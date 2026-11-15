import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { inquiries } from '@/db/schema';
import { sendInquiryNotificationEmail } from '@/lib/email';
import { parseGermanInt } from '@/lib/format';
import { validateAndStoreConsignmentPhotos } from '@/lib/r2';
import { verifyTurnstileToken } from '@/lib/turnstile';

const ConsignmentFieldsSchema = z.object({
  intent: z.enum(['kommission', 'direktankauf']),
  brand: z.string().trim().min(2, 'Bitte geben Sie die Fahrzeugmarke an.').max(60),
  model: z.string().trim().min(1, 'Bitte geben Sie das Modell an.').max(100),
  year: z.coerce
    .number()
    .int()
    .min(1950, 'Baujahr muss zwischen 1950 und heute liegen.')
    .refine(
      (y) => y <= Math.max(2027, new Date().getUTCFullYear() + 1),
      'Bitte geben Sie ein gültiges Baujahr an.'
    ),
  mileageKm: z
    .preprocess(
      (val) => (typeof val === 'string' || typeof val === 'number' ? parseGermanInt(val) : Number.NaN),
      z
        .number({ error: 'Bitte geben Sie einen gültigen Kilometerstand ein.' })
        .int()
        .min(0, 'Kilometerstand darf nicht negativ sein.')
        .max(1000000)
    ),
  transmission: z.string().trim().min(2, 'Bitte wählen Sie die Getriebeart.').max(60),
  vin: z.string().trim().max(32).optional().default(''),
  askingPriceEur: z.string().trim().max(40).optional().default(''),
  conditionNotes: z
    .string()
    .trim()
    .min(15, 'Bitte beschreiben Sie Zustand und Historie mit mindestens 15 Zeichen.')
    .max(4000),
  senderName: z.string().trim().min(2, 'Bitte geben Sie Ihren Namen an.').max(120),
  senderEmail: z.email('Bitte geben Sie eine gültige E-Mail-Adresse an.'),
  senderPhone: z
    .string()
    .trim()
    .min(5, 'Bitte geben Sie eine Rückrufnummer an.')
    .max(40),
  privacyAccepted: z.literal('true', {
    error: 'Bitte stimmen Sie der Datenschutzerklärung zu.',
  }),
  turnstileToken: z.string().trim().min(1, 'Sicherheitsprüfung fehlt.'),
});

function generateInquiryNumber(): string {
  const year = new Date().getUTCFullYear();
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `INQ-${year}-${rand}`;
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ungültiges Formularformat (Multipart erwartet).' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // Honeypot anti-bot field check
  const honeypot = String(formData.get('company_website') ?? '').trim();
  if (honeypot !== '') {
    return new Response(
      JSON.stringify({ ok: true, inquiryNumber: 'INQ-IGNORED' }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const rawFields = {
    intent: String(formData.get('intent') ?? 'kommission'),
    brand: String(formData.get('brand') ?? ''),
    model: String(formData.get('model') ?? ''),
    year: String(formData.get('year') ?? ''),
    mileageKm: String(formData.get('mileageKm') ?? ''),
    transmission: String(formData.get('transmission') ?? ''),
    vin: String(formData.get('vin') ?? ''),
    askingPriceEur: String(formData.get('askingPriceEur') ?? ''),
    conditionNotes: String(formData.get('conditionNotes') ?? ''),
    senderName: String(formData.get('senderName') ?? ''),
    senderEmail: String(formData.get('senderEmail') ?? ''),
    senderPhone: String(formData.get('senderPhone') ?? ''),
    privacyAccepted: String(formData.get('privacyAccepted') ?? ''),
    turnstileToken: String(
      formData.get('cf-turnstile-response') ?? formData.get('turnstileToken') ?? ''
    ),
  };

  const parsed = ConsignmentFieldsSchema.safeParse(rawFields);
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

  const turnstileCheck = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    request.headers.get('CF-Connecting-IP')
  );
  if (!turnstileCheck.ok) {
    return new Response(
      JSON.stringify({ error: turnstileCheck.error }),
      { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const inquiryNumber = generateInquiryNumber();

  const uploadedFiles = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const storageResult = await validateAndStoreConsignmentPhotos(
    uploadedFiles,
    inquiryNumber
  );
  if (!storageResult.ok) {
    return new Response(
      JSON.stringify({ error: storageResult.error }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const d = parsed.data;
  const nowIso = new Date().toISOString();
  const subject = `[${
    d.intent === 'kommission' ? 'Kommission' : 'Direktankauf'
  } ${inquiryNumber}] ${d.brand} ${d.model} (${d.year})`;

  const db = await getDb();
  await db.insert(inquiries).values({
    inquiryNumber,
    type: 'consignment',
    topic: d.intent,
    senderName: d.senderName,
    senderEmail: d.senderEmail,
    senderPhone: d.senderPhone,
    subject,
    message: d.conditionNotes,
    payloadJson: JSON.stringify({
      intent: d.intent,
      brand: d.brand,
      model: d.model,
      year: d.year,
      mileageKm: d.mileageKm,
      transmission: d.transmission,
      vin: d.vin || null,
      askingPriceEur: d.askingPriceEur || null,
    }),
    mediaKeysJson: JSON.stringify(storageResult.keys),
    status: 'new',
    createdAt: nowIso,
  });

  await sendInquiryNotificationEmail({
    inquiryType: 'consignment',
    subject,
    senderName: d.senderName,
    senderEmail: d.senderEmail,
    senderPhone: d.senderPhone,
    details: [
      `Referenznummer: ${inquiryNumber}`,
      `Vermarktungswunsch: ${d.intent === 'kommission' ? 'Kommissionsverkauf' : 'Direktankauf'}`,
      `Fahrzeug: ${d.brand} ${d.model} (Baujahr ${d.year})`,
      `Laufleistung: ${d.mileageKm.toLocaleString('de-DE')} km`,
      `Getriebe: ${d.transmission}`,
      `FIN / VIN: ${d.vin || 'nicht angegeben'}`,
      `Preisvorstellung: ${d.askingPriceEur || 'Nach Bewertung'}`,
      `Hochgeladene Fotos in R2: ${storageResult.keys.length}`,
      '',
      'Zustand & Historie:',
      d.conditionNotes,
    ],
  });

  return new Response(
    JSON.stringify({
      ok: true,
      inquiryNumber,
      uploadedPhotosCount: storageResult.keys.length,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
