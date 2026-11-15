import { describe, expect, it } from 'vitest';
import { getDb } from '@/db/client';
import {
  getProductBySlug,
  listProductModelFacets,
  resolveLegacyProductSlug,
  searchProducts,
} from '@/db/queries/products';
import { createTestD1 } from '../helpers/test-d1';

describe('D1 Ricambi Originali Product Catalog & Wix Migration', () => {
  it('seeds all 96 deduplicated OEM parts without -1 duplicates and fixes Wix typos', async () => {
    const db = await getDb(createTestD1());
    const all = await searchProducts({}, db);

    expect(all.length).toBe(96);

    // 086927755E Gearbox ECU Murciélago deduplicated to 1 entry with canonical price 1.131,12 €
    const ecuHits = await searchProducts({ query: '086927755E' }, db);
    expect(ecuHits).toHaveLength(1);
    expect(ecuHits[0]?.priceCents).toBe(113112);
    expect(ecuHits[0]?.availableStock).toBe(1);
    expect(ecuHits[0]?.title).toContain('Murciélago');

    // Typo fixes verified: "Codant" -> "Coolant", "Sitch" -> "Switch", "Shook" -> "Shock"
    const coolantHits = await searchProducts({ query: '001726334' }, db);
    expect(coolantHits[0]?.title).toContain('Coolant');
    expect(coolantHits[0]?.title).not.toContain('Codant');

    const switchHits = await searchProducts({ query: '410919815' }, db);
    expect(switchHits[0]?.title).toContain('Switch');
    expect(switchHits[0]?.title).not.toContain('Sitch');
  });

  it('supports fast filtering by Lamborghini model, normalized OEM number, and stock availability', async () => {
    const db = await getDb(createTestD1());

    // Search with spaces/dashes in OEM number
    const spacedHit = await searchProducts({ query: '400 945 095 P' }, db);
    expect(spacedHit).toHaveLength(1);
    expect(spacedHit[0]?.oemNumber).toBe('400945095P');

    const countachParts = await searchProducts({ modelSlug: 'countach' }, db);
    expect(countachParts.length).toBeGreaterThanOrEqual(8);
    expect(
      countachParts.every((p) => p.models.some((m) => m.slug === 'countach'))
    ).toBe(true);

    const facets = await listProductModelFacets(db);
    expect(facets.some((f) => f.slug === 'diablo')).toBe(true);
    expect(facets.some((f) => f.slug === 'murcielago')).toBe(true);
    expect(facets.some((f) => f.slug === 'lm002')).toBe(true);
  });

  it('resolves all legacy Wix /product-page/* slugs (including -1 duplicates and umlauts) to canonical /shop/[slug]', async () => {
    const db = await getDb(createTestD1());

    const slugA = await resolveLegacyProductSlug('gearbox-ecu-murcielago', db);
    const slugB = await resolveLegacyProductSlug('gearbox-ecu-murcielago-1', db);
    expect(slugA).toBeTruthy();
    expect(slugA).toBe(slugB);

    const targetProduct = await getProductBySlug(slugA!, db);
    expect(targetProduct?.oemNumber).toBe('086927755E');

    const umlautTarget = await resolveLegacyProductSlug(
      encodeURIComponent('rückleuchte-links-gallardo-560'),
      db
    );
    expect(umlautTarget).toContain('400945095p');
  });
});
