import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, setTestD1 } from '@/db/client';
import { inquiries } from '@/db/schema';
import {
  clearDispatchedEmailsForTest,
  getDispatchedEmailsForTest,
} from '@/lib/email';
import { setTestRuntimeEnv } from '@/lib/runtime-env';
import { POST as contactPost } from '@/pages/api/inquiries/contact';
import { createTestD1 } from '../helpers/test-d1';

describe('Consolidated Contact & Vehicle/Part Inquiry API (/api/inquiries/contact)', () => {
  let testD1: D1Database;

  beforeEach(() => {
    testD1 = createTestD1();
    setTestD1(testD1);
    clearDispatchedEmailsForTest();
    setTestRuntimeEnv({
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      MAIL_TO: 'info@auto-kremer.com',
    });
  });

  afterEach(() => {
    setTestD1(null);
    setTestRuntimeEnv(null);
  });

  it('persists prefilled vehicle inquiry in D1 and dispatches notification email to info@auto-kremer.com', async () => {
    const res = await contactPost({
      request: new Request('http://localhost:4321/api/inquiries/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'fahrzeug',
          referenceItem: 'Lamborghini Gallardo LP 560-4 Handschalter (2009)',
          senderName: 'Markus Weber',
          senderEmail: 'm.weber@beispiel.de',
          senderPhone: '+49 228 123456',
          message:
            'Guten Tag, ich würde gerne kommende Woche einen Besichtigungstermin in Bonn vereinbaren.',
          privacyAccepted: true,
          turnstileToken: 'turnstile-local-pass-token',
        }),
      }),
    } as never);

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; inquiryNumber: string };
    expect(body.ok).toBe(true);
    expect(body.inquiryNumber).toMatch(/^INQ-/);

    const db = await getDb(testD1);
    const [saved] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.inquiryNumber, body.inquiryNumber));
    expect(saved).toBeDefined();
    expect(saved!.type).toBe('contact');
    expect(saved!.topic).toBe('fahrzeug');
    expect(saved!.subject).toContain('Lamborghini Gallardo LP 560-4 Handschalter');

    const emails = getDispatchedEmailsForTest();
    expect(emails).toHaveLength(1);
    expect(emails[0]?.to).toEqual(['info@auto-kremer.com']);
    expect(emails[0]?.replyTo).toBe('m.weber@beispiel.de');
  });

  it('rejects missing privacy consent, short messages, and invalid Turnstile tokens', async () => {
    const noConsentRes = await contactPost({
      request: new Request('http://localhost:4321/api/inquiries/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'allgemein',
          senderName: 'Test User',
          senderEmail: 'test@beispiel.de',
          message: 'Eine ausreichend lange Testnachricht an Auto Kremer.',
          privacyAccepted: false,
          turnstileToken: 'turnstile-local-pass-token',
        }),
      }),
    } as never);
    expect(noConsentRes.status).toBe(400);

    const badTurnstileRes = await contactPost({
      request: new Request('http://localhost:4321/api/inquiries/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'werkstatt',
          senderName: 'Test User',
          senderEmail: 'test@beispiel.de',
          message: 'Bitte um Rückruf wegen Jahresinspektion meines Diablo.',
          privacyAccepted: true,
          turnstileToken: 'INVALID_TURNSTILE_TOKEN',
        }),
      }),
    } as never);
    expect(badTurnstileRes.status).toBe(403);
  });
});
