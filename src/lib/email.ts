import { formatEurCents } from '@/lib/format';
import { getRuntimeEnv } from '@/lib/runtime-env';
import { SITE_CONFIG } from '@/lib/site-config';

export interface DispatchedEmailRecord {
  to: string[];
  from: string;
  subject: string;
  text: string;
  sentVia: 'resend-api' | 'local-log';
  createdAt: string;
}

const recentDispatchedEmails: DispatchedEmailRecord[] = [];

export function getDispatchedEmailsForTest(): DispatchedEmailRecord[] {
  return [...recentDispatchedEmails];
}

export function clearDispatchedEmailsForTest(): void {
  recentDispatchedEmails.length = 0;
}

export async function sendTransactionalEmail(params: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<DispatchedEmailRecord> {
  const env = await getRuntimeEnv();
  const from = env.MAIL_FROM || `Auto Kremer <noreply@auto-kremer.com>`;
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const apiKey = env.RESEND_API_KEY?.trim() ?? '';

  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: params.subject,
        text: params.text,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      console.error('Resend API delivery failed with status', res.status);
    }

    const record: DispatchedEmailRecord = {
      to: recipients,
      from,
      subject: params.subject,
      text: params.text,
      sentVia: 'resend-api',
      createdAt: new Date().toISOString(),
    };
    recentDispatchedEmails.push(record);
    return record;
  }

  const record: DispatchedEmailRecord = {
    to: recipients,
    from,
    subject: params.subject,
    text: params.text,
    sentVia: 'local-log',
    createdAt: new Date().toISOString(),
  };
  recentDispatchedEmails.push(record);
  return record;
}

export async function sendOrderConfirmationEmails(input: {
  orderNumber: string;
  customerEmail?: string | null;
  customerName?: string | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: Array<{
    oemNumber: string;
    title: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}): Promise<void> {
  const env = await getRuntimeEnv();
  const internalRecipient = env.MAIL_TO || SITE_CONFIG.contact.email;

  const linesText = input.items
    .map(
      (item) =>
        `- ${item.quantity}x [OEM ${item.oemNumber}] ${item.title} (${formatEurCents(
          item.unitPriceCents
        )})`
    )
    .join('\n');

  const bodyText = [
    `Bestellbestätigung — Auto Kremer Bonn (Ricambi Originali)`,
    `Bestellnummer: ${input.orderNumber}`,
    `Kunde: ${input.customerName || 'Online-Kunde'} (${input.customerEmail || 'keine E-Mail hinterlegt'})`,
    '',
    'Positionen:',
    linesText,
    '',
    `Zwischensumme: ${formatEurCents(input.subtotalCents)}`,
    `Versand: ${formatEurCents(input.shippingCents)}`,
    `Gesamtbetrag (inkl. 19 % MwSt.): ${formatEurCents(input.totalCents)}`,
    '',
    `${SITE_CONFIG.legalName} · ${SITE_CONFIG.address.street}, ${SITE_CONFIG.address.postalCode} ${SITE_CONFIG.address.city}`,
    `Telefon: ${SITE_CONFIG.contact.phonePrimaryDisplay} · E-Mail: ${SITE_CONFIG.contact.email}`,
  ].join('\n');

  await sendTransactionalEmail({
    to: internalRecipient,
    subject: `[Shop-Bestellung ${input.orderNumber}] Eingang bestätigt`,
    text: bodyText,
    replyTo: input.customerEmail ?? undefined,
  });

  if (input.customerEmail) {
    await sendTransactionalEmail({
      to: input.customerEmail,
      subject: `Ihre Bestellung ${input.orderNumber} bei Auto Kremer Bonn`,
      text: bodyText,
    });
  }
}

export async function sendInquiryNotificationEmail(input: {
  inquiryType: 'consignment' | 'contact';
  subject: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string | null;
  details: string[];
}): Promise<void> {
  const env = await getRuntimeEnv();
  const internalRecipient = env.MAIL_TO || SITE_CONFIG.contact.email;

  const text = [
    `Neue Webseiten-Anfrage (${input.inquiryType === 'consignment' ? 'Fahrzeug-Kommission / Ankauf' : 'Kontakt / Werkstatt / Teile'})`,
    `Absender: ${input.senderName}`,
    `E-Mail: ${input.senderEmail}`,
    `Telefon: ${input.senderPhone || 'nicht angegeben'}`,
    '',
    ...input.details,
  ].join('\n');

  await sendTransactionalEmail({
    to: internalRecipient,
    subject: input.subject,
    text,
    replyTo: input.senderEmail,
  });
}
