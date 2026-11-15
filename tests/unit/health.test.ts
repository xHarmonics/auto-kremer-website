import { describe, expect, it } from 'vitest';
import { buildHealthPayload } from '@/pages/api/health';

describe('health endpoint payload', () => {
  it('returns healthy cloudflare-workers status in sandbox-only stripe mode', () => {
    const payload = buildHealthPayload();
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe('auto-kremer-website');
    expect(payload.runtime).toBe('cloudflare-workers');
    expect(payload.stripeMode).toBe('sandbox-only');
  });
});
