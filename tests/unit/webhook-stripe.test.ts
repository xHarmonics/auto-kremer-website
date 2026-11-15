import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, setTestD1 } from '@/db/client';
import { searchProducts } from '@/db/queries/products';
import { orders } from '@/db/schema';
import {
  clearDispatchedEmailsForTest,
  getDispatchedEmailsForTest,
} from '@/lib/email';
import { setTestRuntimeEnv } from '@/lib/runtime-env';
import { computeStripeSignatureHeader } from '@/lib/stripe';
import { POST as checkoutPost } from '@/pages/api/checkout';
import { POST as webhookPost } from '@/pages/api/webhooks/stripe';
import { createTestD1 } from '../helpers/test-d1';

const WEBHOOK_SECRET = 'whsec_test_unit_secret';

describe('Stripe Webhook Signature, Idempotency & Stock Lifecycle', () => {
  let testD1: D1Database;

  beforeEach(() => {
    testD1 = createTestD1();
    setTestD1(testD1);
    clearDispatchedEmailsForTest();
    setTestRuntimeEnv({
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
      MAIL_TO: 'info@auto-kremer.com',
    });
  });

  afterEach(() => {
    setTestD1(null);
    setTestRuntimeEnv(null);
  });

  it('rejects unsigned or live-mode webhook payloads with HTTP 400', async () => {
    const raw = JSON.stringify({
      id: 'evt_bad_1',
      type: 'checkout.session.completed',
      livemode: false,
    });

    const badRes = await webhookPost({
      request: new Request('http://localhost:4321/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=12345,v1=deadbeef' },
        body: raw,
      }),
    } as never);
    expect(badRes.status).toBe(400);

    // Signed live-mode event must also be rejected!
    const livePayload = JSON.stringify({
      id: 'evt_live_forbidden',
      type: 'checkout.session.completed',
      livemode: true,
    });
    const liveSig = await computeStripeSignatureHeader(livePayload, WEBHOOK_SECRET);
    const liveRes = await webhookPost({
      request: new Request('http://localhost:4321/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': liveSig },
        body: livePayload,
      }),
    } as never);
    expect(liveRes.status).toBe(400);
  });

  it('finalizes paid orders idempotently, decrements D1 stock once, and sends AK-... emails', async () => {
    const db = await getDb(testD1);
    const [part] = await searchProducts({ query: '086927755E' }, db);
    expect(part!.stockQuantity).toBe(1);

    const checkoutRes = await checkoutPost({
      request: new Request('http://localhost:4321/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingZone: 'DE',
          customerEmail: 'kaeufer@beispiel.de',
          items: [{ productId: part!.id, quantity: 1 }],
        }),
      }),
      url: new URL('http://localhost:4321/api/checkout'),
    } as never);
    expect(checkoutRes.status).toBe(200);

    const { orderNumber, sessionId } = (await checkoutRes.json()) as {
      orderNumber: string;
      sessionId: string;
    };

    const completedPayload = JSON.stringify({
      id: 'evt_test_completed_001',
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          id: sessionId,
          client_reference_id: orderNumber,
          customer_details: {
            email: 'kaeufer@beispiel.de',
            name: 'Dr. Luca Ferruccio',
          },
          metadata: { order_number: orderNumber },
        },
      },
    });

    const sig = await computeStripeSignatureHeader(completedPayload, WEBHOOK_SECRET);

    const firstWebhook = await webhookPost({
      request: new Request('http://localhost:4321/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: completedPayload,
      }),
    } as never);
    expect(firstWebhook.status).toBe(200);

    // Deliver exact same event a second time -> must be idempotent!
    const duplicateWebhook = await webhookPost({
      request: new Request('http://localhost:4321/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: completedPayload,
      }),
    } as never);
    expect(duplicateWebhook.status).toBe(200);
    const dupJson = (await duplicateWebhook.json()) as { duplicate: boolean };
    expect(dupJson.duplicate).toBe(true);

    // Verify D1 stock decremented to 0 (not negative) and order marked paid
    const [updatedPart] = await searchProducts({ query: '086927755E' }, db);
    expect(updatedPart!.stockQuantity).toBe(0);
    expect(updatedPart!.reservedQuantity).toBe(0);
    expect(updatedPart!.availableStock).toBe(0);

    const [updatedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber));
    expect(updatedOrder!.status).toBe('paid');

    // Exactly 2 emails sent (1 internal to info@auto-kremer.com + 1 customer confirmation), not 4
    const sent = getDispatchedEmailsForTest();
    expect(sent).toHaveLength(2);
    expect(sent[0]?.subject).toContain(orderNumber);
  });

  it('releases reserved stock when checkout.session.expired arrives', async () => {
    const db = await getDb(testD1);
    const [part] = await searchProducts({ query: '400945095P' }, db);
    expect(part!.availableStock).toBe(1);

    const checkoutRes = await checkoutPost({
      request: new Request('http://localhost:4321/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingZone: 'DE',
          items: [{ productId: part!.id, quantity: 1 }],
        }),
      }),
      url: new URL('http://localhost:4321/api/checkout'),
    } as never);
    const { orderNumber, sessionId } = (await checkoutRes.json()) as {
      orderNumber: string;
      sessionId: string;
    };

    const [duringCheckout] = await searchProducts({ query: '400945095P' }, db);
    expect(duringCheckout!.availableStock).toBe(0);

    const expiredPayload = JSON.stringify({
      id: 'evt_test_expired_001',
      type: 'checkout.session.expired',
      livemode: false,
      data: {
        object: {
          id: sessionId,
          metadata: { order_number: orderNumber },
        },
      },
    });
    const sig = await computeStripeSignatureHeader(expiredPayload, WEBHOOK_SECRET);

    const res = await webhookPost({
      request: new Request('http://localhost:4321/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: expiredPayload,
      }),
    } as never);
    expect(res.status).toBe(200);

    const [afterExpiry] = await searchProducts({ query: '400945095P' }, db);
    expect(afterExpiry!.availableStock).toBe(1);
  });
});
