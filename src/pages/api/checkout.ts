import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { getD1, getDb } from '@/db/client';
import { orderItems, orders, products } from '@/db/schema';
import {
  calculateIncludedVatCents,
  calculateShippingCents,
} from '@/lib/cart.store';
import { getRuntimeEnv } from '@/lib/runtime-env';
import {
  assertSandboxOnly,
  createStripeSandboxCheckoutSession,
} from '@/lib/stripe';

const CheckoutRequestSchema = z.object({
  shippingZone: z.enum(['DE', 'EU', 'WORLD']).default('DE'),
  customerEmail: z.email('Ungültige E-Mail-Adresse').optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1, 'Der Warenkorb darf nicht leer sein.')
    .max(40),
});

async function releaseExpiredReservations(d1: D1Database, nowIso: string) {
  const db = await getDb(d1);
  const staleOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, 'pending'), lt(orders.reservedUntil, nowIso)));

  for (const stale of staleOrders) {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, stale.id));

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
      .set({ status: 'expired', updatedAt: nowIso })
      .where(eq(orders.id, stale.id));
  }
}

function generateOrderNumber(): string {
  const year = new Date().getUTCFullYear();
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `AK-${year}-${rand}`;
}

export const POST: APIRoute = async ({ request, url }) => {
  const runtimeEnv = await getRuntimeEnv();

  try {
    assertSandboxOnly(runtimeEnv.STRIPE_SECRET_KEY);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : 'Stripe-Konfigurationsfehler (nur Sandbox zulässig).',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ungültiges JSON-Anfrageformat.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const parsed = CheckoutRequestSchema.safeParse(rawJson);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: 'Ungültige Warenkorb-Angaben.',
        issues: parsed.error.issues.map((i) => i.message),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // Aggregate duplicate productIds if any
  const aggregatedQty = new Map<number, number>();
  for (const item of parsed.data.items) {
    aggregatedQty.set(
      item.productId,
      (aggregatedQty.get(item.productId) ?? 0) + item.quantity
    );
  }

  const d1 = await getD1();
  const db = await getDb(d1);
  const now = new Date();
  const nowIso = now.toISOString();
  const reservedUntilIso = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  await releaseExpiredReservations(d1, nowIso);

  const requestedIds = Array.from(aggregatedQty.keys());
  const dbProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, requestedIds));

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));

  // Atomically reserve stock item by item; roll back immediately if any item lacks stock
  const reservedSoFar: Array<{ productId: number; quantity: number }> = [];

  for (const [productId, qty] of aggregatedQty.entries()) {
    const prod = productMap.get(productId);
    if (!prod || !prod.active || prod.priceCents <= 0) {
      for (const prev of reservedSoFar) {
        await d1
          .prepare(
            'UPDATE products SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? WHERE id = ?'
          )
          .bind(prev.quantity, nowIso, prev.productId)
          .run();
      }
      return new Response(
        JSON.stringify({
          error: `Artikel #${productId} ist aktuell nicht bestellbar.`,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const updateRes = await d1
      .prepare(
        'UPDATE products SET reserved_quantity = reserved_quantity + ?, updated_at = ? WHERE id = ? AND active = 1 AND price_cents > 0 AND (stock_quantity - reserved_quantity) >= ?'
      )
      .bind(qty, nowIso, productId, qty)
      .run();

    if ((updateRes.meta.changes ?? 0) === 0) {
      for (const prev of reservedSoFar) {
        await d1
          .prepare(
            'UPDATE products SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? WHERE id = ?'
          )
          .bind(prev.quantity, nowIso, prev.productId)
          .run();
      }
      const available = Math.max(0, prod.stockQuantity - prod.reservedQuantity);
      return new Response(
        JSON.stringify({
          error: `Für das Ersatzteil „${prod.oemNumber} — ${prod.title}“ ist leider nicht mehr genügend Bestand frei (verfügbar: ${available} Stk., angefragt: ${qty} Stk.).`,
          insufficientItems: [
            {
              productId: prod.id,
              oemNumber: prod.oemNumber,
              title: prod.title,
              availableStock: available,
              requestedQuantity: qty,
            },
          ],
        }),
        { status: 409, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    reservedSoFar.push({ productId, quantity: qty });
  }

  // Compute authoritative totals exclusively from D1 prices
  const orderLines = Array.from(aggregatedQty.entries()).map(([productId, quantity]) => {
    const prod = productMap.get(productId)!;
    return {
      productId,
      oemNumber: prod.oemNumber,
      title: prod.title,
      unitPriceCents: prod.priceCents,
      quantity,
      lineTotalCents: prod.priceCents * quantity,
    };
  });

  const subtotalCents = orderLines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingCents = calculateShippingCents(subtotalCents, parsed.data.shippingZone);
  const totalCents = subtotalCents + shippingCents;
  const vatCents = calculateIncludedVatCents(totalCents, 19);
  const orderNumber = generateOrderNumber();
  const origin = url.origin;

  try {
    const session = await createStripeSandboxCheckoutSession({
      orderNumber,
      origin,
      shippingZone: parsed.data.shippingZone,
      shippingCents,
      customerEmail: parsed.data.customerEmail,
      lines: orderLines,
      stripeSecretKey: runtimeEnv.STRIPE_SECRET_KEY,
    });

    const insertedOrders = await db
      .insert(orders)
      .values({
        orderNumber,
        stripeSessionId: session.sessionId,
        status: 'pending',
        shippingZone: parsed.data.shippingZone,
        subtotalCents,
        shippingCents,
        totalCents,
        vatCents,
        customerEmail: parsed.data.customerEmail ?? null,
        stripeMode: 'sandbox',
        reservedUntil: reservedUntilIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning({ id: orders.id });

    const orderId = insertedOrders[0]!.id;

    for (const line of orderLines) {
      await db.insert(orderItems).values({
        orderId,
        productId: line.productId,
        oemNumber: line.oemNumber,
        title: line.title,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        orderNumber,
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        provider: session.provider,
        stripeMode: 'sandbox',
        subtotalCents,
        shippingCents,
        totalCents,
        vatCents,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  } catch (err) {
    // Release stock reservation if session creation failed
    for (const prev of reservedSoFar) {
      await d1
        .prepare(
          'UPDATE products SET reserved_quantity = MAX(0, reserved_quantity - ?), updated_at = ? WHERE id = ?'
        )
        .bind(prev.quantity, nowIso, prev.productId)
        .run();
    }

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : 'Checkout-Sitzung konnte nicht initialisiert werden.',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
};
