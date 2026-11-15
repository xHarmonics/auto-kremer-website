import { defineMiddleware } from 'astro:middleware';
import { verifyAdminRequest } from '@/lib/admin-auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Protect /admin and /api/admin/* strictly behind Cloudflare Zero Trust Access (or explicit local dev token)
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
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
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
});
