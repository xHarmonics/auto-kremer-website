import type { APIRoute } from 'astro';

export function buildHealthPayload() {
  return {
    ok: true,
    service: 'auto-kremer-website',
    runtime: 'cloudflare-workers',
    stripeMode: 'sandbox-only',
    timestamp: new Date().toISOString(),
  };
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(buildHealthPayload()), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
