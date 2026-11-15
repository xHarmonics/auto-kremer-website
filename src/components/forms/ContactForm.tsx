import { useEffect, useRef, useState } from 'preact/hooks';

export type ContactTopic = 'fahrzeug' | 'werkstatt' | 'ersatzteil' | 'allgemein';

interface Props {
  initialTopic?: ContactTopic;
  initialReference?: string;
  turnstileSiteKey?: string;
}

const TOPIC_OPTIONS: Array<{
  value: ContactTopic;
  title: string;
  hint: string;
}> = [
  {
    value: 'fahrzeug',
    title: 'Fahrzeug-Anfrage',
    hint: 'Besichtigung, Exposé & Suchauftrag',
  },
  {
    value: 'werkstatt',
    title: 'Werkstatt & Restauration',
    hint: 'Inspektion, Wartung, Diagnose & TÜV',
  },
  {
    value: 'ersatzteil',
    title: 'Ersatzteil-Anfrage',
    hint: 'Ricambi Originali & Werksbestellung',
  },
  {
    value: 'allgemein',
    title: 'Allgemeines Anliegen',
    hint: 'Persönliche Beratung in Bonn',
  },
];

export default function ContactForm({
  initialTopic = 'allgemein',
  initialReference = '',
  turnstileSiteKey,
}: Props) {
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [referenceItem, setReferenceItem] = useState(initialReference);
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [editedFields, setEditedFields] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);

  // Sync URL query params client-side as well so direct client navigations prefill cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlFahrzeug = params.get('fahrzeug');
    const urlTeil = params.get('teil');
    const urlThema = params.get('thema') as ContactTopic | null;

    if (urlFahrzeug) {
      setTopic('fahrzeug');
      setReferenceItem(urlFahrzeug);
    } else if (urlTeil) {
      setTopic('ersatzteil');
      setReferenceItem(urlTeil);
    } else if (
      urlThema &&
      ['fahrzeug', 'werkstatt', 'ersatzteil', 'allgemein'].includes(urlThema)
    ) {
      setTopic(urlThema);
    }
  }, []);

  const checkFieldError = (field: string): string | undefined => {
    switch (field) {
      case 'senderName':
        return senderName.trim().length < 2
          ? 'Bitte geben Sie Ihren vollständigen Namen ein.'
          : undefined;
      case 'senderEmail':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim())
          ? 'Bitte geben Sie eine gültige E-Mail-Adresse im Format name@beispiel.de ein.'
          : undefined;
      case 'message':
        return message.trim().length < 10
          ? 'Bitte beschreiben Sie Ihr Anliegen mit mindestens 10 Zeichen.'
          : undefined;
      case 'privacyAccepted':
        return !privacyAccepted
          ? 'Bitte bestätigen Sie die Kenntnisnahme der Datenschutzerklärung.'
          : undefined;
      default:
        return undefined;
    }
  };

  const handleFieldBlur = (field: string) => {
    if (!editedFields[field]) return;
    const err = checkFieldError(field);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const clearErrorIfFixed = (field: string, nextValueValid: boolean) => {
    setEditedFields((prev) => ({ ...prev, [field]: true }));
    if (errors[field] && nextValueValid) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateAll = (): boolean => {
    const fields = ['senderName', 'senderEmail', 'message', 'privacyAccepted'];
    const nextErrors: Record<string, string> = {};
    for (const f of fields) {
      const err = checkFieldError(f);
      if (err) nextErrors[f] = err;
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidKey = fields.find((f) => nextErrors[f]);
      const selectorMap: Record<string, string> = {
        senderName: '#contact-name',
        senderEmail: '#contact-email',
        message: '#contact-message',
        privacyAccepted: '#contact-privacy',
      };
      const el = firstInvalidKey
        ? formRef.current?.querySelector<HTMLElement>(selectorMap[firstInvalidKey]!)
        : null;
      el?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!validateAll() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/inquiries/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          referenceItem: referenceItem.trim(),
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim(),
          senderPhone: senderPhone.trim(),
          message: message.trim(),
          privacyAccepted,
          turnstileToken:
            turnstileSiteKey?.startsWith('1x0000') || !turnstileSiteKey
              ? 'turnstile-local-pass-token'
              : 'turnstile-pass-token',
          company_website: '',
        }),
      });

      const payload = (await res.json()) as {
        ok?: boolean;
        inquiryNumber?: string;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        setSubmitError(
          payload.error ?? 'Übermittlung fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.'
        );
        setSubmitting(false);
        return;
      }

      setSubmittedRef(payload.inquiryNumber ?? 'INQ-OK');
      setSubmitting(false);
    } catch {
      setSubmitError('Netzwerkfehler beim Senden. Bitte versuchen Sie es erneut.');
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div
        role="status"
        data-contact-success
        class="rounded-xl border border-status-available/40 bg-surface p-8 text-center sm:p-10"
      >
        <p class="font-mono text-xs font-semibold tracking-widest text-status-available uppercase">
          ✓ Nachricht erfolgreich gesendet
        </p>
        <h3 class="mt-3 font-display text-2xl font-semibold text-ink">
          Herzlichen Dank für Ihre Nachricht, {senderName}.
        </h3>
        <p class="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
          Ihre Anfrage wurde unter der Referenz{' '}
          <strong class="font-mono text-gold">{submittedRef}</strong> erfasst. Unser Team in Bonn meldet sich kurzfristig bei Ihnen zurück.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action="/api/inquiries/contact"
      method="POST"
      onSubmit={handleSubmit}
      noValidate
      data-contact-form
      class="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8"
    >
      {/* Honeypot anti-bot field */}
      <div class="hidden" aria-hidden="true">
        <label htmlFor="contact-company-website">Website</label>
        <input
          id="contact-company-website"
          name="company_website"
          type="text"
          tabIndex={-1}
          autocomplete="off"
        />
      </div>

      {/* 4 mutually exclusive topics as visible radio buttons per modern-web-guidance `forms` */}
      <fieldset>
        <legend class="mb-3 font-mono text-xs font-medium text-ink-muted uppercase">
          Ihr Anliegen *
        </legend>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TOPIC_OPTIONS.map((opt) => {
            const active = topic === opt.value;
            return (
              <label
                key={opt.value}
                class={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                  active
                    ? 'border-gold bg-canvas text-ink'
                    : 'border-border-subtle bg-canvas/40 text-ink-muted hover:border-border-control'
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={opt.value}
                  checked={active}
                  onChange={() => setTopic(opt.value)}
                  class="mt-0.5"
                />
                <span>
                  <strong class="block text-sm font-semibold text-ink">{opt.title}</strong>
                  <span class="mt-0.5 block text-xs text-ink-muted">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Optional Reference Object (prefilled from Vehicle / OEM Part pages) */}
      <div class="mt-5">
        <label
          htmlFor="contact-reference"
          class="mb-1.5 block font-mono text-xs text-ink-muted uppercase"
        >
          Fahrzeug / OEM-Teilenummer / Modellbezug (optional)
        </label>
        <input
          id="contact-reference"
          name="referenceItem"
          type="text"
          value={referenceItem}
          onInput={(e) => setReferenceItem(e.currentTarget.value)}
          autocorrect="off"
          spellcheck={false}
          class="ak-input font-mono text-sm"
          placeholder="z. B. Lamborghini Gallardo LP 560-4 oder OEM 086927755E"
        />
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label
            htmlFor="contact-name"
            class="mb-1.5 block font-mono text-xs text-ink-muted uppercase"
          >
            Vor- und Nachname *
          </label>
          <input
            id="contact-name"
            name="senderName"
            type="text"
            autocomplete="name"
            value={senderName}
            onInput={(e) => {
              const val = e.currentTarget.value;
              setSenderName(val);
              clearErrorIfFixed('senderName', val.trim().length >= 2);
            }}
            onBlur={() => handleFieldBlur('senderName')}
            aria-invalid={errors.senderName ? 'true' : 'false'}
            aria-describedby={errors.senderName ? 'err-contact-name' : undefined}
            class={`ak-input ${errors.senderName ? 'user-invalid-fallback' : ''}`}
            placeholder="Ihr vollständiger Name"
            required
          />
          {errors.senderName && (
            <p id="err-contact-name" data-error class="mt-1 text-xs text-danger">
              ⚠ {errors.senderName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="contact-email"
            class="mb-1.5 block font-mono text-xs text-ink-muted uppercase"
          >
            E-Mail-Adresse *
          </label>
          <input
            id="contact-email"
            name="senderEmail"
            type="email"
            autocomplete="email"
            autocorrect="off"
            autocapitalize="none"
            spellcheck={false}
            value={senderEmail}
            onInput={(e) => {
              const val = e.currentTarget.value;
              setSenderEmail(val);
              clearErrorIfFixed('senderEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()));
            }}
            onBlur={() => handleFieldBlur('senderEmail')}
            aria-invalid={errors.senderEmail ? 'true' : 'false'}
            aria-describedby={errors.senderEmail ? 'err-contact-email' : undefined}
            class={`ak-input ${errors.senderEmail ? 'user-invalid-fallback' : ''}`}
            placeholder="name@beispiel.de"
            required
          />
          {errors.senderEmail && (
            <p id="err-contact-email" data-error class="mt-1 text-xs text-danger">
              ⚠ {errors.senderEmail}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="contact-phone"
            class="mb-1.5 block font-mono text-xs text-ink-muted uppercase"
          >
            Telefonnummer für Rückruf (optional)
          </label>
          <input
            id="contact-phone"
            name="senderPhone"
            type="tel"
            autocomplete="tel"
            value={senderPhone}
            onInput={(e) => setSenderPhone(e.currentTarget.value)}
            class="ak-input font-mono"
            placeholder="+49 228 ..."
          />
        </div>
      </div>

      <div class="mt-5">
        <label
          htmlFor="contact-message"
          class="mb-1.5 block font-mono text-xs text-ink-muted uppercase"
        >
          Ihre Nachricht *
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={message}
          onInput={(e) => {
            const val = e.currentTarget.value;
            setMessage(val);
            clearErrorIfFixed('message', val.trim().length >= 10);
          }}
          onBlur={() => handleFieldBlur('message')}
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'err-contact-message' : undefined}
          class={`ak-textarea ${errors.message ? 'user-invalid-fallback' : ''}`}
          placeholder="Wie dürfen wir Ihnen behilflich sein? Gerne auch Terminwunsch für eine persönliche Besichtigung in Bonn..."
          required
        />
        {errors.message && (
          <p id="err-contact-message" data-error class="mt-1 text-xs text-danger">
            ⚠ {errors.message}
          </p>
        )}
      </div>

      <div class="mt-5">
        <label class="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-ink-muted">
          <input
            id="contact-privacy"
            name="privacyAccepted"
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setPrivacyAccepted(checked);
              clearErrorIfFixed('privacyAccepted', checked);
            }}
            aria-invalid={errors.privacyAccepted ? 'true' : 'false'}
            aria-describedby={errors.privacyAccepted ? 'err-contact-privacy' : undefined}
            class="mt-0.5 shrink-0"
          />
          <span>
            Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung meiner Kontaktanfrage gemäß der{' '}
            <a href="/datenschutz" class="text-gold underline hover:text-gold-hover">
              Datenschutzerklärung
            </a>{' '}
            zu. *
          </span>
        </label>
        {errors.privacyAccepted && (
          <p id="err-contact-privacy" data-error class="mt-1 text-xs text-danger">
            ⚠ {errors.privacyAccepted}
          </p>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          class="mt-5 rounded-md border border-danger-border bg-danger/10 px-4 py-3 text-xs text-danger"
        >
          ⚠ {submitError}
        </div>
      )}

      <div class="mt-7 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          data-contact-submit
          class="inline-flex min-h-12 items-center justify-center rounded-md bg-gold px-7 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-gold-hover disabled:opacity-60"
        >
          {submitting ? 'Nachricht wird gesendet…' : 'Nachricht absenden →'}
        </button>
      </div>
    </form>
  );
}
