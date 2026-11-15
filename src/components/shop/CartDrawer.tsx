import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  SHIPPING_RATES,
  type ShippingZone,
  calculateIncludedVatCents,
  calculateShippingCents,
  cartItemsStore,
  cartSubtotalCentsStore,
  hydrateCartFromStorage,
  removeFromCart,
  shippingZoneStore,
  updateCartItemQuantity,
} from '@/lib/cart.store';
import { formatEurCents } from '@/lib/format';

export default function CartDrawer() {
  const items = useStore(cartItemsStore);
  const subtotalCents = useStore(cartSubtotalCentsStore);
  const shippingZone = useStore(shippingZoneStore);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pointerDownOutsideRef = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');

  const shippingCents = calculateShippingCents(subtotalCents, shippingZone);
  const totalCents = subtotalCents + shippingCents;
  const includedVatCents = calculateIncludedVatCents(totalCents, 19);

  const openDrawer = () => {
    hydrateCartFromStorage();
    setCheckoutError(null);
    const dlg = dialogRef.current;
    if (dlg && !dlg.open) {
      dlg.showModal();
    }
  };

  const closeDrawer = () => {
    const dlg = dialogRef.current;
    if (dlg && dlg.open) {
      dlg.close();
    }
  };

  useEffect(() => {
    hydrateCartFromStorage();

    const handleOpenEvent = () => openDrawer();
    window.addEventListener('ak:open-cart', handleOpenEvent);

    const triggers = document.querySelectorAll<HTMLElement>('[data-cart-open]');
    const onTriggerClick = (e: Event) => {
      e.preventDefault();
      openDrawer();
    };
    triggers.forEach((el) => el.addEventListener('click', onTriggerClick));

    return () => {
      window.removeEventListener('ak:open-cart', handleOpenEvent);
      triggers.forEach((el) => el.removeEventListener('click', onTriggerClick));
    };
  }, []);

  const handlePointerDown = (e: PointerEvent) => {
    const dlg = dialogRef.current;
    if (!dlg || "closedBy" in HTMLDialogElement.prototype) return;
    const rect = dlg.getBoundingClientRect();
    pointerDownOutsideRef.current =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
  };

  const handlePointerUp = (e: PointerEvent) => {
    const dlg = dialogRef.current;
    if (!dlg || !pointerDownOutsideRef.current || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }
    const rect = dlg.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside && dlg.open) {
      dlg.close();
    }
    pointerDownOutsideRef.current = false;
  };

  const handleCheckout = async () => {
    if (items.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingZone,
          customerEmail: customerEmail.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !data?.checkoutUrl) {
        setCheckoutError(
          data?.error ??
            'Checkout konnte nicht gestartet werden. Bitte überprüfen Sie den Lagerbestand.'
        );
        setIsSubmitting(false);
        return;
      }

      window.location.assign(data.checkoutUrl);
    } catch {
      setCheckoutError(
        'Netzwerkfehler beim Verbindungsaufbau zum Checkout. Bitte versuchen Sie es erneut.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-label="Warenkorb — Ricambi Originali Shop"
      class="cart-drawer"
      data-cart-drawer
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Header */}
      <div class="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 class="font-display text-lg font-semibold text-ink">Warenkorb</h2>
          <p class="font-mono text-[11px] text-gold uppercase">
            Ricambi Originali · Stripe Sandbox
          </p>
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Warenkorb schließen"
          data-cart-close
          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border-control bg-canvas px-3 text-sm font-semibold text-ink hover:border-gold hover:text-gold"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div class="flex-1 overflow-y-auto px-5 py-4">
        {items.length === 0 ? (
          <div class="flex h-full flex-col items-center justify-center py-12 text-center">
            <p class="font-display text-lg font-medium text-ink">
              Ihr Warenkorb ist aktuell leer.
            </p>
            <p class="mt-2 max-w-xs text-sm text-ink-muted">
              Durchsuchen Sie unseren Katalog nach OEM-Teilenummern oder Lamborghini-Baureihen.
            </p>
            <a
              href="/shop"
              onClick={closeDrawer}
              class="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-5 py-2.5 text-xs font-semibold text-canvas hover:bg-gold-hover"
            >
              Zum Ersatzteil-Katalog →
            </a>
          </div>
        ) : (
          <ul class="divide-y divide-border-subtle" data-cart-list>
            {items.map((item) => (
              <li key={item.productId} class="flex gap-3.5 py-4" data-cart-item={item.oemNumber}>
                <a
                  href={`/shop/${item.slug}`}
                  onClick={closeDrawer}
                  class="h-18 w-22 shrink-0 overflow-hidden rounded border border-border-subtle bg-canvas"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    width={96}
                    height={72}
                    loading="lazy"
                    class="h-full w-full object-cover"
                  />
                </a>
                <div class="flex flex-1 flex-col justify-between">
                  <div>
                    <span class="font-mono text-[11px] font-semibold text-gold">
                      OEM {item.oemNumber}
                    </span>
                    <a
                      href={`/shop/${item.slug}`}
                      onClick={closeDrawer}
                      class="block text-sm font-medium leading-snug text-ink hover:text-gold"
                    >
                      {item.title}
                    </a>
                  </div>

                  <div class="mt-2 flex items-center justify-between gap-2">
                    <div class="flex items-center rounded border border-border-control bg-canvas">
                      <button
                        type="button"
                        aria-label={`Menge verringern für ${item.title}`}
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                        class="inline-flex h-8 w-8 items-center justify-center font-mono text-sm text-ink hover:text-gold"
                      >
                        −
                      </button>
                      <span
                        class="min-w-7 text-center font-mono text-xs font-semibold text-ink"
                        data-cart-item-qty={item.oemNumber}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.maxStock}
                        aria-label={`Menge erhöhen für ${item.title}`}
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                        class="inline-flex h-8 w-8 items-center justify-center font-mono text-sm text-ink hover:text-gold disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        +
                      </button>
                    </div>

                    <div class="text-right">
                      <p class="font-mono text-sm font-semibold text-ink">
                        {formatEurCents(item.priceCents * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        class="text-[11px] text-ink-muted underline hover:text-danger"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Summary & Checkout Trigger */}
      {items.length > 0 && (
        <div class="border-t border-border-subtle bg-canvas/85 p-5">
          <div class="mb-3">
            <label
              htmlFor="cart-shipping-zone"
              class="mb-1 block font-mono text-[11px] text-ink-muted uppercase"
            >
              Lieferland / Versandzone
            </label>
            <select
              id="cart-shipping-zone"
              value={shippingZone}
              onChange={(e) =>
                shippingZoneStore.set(e.currentTarget.value as ShippingZone)
              }
              class="ak-select py-2 text-xs"
            >
              {(Object.keys(SHIPPING_RATES) as ShippingZone[]).map((zone) => (
                <option key={zone} value={zone}>
                  {SHIPPING_RATES[zone].label}
                </option>
              ))}
            </select>
          </div>

          <div class="mb-3">
            <label
              htmlFor="cart-customer-email"
              class="mb-1 block font-mono text-[11px] text-ink-muted uppercase"
            >
              E-Mail für Bestellbestätigung (optional vorab)
            </label>
            <input
              id="cart-customer-email"
              type="email"
              value={customerEmail}
              onInput={(e) => setCustomerEmail(e.currentTarget.value)}
              placeholder="name@beispiel.de"
              autocorrect="off"
              autocapitalize="none"
              spellcheck={false}
              autocomplete="email"
              class="ak-input py-2 text-sm"
            />
          </div>

          <dl class="space-y-1.5 border-t border-border-subtle pt-3 text-xs">
            <div class="flex justify-between text-ink-muted">
              <dt>Zwischensumme</dt>
              <dd class="font-mono text-ink">{formatEurCents(subtotalCents)}</dd>
            </div>
            <div class="flex justify-between text-ink-muted">
              <dt>Versicherter Versand</dt>
              <dd class="font-mono text-ink">
                {shippingCents === 0 ? '0,00 € (Versandfrei)' : formatEurCents(shippingCents)}
              </dd>
            </div>
            <div class="flex justify-between border-t border-border-subtle pt-2 text-sm font-semibold text-ink">
              <dt>Gesamtsumme (inkl. 19 % MwSt.)</dt>
              <dd class="font-mono text-base text-gold" data-cart-total>
                {formatEurCents(totalCents)}
              </dd>
            </div>
            <div class="flex justify-between text-[11px] text-ink-muted">
              <dt>Enthaltene MwSt. (19 %)</dt>
              <dd class="font-mono">{formatEurCents(includedVatCents)}</dd>
            </div>
          </dl>

          {checkoutError && (
            <div
              role="alert"
              class="mt-3 rounded-md border border-danger-border bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              ⚠ {checkoutError}
            </div>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckout}
            data-cart-checkout-btn
            class="mt-4 flex min-h-12 w-full items-center justify-center rounded-md bg-gold px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-gold-hover disabled:opacity-60"
          >
            {isSubmitting ? 'Reserviere Bestand…' : 'Zur Kasse (Stripe Sandbox) →'}
          </button>

          <p class="mt-2.5 text-center text-[11px] text-ink-muted">
            Es gelten unsere{' '}
            <a href="/agb" class="underline hover:text-ink">AGB</a>,{' '}
            <a href="/widerruf" class="underline hover:text-ink">14 Tage Widerrufsrecht</a> &amp;{' '}
            <a href="/versand" class="underline hover:text-ink">Versandbedingungen</a>.
          </p>
        </div>
      )}
    </dialog>
  );
}
