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

declare const __ASTRO_DEV_ADMIN_TOKEN__: string | undefined;

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
    const workerEnv = env as unknown as RuntimeEnvVars;
    if (
      import.meta.env.DEV &&
      !workerEnv.DEV_ADMIN_TOKEN &&
      typeof __ASTRO_DEV_ADMIN_TOKEN__ === 'string' &&
      __ASTRO_DEV_ADMIN_TOKEN__.length > 0
    ) {
      return { ...workerEnv, DEV_ADMIN_TOKEN: __ASTRO_DEV_ADMIN_TOKEN__ };
    }
    return workerEnv;
  } catch {
    return process.env as unknown as RuntimeEnvVars;
  }
}
