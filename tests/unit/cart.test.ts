import { beforeEach, describe, expect, it } from 'vitest';
import {
  addToCart,
  calculateIncludedVatCents,
  calculateShippingCents,
  cartCountStore,
  cartItemsStore,
  cartSubtotalCentsStore,
  clearCart,
  removeFromCart,
  updateCartItemQuantity,
} from '@/lib/cart.store';

describe('Persistent Cart Store & Stock Cap Enforcement', () => {
  beforeEach(() => {
    clearCart();
  });

  it('strictly caps cart quantity to maxStock (e.g. NOS stock = 1)', () => {
    const nosEcu = {
      productId: 7,
      slug: '086927755e-gearbox-ecu-murcielago',
      oemNumber: '086927755E',
      title: 'Gearbox ECU Murciélago',
      priceCents: 113112,
      maxStock: 1,
      imageUrl: '/media/parts/086927755e.avif',
    };

    const first = addToCart(nosEcu, 1);
    expect(first.added).toBe(true);
    expect(first.quantity).toBe(1);

    // Trying to add a second unit of a single-stock NOS item is clamped to 1
    const second = addToCart(nosEcu, 2);
    expect(second.added).toBe(false);
    expect(second.clamped).toBe(true);
    expect(cartCountStore.get()).toBe(1);
    expect(cartSubtotalCentsStore.get()).toBe(113112);
  });

  it('rejects out-of-stock or unpriced items and updates/removes multi-stock items cleanly', () => {
    const outOfStock = addToCart(
      {
        productId: 15,
        slug: '0074004842-guarnizione-diablo-gt',
        oemNumber: '0074004842',
        title: 'Guarnizione Diablo GT',
        priceCents: 623,
        maxStock: 0,
        imageUrl: '/media/parts/0074004842.avif',
      },
      1
    );
    expect(outOfStock.added).toBe(false);
    expect(cartItemsStore.get()).toHaveLength(0);

    addToCart(
      {
        productId: 11,
        slug: '008611703-water-pump-seal-countach',
        oemNumber: '008611703',
        title: 'Water Pump Seal Countach',
        priceCents: 17753,
        maxStock: 3,
        imageUrl: '/media/parts/008611703.avif',
      },
      2
    );
    expect(cartCountStore.get()).toBe(2);

    updateCartItemQuantity(11, 5);
    expect(cartCountStore.get()).toBe(3); // clamped to maxStock = 3

    removeFromCart(11);
    expect(cartCountStore.get()).toBe(0);
  });

  it('calculates shipping zones (free DE shipping >= 500 EUR) and 19% VAT breakdown accurately', () => {
    expect(calculateShippingCents(15000, 'DE')).toBe(990);
    expect(calculateShippingCents(50000, 'DE')).toBe(0);
    expect(calculateShippingCents(80000, 'EU')).toBe(2490);
    expect(calculateShippingCents(80000, 'WORLD')).toBe(5900);

    // 119,00 EUR gross includes exactly 19,00 EUR VAT
    expect(calculateIncludedVatCents(11900, 19)).toBe(1900);
  });
});
