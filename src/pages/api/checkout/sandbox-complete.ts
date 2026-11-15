import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { orders } from '@/db/schema';
import { getRuntimeEnv } from '@/lib/runtime-env';
import {
  DEFAULT_LOCAL_WEBHOOK_SECRET,
  computeStripeSignatureHeader,
} from '@/lib/stripe';
import { processVerifiedStripeWebhook } from '@/pages/api/webhooks/stripe';

export const POST: APIRoute = async ({ request, url }) => {
  const runtimeEnv = await getRuntimeEnv();
  // Only allow simulator completion when no external Stripe API key is set or session starts with cs_test_sandbox_
  const formData = await request.formData();
  const orderNumber = String(formData.get('order') ?? '').trim();
  const sessionId = String(formData.get('session_id') ?? '').trim();
  const action = String(formData.get('action') ?? 'complete').trim();
  const customerName = String(formData.get('customer_name') ?? 'Max Mustermann (Sandbox)').trim();
  const customerEmail = String(formData.get('customer_email') ?? 'sandbox-kunde@auto-kremer.com').trim();

  if (!orderNumber || !sessionId.startsWith('cs_test_sandbox_')) {
    return new Response('Ungültige Sandbox-Sitzung.', { status: 400 });
  }

  const db = await getDb();
  const found = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  const order = found[0];
  if (!order || order.stripeSessionId !== sessionId) {
    return new Response('Bestellung nicht gefunden.', { status: 404 });
  }

  const eventType =
    action === 'cancel'
      ? 'checkout.session.expired'
      : 'checkout.session.completed';

  const syntheticEvent = {
    id: `evt_test_sandbox_${crypto.randomUUID().replace(/-/g, '')}`,
    type: eventType,
    livemode: false,
    data: {
      object: {
        id: sessionId,
        client_reference_id: orderNumber,
        customer_email: customerEmail,
        customer_details: {
          name: customerName,
          email: customerEmail,
        },
        metadata: {
          order_number: orderNumber,
          sandbox_only: 'true',
        },
      },
    },
  };

  const rawBody = JSON.stringify(syntheticEvent);
  const secret =
    runtimeEnv.STRIPE_WEBHOOK_SECRET?.trim() || DEFAULT_LOCAL_WEBHOOK_SECRET;
  const sigHeader = await computeStripeSignatureHeader(rawBody, secret);

  await processVerifiedStripeWebhook(rawBody, sigHeader);

  const targetUrl =
    action === 'cancel'
      ? new URL(`/shop/abgebrochen?order=${encodeURIComponent(orderNumber)}`, url.origin)
      : new URL(
          `/shop/erfolg?order=${encodeURIComponent(orderNumber)}&session_id=${encodeURIComponent(sessionId)}`,
          url.origin
        );

  return Response.redirect(targetUrl.toString(), 303);
};
