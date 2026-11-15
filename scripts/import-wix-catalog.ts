import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

interface RawWixItem {
  wix_slug: string;
  name: string;
  sku: string;
  price: number;
  formattedPrice: string;
  isInStock: boolean;
  inventoryQuantity: number;
  image: string;
}

export interface CleanedProduct {
  slug: string;
  oemNumber: string;
  oemNormalized: string;
  title: string;
  category: string;
  condition: 'new_nos' | 'used_tested';
  description: string;
  priceCents: number;
  vatRatePercent: number;
  stockQuantity: number;
  imageUrl: string;
  imageAlt: string;
  featured: boolean;
  models: Array<{ slug: string; label: string }>;
}

const TYPO_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bCodant\b/gi, 'Coolant'],
  [/\bSitch\b/gi, 'Switch'],
  [/\bShook\b/gi, 'Shock'],
  [/\bcasket\b/gi, 'Gasket'],
  [/\bspark\s+rlug\s+Gromet\b/gi, 'Spark Plug Grommet'],
  [/\bGroumet\b/gi, 'Grommet'],
  [/\bCouic\b/gi, 'Conic'],
  [/\bTorision\s+Bear\s+Tiersot\b/gi, 'Torsion Bar Tie-Rod'],
  [/\bFalnge\b/gi, 'Flange'],
  [/\bFlunge\b/gi, 'Flange'],
  [/\bStering\b/gi, 'Steering'],
  [/\bFeuel\b/gi, 'Fuel'],
  [/\bTermostat\b/gi, 'Thermostat'],
  [/\bGuarnzione\b/gi, 'Guarnizione'],
  [/Interr\.?\s*Luntotto\s+termico/gi, 'Interruttore Lunotto Termico'],
  [/\bMuricelago\b/gi, 'Murciélago'],
  [/\bMurcielago\b/gi, 'Murciélago'],
  [/\bHurracan\b/gi, 'Huracán'],
  [/\bHuracan\b/gi, 'Huracán'],
  [/\bUraco\b/gi, 'Urraco'],
  [/\bLm002\b/g, 'LM002'],
  [/\bjarama\b/g, 'Jarama'],
  [/\bExhaust\s+Pipe\s+Clap\b/gi, 'Exhaust Pipe Clamp'],
  [/\bFairled\b/gi, 'Fairlead'],
  [/\bPropellor\b/gi, 'Propeller'],
  [/\bpipegasket\b/gi, 'Pipe Gasket'],
  [/\bProtektiv\b/gi, 'Protective'],
  [/\bHelaxobular\b/gi, 'Hexalobular'],
  [/\bswitch\s+Modul\b/gi, 'Switch Module'],
  [/\bdrier\s+Filter\s+Filtering\b/gi, 'Drier Filter'],
  [/\bCountachNEW\b/gi, 'Countach LPI 800-4'],
  [/\bCountach\s+NEW\b/gi, 'Countach LPI 800-4'],
  [/\bDiabloGT\b/g, 'Diablo GT'],
  [/\s+\.\s+/g, ' '],
  [/\.$/g, ''],
];

const MODEL_MATCHERS: Array<{ slug: string; label: string; pattern: RegExp }> = [
  { slug: '350-gt', label: '350 GT', pattern: /\b350\s*GT\b/i },
  { slug: '400-gt', label: '400 GT', pattern: /\b400\s*GT\b/i },
  { slug: 'miura', label: 'Miura', pattern: /\bMiura\b/i },
  { slug: 'espada', label: 'Espada', pattern: /\bEspada\b/i },
  { slug: 'jarama', label: 'Jarama', pattern: /\bJarama\b/i },
  { slug: 'urraco', label: 'Urraco', pattern: /\bUrraco\b/i },
  { slug: 'countach', label: 'Countach', pattern: /\bCountach\b/i },
  { slug: 'jalpa', label: 'Jalpa', pattern: /\bJalpa\b/i },
  { slug: 'lm002', label: 'LM002', pattern: /\bLM\s*002\b/i },
  { slug: 'diablo', label: 'Diablo', pattern: /\bDiablo\b|\bSE\s*VT\b|\bSVR\b/i },
  { slug: 'murcielago', label: 'Murciélago', pattern: /\bMurci[eé]lago\b/i },
  { slug: 'gallardo', label: 'Gallardo', pattern: /\bGallardo\b|\bLP\s*560\b/i },
  { slug: 'aventador', label: 'Aventador', pattern: /\bAventador\b/i },
  { slug: 'centenario', label: 'Centenario', pattern: /\bCentenario\b/i },
  { slug: 'huracan', label: 'Huracán', pattern: /\bHurac[aá]n\b/i },
  { slug: 'urus', label: 'Urus', pattern: /\bUrus\b/i },
];

