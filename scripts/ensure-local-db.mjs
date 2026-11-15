import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const d1Dir = join(
  process.cwd(),
  '.wrangler',
  'state',
  'v3',
  'd1',
  'miniflare-D1DatabaseObject'
);

function hasPopulatedLocalSqlite() {
  if (!existsSync(d1Dir)) return false;
  const entries = readdirSync(d1Dir).filter(
    (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite'
  );
  return entries.some((name) => {
    try {
      return statSync(join(d1Dir, name)).size >= 150_000;
    } catch {
      return false;
    }
  });
}

if (!hasPopulatedLocalSqlite()) {
  console.log('[auto-kremer] Initialisiere lokale Cloudflare D1-Datenbank (Migrationen & Seed)...');
  execSync('npx wrangler d1 migrations apply DB --local', {
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  });

  const countRaw = execSync(
    'npx wrangler d1 execute DB --local --json --command "SELECT COUNT(*) AS cnt FROM vehicles"',
    {
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
    }
  );

  let vehicleCount = 0;
  try {
    const parsed = JSON.parse(countRaw);
    vehicleCount = Number(parsed?.[0]?.results?.[0]?.cnt ?? 0);
  } catch {
    vehicleCount = 0;
  }

  if (vehicleCount === 0) {
    execSync('npx wrangler d1 execute DB --local --file=./drizzle/seed.sql', {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    });
  }
}
