import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/client';
import {
  getVehicleBySlug,
  listFeaturedVehicles,
  listShowroomVehicles,
  listSoldVehicles,
  updateVehicleStatus,
} from '@/db/queries/vehicles';
import { createTestD1 } from '../helpers/test-d1';

describe('D1 Vehicle Repository (Showroom & Referenzen)', () => {
  it('loads all 5 active showroom vehicles and 3 sold reference icons with images', async () => {
    const db = await getDb(createTestD1());
    const showroom = await listShowroomVehicles({}, db);
    const sold = await listSoldVehicles(db);

    expect(showroom).toHaveLength(5);
    expect(sold).toHaveLength(3);

    for (const car of [...showroom, ...sold]) {
      expect(car.images.length).toBeGreaterThanOrEqual(3);
      expect(car.coverImage?.url).toMatch(/^\/media\/vehicles\/.+\.avif$/);
      expect(car.highlights.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('filters showroom vehicles by brand and transmission', async () => {
    const db = await getDb(createTestD1());

    const porsche = await listShowroomVehicles({ brand: 'Porsche' }, db);
    expect(porsche).toHaveLength(1);
    expect(porsche[0]?.slug).toBe('porsche-993-carrera-rs-clubsport-1995');

    const manuals = await listShowroomVehicles({ transmission: 'Handschaltung' }, db);
    expect(manuals.map((v) => v.slug)).toEqual([
      'lamborghini-gallardo-5-0-handschalter',
      'porsche-993-carrera-rs-clubsport-1995',
    ]);

    const featured = await listFeaturedVehicles(3, db);
    expect(featured).toHaveLength(3);
  });

  it('fetches individual vehicle details by slug and updates status cleanly', async () => {
    const db = await getDb(createTestD1());

    const car = await getVehicleBySlug('alfa-romeo-4c-2016', db);
    expect(car).not.toBeNull();
    expect(car?.year).toBe(2016);
    expect(car?.priceCents).toBe(6490000);
    expect(car?.priceOnRequest).toBe(false);

    const unknown = await getVehicleBySlug('non-existent-ferrari', db);
    expect(unknown).toBeNull();

    const changed = await updateVehicleStatus(car!.id, 'sold', db);
    expect(changed).toBe(true);

    const showroomAfter = await listShowroomVehicles({}, db);
    const soldAfter = await listSoldVehicles(db);
    expect(showroomAfter).toHaveLength(4);
    expect(soldAfter).toHaveLength(4);
  });
});