function normalizeOem(rawSku: string, rawName: string): string {
  let sku = (rawSku || '').trim();
  if (!sku && /Pipe\s+Green\s+LM002/i.test(rawName)) {
    sku = '001725991';
  }
  if (!sku && rawName.includes(' - ')) {
    sku = rawName.split(' - ')[0].trim();
  }
  return sku.replace(/\s+/g, '').toUpperCase();
}

function cleanPartTitle(rawName: string, oemNumber: string): string {
  let title = rawName.trim();
  // Strip leading SKU prefix if present
  const dashIdx = title.indexOf(' - ');
  if (dashIdx !== -1) {
    const prefix = title.slice(0, dashIdx).replace(/\s+/g, '').toUpperCase();
    if (prefix === oemNumber || prefix.length >= 4) {
      title = title.slice(dashIdx + 3).trim();
    }
  }
  for (const [regex, replacement] of TYPO_REPLACEMENTS) {
    title = title.replace(regex, replacement);
  }
  title = title.replace(/\s{2,}/g, ' ').trim();
  return title;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[éèê]/g, 'e')
    .replace(/[áàâ]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function classifyCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\b(ecu|gfa|switch|interruttore|wiring|wire|connectivity|odometer|attuatore|light|rückleuchte|foglight)\b/.test(t)) {
    return 'Elektronik & Beleuchtung';
  }
  if (/\b(carbon|trim|interior|badge|seat|belt|door handle|window|hood damper|gas spring)\b/.test(t)) {
    return 'Karosserie, Interieur & Carbon';
  }
  if (/\b(brake|handbrake|hb lever|shock|torsion|steering|tie-rod|bump|reifen)\b/.test(t)) {
    return 'Fahrwerk, Lenkung & Bremse';
  }
  if (/\b(gearbox|egear|reverse gear|propeller|cujoint|bearing|coupling)\b/.test(t)) {
    return 'Getriebe & Antriebsstrang';
  }
  if (/\b(pump|coolant|water|thermostat|radiator|coolout|exhaust|carb|fuel|spark|filter)\b/.test(t)) {
    return 'Motor, Kühlung & Kraftstoff';
  }
  return 'Dichtungen, Buchsen & Befestigung';
}

function buildDescription(
  oemNumber: string,
  title: string,
  models: Array<{ slug: string; label: string }>,
  condition: 'new_nos' | 'used_tested'
): string {
  const modelText =
    models.length > 0
      ? `Passend für Automobili Lamborghini ${models.map((m) => m.label).join(', ')}.`
      : 'Originales Automobili Lamborghini Werksersatzteil (Ricambi Originali) aus unserem Bonner Fachlager.';
  const condText =
    condition === 'used_tested'
      ? 'Geprüftes Original-Gebrauchtteil aus unserer Bonner Lamborghini-Fachwerkstatt.'
      : 'Unbenutzter Originalbestand (New Old Stock / Ricambi Originali) ab Lager Bonn.';

  return `${title} (OEM-Teilenummer ${oemNumber}). ${modelText} ${condText} Weltweiter versicherter Paketversand inklusive Sendungsverfolgung.`;
}

const FEATURED_OEMS = new Set([
  '413863365A',
  '086927755E',
  '400945095P',
  '410035422N',
  '006037759',
  '410864123A',
  '001726334',
  '002410655',
]);

const rawPath = resolve(import.meta.dirname, './data/wix-raw-catalog.json');
const rawItems: RawWixItem[] = JSON.parse(readFileSync(rawPath, 'utf8'));

const grouped = new Map<string, RawWixItem[]>();
for (const item of rawItems) {
  const oem = normalizeOem(item.sku, item.name);
  const bucket = grouped.get(oem) ?? [];
  bucket.push(item);
  grouped.set(oem, bucket);
}

