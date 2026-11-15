import type { APIRoute } from 'astro';
import { searchProducts } from '@/db/queries/products';
import { listAllVehicles } from '@/db/queries/vehicles';
import { SITE_CONFIG } from '@/lib/site-config';

const CORE_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/fahrzeuge', changefreq: 'daily', priority: '0.95' },
  { path: '/referenzen', changefreq: 'weekly', priority: '0.85' },
  { path: '/werkstatt', changefreq: 'monthly', priority: '0.85' },
  { path: '/shop', changefreq: 'daily', priority: '0.90' },
  { path: '/fahrzeug-verkaufen', changefreq: 'monthly', priority: '0.85' },
  { path: '/ueber-uns', changefreq: 'monthly', priority: '0.80' },
  { path: '/kontakt', changefreq: 'monthly', priority: '0.80' },
  { path: '/versand', changefreq: 'monthly', priority: '0.50' },
  { path: '/impressum', changefreq: 'yearly', priority: '0.30' },
  { path: '/datenschutz', changefreq: 'yearly', priority: '0.30' },
  { path: '/agb', changefreq: 'yearly', priority: '0.30' },
  { path: '/widerruf', changefreq: 'yearly', priority: '0.30' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toW3cDate(iso: string | null | undefined): string {
  if (!iso) return '2026-11-15';
  return iso.slice(0, 10);
}

export const GET: APIRoute = async () => {
  const origin = SITE_CONFIG.url.replace(/\/+$/, '');
  const [allVehicles, allProducts] = await Promise.all([
    listAllVehicles(),
    searchProducts({}),
  ]);

  const urlNodes: string[] = [];

  for (const r of CORE_ROUTES) {
    urlNodes.push(
      `  <url>\n    <loc>${escapeXml(`${origin}${r.path}`)}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    );
  }

  for (const v of allVehicles) {
    urlNodes.push(
      `  <url>\n    <loc>${escapeXml(`${origin}/fahrzeuge/${v.slug}`)}</loc>\n    <lastmod>${escapeXml(toW3cDate(v.updatedAt))}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${v.status === 'sold' ? '0.70' : '0.90'}</priority>\n  </url>`
    );
  }

  for (const p of allProducts) {
    urlNodes.push(
      `  <url>\n    <loc>${escapeXml(`${origin}/shop/${p.slug}`)}</loc>\n    <lastmod>${escapeXml(toW3cDate(p.updatedAt))}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.75</priority>\n  </url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes.join('\n')}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
};
