import { atom, computed } from 'nanostores';

export const CART_STORAGE_KEY = 'ak_cart_v1';

export type ShippingZone = 'DE' | 'EU' | 'WORLD';

export interface CartItem {
  productId: number;
  slug: string;
  oemNumber: string;
  title: string;
  priceCents: number;
  maxStock: number;
  quantity: number;
  imageUrl: string;
}

export const SHIPPING_RATES: Record<
  ShippingZone,
  { label: string; baseCents: number; freeThresholdCents: number | null }
> = {
  DE: {
    label: 'Deutschland (Versichertes Paket inkl. Sendungsverfolgung)',
    baseCents: 990,
    freeThresholdCents: 50000,
  },
  EU: {
    label: 'Europäische Union (DHL / UPS Express versichert)',
    baseCents: 2490,
    freeThresholdCents: null,
  },
  WORLD: {
    label: 'Weltweit / Schweiz / UK / USA (Express versichert)',
    baseCents: 5900,
    freeThresholdCents: null,
  },
};

export const cartItemsStore = atom<CartItem[]>([]);
export const shippingZoneStore = atom<ShippingZone>('DE');
export const cartInitializedStore = atom<boolean>(false);

function notifyBrowserCartChanged(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('ak:cart-updated', { detail: items }));
  } catch {
    // Ignore storage quota errors
  }
}

export function hydrateCartFromStorage(): void {
  if (typeof window === 'undefined' || cartInitializedStore.get()) return;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized: CartItem[] = parsed
          .filter(
            (x) =>
              x &&
              typeof x.productId === 'number' &&
              typeof x.slug === 'string' &&
              typeof x.priceCents === 'number' &&
              x.priceCents > 0 &&
              typeof x.maxStock === 'number' &&
              x.maxStock > 0
          )
          .map((x) => ({
            productId: x.productId,
            slug: x.slug,
            oemNumber: String(x.oemNumber ?? ''),
            title: String(x.title ?? ''),
            priceCents: Math.round(x.priceCents),
            maxStock: Math.max(1, Math.floor(x.maxStock)),
            quantity: Math.min(
              Math.max(1, Math.floor(Number(x.quantity) || 1)),
              Math.max(1, Math.floor(x.maxStock))
            ),
            imageUrl: String(x.imageUrl || '/media/parts/ricambi-blueprint.svg'),
          }));
        cartItemsStore.set(sanitized);
      }
    }
  } catch {
    // Ignore malformed storage entries
  } finally {
    cartInitializedStore.set(true);
  }
}

export function addToCart(
  product: Omit<CartItem, 'quantity'>,
  requestedQty = 1
): { added: boolean; clamped: boolean; quantity: number } {
  hydrateCartFromStorage();
  if (product.maxStock <= 0 || product.priceCents <= 0 || requestedQty <= 0) {
    return { added: false, clamped: false, quantity: 0 };
  }

  const current = [...cartItemsStore.get()];
  const existingIdx = current.findIndex((i) => i.productId === product.productId);

  if (existingIdx >= 0) {
    const existing = current[existingIdx]!;
    const effectiveMax = Math.max(1, product.maxStock);
    const desired = existing.quantity + requestedQty;
    const nextQty = Math.min(effectiveMax, desired);
    const clamped = desired > effectiveMax;
    current[existingIdx] = {
      ...existing,
      priceCents: product.priceCents,
      maxStock: effectiveMax,
      quantity: nextQty,
    };
    cartItemsStore.set(current);
    notifyBrowserCartChanged(current);
    return { added: nextQty > existing.quantity, clamped, quantity: nextQty };
  }

  const nextQty = Math.min(product.maxStock, requestedQty);
  const clamped = requestedQty > product.maxStock;
  const created: CartItem = {
    ...product,
    quantity: nextQty,
  };
  const updated = [...current, created];
  cartItemsStore.set(updated);
  notifyBrowserCartChanged(updated);
  return { added: true, clamped, quantity: nextQty };
}

export function updateCartItemQuantity(productId: number, quantity: number): void {
  hydrateCartFromStorage();
  const current = [...cartItemsStore.get()];
  const idx = current.findIndex((i) => i.productId === productId);
  if (idx === -1) return;

  if (quantity <= 0) {
    current.splice(idx, 1);
  } else {
    const item = current[idx]!;
    current[idx] = {
      ...item,
      quantity: Math.min(item.maxStock, Math.floor(quantity)),
    };
  }
  cartItemsStore.set(current);
  notifyBrowserCartChanged(current);
}

export function removeFromCart(productId: number): void {
  updateCartItemQuantity(productId, 0);
}

export function clearCart(): void {
  cartItemsStore.set([]);
  notifyBrowserCartChanged([]);
}

export function calculateShippingCents(
  subtotalCents: number,
  zone: ShippingZone = 'DE'
): number {
  if (subtotalCents <= 0) return 0;
  const cfg = SHIPPING_RATES[zone];
  if (cfg.freeThresholdCents !== null && subtotalCents >= cfg.freeThresholdCents) {
    return 0;
  }
  return cfg.baseCents;
}

export function calculateIncludedVatCents(
  grossTotalCents: number,
  vatRatePercent = 19
): number {
  if (grossTotalCents <= 0) return 0;
  const netCents = Math.round(grossTotalCents / (1 + vatRatePercent / 100));
  return grossTotalCents - netCents;
}

export const cartCountStore = computed(cartItemsStore, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);

export const cartSubtotalCentsStore = computed(cartItemsStore, (items) =>
  items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
);

export function openCartDrawer(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ak:open-cart'));
  }
}
