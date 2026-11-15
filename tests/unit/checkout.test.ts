import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setTestD1, getDb } from '@/db/client';
import { searchProducts } from '@/db/queries/products';
import { setTestRuntimeEnv } from '@/lib/runtime-env';
import { assertSandboxOnly } from '@/lib/stripe';
import { POST as checkoutPost } from '@/pages/api/checkout';
import { createTestD1 } from '../helpers/test-d1';

describe('Stripe Sandbox Checkout API & Atomic Stock Reservation', () => {
  let testD1: D1Database;

  beforeEach(() => {
    testD1 = createTestD1();
    setTestD1(testD1);
    setTestRuntimeEnv({
      STRIPE_SECRET_KEY: '', // Uses local deterministic sandbox simulator
      STRIPE_WEBHOOK_SECRET: 'whsec_test_sandbox_local_secret',
    });
  });

  afterEach(() => {
    setTestD1(null);
    setTestRuntimeEnv(null);
  });

  it('strictly blocks any Stripe production/live keys at runtime', () => {
    expect(() => assertSandboxOnly('sk_live_' + '1234567890')).toThrow(
      /SECURITY_VIOLATION/
    );
    expect(() => assertSandboxOnly('pk_live_' + 'abcdef')).toThrow(
      /SECURITY_VIOLATION/
    );
    expect(() => assertSandboxOnly('rk_live_' + 'abcdef')).toThrow(
      /SECURITY_VIOLATION/
    );
    expect(() => assertSandboxOnly('sk_test_sandbox_allowed')).not.toThrow();
    expect(() => assertSandboxOnly('')).not.toThrow();
  });

  it('ignores tampered client prices, reads authoritative D1 prices, and creates a sandbox session', async () => {
    const db = await getDb(testD1);
    const [ecu] = await searchProducts({ query: '086927755E' }, db);
    expect(ecu).toBeDefined();
    expect(ecu!.priceCents).toBe(113112); // 1.131,12 EUR (>= 500 EUR -> 0 EUR DE shipping)

    const req = new Request('http://localhost:4321/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingZone: 'DE',
        customerEmail: 'sammler@auto-kremer-test.de',
        items: [
          {
            productId: ecu!.id,
            quantity: 1,
            priceCents: 1, // Malicious client price tampering attempt!
          },
        ],
      }),
    });

    const res = await checkoutPost({
      request: req,
      url: new URL(req.url),
    } as never);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      orderNumber: string;
      checkoutUrl: string;
      subtotalCents: number;
      shippingCents: number;
      totalCents: number;
      stripeMode: string;
    };

    expect(body.ok).toBe(true);
    expect(body.stripeMode).toBe('sandbox');
    expect(body.subtotalCents).toBe(113112);
    expect(body.shippingCents).toBe(0);
    expect(body.totalCents).toBe(113112);
    expect(body.checkoutUrl).toContain('/shop/sandbox-checkout?');
  });

  it('prevents overselling single-unit NOS parts (stock = 1): second checkout returns HTTP 409', async () => {
    const db = await getDb(testD1);
    const [ecu] = await searchProducts({ query: '086927755E' }, db);
    expect(ecu!.availableStock).toBe(1);

    const makeReq = () =>
      new Request('http://localhost:4321/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingZone: 'DE',
          items: [{ productId: ecu!.id, quantity: 1 }],
        }),
      });

    const firstRes = await checkoutPost({
      request: makeReq(),
      url: new URL('http://localhost:4321/api/checkout'),
    } as never);
    expect(firstRes.status).toBe(200);

    const secondRes = await checkoutPost({
      request: makeReq(),
      url: new URL('http://localhost:4321/api/checkout'),
    } as never);
    expect(secondRes.status).toBe(409);

    const errPayload = (await secondRes.json()) as { error: string };
    expect(errPayload.error).toContain('086927755E');
  });
});
