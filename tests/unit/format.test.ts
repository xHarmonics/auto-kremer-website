import { describe, expect, it } from 'vitest';
import {
  formatEurCents,
  formatMileageKm,
  formatPower,
  formatVehiclePriceDisplay,
} from '@/lib/format';

describe('German de-DE Automotive & Currency Formatting', () => {
  it('formats cents and vehicle prices according to German conventions and § 25a UStG', () => {
    expect(formatEurCents(179830)).toContain('1.798,30');
    expect(formatEurCents(179830)).toContain('€');

    const gallardo = formatVehiclePriceDisplay({
      priceCents: 13890000,
      priceOnRequest: false,
      vatDeductible: false,
      status: 'available',
    });
    expect(gallardo.primary).toContain('138.900');
    expect(gallardo.taxNote).toContain('§ 25a UStG');

    const poa = formatVehiclePriceDisplay({
      priceCents: null,
      priceOnRequest: true,
      vatDeductible: false,
      status: 'available',
    });
    expect(poa.primary).toBe('Preis auf Anfrage');

    const sold = formatVehiclePriceDisplay({
      priceCents: null,
      priceOnRequest: true,
      vatDeductible: false,
      status: 'sold',
    });
    expect(sold.primary).toBe('Verkauft');
  });

  it('formats mileage and power specs cleanly', () => {
    expect(formatMileageKm(34800)).toBe('34.800 km');
    expect(formatMileageKm(null)).toBe('Auf Anfrage');
    expect(formatPower(580, 426)).toBe('580 PS (426 kW)');
  });
});
