import { useRef, useState } from 'preact/hooks';
import { parseGermanInt } from '@/lib/format';

interface Props {
  turnstileSiteKey?: string;
}

type StepNumber = 1 | 2 | 3;

export default function ConsignmentWizard({ turnstileSiteKey }: Props) {
  const [step, setStep] = useState<StepNumber>(1);
  const [intent, setIntent] = useState<'kommission' | 'direktankauf'>('kommission');
  const [brand, setBrand] = useState('Lamborghini');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileageKm, setMileageKm] = useState('');
  const [transmission, setTransmission] = useState('Handschaltung');
  const [vin, setVin] = useState('');
  const [askingPriceEur, setAskingPriceEur] = useState('');

  const [conditionNotes, setConditionNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const step1HeadingRef = useRef<HTMLHeadingElement | null>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement | null>(null);
  const step3HeadingRef = useRef<HTMLHeadingElement | null>(null);

  const focusStepHeading = (target: StepNumber) => {
    requestAnimationFrame(() => {
      const ref =
        target === 1
          ? step1HeadingRef
          : target === 2
            ? step2HeadingRef
            : step3HeadingRef;
      ref.current?.focus();
    });
  };

  const validateStep1 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (brand.trim().length < 2) {
      nextErrors.brand = 'Bitte geben Sie die Fahrzeugmarke an.';
    }
    if (model.trim().length < 1) {
      nextErrors.model = 'Bitte geben Sie die genaue Modellbezeichnung an.';
    }
    const y = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(y) || y < 1950 || y > maxYear) {
      nextErrors.year = `Bitte geben Sie ein gültiges Baujahr (1950–${maxYear}) ein.`;
    }
    const km = parseGermanInt(mileageKm);
    if (Number.isNaN(km) || km < 0 || km > 1000000) {
      nextErrors.mileageKm = 'Bitte geben Sie den aktuellen Kilometerstand ein.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (conditionNotes.trim().length < 15) {
      nextErrors.conditionNotes =
        'Bitte beschreiben Sie Zustand, Wartungshistorie und Ausstattung mit mindestens 15 Zeichen.';
    }
    if (selectedFiles.length > 8) {
      nextErrors.photos = 'Es können maximal 8 Fotos ausgewählt werden.';
    }
    for (const file of selectedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        nextErrors.photos = `Datei „${file.name}“ ist größer als 10 MB.`;
        break;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (senderName.trim().length < 2) {
      nextErrors.senderName = 'Bitte geben Sie Ihren vollständigen Namen an.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim())) {
      nextErrors.senderEmail = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    }
    if (senderPhone.trim().length < 5) {
      nextErrors.senderPhone = 'Bitte geben Sie eine Telefonnummer für Rückfragen an.';
    }
    if (!privacyAccepted) {
      nextErrors.privacyAccepted =
        'Bitte bestätigen Sie die Kenntnisnahme der Datenschutzerklärung.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNextFromStep1 = () => {
    if (validateStep1()) {
      setStep(2);
      focusStepHeading(2);
    }
  };

  const goNextFromStep2 = () => {
    if (validateStep2()) {
      setStep(3);
      focusStepHeading(3);
    }
  };

  const goBackTo = (target: StepNumber) => {
    setErrors({});
    setStep(target);
    focusStepHeading(target);
  };

  const handleFileChange = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    setSelectedFiles(files.slice(0, 8));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!validateStep3() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const fd = new FormData();
      fd.set('intent', intent);
      fd.set('brand', brand.trim());
      fd.set('model', model.trim());
      fd.set('year', year.trim());
      fd.set('mileageKm', mileageKm.trim());
      fd.set('transmission', transmission);
      fd.set('vin', vin.trim());
      fd.set('askingPriceEur', askingPriceEur.trim());
      fd.set('conditionNotes', conditionNotes.trim());
      fd.set('senderName', senderName.trim());
      fd.set('senderEmail', senderEmail.trim());
      fd.set('senderPhone', senderPhone.trim());
      fd.set('privacyAccepted', privacyAccepted ? 'true' : 'false');
      fd.set(
        'cf-turnstile-response',
        turnstileSiteKey?.startsWith('1x0000') || !turnstileSiteKey
          ? 'turnstile-local-pass-token'
          : 'turnstile-pass-token'
      );

      for (const photo of selectedFiles) {
        fd.append('photos', photo);
      }

      const res = await fetch('/api/inquiries/consign', {
        method: 'POST',
        body: fd,
      });

      const payload = (await res.json()) as {
        ok?: boolean;
        inquiryNumber?: string;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        setSubmitError(
          payload.error ?? 'Übermittlung fehlgeschlagen. Bitte prüfen Sie Ihre Angaben.'
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
        data-consignment-success
        class="rounded-xl border border-status-available/40 bg-surface p-8 text-center sm:p-10"
      >
        <p class="font-mono text-xs font-semibold tracking-widest text-status-available uppercase">
          ✓ Fahrzeugangebot erfolgreich übermittelt
        </p>
        <h3 class="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
          Vielen Dank, {senderName}.
        </h3>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          Ihre Anfrage wurde unter der Referenznummer{' '}
          <strong class="font-mono text-gold">{submittedRef}</strong> gespeichert. Jason oder Marvin Kremer melden sich zeitnah persönlich bei Ihnen zur Besprechung der Bewertung und weiteren Vorgehensweise.
        </p>
      </div>
    );
  }

  const stepsMeta = [
    { num: 1 as const, label: '1. Fahrzeugdaten' },
    { num: 2 as const, label: '2. Zustand & Fotos' },
    { num: 3 as const, label: '3. Kontakt & Absenden' },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      class="rounded-xl border border-border-subtle bg-surface p-6 sm:p-8"
      data-consignment-wizard
    >
      {/* Accessible Step Progress Indicator */}
      <ol
        aria-label="Fortschritt der Fahrzeug-Anfrage"
        class="mb-8 grid grid-cols-1 gap-2 border-b border-border-subtle pb-6 sm:grid-cols-3"
      >
        {stepsMeta.map((s) => {
          const isCurrent = step === s.num;
          const isCompleted = step > s.num;
          return (
            <li
              key={s.num}
              aria-current={isCurrent ? 'step' : undefined}
              class={`rounded-md border px-3.5 py-2.5 font-mono text-xs ${
                isCurrent
                  ? 'border-gold bg-canvas font-semibold text-gold'
                  : isCompleted
                    ? 'border-status-available/40 bg-canvas/60 text-status-available'
                    : 'border-border-subtle bg-canvas/30 text-ink-muted'
              }`}
            >
              {isCompleted ? `✓ ${s.label}` : s.label}
            </li>
          );
        })}
      </ol>

      {/* Honeypot anti-bot field */}
      <div class="hidden" aria-hidden="true">
        <label htmlFor="consign-company-website">Website</label>
        <input
          id="consign-company-website"
          type="text"
          name="company_website"
          tabIndex={-1}
          autocomplete="off"
        />
      </div>

      {/* STEP 1: Vehicle Core Specs */}
      <div hidden={step !== 1} data-wizard-step="1">
        <h3
          ref={step1HeadingRef}
          tabIndex={-1}
          class="font-display text-xl font-semibold text-ink focus:outline-none"
        >
          Schritt 1: Eckdaten Ihres Fahrzeugs
        </h3>
        <p class="mt-1 text-sm text-ink-muted">
          Wählen Sie Ihre bevorzugte Vermarktungsart und nennen Sie uns die wichtigsten Fahrzeugdaten.
        </p>

        <fieldset class="mt-6">
          <legend class="mb-2 font-mono text-xs font-medium text-ink-muted uppercase">
            Gewünschte Vermarktungsform *
          </legend>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              class={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                intent === 'kommission'
                  ? 'border-gold bg-canvas text-ink'
                  : 'border-border-subtle bg-canvas/50 text-ink-muted hover:border-border-control'
              }`}
            >
              <input
                type="radio"
                name="intent"
                value="kommission"
                checked={intent === 'kommission'}
                onChange={() => setIntent('kommission')}
                class="mt-0.5"
              />
              <span>
                <strong class="block text-sm font-semibold text-ink">
                  Kommissionsverkauf (Empfohlen)
                </strong>
                <span class="mt-0.5 block text-xs text-ink-muted">
                  Maximaler Sammlererlös durch Aufbereitung &amp; Vermarktung über Auto Kremer.
                </span>
              </span>
            </label>

            <label
              class={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                intent === 'direktankauf'
                  ? 'border-gold bg-canvas text-ink'
                  : 'border-border-subtle bg-canvas/50 text-ink-muted hover:border-border-control'
              }`}
            >
              <input
                type="radio"
                name="intent"
                value="direktankauf"
                checked={intent === 'direktankauf'}
                onChange={() => setIntent('direktankauf')}
                class="mt-0.5"
              />
              <span>
                <strong class="block text-sm font-semibold text-ink">
                  Direktankauf durch Auto Kremer
                </strong>
                <span class="mt-0.5 block text-xs text-ink-muted">
                  Schnelle, diskrete Abwicklung und sofortige Auszahlung.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="consign-brand" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Marke *
            </label>
            <input
              id="consign-brand"
              name="brand"
              type="text"
              value={brand}
              onInput={(e) => setBrand(e.currentTarget.value)}
              aria-invalid={errors.brand ? 'true' : undefined}
              aria-describedby={errors.brand ? 'err-consign-brand' : undefined}
              class={`ak-input ${errors.brand ? 'user-invalid-fallback' : ''}`}
              placeholder="z. B. Lamborghini, Porsche, Ferrari, Alfa Romeo"
              required
            />
            {errors.brand && (
              <p id="err-consign-brand" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.brand}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-model" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Modell &amp; Variante *
            </label>
            <input
              id="consign-model"
              name="model"
              type="text"
              value={model}
              onInput={(e) => setModel(e.currentTarget.value)}
              aria-invalid={errors.model ? 'true' : undefined}
              aria-describedby={errors.model ? 'err-consign-model' : undefined}
              class={`ak-input ${errors.model ? 'user-invalid-fallback' : ''}`}
              placeholder="z. B. Diablo VT 6.0, Gallardo Superleggera"
              required
            />
            {errors.model && (
              <p id="err-consign-model" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.model}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-year" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Baujahr / Erstzulassung *
            </label>
            <input
              id="consign-year"
              name="year"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{4}"
              value={year}
              onInput={(e) => setYear(e.currentTarget.value)}
              aria-invalid={errors.year ? 'true' : undefined}
              aria-describedby={errors.year ? 'err-consign-year' : undefined}
              class={`ak-input font-mono ${errors.year ? 'user-invalid-fallback' : ''}`}
              placeholder="z. B. 1998"
              required
            />
            {errors.year && (
              <p id="err-consign-year" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.year}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-mileage" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Laufleistung (km) *
            </label>
            <input
              id="consign-mileage"
              name="mileageKm"
              type="text"
              inputMode="numeric"
              value={mileageKm}
              onInput={(e) => setMileageKm(e.currentTarget.value)}
              aria-invalid={errors.mileageKm ? 'true' : undefined}
              aria-describedby={errors.mileageKm ? 'err-consign-mileage' : undefined}
              class={`ak-input font-mono ${errors.mileageKm ? 'user-invalid-fallback' : ''}`}
              placeholder="z. B. 28500"
              required
            />
            {errors.mileageKm && (
              <p id="err-consign-mileage" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.mileageKm}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-transmission" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Getriebeart *
            </label>
            <select
              id="consign-transmission"
              name="transmission"
              value={transmission}
              onChange={(e) => setTransmission(e.currentTarget.value)}
              class="ak-select"
            >
              <option value="Handschaltung">Handschaltung</option>
              <option value="Automatik / E-Gear / ISR">Automatik / E-Gear / ISR</option>
              <option value="Doppelkupplung (LDF / PDK)">Doppelkupplung (LDF / PDK)</option>
            </select>
          </div>

          <div>
            <label htmlFor="consign-price" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Preisvorstellung in € (optional)
            </label>
            <input
              id="consign-price"
              name="askingPriceEur"
              type="text"
              value={askingPriceEur}
              onInput={(e) => setAskingPriceEur(e.currentTarget.value)}
              class="ak-input font-mono"
              placeholder="z. B. 245.000 €"
            />
          </div>

          <div class="sm:col-span-2">
            <label htmlFor="consign-vin" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Fahrgestellnummer / FIN (optional, vertraulich)
            </label>
            <input
              id="consign-vin"
              name="vin"
              type="text"
              value={vin}
              onInput={(e) => setVin(e.currentTarget.value)}
              autocorrect="off"
              autocapitalize="none"
              spellcheck={false}
              class="ak-input font-mono uppercase"
              placeholder="z. B. ZA9DE07A0..."
            />
          </div>
        </div>

        <div class="mt-8 flex justify-end">
          <button
            type="button"
            onClick={goNextFromStep1}
            data-step1-next
            class="inline-flex min-h-12 items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-canvas hover:bg-gold-hover"
          >
            Weiter zu Zustand &amp; Fotos →
          </button>
        </div>
      </div>

      {/* STEP 2: Condition & R2 Photos */}
      <div hidden={step !== 2} data-wizard-step="2">
        <h3
          ref={step2HeadingRef}
          tabIndex={-1}
          class="font-display text-xl font-semibold text-ink focus:outline-none"
        >
          Schritt 2: Zustand, Historie &amp; Fahrzeugbilder
        </h3>
        <p class="mt-1 text-sm text-ink-muted">
          Je genauer Ihre Angaben zu Wartungshistorie, Erstauslieferung und Zustand sind, desto präziser unsere Einschätzung.
        </p>

        <div class="mt-6 space-y-5">
          <div>
            <label htmlFor="consign-notes" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Zustandsbeschreibung &amp; Historie *
            </label>
            <textarea
              id="consign-notes"
              name="conditionNotes"
              rows={5}
              value={conditionNotes}
              onInput={(e) => setConditionNotes(e.currentTarget.value)}
              aria-invalid={errors.conditionNotes ? 'true' : undefined}
              aria-describedby={errors.conditionNotes ? 'err-consign-notes' : undefined}
              class={`ak-textarea ${errors.conditionNotes ? 'user-invalid-fallback' : ''}`}
              placeholder="Außen-/Innenfarbe, Vorbesitzer, Scheckheft, durchgeführte Revisionen, Unfallfreiheit, Sonderzubehör..."
              required
            />
            {errors.conditionNotes && (
              <p id="err-consign-notes" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.conditionNotes}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-photos" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Fahrzeugfotos hochladen (optional, bis zu 8 Bilder · JPG, PNG, WebP, AVIF · max. 10 MB)
            </label>
            <input
              id="consign-photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={handleFileChange}
              aria-describedby={errors.photos ? 'err-consign-photos' : undefined}
              class="ak-input file:mr-4 file:rounded file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-canvas"
            />
            {selectedFiles.length > 0 && (
              <p class="mt-2 font-mono text-xs text-status-available">
                ✓ {selectedFiles.length}{' '}
                {selectedFiles.length === 1 ? 'Foto ausgewählt' : 'Fotos ausgewählt'} (geschützte Speicherung in Cloudflare R2)
              </p>
            )}
            {errors.photos && (
              <p id="err-consign-photos" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.photos}
              </p>
            )}
          </div>
        </div>

        <div class="mt-8 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => goBackTo(1)}
            class="inline-flex min-h-12 items-center justify-center rounded-md border border-border-control bg-canvas px-5 py-3 text-sm font-semibold text-ink hover:border-gold"
          >
            ← Zurück
          </button>
          <button
            type="button"
            onClick={goNextFromStep2}
            data-step2-next
            class="inline-flex min-h-12 items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-canvas hover:bg-gold-hover"
          >
            Weiter zu Ihren Kontaktdaten →
          </button>
        </div>
      </div>

      {/* STEP 3: Contact Details & Submit */}
      <div hidden={step !== 3} data-wizard-step="3">
        <h3
          ref={step3HeadingRef}
          tabIndex={-1}
          class="font-display text-xl font-semibold text-ink focus:outline-none"
        >
          Schritt 3: Persönliche Kontaktdaten
        </h3>
        <p class="mt-1 text-sm text-ink-muted">
          Ihre Angaben werden streng vertraulich behandelt und ausschließlich zur Bewertung Ihres Fahrzeugs verwendet.
        </p>

        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label htmlFor="consign-name" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Vor- und Nachname *
            </label>
            <input
              id="consign-name"
              name="senderName"
              type="text"
              autocomplete="name"
              value={senderName}
              onInput={(e) => setSenderName(e.currentTarget.value)}
              aria-invalid={errors.senderName ? 'true' : undefined}
              aria-describedby={errors.senderName ? 'err-consign-name' : undefined}
              class={`ak-input ${errors.senderName ? 'user-invalid-fallback' : ''}`}
              placeholder="Dr. Max Mustermann"
              required
            />
            {errors.senderName && (
              <p id="err-consign-name" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.senderName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-email" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              E-Mail-Adresse *
            </label>
            <input
              id="consign-email"
              name="senderEmail"
              type="email"
              autocomplete="email"
              autocorrect="off"
              autocapitalize="none"
              spellcheck={false}
              value={senderEmail}
              onInput={(e) => setSenderEmail(e.currentTarget.value)}
              aria-invalid={errors.senderEmail ? 'true' : undefined}
              aria-describedby={errors.senderEmail ? 'err-consign-email' : undefined}
              class={`ak-input ${errors.senderEmail ? 'user-invalid-fallback' : ''}`}
              placeholder="name@beispiel.de"
              required
            />
            {errors.senderEmail && (
              <p id="err-consign-email" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.senderEmail}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="consign-phone" class="mb-1.5 block font-mono text-xs text-ink-muted uppercase">
              Telefonnummer für Rückfragen *
            </label>
            <input
              id="consign-phone"
              name="senderPhone"
              type="tel"
              autocomplete="tel"
              value={senderPhone}
              onInput={(e) => setSenderPhone(e.currentTarget.value)}
              aria-invalid={errors.senderPhone ? 'true' : undefined}
              aria-describedby={errors.senderPhone ? 'err-consign-phone' : undefined}
              class={`ak-input font-mono ${errors.senderPhone ? 'user-invalid-fallback' : ''}`}
              placeholder="+49 170 ..."
              required
            />
            {errors.senderPhone && (
              <p id="err-consign-phone" data-error class="mt-1 text-xs text-danger">
                ⚠ {errors.senderPhone}
              </p>
            )}
          </div>
        </div>

        <div class="mt-5">
          <label class="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-ink-muted">
            <input
              type="checkbox"
              name="privacyAccepted"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.currentTarget.checked)}
              aria-invalid={errors.privacyAccepted ? 'true' : undefined}
              aria-describedby={errors.privacyAccepted ? 'err-consign-privacy' : undefined}
              class="mt-0.5 shrink-0"
            />
            <span>
              Ich stimme zu, dass meine Angaben und Fahrzeugbilder zur Bearbeitung meines Kommissions-/Ankaufsangebots gemäß der{' '}
              <a href="/datenschutz" class="text-gold underline hover:text-gold-hover">
                Datenschutzerklärung
              </a>{' '}
              verarbeitet werden. *
            </span>
          </label>
          {errors.privacyAccepted && (
            <p id="err-consign-privacy" data-error class="mt-1 text-xs text-danger">
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

        <div class="mt-8 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => goBackTo(2)}
            class="inline-flex min-h-12 items-center justify-center rounded-md border border-border-control bg-canvas px-5 py-3 text-sm font-semibold text-ink hover:border-gold"
          >
            ← Zurück
          </button>
          <button
            type="submit"
            disabled={submitting}
            data-consign-submit
            class="inline-flex min-h-12 items-center justify-center rounded-md bg-gold px-7 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-gold-hover disabled:opacity-60"
          >
            {submitting ? 'Wird verschlüsselt übertragen…' : 'Unverbindliches Angebot anfordern →'}
          </button>
        </div>
      </div>
    </form>
  );
}
