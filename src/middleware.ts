import { defineMiddleware } from 'astro:middleware';
import { resolveLegacyProductSlug } from '@/db/queries/products';
import { verifyAdminRequest } from '@/lib/admin-auth';

const STATIC_301_MAP: Record<string, string> = {
  '/verkaufsraum': '/fahrzeuge',
  '/sold-cars': '/referenzen',
  '/consign-your-car': '/fahrzeug-verkaufen',
  '/about-us': '/ueber-uns',
  '/news': '/ueber-uns#chronik',
  '/service': '/werkstatt',
  '/contact-us': '/kontakt',
  '/category/all-products': '/shop',
  '/wartungsarbeiten': '/',
  '/datenschutzerklärung': '/datenschutz',
  '/datenschutzerklaerung': '/datenschutz',
};

const GONE_410_PATHS = new Set([
  '/blog',
  '/event-list',
  '/payment-request-page',
]);

function normalizePathname(rawPathname: string): string {
  let decoded = rawPathname;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    decoded = rawPathname;
  }
  if (decoded.length > 1 && decoded.endsWith('/')) {
    return decoded.replace(/\/+$/, '');
  }
  return decoded;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const normalizedLower = normalizePathname(pathname).toLowerCase();

  // 1. Static Wix Legacy 301 Redirects (including percent-encoded German umlauts)
  const staticTarget = STATIC_301_MAP[normalizedLower];
  if (staticTarget) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: staticTarget,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // 2. Dynamic Wix /product-page/:oldSlug -> 301 /shop/:cleanSlug (deduplicated & OEM-enriched)
  if (normalizedLower.startsWith('/product-page/')) {
    const rawOldSlug = pathname.replace(/^\/product-page\//i, '').replace(/\/+$/, '');
    const targetSlug = rawOldSlug
      ? await resolveLegacyProductSlug(rawOldSlug)
      : null;
    const destination = targetSlug ? `/shop/${targetSlug}` : '/shop';

    return new Response(null, {
      status: 301,
      headers: {
        Location: destination,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // 3. Explicit 410 Gone for empty leftover Wix boilerplate pages
  if (GONE_410_PATHS.has(normalizedLower) || normalizedLower.startsWith('/blog/')) {
    return new Response(
      `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>410 — Seite dauerhaft entfernt | Auto Kremer Bonn</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0B;color:#F5F4F0;font-family:system-ui,sans-serif;padding:24px}.box{max-width:460px;border:1px solid #262930;background:#121316;border-radius:12px;padding:32px}h1{margin:8px 0 12px;font-size:22px}p{color:#A3A8B4;line-height:1.6;font-size:14px}.tag{color:#C9A84C;font-family:monospace;font-size:12px;text-transform:uppercase;letter-spacing:.12em}a{display:inline-block;margin-top:16px;color:#C9A84C;text-decoration:none;font-size:14px}</style></head><body><main class="box"><div class="tag">HTTP 410 · Dauerhaft entfernt</div><h1>Diese ältere Unterseite existiert nicht mehr.</h1><p>Im Rahmen unseres Webseiten-Neubaus wurden leere Baukasten-Seiten bereinigt. Entdecken Sie unseren aktuellen Fahrzeugbestand und den Ricambi Originali Teile-Shop.</p><a href="/">→ Zur Startseite von Auto Kremer Bonn</a></main></body></html>`,
      {
        status: 410,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex',
        },
      }
    );
  }

  // 4. Protect /admin and /api/admin/* strictly behind Cloudflare Zero Trust Access (or explicit local dev token)
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin/')
  ) {
    const auth = await verifyAdminRequest(context.request);
    if (!auth.authenticated) {
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }

      return new Response(
        `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>401 — Nicht autorisiert | Auto Kremer Admin</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0B;color:#F5F4F0;font-family:system-ui,sans-serif;padding:24px}.box{max-width:460px;border:1px solid #262930;background:#121316;border-radius:12px;padding:32px}h1{margin:8px 0 12px;font-size:22px}p{color:#A3A8B4;line-height:1.6;font-size:14px}.tag{color:#C9A84C;font-family:monospace;font-size:12px;text-transform:uppercase;letter-spacing:.12em}a{display:inline-block;margin-top:16px;color:#C9A84C;text-decoration:none;font-size:14px}</style></head><body><main class="box"><div class="tag">Cloudflare Zero Trust Access · HTTP ${auth.status}</div><h1>Zugriff geschützt</h1><p>${auth.error ?? 'Für den Zugriff auf das Auto Kremer Backoffice ist eine gültige Authentifizierung erforderlich.'}</p><a href="/">← Zurück zur Webseite</a></main></body></html>`,
        {
          status: auth.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      );
    }

    context.locals.adminUser = {
      email: auth.email ?? 'admin@auto-kremer.com',
      mode: auth.mode ?? 'cloudflare-access',
    };
  }

  const response = await next();
  const mutableHeaders = new Headers(response.headers);
  mutableHeaders.set('X-Content-Type-Options', 'nosniff');
  mutableHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  mutableHeaders.set('X-Frame-Options', 'DENY');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: mutableHeaders,
  });
});
