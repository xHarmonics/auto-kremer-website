import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDb, setTestD1 } from '@/db/client';
import { getProductBySlug, searchProducts } from '@/db/queries/products';
import { listShowroomVehicles, listSoldVehicles } from '@/db/queries/vehicles';
import {
  setJwksFetcherForTest,
  verifyAdminRequest,
} from '@/lib/admin-auth';
import { setTestRuntimeEnv } from '@/lib/runtime-env';
import { POST as adminInventoryPost } from '@/pages/api/admin/inventory';
import { createTestD1 } from '../helpers/test-d1';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function jsonToBase64Url(obj: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

async function signRs256Jwt(
  privateKey: CryptoKey,
  kid: string,
  payload: Record<string, unknown>
): Promise<string> {
  const headerB64 = jsonToBase64Url({ alg: 'RS256', typ: 'JWT', kid });
  const payloadB64 = jsonToBase64Url(payload);
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    signingInput
  );
  return `${headerB64}.${payloadB64}.${bytesToBase64Url(new Uint8Array(sigBuf))}`;
}

describe('Cloudflare Zero Trust Access Admin Auth & Inventory Backoffice', () => {
  let testD1: D1Database;

  beforeEach(() => {
    testD1 = createTestD1();
    setTestD1(testD1);
  });

  afterEach(() => {
    setTestD1(null);
    setTestRuntimeEnv(null);
    setJwksFetcherForTest(null);
  });

  it('verifies real RS256 Cloudflare Access JWTs and rejects missing, expired, or wrong-AUD tokens', async () => {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );

    const exportedJwk = (await crypto.subtle.exportKey('jwk', publicKey)) as JsonWebKey & {
      kid?: string;
    };
    exportedJwk.kid = 'cf-access-key-1';

    setJwksFetcherForTest(async () => ({ keys: [exportedJwk] }));
    setTestRuntimeEnv({
      CF_ACCESS_TEAM_DOMAIN: 'autokremer',
      CF_ACCESS_AUD: 'aud-tag-bonn-1967',
    });

    // 1. Missing JWT -> 401
    const noHeaderRes = await verifyAdminRequest(
      new Request('https://www.auto-kremer.com/admin')
    );
    expect(noHeaderRes.authenticated).toBe(false);
    expect(noHeaderRes.status).toBe(401);

    // 2. Wrong audience -> 403
    const nowSec = Math.floor(Date.now() / 1000);
    const wrongAudJwt = await signRs256Jwt(privateKey, 'cf-access-key-1', {
      iss: 'https://autokremer.cloudflareaccess.com',
      aud: ['wrong-aud'],
      email: 'jason@auto-kremer.com',
      exp: nowSec + 3600,
    });
    const wrongAudRes = await verifyAdminRequest(
      new Request('https://www.auto-kremer.com/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': wrongAudJwt },
      })
    );
    expect(wrongAudRes.authenticated).toBe(false);
    expect(wrongAudRes.status).toBe(403);

    // 3. Valid RS256 signed JWT -> 200 authenticated
    const validJwt = await signRs256Jwt(privateKey, 'cf-access-key-1', {
      iss: 'https://autokremer.cloudflareaccess.com',
      aud: ['aud-tag-bonn-1967'],
      email: 'jason@auto-kremer.com',
      exp: nowSec + 3600,
    });
    const validRes = await verifyAdminRequest(
      new Request('https://www.auto-kremer.com/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': validJwt },
      })
    );
    expect(validRes.authenticated).toBe(true);
    expect(validRes.email).toBe('jason@auto-kremer.com');
    expect(validRes.mode).toBe('cloudflare-access');
  });

  it('toggles vehicle from available to sold (moving it to /referenzen) and updates OEM part stock/price', async () => {
    setTestRuntimeEnv({
      DEV_ADMIN_TOKEN: 'unit-test-admin-secret',
    });

    const db = await getDb(testD1);
    const beforeShowroom = await listShowroomVehicles({}, db);
    expect(beforeShowroom).toHaveLength(5);

    const targetVehicle = beforeShowroom[0]!;

    // 1-click mark as sold
    const toggleRes = await adminInventoryPost({
      request: new Request('http://localhost:4321/api/admin/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer unit-test-admin-secret',
        },
        body: JSON.stringify({
          action: 'toggle_vehicle_status',
          vehicleId: targetVehicle.id,
          status: 'sold',
        }),
      }),
    } as never);

    expect(toggleRes.status).toBe(200);
    const afterShowroom = await listShowroomVehicles({}, db);
    const afterSold = await listSoldVehicles(db);
    expect(afterShowroom).toHaveLength(4);
    expect(afterSold.some((v) => v.id === targetVehicle.id)).toBe(true);

    // Update OEM part stock & price
    const [partBefore] = await searchProducts({ query: '086927755E' }, db);
    expect(partBefore).toBeDefined();

    const prodRes = await adminInventoryPost({
      request: new Request('http://localhost:4321/api/admin/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer unit-test-admin-secret',
        },
        body: JSON.stringify({
          action: 'update_product',
          productId: partBefore!.id,
          priceEur: 2890,
          stockQuantity: 3,
        }),
      }),
    } as never);

    expect(prodRes.status).toBe(200);
    const partAfter = await getProductBySlug(partBefore!.slug, db);
    expect(partAfter!.priceCents).toBe(289000);
    expect(partAfter!.stockQuantity).toBe(3);
  });
});
