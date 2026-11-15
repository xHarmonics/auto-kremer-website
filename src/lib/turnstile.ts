import { getRuntimeEnv } from '@/lib/runtime-env';

const DUMMY_PASS_SECRET_PREFIX = '1x00000000';
const DUMMY_FAIL_SECRET_PREFIX = '2x00000000';

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = (token ?? '').trim();
  if (!cleanToken || cleanToken === 'INVALID_TURNSTILE_TOKEN') {
    return {
      ok: false,
      error: 'Bitte bestätigen Sie die Sicherheitsprüfung (Turnstile).',
    };
  }

  const env = await getRuntimeEnv();
  const secret = (
    env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'
  ).trim();

  if (secret.startsWith(DUMMY_FAIL_SECRET_PREFIX)) {
    return {
      ok: false,
      error: 'Sicherheitsprüfung (Turnstile) wurde abgelehnt.',
    };
  }

  // Official Cloudflare dummy pass key for local dev & automated CI/E2E suites
  if (secret.startsWith(DUMMY_PASS_SECRET_PREFIX)) {
    return { ok: true };
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', cleanToken);
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }
    );
    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return {
        ok: false,
        error: 'Turnstile-Sicherheitsprüfung fehlgeschlagen. Bitte laden Sie die Seite neu.',
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Sicherheitsprüfung momentan nicht erreichbar.',
    };
  }
}
