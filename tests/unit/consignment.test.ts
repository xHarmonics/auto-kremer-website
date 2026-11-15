import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, setTestD1 } from '@/db/client';
import { inquiries } from '@/db/schema';
import {
  clearDispatchedEmailsForTest,
  getDispatchedEmailsForTest,
} from '@/lib/email';
import {
  clearMemoryR2UploadsForTest,
  getMemoryR2UploadsForTest,
} from '@/lib/r2';
import { setTestRuntimeEnv } from '@/lib/runtime-env';
import { POST as consignPost } from '@/pages/api/inquiries/consign';
import { createTestD1 } from '../helpers/test-d1';

describe('Vehicle Consignment API (/api/inquiries/consign) + R2 Photo Validation', () => {
  let testD1: D1Database;

  beforeEach(() => {
    testD1 = createTestD1();
    setTestD1(testD1);
    clearDispatchedEmailsForTest();
    clearMemoryR2UploadsForTest();
    setTestRuntimeEnv({
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      MAIL_TO: 'info@auto-kremer.com',
    });
  });

  afterEach(() => {
    setTestD1(null);
    setTestRuntimeEnv(null);
  });

  function buildValidFormData(): FormData {
    const fd = new FormData();
    fd.set('intent', 'kommission');
    fd.set('brand', 'Lamborghini');
    fd.set('model', 'Diablo VT 6.0');
    fd.set('year', '2001');
    fd.set('mileageKm', '19400');
    fd.set('transmission', 'Handschaltung');
    fd.set('vin', 'ZA9DE07A01LA12345');
    fd.set('askingPriceEur', '385.000 €');
    fd.set(
      'conditionNotes',
      'Deutsche Erstauslieferung, Scheckheft lückenlos, Erstlack Giallo Orion.'
    );
    fd.set('senderName', 'Christian Graf');
    fd.set('senderEmail', 'c.graf@sammler.de');
    fd.set('senderPhone', '+49 171 5554433');
    fd.set('privacyAccepted', 'true');
    fd.set('cf-turnstile-response', 'valid-dummy-turnstile-token');
    return fd;
  }

  it('stores valid consignment inquiry in D1, uploads photos to R2 prefix, and sends notification email', async () => {
    const fd = buildValidFormData();
    fd.append(
      'photos',
      new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'diablo-front.jpg', {
        type: 'image/jpeg',
      })
    );
    fd.append(
      'photos',
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'diablo-cockpit.png', {
        type: 'image/png',
      })
    );

    const res = await consignPost({
      request: new Request('http://localhost:4321/api/inquiries/consign', {
        method: 'POST',
        body: fd,
      }),
    } as never);

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      inquiryNumber: string;
      uploadedPhotosCount: number;
    };
    expect(body.ok).toBe(true);
    expect(body.uploadedPhotosCount).toBe(2);

    const db = await getDb(testD1);
    const [saved] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.inquiryNumber, body.inquiryNumber));
    expect(saved).toBeDefined();
    expect(saved!.type).toBe('consignment');
    expect(JSON.parse(saved!.mediaKeysJson)).toHaveLength(2);

    const r2Objects = getMemoryR2UploadsForTest();
    expect(r2Objects.size).toBe(2);

    const emails = getDispatchedEmailsForTest();
    expect(emails).toHaveLength(1);
    expect(emails[0]?.to).toEqual(['info@auto-kremer.com']);
    expect(emails[0]?.subject).toContain('Diablo VT 6.0');
  });

  it('rejects disallowed MIME types (e.g. executable/SVG/PDF) and invalid Turnstile tokens', async () => {
    const badFileFd = buildValidFormData();
    badFileFd.append(
      'photos',
      new File(['<script>alert(1)</script>'], 'exploit.svg', {
        type: 'image/svg+xml',
      })
    );

    const badFileRes = await consignPost({
      request: new Request('http://localhost:4321/api/inquiries/consign', {
        method: 'POST',
        body: badFileFd,
      }),
    } as never);
    expect(badFileRes.status).toBe(400);

    const badTurnstileFd = buildValidFormData();
    badTurnstileFd.set('cf-turnstile-response', 'INVALID_TURNSTILE_TOKEN');

    const badTurnstileRes = await consignPost({
      request: new Request('http://localhost:4321/api/inquiries/consign', {
        method: 'POST',
        body: badTurnstileFd,
      }),
    } as never);
    expect(badTurnstileRes.status).toBe(403);
  });

  it('accepts German dot-grouped mileage (e.g. "28.500") and stores exact integer 28500', async () => {
    const fd = buildValidFormData();
    fd.set('mileageKm', '28.500');

    const res = await consignPost({
      request: new Request('http://localhost:4321/api/inquiries/consign', {
        method: 'POST',
        body: fd,
      }),
    } as never);

    expect(res.status).toBe(201);
    const body = (await res.json()) as { inquiryNumber: string };
    const db = await getDb(testD1);
    const [saved] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.inquiryNumber, body.inquiryNumber));
    expect(saved).toBeDefined();
    const payload = JSON.parse(saved!.payloadJson) as { mileageKm: number };
    expect(payload.mileageKm).toBe(28500);
  });
});
