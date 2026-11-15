export interface RuntimeEnvVars {
  PUBLIC_SITE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_TO?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  DEV_ADMIN_TOKEN?: string;
  MEDIA_BUCKET?: R2Bucket;
  DB?: D1Database;
}

let injectedTestEnv: RuntimeEnvVars | null = null;

export function setTestRuntimeEnv(envObj: RuntimeEnvVars | null): void {
  injectedTestEnv = envObj;
}

export async function getRuntimeEnv(): Promise<RuntimeEnvVars> {
  if (injectedTestEnv) {
    return injectedTestEnv;
  }
  try {
    const { env } = await import('cloudflare:workers');
    return env as unknown as RuntimeEnvVars;
  } catch {
    return process.env as unknown as RuntimeEnvVars;
  }
}
