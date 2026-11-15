import { useEffect, useState } from 'preact/hooks';

interface Props {
  brands: string[];
  transmissions: string[];
  initialBrand?: string;
  initialTransmission?: string;
  totalCount: number;
}

export default function VehicleFilterBar({
  brands,
  transmissions,
  initialBrand = 'all',
  initialTransmission = 'all',
  totalCount,
}: Props) {
  const [brand, setBrand] = useState<string>(initialBrand);
  const [transmission, setTransmission] = useState<string>(initialTransmission);
  const [visibleCount, setVisibleCount] = useState<number>(totalCount);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBrand = params.get('marke');
    const urlTrans = params.get('getriebe');

    const domBrand = document.getElementById('filter-brand') as HTMLSelectElement | null;
    if (domBrand && domBrand.value !== initialBrand && (domBrand.value === 'all' || brands.includes(domBrand.value))) {
      setBrand(domBrand.value);
    } else if (urlBrand && brands.includes(urlBrand)) {
      setBrand(urlBrand);
    }

    const domTrans = document.getElementById('filter-transmission') as HTMLSelectElement | null;
    if (
      domTrans &&
      domTrans.value !== initialTransmission &&
      (domTrans.value === 'all' || transmissions.includes(domTrans.value))
    ) {
      setTransmission(domTrans.value);
    } else if (urlTrans && transmissions.includes(urlTrans)) {
      setTransmission(urlTrans);
    }
  }, [brands, transmissions]);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('[data-vehicle-card]');
    let matched = 0;

    cards.forEach((card) => {
      const cardBrand = card.dataset.brand ?? '';
      const cardTrans = card.dataset.transmission ?? '';
      const matchBrand = brand === 'all' || cardBrand === brand;
      const matchTrans = transmission === 'all' || cardTrans === transmission;
      const show = matchBrand && matchTrans;
      card.hidden = !show;
      if (show) matched += 1;
    });

    setVisibleCount(matched);

    const emptyNotice = document.getElementById('showroom-empty-state');
    if (emptyNotice) {
      emptyNotice.hidden = matched > 0;
    }

    const url = new URL(window.location.href);
    if (brand === 'all') url.searchParams.delete('marke');
    else url.searchParams.set('marke', brand);

    if (transmission === 'all') url.searchParams.delete('getriebe');
    else url.searchParams.set('getriebe', transmission);

    window.history.replaceState({}, '', url.toString());
  }, [brand, transmission]);

  const hasActiveFilters = brand !== 'all' || transmission !== 'all';

  return (
    <search
      aria-label="Fahrzeugbestand filtern"
      class="rounded-lg border border-border-subtle bg-surface p-4 sm:p-5"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="filter-brand"
              class="mb-1.5 block font-mono text-xs font-medium tracking-wider text-ink-muted uppercase"
            >
              Marke
            </label>
            <select
              id="filter-brand"
              name="marke"
              value={brand}
              onChange={(e) => setBrand(e.currentTarget.value)}
              class="ak-select"
            >
              <option value="all">Alle Marken ({totalCount})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-transmission"
              class="mb-1.5 block font-mono text-xs font-medium tracking-wider text-ink-muted uppercase"
            >
              Getriebeart
            </label>
            <select
              id="filter-transmission"
              name="getriebe"
              value={transmission}
              onChange={(e) => setTransmission(e.currentTarget.value)}
              class="ak-select"
            >
              <option value="all">Alle Getriebearten</option>
              {transmissions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 lg:justify-end">
          <p
            aria-live="polite"
            class="font-mono text-xs text-ink-muted"
            data-showroom-count
          >
            <strong class="text-ink">{visibleCount}</strong> von {totalCount}{' '}
            {visibleCount === 1 ? 'Fahrzeug' : 'Fahrzeugen'} angezeigt
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setBrand('all');
                setTransmission('all');
              }}
              class="inline-flex min-h-11 items-center rounded-md border border-border-control bg-canvas px-3.5 py-2 text-xs font-semibold text-gold transition-colors hover:border-gold"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>
    </search>
  );
}
