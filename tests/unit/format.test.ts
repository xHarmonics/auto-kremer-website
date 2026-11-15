import { describe, expect, it } from 'vitest';
import {
  formatEurCents,
  formatMileageKm,
  formatPower,
  formatVehiclePriceDisplay,
  parseGermanEuroToCents,
  parseGermanInt,
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

  it('parses German formatted integers and Euro prices accurately without precision loss', () => {
    expect(parseGermanInt('28.500')).toBe(28500);
    expect(parseGermanInt('1.250.000')).toBe(1250000);
    expect(parseGermanInt('28 500')).toBe(28500);
    expect(parseGermanInt('0')).toBe(0);
    expect(parseGermanInt(19400)).toBe(19400);
    expect(Number.isNaN(parseGermanInt('28.5'))).toBe(true);
    expect(Number.isNaN(parseGermanInt('-100'))).toBe(true);
    expect(Number.isNaN(parseGermanInt('abc'))).toBe(true);

    expect(parseGermanEuroToCents('1.290,50')).toBe(129050);
    expect(parseGermanEuroToCents('1290,50')).toBe(129050);
    expect(parseGermanEuroToCents('199,5')).toBe(19950);
    expect(parseGermanEuroToCents('1798.30')).toBe(179830);
    expect(parseGermanEuroToCents('295.000')).toBe(29500000);
    expect(parseGermanEuroToCents('295.000 €')).toBe(29500000);
    expect(parseGermanEuroToCents(2890)).toBe(289000);
    expect(Number.isNaN(parseGermanEuroToCents(''))).toBe(true);
    expect(Number.isNaN(parseGermanEuroToCents('-50'))).toBe(true);
    expect(Number.isNaN(parseGermanEuroToCents('12.34.56'))).toBe(true);
  });
});
