import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db/client';
import {
  legacyProductRedirects,
  productModels,
  products,
  type ProductRow,
} from '@/db/schema';

export interface ProductModelTag {
  slug: string;
  label: string;
}

export interface ProductWithModels extends ProductRow {
  availableStock: number;
  models: ProductModelTag[];
}

export interface ProductSearchOptions {
  query?: string;
  modelSlug?: string;
  category?: string;
  inStockOnly?: boolean;
  limit?: number;
}

export interface ModelFacet {
  slug: string;
  label: string;
  count: number;
}

export interface CategoryFacet {
  category: string;
  count: number;
}

async function attachModels(
  db: AppDb,
  rows: ProductRow[]
): Promise<ProductWithModels[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const modelRows = await db
    .select()
    .from(productModels)
    .where(inArray(productModels.productId, ids))
    .orderBy(asc(productModels.modelLabel));

  const byProduct = new Map<number, ProductModelTag[]>();
  for (const m of modelRows) {
    const list = byProduct.get(m.productId) ?? [];
    list.push({ slug: m.modelSlug, label: m.modelLabel });
    byProduct.set(m.productId, list);
  }

  return rows.map((row) => ({
    ...row,
    availableStock: Math.max(0, row.stockQuantity - row.reservedQuantity),
    models: byProduct.get(row.id) ?? [],
  }));
}

export async function searchProducts(
  options: ProductSearchOptions = {},
  dbOverride?: AppDb
): Promise<ProductWithModels[]> {
  const db = dbOverride ?? (await getDb());
  const conditions = [eq(products.active, true)];

  if (options.category && options.category !== 'all') {
    conditions.push(eq(products.category, options.category));
  }

  if (options.inStockOnly) {
    conditions.push(sql`(${products.stockQuantity} - ${products.reservedQuantity}) > 0`);
  }

  if (options.modelSlug && options.modelSlug !== 'all') {
    const matchingModelRows = await db
      .select({ productId: productModels.productId })
      .from(productModels)
      .where(eq(productModels.modelSlug, options.modelSlug));

    if (matchingModelRows.length === 0) return [];
    conditions.push(
      inArray(
        products.id,
        matchingModelRows.map((r) => r.productId)
      )
    );
  }

  const rawQuery = options.query?.trim();
  if (rawQuery) {
    const cleanQ = rawQuery.replace(/[%_]/g, '');
    const normOem = cleanQ.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const modelMatches = await db
      .select({ productId: productModels.productId })
      .from(productModels)
      .where(like(productModels.modelLabel, `%${cleanQ}%`));

    const searchClauses = [
      like(products.oemNumber, `%${cleanQ}%`),
      like(products.title, `%${cleanQ}%`),
      like(products.category, `%${cleanQ}%`),
    ];

    if (normOem.length >= 2) {
      searchClauses.push(like(products.oemNormalized, `%${normOem}%`));
    }
    if (modelMatches.length > 0) {
      searchClauses.push(
        inArray(
          products.id,
          modelMatches.map((m) => m.productId)
        )
      );
    }

    conditions.push(or(...searchClauses)!);
  }

  const baseQuery = db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(
      desc(products.featured),
      desc(sql`(${products.stockQuantity} - ${products.reservedQuantity}) > 0`),
      desc(products.priceCents),
      asc(products.id)
    );

  const rows = options.limit ? await baseQuery.limit(options.limit) : await baseQuery;
  return attachModels(db, rows);
}

export async function getProductBySlug(
  slug: string,
  dbOverride?: AppDb
): Promise<ProductWithModels | null> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.active, true)))
    .limit(1);

  if (rows.length === 0) return null;
  const enriched = await attachModels(db, rows);
  return enriched[0] ?? null;
}

export async function listFeaturedProducts(
  limit = 4,
  dbOverride?: AppDb
): Promise<ProductWithModels[]> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.active, true),
        eq(products.featured, true),
        sql`(${products.stockQuantity} - ${products.reservedQuantity}) > 0`
      )
    )
    .orderBy(desc(products.priceCents), asc(products.id))
    .limit(limit);

  return attachModels(db, rows);
}

export async function listProductModelFacets(
  dbOverride?: AppDb
): Promise<ModelFacet[]> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select({
      slug: productModels.modelSlug,
      label: productModels.modelLabel,
      count: sql<number>`count(distinct ${productModels.productId})`,
    })
    .from(productModels)
    .groupBy(productModels.modelSlug, productModels.modelLabel)
    .orderBy(desc(sql`count(distinct ${productModels.productId})`), asc(productModels.modelLabel));

  return rows.map((r) => ({
    slug: r.slug,
    label: r.label,
    count: Number(r.count),
  }));
}

export async function listProductCategoryFacets(
  dbOverride?: AppDb
): Promise<CategoryFacet[]> {
  const db = dbOverride ?? (await getDb());
  const rows = await db
    .select({
      category: products.category,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .where(eq(products.active, true))
    .groupBy(products.category)
    .orderBy(desc(sql`count(*)`), asc(products.category));

  return rows.map((r) => ({
    category: r.category,
    count: Number(r.count),
  }));
}

export async function resolveLegacyProductSlug(
  oldWixSlug: string,
  dbOverride?: AppDb
): Promise<string | null> {
  const db = dbOverride ?? (await getDb());
  const decoded = decodeURIComponent(oldWixSlug).trim();
  const candidates = Array.from(new Set([oldWixSlug.trim(), decoded, decoded.toLowerCase()]));

  const rows = await db
    .select()
    .from(legacyProductRedirects)
    .where(inArray(legacyProductRedirects.oldWixSlug, candidates))
    .limit(1);

  return rows[0]?.targetProductSlug ?? null;
}

export async function updateProductInventory(
  productId: number,
  updates: { priceCents?: number; stockQuantity?: number },
  dbOverride?: AppDb
): Promise<boolean> {
  const db = dbOverride ?? (await getDb());
  const setPayload: Partial<typeof products.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (updates.priceCents !== undefined) {
    setPayload.priceCents = updates.priceCents;
  }
  if (updates.stockQuantity !== undefined) {
    setPayload.stockQuantity = updates.stockQuantity;
  }

  const updated = await db
    .update(products)
    .set(setPayload)
    .where(eq(products.id, productId))
    .returning({ id: products.id });

  return updated.length > 0;
}
