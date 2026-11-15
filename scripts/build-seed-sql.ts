import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEED_VEHICLES } from '../src/data/vehicles-seed.ts';

function sqlStr(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

function sqlNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return String(val);
}

function sqlBool(val: boolean): string {
  return val ? '1' : '0';
}

const nowIso = '2026-11-15T00:00:00.000Z';
const lines: string[] = [
  '-- Auto Kremer Bonn — Deterministic D1 Seed SQL',
  'DELETE FROM vehicle_images;',
  'DELETE FROM vehicles;',
  '',
];

SEED_VEHICLES.forEach((v, idx) => {
  const vehicleId = idx + 1;
  lines.push(
    `INSERT INTO vehicles (id, slug, title, brand, model, year, mileage_km, power_ps, power_kw, displacement_cc, engine_type, transmission, drivetrain, fuel_type, exterior_color, interior_color, price_cents, price_on_request, vat_deductible, status, featured, summary, description, highlights_json, mobile_de_url, sort_order, created_at, updated_at) VALUES (${vehicleId}, ${sqlStr(v.slug)}, ${sqlStr(v.title)}, ${sqlStr(v.brand)}, ${sqlStr(v.model)}, ${sqlNum(v.year)}, ${sqlNum(v.mileageKm)}, ${sqlNum(v.powerPs)}, ${sqlNum(v.powerKw)}, ${sqlNum(v.displacementCc)}, ${sqlStr(v.engineType)}, ${sqlStr(v.transmission)}, ${sqlStr(v.drivetrain)}, ${sqlStr(v.fuelType)}, ${sqlStr(v.exteriorColor)}, ${sqlStr(v.interiorColor)}, ${sqlNum(v.priceCents)}, ${sqlBool(v.priceOnRequest)}, ${sqlBool(v.vatDeductible)}, ${sqlStr(v.status)}, ${sqlBool(v.featured)}, ${sqlStr(v.summary)}, ${sqlStr(v.description)}, ${sqlStr(JSON.stringify(v.highlights))}, ${sqlStr(v.mobileDeUrl)}, ${sqlNum(v.sortOrder)}, ${sqlStr(nowIso)}, ${sqlStr(nowIso)});`
  );

  v.images.forEach((img, imgIdx) => {
    lines.push(
      `INSERT INTO vehicle_images (vehicle_id, url, alt, width, height, sort_order) VALUES (${vehicleId}, ${sqlStr(img.url)}, ${sqlStr(img.alt)}, 1280, 854, ${imgIdx + 1});`
    );
  });
  lines.push('');
});

const outPath = resolve(import.meta.dirname, '../drizzle/seed.sql');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Generated ${outPath} with ${SEED_VEHICLES.length} vehicles.`);