const cleanedProducts: CleanedProduct[] = [];
const redirects: Array<{ oldWixSlug: string; targetProductSlug: string }> = [];
const usedSlugs = new Set<string>();

for (const [oemNumber, group] of grouped.entries()) {
  // Prefer item with inventoryQuantity > 0 and decimal/positive factory price
  const positivePrices = group.map((g) => g.price).filter((p) => p > 0);
  // If an ERP decimal price exists, pick the entry with inventoryQuantity > 0 & price > 0 first, else max positive price
  const withStockAndPrice = group.find((g) => g.inventoryQuantity > 0 && g.price > 0);
  const chosenPrice = withStockAndPrice
    ? withStockAndPrice.price
    : positivePrices.length > 0
      ? Math.max(...positivePrices)
      : 0;

  const maxExplicitQty = Math.max(...group.map((g) => g.inventoryQuantity || 0));
  const anyInStock = group.some((g) => g.isInStock);

  // Determine real stock quantity safely:
  // If price === 0 (unpriced Wix import row) or explicitly out of stock -> 0 (Verfügbarkeit & Preis anfragen)
  let stockQuantity = 0;
  if (chosenPrice > 0 && anyInStock) {
    stockQuantity = maxExplicitQty > 0 ? maxExplicitQty : 1;
  }

  const primaryEntry =
    withStockAndPrice ??
    group.find((g) => g.inventoryQuantity > 0) ??
    group[0];

  const combinedNames = group.map((g) => g.name).join(' ');
  const condition: 'new_nos' | 'used_tested' = /\(USED\)/i.test(combinedNames)
    ? 'used_tested'
    : 'new_nos';

  const cleanTitle = cleanPartTitle(primaryEntry.name, oemNumber).replace(/\s*\(USED\)\s*/gi, '').trim();
  const models = MODEL_MATCHERS.filter((m) => m.pattern.test(combinedNames) || m.pattern.test(cleanTitle)).map(
    ({ slug, label }) => ({ slug, label })
  );

  let baseSlug = slugify(`${oemNumber}-${cleanTitle}`);
  if (usedSlugs.has(baseSlug)) {
    baseSlug = `${baseSlug}-2`;
  }
  usedSlugs.add(baseSlug);

  const oemNormalized = oemNumber.replace(/[^A-Z0-9]/g, '');
  const localImgRel = `/media/parts/${oemNumber.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.avif`;
  const localImgDisk = resolve(import.meta.dirname, `../public${localImgRel}`);
  const finalImageUrl = existsSync(localImgDisk)
    ? localImgRel
    : '/media/parts/ricambi-blueprint.svg';

  const product: CleanedProduct = {
    slug: baseSlug,
    oemNumber,
    oemNormalized,
    title: cleanTitle,
    category: classifyCategory(cleanTitle),
    condition,
    description: buildDescription(oemNumber, cleanTitle, models, condition),
    priceCents: Math.round(chosenPrice * 100),
    vatRatePercent: 19,
    stockQuantity,
    imageUrl: finalImageUrl,
    imageAlt: `${oemNumber} — ${cleanTitle} (Lamborghini Originalersatzteil)`,
    featured: FEATURED_OEMS.has(oemNumber),
    models,
  };

  cleanedProducts.push(product);

  for (const g of group) {
    redirects.push({
      oldWixSlug: g.wix_slug,
      targetProductSlug: baseSlug,
    });
  }
}

cleanedProducts.sort((a, b) => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if ((a.stockQuantity > 0) !== (b.stockQuantity > 0)) {
    return a.stockQuantity > 0 ? -1 : 1;
  }
  return b.priceCents - a.priceCents;
});

mkdirSync(resolve(import.meta.dirname, '../src/data'), { recursive: true });
const outJson = resolve(import.meta.dirname, '../src/data/products-seed.json');
writeFileSync(
  outJson,
  JSON.stringify({ products: cleanedProducts, redirects }, null, 2),
  'utf8'
);

console.log(
  `Cleaned ${rawItems.length} raw Wix items -> ${cleanedProducts.length} unique OEM parts and ${redirects.length} legacy redirects.`
);
