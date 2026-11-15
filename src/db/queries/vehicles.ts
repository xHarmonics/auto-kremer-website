import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db/client';
import {
  vehicles,
  vehicleImages,
  type VehicleRow,
  type VehicleImageRow,
} from '@/db/schema';

export interface VehicleWithImages extends VehicleRow {
  highlights: string[];
  images: VehicleImageRow[];
  coverImage: VehicleImageRow | null;
}

export interface ShowroomFilter {
  brand?: string;
  transmission?: string;
}

function parseHighlights(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function attachImages(
  db: AppDb,
  rows: VehicleRow[]
): Promise<VehicleWithImages[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const imgs = await db
    .select()
    .from(vehicleImages)
    .where(inArray(vehicleImages.vehicleId, ids))
    .orderBy(asc(vehicleImages.sortOrder), asc(vehicleImages.id));

  const byVehicle = new Map<number, VehicleImageRow[]>();
  for (const img of imgs) {
    const bucket = byVehicle.get(img.vehicleId) ?? [];
    bucket.push(img);
    byVehicle.set(img.vehicleId, bucket);
  }

  return rows.map((row) => {
    const images = byVehicle.get(row.id) ?? [];
    return {
      ...row,
      highlights: parseHighlights(row.highlightsJson),
      images,
      coverImage: images[0] ?? null,
    };
  });
}

export async function listShowroomVehicles(
  filter: ShowroomFilter = {},
  dbOverride?: AppDb
): Promise<VehicleWithImages[]> {
  const db = dbOverride ?? (await getDb());
  const conditions = [inArray(vehicles.status, ['available', 'reserved'])];

  if (filter.brand && filter.brand !== 'all') {
    conditions.push(eq(vehicles.brand, filter.brand));
  }
  if (filter.transmission && filter.transmission !== 'all') {
    conditions.push(eq(vehicles.transmission, filter.transmission));
  }

  const rows = await db
    .select()
    .from(vehicles)
    .where(and(...conditions))
    .orderBy(asc(vehicles.sortOrder), asc(vehicles.id));

  return attachImages(db, rows);
}

export async function listSoldVehicles(
  dbOverride?: AppDb
): Promise<VehicleWithImages[]> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.status, 'sold'))
    .orderBy(asc(vehicles.sortOrder), asc(vehicles.id));

  return attachImages(db, rows);
}

export async function listFeaturedVehicles(
  limit = 3,
  dbOverride?: AppDb
): Promise<VehicleWithImages[]> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select()
    .from(vehicles)
    .where(
      and(
        inArray(vehicles.status, ['available', 'reserved']),
        eq(vehicles.featured, true)
      )
    )
    .orderBy(asc(vehicles.sortOrder), asc(vehicles.id))
    .limit(limit);

  return attachImages(db, rows);
}

export async function getVehicleBySlug(
  slug: string,
  dbOverride?: AppDb
): Promise<VehicleWithImages | null> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.slug, slug))
    .limit(1);

  if (rows.length === 0) return null;
  const enriched = await attachImages(db, rows);
  return enriched[0] ?? null;
}

export async function listAllVehicles(
  dbOverride?: AppDb
): Promise<VehicleWithImages[]> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select()
    .from(vehicles)
    .orderBy(asc(vehicles.sortOrder), asc(vehicles.id));
  return attachImages(db, rows);
}

export async function updateVehicleStatus(
  vehicleId: number,
  status: 'available' | 'reserved' | 'sold',
  dbOverride?: AppDb
): Promise<boolean> {
  const db = dbOverride ?? (await getDb());
  const updated = await db
    .update(vehicles)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(vehicles.id, vehicleId))
    .returning({ id: vehicles.id });

  return updated.length > 0;
}
