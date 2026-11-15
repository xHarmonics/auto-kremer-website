import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type AppDb = DrizzleD1Database<typeof schema>;

let injectedTestD1: D1Database | null = null;

export function setTestD1(d1: D1Database | null): void {
  injectedTestD1 = d1;
}

export async function getD1(): Promise<D1Database> {
  if (injectedTestD1) {
    return injectedTestD1;
  }
  const { env } = await import('cloudflare:workers');
  return env.DB;
}

export async function getDb(d1Override?: D1Database): Promise<AppDb> {
  const d1 = d1Override ?? (await getD1());
  return drizzle(d1, { schema });
}
