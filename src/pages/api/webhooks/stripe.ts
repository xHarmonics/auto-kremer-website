import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { getD1, getDb } from '@/db/client';
import { orderItems, orders, stripeWebhookEvents } from '@/db/schema';
import { sendOrderConfirmationEmails } from '@/lib/email';
import { getRuntimeEnv } from '@/lib/runtime-env';
import {
  DEFAULT_LOCAL_WEBHOOK_SECRET,
  verifyStripeWebhookSignature,
} from '@/lib/stripe';

interface StripeWebhookEventPayload {
  id: string;
  type: string;
  livemode?: boolean;
  data?: {
    object?: {
      id?: string;
      client_reference_id?: string | null;
      customer_email?: string | null;
      customer_details?: {
        email?: string | null;
        name?: string | null;
      } | null;
      metadata?: Record<string, string | undefined>;
    };
  };
}

export async function processVerifiedStripeWebhook(
  rawBody: string,
  signatureHeader: string | null
): Promise<Response> {
  const runtimeEnv = await getRuntimeEnv();
  const webhookSecret =
    runtimeEnv.STRIPE_WEBHOOK_SECRET?.trim() || DEFAULT_LOCAL_WEBHOOK_SECRET;

  const validSig = await verifyStripeWebhookSignature(
    rawBody,
    signatureHeader,
    webhookSecret
  );

  if (!validSig) {
    return new Response(
      JSON.stringify({ error: 'Ungültige Stripe-Webhook-Signatur.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let event: StripeWebhookEventPayload;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEventPayload;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ungültiger Webhook-JSON-Payload.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  if (!event.id || !event.type) {
    return new Response(
      JSON.stringify({ error: 'Fehlende Event-ID oder Event-Typ.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // Strict Sandbox-Only Enforcement: Reject any live-mode event
  if (event.livemode === true) {
    return new Response(
      JSON.stringify({
        error: 'SECURITY_VIOLATION: Live-Mode Stripe-Events sind deaktiviert (nur Sandbox zulässig).',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const d1 = await getD1();
  const db = await getDb(d1);
  const nowIso = new Date().toISOString();

  // Idempotency guard: check if event.id was already processed
  const existingEvent = await db
    .select()
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.eventId, event.id))
    .limit(1);

  if (existingEvent.length > 0) {
    return new Response(
      JSON.stringify({ received: true, duplicate: true }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const sessionObj = event.data?.object;
  const sessionId = sessionObj?.id;
  const orderNumber =
    sessionObj?.metadata?.order_number ?? sessionObj?.client_reference_id ?? undefined;

  let matchedOrders = sessionId
    ? await db
        .select()
        .from(orders)
        .where(eq(orders.stripeSessionId, sessionId))
        .limit(1)
    : [];

  if (matchedOrders.length === 0 && orderNumber) {
    matchedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);
  }

  const order = matchedOrders[0];

  if (event.type === 'checkout.session.completed' && order) {
    if (order.status === 'pending') {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        await d1
          .prepare(
            'UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?), reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? WHERE id = ?'
          )
          .bind(item.quantity, item.quantity, nowIso, item.productId)
          .run();
      }

      const resolvedEmail =
        sessionObj?.customer_details?.email ??
        sessionObj?.customer_email ??
        order.customerEmail;
      const resolvedName =
        sessionObj?.customer_details?.name ?? order.customerName;

      await db
        .update(orders)
        .set({
          status: 'paid',
          customerEmail: resolvedEmail ?? null,
          customerName: resolvedName ?? null,
          paidAt: nowIso,
          updatedAt: nowIso,
        })
        .where(eq(orders.id, order.id));

      await sendOrderConfirmationEmails({
        orderNumber: order.orderNumber,
        customerEmail: resolvedEmail,
        customerName: resolvedName,
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
        items,
      });
    }
  } else if (
    (event.type === 'checkout.session.expired' ||
      event.type === 'checkout.session.async_payment_failed') &&
    order
  ) {
    if (order.status === 'pending') {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        await d1
          .prepare(
            'UPDATE products SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? WHERE id = ?'
          )
          .bind(item.quantity, nowIso, item.productId)
          .run();
      }

      await db
        .update(orders)
        .set({
          status: 'expired',
          updatedAt: nowIso,
        })
        .where(eq(orders.id, order.id));
    }
  }

  await db.insert(stripeWebhookEvents).values({
    eventId: event.id,
    eventType: event.type,
    processedAt: nowIso,
  });

  return new Response(
    JSON.stringify({ received: true, duplicate: false }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');
  return processVerifiedStripeWebhook(rawBody, signatureHeader);
};
