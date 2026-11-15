import { SHIPPING_RATES, type ShippingZone } from '@/lib/cart.store';

export const DEFAULT_LOCAL_WEBHOOK_SECRET = 'whsec_test_sandbox_local_secret';

/**
 * Hard runtime guard enforcing the strict project constraint:
 * Stripe may ONLY run in Sandbox / Test mode — production/live keys are strictly forbidden.
 */
export function assertSandboxOnly(stripeKey?: string | null): void {
  if (!stripeKey) return;
  const trimmed = stripeKey.trim();
  if (!trimmed) return;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('sk_live_') ||
    lower.startsWith('pk_live_') ||
    lower.startsWith('rk_live_') ||
    lower.includes('_live_')
  ) {
    throw new Error(
      'SECURITY_VIOLATION: Produktive Stripe-Live-Schlüssel sind strikt untersagt. Es dürfen ausschließlich Sandbox-Testschlüssel (sk_test_...) verwendet werden.'
    );
  }

  if (!lower.startsWith('sk_test_') && !lower.startsWith('rk_test_')) {
    throw new Error(
      'SECURITY_VIOLATION: Ungültiges Stripe-Schlüsselformat. Nur Stripe-Sandbox-Schlüssel (sk_test_... / rk_test_...) sind zulässig.'
    );
  }
}

export interface CheckoutLineInput {
  oemNumber: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CreateSandboxSessionParams {
  orderNumber: string;
  origin: string;
  shippingZone: ShippingZone;
  shippingCents: number;
  customerEmail?: string;
  lines: CheckoutLineInput[];
  stripeSecretKey?: string;
}

export interface CreatedSandboxSession {
  sessionId: string;
  checkoutUrl: string;
  provider: 'stripe-test-api' | 'local-sandbox-simulator';
}

export async function createStripeSandboxCheckoutSession(
  params: CreateSandboxSessionParams
): Promise<CreatedSandboxSession> {
  assertSandboxOnly(params.stripeSecretKey);

  const secretKey = params.stripeSecretKey?.trim() ?? '';

  // Local deterministic Sandbox Simulator when no external sk_test_... key is configured
  if (!secretKey) {
    const sessionId = `cs_test_sandbox_${crypto.randomUUID().replace(/-/g, '')}`;
    const checkoutUrl = `${params.origin}/shop/sandbox-checkout?order=${encodeURIComponent(
      params.orderNumber
    )}&session_id=${encodeURIComponent(sessionId)}`;
    return {
      sessionId,
      checkoutUrl,
      provider: 'local-sandbox-simulator',
    };
  }

  // Real Stripe Sandbox API (https://api.stripe.com/v1/checkout/sessions with sk_test_...)
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('client_reference_id', params.orderNumber);
  form.set('metadata[order_number]', params.orderNumber);
  form.set('metadata[sandbox_only]', 'true');
  form.set(
    'success_url',
    `${params.origin}/shop/erfolg?order=${encodeURIComponent(
      params.orderNumber
    )}&session_id={CHECKOUT_SESSION_ID}`
  );
  form.set(
    'cancel_url',
    `${params.origin}/shop/abgebrochen?order=${encodeURIComponent(params.orderNumber)}`
  );

  if (params.customerEmail) {
    form.set('customer_email', params.customerEmail);
  }

  params.lines.forEach((line, idx) => {
    form.set(`line_items[${idx}][quantity]`, String(line.quantity));
    form.set(`line_items[${idx}][price_data][currency]`, 'eur');
    form.set(
      `line_items[${idx}][price_data][unit_amount]`,
      String(line.unitPriceCents)
    );
    form.set(
      `line_items[${idx}][price_data][product_data][name]`,
      `${line.oemNumber} — ${line.title}`
    );
    form.set(
      `line_items[${idx}][price_data][product_data][metadata][oem_number]`,
      line.oemNumber
    );
  });

  form.set(
    'shipping_options[0][shipping_rate_data][type]',
    'fixed_amount'
  );
  form.set(
    'shipping_options[0][shipping_rate_data][display_name]',
    SHIPPING_RATES[params.shippingZone].label
  );
  form.set(
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]',
    String(params.shippingCents)
  );
  form.set(
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]',
    'eur'
  );

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const payload = (await response.json()) as {
    id?: string;
    url?: string;
    livemode?: boolean;
    error?: { message?: string };
  };

  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(
      payload.error?.message ?? 'Stripe Sandbox Session konnte nicht erstellt werden.'
    );
  }

  if (payload.livemode === true) {
    throw new Error(
      'SECURITY_VIOLATION: Stripe Session gab livemode=true zurück — abgebrochen!'
    );
  }

  return {
    sessionId: payload.id,
    checkoutUrl: payload.url,
    provider: 'stripe-test-api',
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function computeStripeSignatureHeader(
  rawBody: string,
  webhookSecret: string,
  timestampSec = Math.floor(Date.now() / 1000)
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedPayload = `${timestampSec}.${rawBody}`;
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );
  const hex = bytesToHex(new Uint8Array(sigBuffer));
  return `t=${timestampSec},v1=${hex}`;
}

export async function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  toleranceSeconds = 300
): Promise<boolean> {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = signatureHeader.split(',').map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Parts = parts
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3));

  if (!tPart || v1Parts.length === 0) return false;
  const timestamp = Number(tPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSeconds) {
    return false;
  }

  const expectedHeader = await computeStripeSignatureHeader(
    rawBody,
    webhookSecret,
    timestamp
  );
  const expectedV1 = expectedHeader.split(',v1=')[1] ?? '';

  return v1Parts.some((candidate) => timingSafeHexEqual(candidate, expectedV1));
}
