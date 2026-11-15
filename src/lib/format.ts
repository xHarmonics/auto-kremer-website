const eurFormatterCents = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurFormatterWhole = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('de-DE');

export function formatEurCents(cents: number): string {
  return eurFormatterCents.format(cents / 100);
}

export function formatVehicleEurWhole(cents: number): string {
  return eurFormatterWhole.format(Math.round(cents / 100));
}

export function formatVehiclePriceDisplay(input: {
  priceCents: number | null;
  priceOnRequest: boolean;
  vatDeductible: boolean;
  status: 'available' | 'reserved' | 'sold';
}): { primary: string; taxNote: string } {
  if (input.status === 'sold') {
    return {
      primary: 'Verkauft',
      taxNote: 'Vermittelte Sammler-Referenz',
    };
  }
  if (input.priceOnRequest || input.priceCents === null) {
    return {
      primary: 'Preis auf Anfrage',
      taxNote: input.vatDeductible
        ? '19 % MwSt. ausweisbar'
        : 'Differenzbesteuert gem. § 25a UStG',
    };
  }
  return {
    primary: formatVehicleEurWhole(input.priceCents),
    taxNote: input.vatDeductible
      ? 'inkl. 19 % MwSt. (ausweisbar)'
      : 'Differenzbesteuert gem. § 25a UStG',
  };
}

export function formatMileageKm(mileageKm: number | null | undefined): string {
  if (mileageKm === null || mileageKm === undefined) return 'Auf Anfrage';
  return `${numberFormatter.format(mileageKm)} km`;
}

export function formatPower(
  powerPs: number | null | undefined,
  powerKw: number | null | undefined
): string {
  if (powerPs && powerKw) {
    return `${numberFormatter.format(powerPs)} PS (${numberFormatter.format(powerKw)} kW)`;
  }
  if (powerPs) return `${numberFormatter.format(powerPs)} PS`;
  return 'k. A.';
}

export function formatDisplacementCc(cc: number | null | undefined): string {
  if (!cc) return 'k. A.';
  return `${numberFormatter.format(cc)} cm³`;
}

export function parseGermanInt(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 0 ? raw : Number.NaN;
  }
  const cleaned = raw.trim().replace(/[\s\u00a0\u202f]+/g, '');
  if (cleaned === '') return Number.NaN;
  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned);
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ''));
  }
  return Number.NaN;
}

export function parseGermanEuroToCents(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) : Number.NaN;
  }
  const cleaned = raw
    .trim()
    .replace(/(?:€|eur)\s*$/i, '')
    .replace(/[\s\u00a0\u202f]+/g, '');

  if (cleaned === '') return Number.NaN;

  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned) * 100;
  }

  const commaMatch = /^(\d+|\d{1,3}(?:\.\d{3})+),(\d{1,2})$/.exec(cleaned);
  if (commaMatch) {
    const euros = Number(commaMatch[1]!.replace(/\./g, ''));
    const cents = Number(commaMatch[2]!.padEnd(2, '0'));
    return euros * 100 + cents;
  }

  if (!cleaned.includes(',')) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
      return Number(cleaned.replace(/\./g, '')) * 100;
    }
    const dotDecimalMatch = /^(\d+)\.(\d{1,2})$/.exec(cleaned);
    if (dotDecimalMatch) {
      const euros = Number(dotDecimalMatch[1]!);
      const cents = Number(dotDecimalMatch[2]!.padEnd(2, '0'));
      return euros * 100 + cents;
    }
  }

  return Number.NaN;
}
