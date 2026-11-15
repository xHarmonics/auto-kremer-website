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
