import { useEffect, useMemo, useState } from 'preact/hooks';
import type {
  CategoryFacet,
  ModelFacet,
  ProductWithModels,
} from '@/db/queries/products';
import { addToCart, openCartDrawer } from '@/lib/cart.store';
import { formatEurCents } from '@/lib/format';

interface Props {
  initialProducts: ProductWithModels[];
  modelFacets: ModelFacet[];
  categoryFacets: CategoryFacet[];
  initialQuery?: string;
  initialModel?: string;
  initialCategory?: string;
  initialInStockOnly?: boolean;
}

export default function ShopCatalogExplorer({
  initialProducts,
  modelFacets,
  categoryFacets,
  initialQuery = '',
  initialModel = 'all',
  initialCategory = 'all',
  initialInStockOnly = false,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [modelSlug, setModelSlug] = useState(initialModel);
  const [category, setCategory] = useState(initialCategory);
  const [inStockOnly, setInStockOnly] = useState(initialInStockOnly);
  const [addedFeedbackId, setAddedFeedbackId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const m = params.get('modell');
    const c = params.get('kategorie');
    const l = params.get('lager');

    const domInput = document.getElementById('oem-search-input') as HTMLInputElement | null;
    if (domInput && domInput.value !== initialQuery) {
      setQuery(domInput.value);
    } else if (q !== null) {
      setQuery(q);
    }

    const domModel = document.getElementById('shop-model-filter') as HTMLSelectElement | null;
    if (domModel && domModel.value && domModel.value !== initialModel) {
      setModelSlug(domModel.value);
    } else if (m) {
      setModelSlug(m);
    }

    const domCat = document.getElementById('shop-category-filter') as HTMLSelectElement | null;
    if (domCat && domCat.value && domCat.value !== initialCategory) {
      setCategory(domCat.value);
    } else if (c) {
      setCategory(c);
    }

    if (l === '1') setInStockOnly(true);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');

    if (modelSlug !== 'all') url.searchParams.set('modell', modelSlug);
    else url.searchParams.delete('modell');

    if (category !== 'all') url.searchParams.set('kategorie', category);
    else url.searchParams.delete('kategorie');

    if (inStockOnly) url.searchParams.set('lager', '1');
    else url.searchParams.delete('lager');

    window.history.replaceState({}, '', url.toString());
  }, [query, modelSlug, category, inStockOnly]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const normOem = q.replace(/[^a-z0-9]/g, '').toUpperCase();

    return initialProducts.filter((p) => {
      if (modelSlug !== 'all' && !p.models.some((m) => m.slug === modelSlug)) {
        return false;
      }
      if (category !== 'all' && p.category !== category) {
        return false;
      }
      if (inStockOnly && (p.availableStock <= 0 || p.priceCents <= 0)) {
        return false;
      }
      if (!q) return true;

      const matchOem =
        p.oemNumber.toLowerCase().includes(q) ||
        (normOem.length >= 2 && p.oemNormalized.includes(normOem));
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      const matchModel = p.models.some((m) => m.label.toLowerCase().includes(q));

      return matchOem || matchTitle || matchCat || matchModel;
    });
  }, [initialProducts, query, modelSlug, category, inStockOnly]);

  const hasFilters =
    query.trim() !== '' ||
    modelSlug !== 'all' ||
    category !== 'all' ||
    inStockOnly;

  const handleQuickAdd = (product: ProductWithModels) => {
    const res = addToCart(
      {
        productId: product.id,
        slug: product.slug,
        oemNumber: product.oemNumber,
        title: product.title,
        priceCents: product.priceCents,
        maxStock: product.availableStock,
        imageUrl: product.imageUrl,
      },
      1
    );
    if (res.added) {
      setAddedFeedbackId(product.id);
      setTimeout(() => setAddedFeedbackId(null), 1600);
    }
    openCartDrawer();
  };

  return (
    <div>
      {/* Search & Filter Console */}
      <search
        aria-label="Lamborghini Ersatzteilkatalog nach OEM-Teilenummer und Modell durchsuchen"
        class="rounded-xl border border-border-subtle bg-surface p-5 sm:p-6"
      >
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <label
              htmlFor="oem-search-input"
              class="mb-1.5 block font-mono text-xs font-medium tracking-wider text-gold uppercase"
            >
              OEM-Teilenummer oder Bauteil suchen
            </label>
            <input
              id="oem-search-input"
              type="search"
              name="q"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder="z. B. 086927755E, 400945095P, Gearbox ECU, Rückleuchte..."
              autocorrect="off"
              autocapitalize="none"
              spellcheck={false}
              autocomplete="off"
              class="ak-input font-mono text-sm"
            />
          </div>

          <div class="lg:col-span-3">
            <label
              htmlFor="shop-model-filter"
              class="mb-1.5 block font-mono text-xs font-medium tracking-wider text-ink-muted uppercase"
            >
              Lamborghini Baureihe
            </label>
            <select
              id="shop-model-filter"
              name="modell"
              value={modelSlug}
              onChange={(e) => setModelSlug(e.currentTarget.value)}
              class="ak-select"
            >
              <option value="all">Alle Baureihen</option>
              {modelFacets.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.label} ({m.count})
                </option>
              ))}
            </select>
          </div>

          <div class="lg:col-span-4">
            <label
              htmlFor="shop-category-filter"
              class="mb-1.5 block font-mono text-xs font-medium tracking-wider text-ink-muted uppercase"
            >
              Baugruppe
            </label>
            <select
              id="shop-category-filter"
              name="kategorie"
              value={category}
              onChange={(e) => setCategory(e.currentTarget.value)}
              class="ak-select"
            >
              <option value="all">Alle Baugruppen</option>
              {categoryFacets.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Model Pills + Availability Toggle */}
        <div class="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-4">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModelSlug('all')}
              aria-pressed={modelSlug === 'all'}
              class={`min-h-9 rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                modelSlug === 'all'
                  ? 'border-gold bg-gold text-canvas font-semibold'
                  : 'border-border-subtle bg-canvas text-ink-muted hover:border-gold/60 hover:text-ink'
              }`}
            >
              Alle
            </button>
            {modelFacets.slice(0, 8).map((m) => {
              const active = modelSlug === m.slug;
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setModelSlug(active ? 'all' : m.slug)}
                  aria-pressed={active}
                  class={`min-h-9 rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                    active
                      ? 'border-gold bg-gold text-canvas font-semibold'
                      : 'border-border-subtle bg-canvas text-ink-muted hover:border-gold/60 hover:text-ink'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <label class="inline-flex min-h-9 cursor-pointer items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.currentTarget.checked)}
              />
              <span>Nur sofort lieferbare Teile</span>
            </label>

            <span
              aria-live="polite"
              data-shop-result-count
              class="font-mono text-xs text-ink-muted"
            >
              <strong class="text-ink">{filtered.length}</strong>{' '}
              {filtered.length === 1 ? 'Ersatzteil' : 'Ersatzteile'}
            </span>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setModelSlug('all');
                  setCategory('all');
                  setInStockOnly(false);
                }}
                class="font-mono text-xs font-semibold text-gold underline hover:text-gold-hover"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      </search>

      {/* Product Results Grid */}
      {filtered.length === 0 ? (
        <div class="mt-8 rounded-xl border border-border-subtle bg-surface p-10 text-center">
          <h2 class="font-display text-xl font-semibold text-ink">
            Kein passendes Ersatzteil im Online-Katalog gefunden
          </h2>
          <p class="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
            Unser physisches Ricambi-Originali-Lager in Bonn umfasst weit mehr Positionen als der Online-Auszug. Senden Sie uns Ihre gesuchte Teilenummer oder Fahrgestellnummer (FIN).
          </p>
          <a
            href={`/kontakt?thema=ersatzteil&teil=${encodeURIComponent(query || 'OEM-Ersatzteilanfrage')}`}
            class="mt-6 inline-flex min-h-12 items-center justify-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-canvas hover:bg-gold-hover"
          >
            Teilenummer direkt anfragen →
          </a>
        </div>
      ) : (
        <div
          class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-shop-grid
        >
          {filtered.map((product) => {
            const inStock = product.availableStock > 0 && product.priceCents > 0;
            const inquiryHref = `/kontakt?thema=ersatzteil&teil=${encodeURIComponent(
              `${product.oemNumber} - ${product.title}`
            )}`;
            const justAdded = addedFeedbackId === product.id;

            return (
              <article
                key={product.id}
                data-product-card
                data-oem={product.oemNumber}
                class="group flex flex-col justify-between overflow-hidden rounded-lg border border-border-subtle bg-surface transition-colors hover:border-gold/60 hover:bg-surface-elevated"
              >
                <div>
                  <a
                    href={`/shop/${product.slug}`}
                    class="relative block aspect-[4/3] overflow-hidden bg-canvas"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      width={480}
                      height={360}
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span class="rounded border border-gold/50 bg-canvas/90 px-2 py-0.5 font-mono text-xs font-semibold text-gold backdrop-blur-sm">
                        {product.oemNumber}
                      </span>
                      {product.condition === 'used_tested' && (
                        <span class="rounded border border-border-control bg-canvas/90 px-2 py-0.5 font-mono text-[10px] text-ink-muted uppercase">
                          Geprüft gebraucht
                        </span>
                      )}
                    </div>
                  </a>

                  <div class="p-4 sm:p-5">
                    <div class="flex flex-wrap gap-1.5">
                      {product.models.length > 0 ? (
                        product.models.slice(0, 3).map((m) => (
                          <span
                            key={m.slug}
                            class="rounded bg-canvas px-2 py-0.5 font-mono text-[10px] text-ink-muted uppercase"
                          >
                            {m.label}
                          </span>
                        ))
                      ) : (
                        <span class="rounded bg-canvas px-2 py-0.5 font-mono text-[10px] text-ink-muted uppercase">
                          Ricambi Originali
                        </span>
                      )}
                    </div>

                    <h2 class="mt-2.5 font-display text-base font-semibold leading-snug text-ink transition-colors group-hover:text-gold">
                      <a href={`/shop/${product.slug}`}>{product.title}</a>
                    </h2>

                    <p class="mt-2.5 flex items-center gap-1.5 font-mono text-xs">
                      {inStock ? (
                        <>
                          <span aria-hidden="true" class="text-status-available">
                            ●
                          </span>
                          <span class="text-status-available">
                            Auf Lager ({product.availableStock} Stk.)
                          </span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden="true" class="text-ink-muted">
                            ○
                          </span>
                          <span class="text-ink-muted">
                            Nicht vorrätig · Auf Anfrage
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div class="border-t border-border-subtle p-4 pt-3.5 sm:p-5 sm:pt-4">
                  <div class="mb-3">
                    <p class="font-mono text-lg font-semibold text-ink">
                      {product.priceCents > 0
                        ? formatEurCents(product.priceCents)
                        : 'Preis auf Anfrage'}
                    </p>
                    <p class="text-[11px] text-ink-muted">
                      inkl. 19 % MwSt., zzgl.{' '}
                      <a href="/versand" class="underline hover:text-gold">
                        Versandkosten
                      </a>
                    </p>
                  </div>

                  {inStock ? (
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product)}
                        data-add-to-cart={product.oemNumber}
                        class="flex min-h-11 flex-1 items-center justify-center rounded-md bg-gold px-3.5 py-2 text-xs font-semibold text-canvas transition-colors hover:bg-gold-hover"
                      >
                        {justAdded ? '✓ Im Warenkorb' : 'In den Warenkorb'}
                      </button>
                      <a
                        href={`/shop/${product.slug}`}
                        aria-label={`Details zu ${product.oemNumber} ${product.title}`}
                        class="inline-flex min-h-11 items-center justify-center rounded-md border border-border-control bg-canvas px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
                      >
                        Details
                      </a>
                    </div>
                  ) : (
                    <a
                      href={inquiryHref}
                      data-inquire-part={product.oemNumber}
                      class="flex min-h-11 w-full items-center justify-center rounded-md border border-border-control bg-canvas px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-gold hover:text-gold"
                    >
                      Verfügbarkeit anfragen →
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
