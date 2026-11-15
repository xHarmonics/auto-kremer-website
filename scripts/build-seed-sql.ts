import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEED_VEHICLES } from '../src/data/vehicles-seed.ts';
import type { CleanedProduct } from './import-wix-catalog.ts';

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
  '-- Auto Kremer Bonn — Deterministic D1 Seed SQL (Vehicles + Ricambi Originali Shop)',
  'DELETE FROM legacy_product_redirects;',
  'DELETE FROM product_models;',
  'DELETE FROM products;',
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
});

lines.push('');

const catalogJsonPath = resolve(import.meta.dirname, '../src/data/products-seed.json');
const catalogData: {
  products: CleanedProduct[];
  redirects: Array<{ oldWixSlug: string; targetProductSlug: string }>;
} = JSON.parse(readFileSync(catalogJsonPath, 'utf8'));

catalogData.products.forEach((p, idx) => {
  const productId = idx + 1;
  lines.push(
    `INSERT INTO products (id, slug, oem_number, oem_normalized, title, category, condition, description, price_cents, vat_rate_percent, stock_quantity, reserved_quantity, image_url, image_alt, featured, active, created_at, updated_at) VALUES (${productId}, ${sqlStr(p.slug)}, ${sqlStr(p.oemNumber)}, ${sqlStr(p.oemNormalized)}, ${sqlStr(p.title)}, ${sqlStr(p.category)}, ${sqlStr(p.condition)}, ${sqlStr(p.description)}, ${sqlNum(p.priceCents)}, ${sqlNum(p.vatRatePercent)}, ${sqlNum(p.stockQuantity)}, 0, ${sqlStr(p.imageUrl)}, ${sqlStr(p.imageAlt)}, ${sqlBool(p.featured)}, 1, ${sqlStr(nowIso)}, ${sqlStr(nowIso)});`
  );

  for (const m of p.models) {
    lines.push(
      `INSERT INTO product_models (product_id, model_slug, model_label) VALUES (${productId}, ${sqlStr(m.slug)}, ${sqlStr(m.label)});`
    );
  }
});

lines.push('');

const seenRedirectSlugs = new Set<string>();
for (const r of catalogData.redirects) {
  if (seenRedirectSlugs.has(r.oldWixSlug)) continue;
  seenRedirectSlugs.add(r.oldWixSlug);
  lines.push(
    `INSERT INTO legacy_product_redirects (old_wix_slug, target_product_slug) VALUES (${sqlStr(r.oldWixSlug)}, ${sqlStr(r.targetProductSlug)});`
  );
}

const outPath = resolve(import.meta.dirname, '../drizzle/seed.sql');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(
  `Generated ${outPath} with ${SEED_VEHICLES.length} vehicles, ${catalogData.products.length} OEM parts, and ${seenRedirectSlugs.size} legacy redirects.`
);
