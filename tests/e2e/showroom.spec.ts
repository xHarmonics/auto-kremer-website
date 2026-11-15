import { expect, test } from '@playwright/test';

test.describe('Showroom & Referenzen End-to-End Journey', () => {
  test('filters /fahrzeuge, opens Porsche 993 RS detail page, navigates Lightbox via keyboard, and exposes Car JSON-LD without external CDN calls', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('wixstatic.com') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/fahrzeuge');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toContainText('Sportwagen');

    // All 5 active vehicles visible initially
    const visibleCards = page.locator('[data-vehicle-card]:not([hidden])');
    await expect(visibleCards).toHaveCount(5);

    // Filter by Porsche
    await page.selectOption('#filter-brand', 'Porsche');
    await expect(visibleCards).toHaveCount(1);
    await expect(page).toHaveURL(/marke=Porsche/);

    // Navigate to Porsche 993 Carrera RS Clubsport detail page
    await visibleCards.first().locator('a').first().click();
    await expect(page).toHaveURL('/fahrzeuge/porsche-993-carrera-rs-clubsport-1995');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toContainText('Porsche 911 (993) Carrera RS Clubsport');

    // Verify Schema.org Car JSON-LD
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasCarSchema = schemas.some((raw) => {
      const parsed = JSON.parse(raw);
      return parsed['@type'] === 'Car' && parsed.model === '993 Carrera RS Clubsport';
    });
    expect(hasCarSchema).toBe(true);

    // Open Lightbox modal <dialog> and navigate with keyboard
    const lightboxDialog = page.locator('[data-lightbox-dialog]');
    await expect(lightboxDialog).not.toBeVisible();

    await page.locator('[data-lightbox-trigger]').click();
    await expect(lightboxDialog).toBeVisible();
    await expect(page.locator('[data-lightbox-counter]')).toHaveText('1 / 3');

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-lightbox-counter]')).toHaveText('2 / 3');

    await page.keyboard.press('Escape');
    await expect(lightboxDialog).not.toBeVisible();

    // Verify prefilled inquiry CTA link
    const inquiryHref = await page.locator('[data-vehicle-inquiry-cta]').getAttribute('href');
    expect(inquiryHref).toContain('/kontakt?thema=fahrzeug&fahrzeug=');
    expect(inquiryHref).toContain('993');

    expect(externalRequests).toEqual([]);
  });

  test('renders sold references on /referenzen and returns HTTP 404 on unknown vehicle slug', async ({
    page,
  }) => {
    await page.goto('/referenzen');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('[data-vehicle-card]')).toHaveCount(3);
    await expect(page.getByText('Diablo SE30')).toBeVisible();
    await expect(page.getByText('Jarama 400 GT')).toBeVisible();

    const resp404 = await page.goto('/fahrzeuge/nicht-existierendes-fahrzeug');
    expect(resp404?.status()).toBe(404);
  });
});
