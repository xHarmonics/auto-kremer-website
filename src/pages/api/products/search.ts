import type { APIRoute } from 'astro';
import { searchProducts } from '@/db/queries/products';

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q') ?? undefined;
  const modelSlug = url.searchParams.get('modell') ?? undefined;
  const category = url.searchParams.get('kategorie') ?? undefined;
  const inStockOnly = url.searchParams.get('lager') === '1';

  const items = await searchProducts({
    query,
    modelSlug,
    category,
    inStockOnly,
  });

  return new Response(
    JSON.stringify({
      count: items.length,
      items,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
      },
    }
  );
};
