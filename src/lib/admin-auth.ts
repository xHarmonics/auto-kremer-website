import { getRuntimeEnv } from '@/lib/runtime-env';

export interface JwksResponse {
  keys: JsonWebKey[];
}

export interface AdminAuthResult {
  authenticated: boolean;
  status: 200 | 401 | 403;
  email?: string;
  mode?: 'cloudflare-access' | 'dev-token';
  error?: string;
}

type JwksFetcher = (certsUrl: string) => Promise<JwksResponse>;

let customJwksFetcherForTest: JwksFetcher | null = null;

export function setJwksFetcherForTest(fetcher: JwksFetcher | null): void {
  customJwksFetcherForTest = fetcher;
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeJson<T>(input: string): T | null {
  try {
    const bytes = base64UrlToBytes(input);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length || aBytes.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i]! ^ bBytes[i]!;
  }
  return diff === 0;
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name && rest.length > 0) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function normalizeTeamIssuer(rawDomain: string): string {
  const trimmed = rawDomain.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('.cloudflareaccess.com')) return `https://${trimmed}`;
  return `https://${trimmed}.cloudflareaccess.com`;
}

export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  const env = await getRuntimeEnv();
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim() ?? '';
  const expectedAud = env.CF_ACCESS_AUD?.trim() ?? '';

  // 1. Production Mode: Cryptographic Cloudflare Zero Trust Access RS256 JWT verification
  if (teamDomain && expectedAud) {
    const jwt =
      request.headers.get('Cf-Access-Jwt-Assertion')?.trim() ||
      parseCookieValue(request.headers.get('Cookie'), 'CF_Authorization');

    if (!jwt) {
      return {
        authenticated: false,
        status: 401,
        error: 'Zugriff verweigert: Cloudflare Access Token fehlt.',
      };
    }

    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return {
        authenticated: false,
        status: 401,
        error: 'Ungültiges Cloudflare Access JWT-Format.',
      };
    }

    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];
    const header = base64UrlDecodeJson<{ alg?: string; kid?: string }>(headerB64);
    const payload = base64UrlDecodeJson<{
      aud?: string | string[];
      iss?: string;
      exp?: number;
      nbf?: number;
      email?: string;
    }>(payloadB64);

    if (!header || !payload || header.alg !== 'RS256' || !header.kid) {
      return {
        authenticated: false,
        status: 401,
        error: 'Ungültiger JWT-Header (RS256 & kid erforderlich).',
      };
    }

    const expectedIssuer = normalizeTeamIssuer(teamDomain);
    if (payload.iss !== expectedIssuer) {
      return {
        authenticated: false,
        status: 403,
        error: 'Ungültiger JWT-Aussteller (iss).',
      };
    }

    const audList = Array.isArray(payload.aud)
      ? payload.aud
      : payload.aud
        ? [payload.aud]
        : [];
    if (!audList.includes(expectedAud)) {
      return {
        authenticated: false,
        status: 403,
        error: 'Ungültige Cloudflare Access Application Audience (aud).',
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
      return {
        authenticated: false,
        status: 401,
        error: 'Cloudflare Access Sitzung ist abgelaufen.',
      };
    }
    if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 30) {
      return {
        authenticated: false,
        status: 401,
        error: 'Cloudflare Access Token ist noch nicht gültig.',
      };
    }

    const certsUrl = `${expectedIssuer}/cdn-cgi/access/certs`;
    let jwks: JwksResponse;
    try {
      if (customJwksFetcherForTest) {
        jwks = await customJwksFetcherForTest(certsUrl);
      } else {
        const res = await fetch(certsUrl);
        if (!res.ok) {
          return {
            authenticated: false,
            status: 401,
            error: 'Cloudflare Access Zertifikate konnten nicht geladen werden.',
          };
        }
        jwks = (await res.json()) as JwksResponse;
      }
    } catch {
      return {
        authenticated: false,
        status: 401,
        error: 'Fehler beim Abruf der Cloudflare Access JWKS.',
      };
    }

    const matchingJwk = (jwks.keys ?? []).find(
      (k) => (k as JsonWebKey & { kid?: string }).kid === header.kid
    );
    if (!matchingJwk) {
      return {
        authenticated: false,
        status: 401,
        error: 'Kein passender öffentlicher Schlüssel (kid) gefunden.',
      };
    }

    try {
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        matchingJwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const signedContent = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
      const sigBytes = base64UrlToBytes(sigB64);
      const sigBuffer = new Uint8Array(sigBytes).buffer;

      const valid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        publicKey,
        sigBuffer,
        signedContent
      );

      if (!valid) {
        return {
          authenticated: false,
          status: 403,
          error: 'Kryptografische JWT-Signaturprüfung fehlgeschlagen.',
        };
      }

      return {
        authenticated: true,
        status: 200,
        email: payload.email ?? 'admin@auto-kremer.com',
        mode: 'cloudflare-access',
      };
    } catch {
      return {
        authenticated: false,
        status: 403,
        error: 'Fehler bei der RSA-Signaturprüfung.',
      };
    }
  }

  // 2. Local Dev / Preview Fallback: Fails closed unless DEV_ADMIN_TOKEN is explicitly configured and matched
  const devToken = env.DEV_ADMIN_TOKEN?.trim() ?? '';
  if (!devToken) {
    return {
      authenticated: false,
      status: 401,
      error:
        'Admin-Bereich gesperrt: Bitte konfigurieren Sie Cloudflare Zero Trust Access (CF_ACCESS_TEAM_DOMAIN & CF_ACCESS_AUD).',
    };
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const headerToken = request.headers.get('x-admin-token')?.trim() ?? '';
  const cookieToken =
    parseCookieValue(request.headers.get('Cookie'), 'ak_admin_token') ?? '';

  const provided = bearerToken || headerToken || cookieToken;
  if (!provided || !timingSafeStringEqual(provided, devToken)) {
    return {
      authenticated: false,
      status: 401,
      error: 'Nicht autorisiert (gültiges Admin-Token erforderlich).',
    };
  }

  return {
    authenticated: true,
    status: 200,
    email: 'dev-admin@auto-kremer.com',
    mode: 'dev-token',
  };
}
