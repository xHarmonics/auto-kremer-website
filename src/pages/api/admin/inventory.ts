import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { vehicleImages, vehicles } from '@/db/schema';
import { updateProductInventory } from '@/db/queries/products';
import { updateVehicleStatus } from '@/db/queries/vehicles';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { parseGermanEuroToCents, parseGermanInt } from '@/lib/format';

const ToggleVehicleStatusSchema = z.object({
  action: z.literal('toggle_vehicle_status'),
  vehicleId: z.coerce.number().int().positive(),
  status: z.enum(['available', 'reserved', 'sold']),
});

const UpdateProductSchema = z.object({
  action: z.literal('update_product'),
  productId: z.coerce.number().int().positive(),
  priceCents: z.preprocess(
    (val) =>
      typeof val === 'string' || typeof val === 'number'
        ? parseGermanEuroToCents(val)
        : Number.NaN,
    z.number().int().min(0).max(50000000)
  ),
  stockQuantity: z.preprocess(
    (val) =>
      typeof val === 'string' || typeof val === 'number' ? parseGermanInt(val) : Number.NaN,
    z.number().int().min(0).max(10000)
  ),
});

const CreateVehicleSchema = z.object({
  action: z.literal('create_vehicle'),
  title: z.string().trim().min(3).max(140),
  brand: z.string().trim().min(2).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1950).max(2030),
  mileageKm: z.preprocess(
    (val) =>
      typeof val === 'string' || typeof val === 'number' ? parseGermanInt(val) : Number.NaN,
    z.number().int().min(0).max(1000000)
  ),
  powerPs: z.preprocess(
    (val) =>
      typeof val === 'string' || typeof val === 'number' ? parseGermanInt(val) : Number.NaN,
    z.number().int().min(1).max(2500)
  ),
  transmission: z.string().trim().min(2).max(60),
  priceEur: z.string().trim().optional().default(''),
  status: z.enum(['available', 'reserved', 'sold']).default('available'),
  summary: z.string().trim().min(10).max(500),
});

const DeleteVehicleSchema = z.object({
  action: z.literal('delete_vehicle'),
  slug: z.string().trim().min(2).max(120),
});

function slugifyVehicle(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await verifyAdminRequest(request);
  if (!auth.authenticated) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  let raw: Record<string, unknown> = {};

  try {
    if (isJson) {
      raw = (await request.json()) as Record<string, unknown>;
    } else {
      const fd = await request.formData();
      fd.forEach((value, key) => {
        raw[key] = String(value);
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültige Nutzdaten.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const action = String(raw.action ?? '');

  if (action === 'toggle_vehicle_status') {
    const parsed = ToggleVehicleStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Ungültige Fahrzeug-Statusdaten.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const updated = await updateVehicleStatus(parsed.data.vehicleId, parsed.data.status);
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Fahrzeug nicht gefunden.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (!isJson) {
      return new Response(null, {
        status: 303,
        headers: { Location: '/admin?saved=vehicle-status' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        vehicleId: parsed.data.vehicleId,
        status: parsed.data.status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  if (action === 'update_product') {
    const parsed = UpdateProductSchema.safeParse({
      ...raw,
      priceCents: raw.priceCents ?? raw.priceEur,
    });
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Ungültige Produktdaten.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const priceCents = parsed.data.priceCents;
    const updated = await updateProductInventory(parsed.data.productId, {
      priceCents,
      stockQuantity: parsed.data.stockQuantity,
    });

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Ersatzteil nicht gefunden.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (!isJson) {
      return new Response(null, {
        status: 303,
        headers: { Location: '/admin?saved=product' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        productId: parsed.data.productId,
        priceCents,
        stockQuantity: parsed.data.stockQuantity,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  if (action === 'create_vehicle') {
    const parsed = CreateVehicleSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message ?? 'Ungültige Fahrzeugangaben.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const d = parsed.data;
    const db = await getDb();
    const nowIso = new Date().toISOString();
    const baseSlug = slugifyVehicle(`${d.brand}-${d.model}-${d.year}`);
    const uniqueSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;
    const parsedVehiclePriceCents = d.priceEur ? parseGermanEuroToCents(d.priceEur) : Number.NaN;
    if (d.priceEur && (Number.isNaN(parsedVehiclePriceCents) || parsedVehiclePriceCents < 0)) {
      return new Response(
        JSON.stringify({ error: 'Bitte geben Sie einen gültigen Fahrzeugpreis in EUR ein.' }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
    const hasPrice = Number.isFinite(parsedVehiclePriceCents) && parsedVehiclePriceCents > 0;
    const powerKw = Math.round(d.powerPs * 0.7355);

    const [inserted] = await db
      .insert(vehicles)
      .values({
        slug: uniqueSlug,
        title: d.title,
        brand: d.brand,
        model: d.model,
        year: d.year,
        mileageKm: d.mileageKm,
        powerPs: d.powerPs,
        powerKw,
        transmission: d.transmission,
        fuelType: 'Benzin',
        priceCents: hasPrice ? parsedVehiclePriceCents : null,
        priceOnRequest: !hasPrice,
        vatDeductible: false,
        status: d.status,
        featured: false,
        summary: d.summary,
        description: d.summary,
        highlightsJson: JSON.stringify(['Geprüft durch Auto Kremer Bonn']),
        sortOrder: 50,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning({ id: vehicles.id, slug: vehicles.slug });

    if (inserted) {
      await db.insert(vehicleImages).values({
        vehicleId: inserted.id,
        url: '/media/vehicles/murcielago-v12-1.avif',
        alt: d.title,
        width: 1280,
        height: 854,
        sortOrder: 1,
      });
    }

    if (!isJson) {
      return new Response(null, {
        status: 303,
        headers: { Location: '/admin?saved=vehicle-created' },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, vehicle: inserted }),
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  if (action === 'delete_vehicle') {
    const parsed = DeleteVehicleSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Ungültiger Fahrzeug-Slug.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const db = await getDb();
    const deleted = await db
      .delete(vehicles)
      .where(eq(vehicles.slug, parsed.data.slug))
      .returning({ id: vehicles.id, slug: vehicles.slug });

    if (deleted.length === 0) {
      return new Response(JSON.stringify({ error: 'Fahrzeug nicht gefunden.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({ ok: true, deleted: deleted[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unbekannte Aktion.' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
