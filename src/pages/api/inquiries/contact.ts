import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { inquiries } from '@/db/schema';
import { sendInquiryNotificationEmail } from '@/lib/email';
import { verifyTurnstileToken } from '@/lib/turnstile';

const ContactInquirySchema = z.object({
  topic: z.enum(['fahrzeug', 'werkstatt', 'ersatzteil', 'allgemein']),
  referenceItem: z.string().trim().max(200).optional().default(''),
  senderName: z.string().trim().min(2, 'Bitte geben Sie Ihren Namen an.').max(120),
  senderEmail: z.email('Bitte geben Sie eine gültige E-Mail-Adresse an.'),
  senderPhone: z.string().trim().max(40).optional().default(''),
  message: z
    .string()
    .trim()
    .min(10, 'Bitte beschreiben Sie Ihr Anliegen mit mindestens 10 Zeichen.')
    .max(4000),
  privacyAccepted: z.boolean().refine((v) => v === true, {
    message: 'Bitte stimmen Sie der Datenschutzerklärung zu.',
  }),
  turnstileToken: z.string().trim().min(1, 'Sicherheitsprüfung fehlt.'),
  company_website: z.string().optional().default(''),
});

const TOPIC_LABELS: Record<z.infer<typeof ContactInquirySchema>['topic'], string> = {
  fahrzeug: 'Fahrzeug-Anfrage / Besichtigung',
  werkstatt: 'Werkstatt-Termin / Service',
  ersatzteil: 'Ersatzteil-Anfrage (Ricambi Originali)',
  allgemein: 'Allgemeine Anfrage',
};

function generateInquiryNumber(): string {
  const year = new Date().getUTCFullYear();
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `INQ-${year}-${rand}`;
}

export const POST: APIRoute = async ({ request }) => {
  let rawBody: unknown;
  const contentType = request.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      rawBody = await request.json();
    } else {
      const fd = await request.formData();
      rawBody = {
        topic: String(fd.get('topic') ?? 'allgemein'),
        referenceItem: String(fd.get('referenceItem') ?? ''),
        senderName: String(fd.get('senderName') ?? ''),
        senderEmail: String(fd.get('senderEmail') ?? ''),
        senderPhone: String(fd.get('senderPhone') ?? ''),
        message: String(fd.get('message') ?? ''),
        privacyAccepted: fd.get('privacyAccepted') === 'true' || fd.get('privacyAccepted') === 'on',
        turnstileToken: String(
          fd.get('cf-turnstile-response') ?? fd.get('turnstileToken') ?? ''
        ),
        company_website: String(fd.get('company_website') ?? ''),
      };
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ungültiges Anfrageformat.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // Honeypot anti-bot check
  if (
    typeof rawBody === 'object' &&
    rawBody !== null &&
    'company_website' in rawBody &&
    String((rawBody as { company_website?: unknown }).company_website ?? '').trim() !== ''
  ) {
    return new Response(
      JSON.stringify({ ok: true, inquiryNumber: 'INQ-IGNORED' }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const parsed = ContactInquirySchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: parsed.error.issues[0]?.message ?? 'Bitte überprüfen Sie Ihre Eingaben.',
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const d = parsed.data;
  const turnstileCheck = await verifyTurnstileToken(
    d.turnstileToken,
    request.headers.get('CF-Connecting-IP')
  );
  if (!turnstileCheck.ok) {
    return new Response(
      JSON.stringify({ error: turnstileCheck.error }),
      { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const inquiryNumber = generateInquiryNumber();
  const topicLabel = TOPIC_LABELS[d.topic];
  const subject = d.referenceItem
    ? `[${topicLabel} ${inquiryNumber}] ${d.referenceItem}`
    : `[${topicLabel} ${inquiryNumber}] Anfrage von ${d.senderName}`;
  const nowIso = new Date().toISOString();

  const db = await getDb();
  await db.insert(inquiries).values({
    inquiryNumber,
    type: 'contact',
    topic: d.topic,
    senderName: d.senderName,
    senderEmail: d.senderEmail,
    senderPhone: d.senderPhone || null,
    subject,
    message: d.message,
    payloadJson: JSON.stringify({
      topic: d.topic,
      referenceItem: d.referenceItem || null,
    }),
    mediaKeysJson: '[]',
    status: 'new',
    createdAt: nowIso,
  });

  await sendInquiryNotificationEmail({
    inquiryType: 'contact',
    subject,
    senderName: d.senderName,
    senderEmail: d.senderEmail,
    senderPhone: d.senderPhone || undefined,
    details: [
      `Referenznummer: ${inquiryNumber}`,
      `Anliegen: ${topicLabel}`,
      ...(d.referenceItem ? [`Bezugsobjekt: ${d.referenceItem}`] : []),
      '',
      'Nachricht:',
      d.message,
    ],
  });

  return new Response(
    JSON.stringify({
      ok: true,
      inquiryNumber,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
