import { useState } from 'preact/hooks';
import { addToCart, openCartDrawer } from '@/lib/cart.store';

interface Props {
  product: {
    id: number;
    slug: string;
    oemNumber: string;
    title: string;
    priceCents: number;
    availableStock: number;
    imageUrl: string;
  };
}

export default function AddToCartButton({ product }: Props) {
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const inStock = product.availableStock > 0 && product.priceCents > 0;
  const inquiryHref = `/kontakt?thema=ersatzteil&teil=${encodeURIComponent(
    `${product.oemNumber} - ${product.title}`
  )}`;

  if (!inStock) {
    return (
      <div class="space-y-3">
        <p class="rounded-md border border-border-subtle bg-canvas px-3.5 py-2.5 font-mono text-xs text-ink-muted">
          ○ Derzeit nicht ab Online-Lager bestellbar — gerne prüfen wir unseren erweiterten Werkstattbestand oder eine Werksbestellung.
        </p>
        <a
          href={inquiryHref}
          class="flex min-h-12 w-full items-center justify-center rounded-md border border-gold bg-canvas px-5 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold hover:text-canvas"
        >
          Verfügbarkeit &amp; Lieferzeit anfragen →
        </a>
      </div>
    );
  }

  const handleAdd = () => {
    const result = addToCart(
      {
        productId: product.id,
        slug: product.slug,
        oemNumber: product.oemNumber,
        title: product.title,
        priceCents: product.priceCents,
        maxStock: product.availableStock,
        imageUrl: product.imageUrl,
      },
      qty
    );

    if (result.clamped || (!result.added && result.quantity >= product.availableStock)) {
      setFeedback(
        `Maximale Lagermenge (${product.availableStock} Stk.) befindet sich bereits im Warenkorb.`
      );
    } else {
      setFeedback('✓ Zum Warenkorb hinzugefügt');
    }
    openCartDrawer();
  };

  return (
    <div class="space-y-3">
      <div class="flex flex-col gap-3 sm:flex-row">
        {product.availableStock > 1 && (
          <div class="flex items-center rounded-md border border-border-control bg-canvas">
            <button
              type="button"
              aria-label="Menge verringern"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              class="inline-flex min-h-12 min-w-11 items-center justify-center font-mono text-lg text-ink hover:text-gold"
            >
              −
            </button>
            <span
              aria-live="polite"
              class="min-w-10 text-center font-mono text-sm font-semibold text-ink"
            >
              {qty}
            </span>
            <button
              type="button"
              aria-label="Menge erhöhen"
              onClick={() => setQty((q) => Math.min(product.availableStock, q + 1))}
              class="inline-flex min-h-12 min-w-11 items-center justify-center font-mono text-lg text-ink hover:text-gold"
            >
              +
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          data-product-add-btn
          class="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-gold-hover"
        >
          <span>In den Warenkorb legen</span>
        </button>
      </div>

      {product.availableStock === 1 && (
        <p class="font-mono text-xs text-gold">
          ◆ Einzelstück am Lager Bonn (max. 1 Stück bestellbar)
        </p>
      )}

      {feedback && (
        <p role="status" class="font-mono text-xs text-status-available">
          {feedback}
        </p>
      )}
    </div>
  );
}
