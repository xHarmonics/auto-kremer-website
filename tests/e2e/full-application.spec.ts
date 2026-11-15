import { expect, test } from '@playwright/test';

// Minimal valid 1x1 transparent PNG (67 bytes) for real R2 upload verification
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('Full Application Interactive Journeys, Edge Cases & Security Verification', () => {
  test('renders homepage AutoDealer JSON-LD, decodes visible images cleanly, pre-filters shop from model pills, and operates mobile dialog drawer', async ({
    page,
  }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    expect(res?.headers()['x-content-type-options']).toBe('nosniff');
    expect(res?.headers()['x-frame-options']).toBe('DENY');
    expect(res?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Verify AutoDealer Schema.org JSON-LD on homepage
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasAutoDealer = schemas.some((raw) => {
      const parsed = JSON.parse(raw);
      const types = Array.isArray(parsed['@type']) ? parsed['@type'] : [parsed['@type']];
      return types.includes('AutoDealer') && parsed.foundingDate === '1967';
    });
    expect(hasAutoDealer).toBe(true);

    // Ensure hero image on / and /ueber-uns decoded with real pixel dimensions
    const homeHeroNaturalWidth = await page
      .locator('img[fetchpriority="high"]')
      .first()
      .evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(homeHeroNaturalWidth).toBeGreaterThan(0);

    // Click quick model link (/shop?modell=diablo) from homepage
    await page.locator('a[href="/shop?modell=diablo"]').first().click();
    await expect(page).toHaveURL(/\/shop\?modell=diablo/);
    await expect(page.locator('#shop-model-filter')).toHaveValue('diablo');

    // Verify /ueber-uns hero image naturalWidth > 0
    await page.goto('/ueber-uns');
    const aboutHeroWidth = await page
      .locator('img[fetchpriority="high"]')
      .first()
      .evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(aboutHeroWidth).toBeGreaterThan(0);

    // Test mobile viewport & native <dialog> navigation drawer
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileDrawer = page.locator('#mobile-nav-drawer');
    await expect(mobileDrawer).not.toBeVisible();

    await page.locator('#mobile-menu-open').click();
    await expect(mobileDrawer).toBeVisible();

    await page.locator('#mobile-menu-close').click();
    await expect(mobileDrawer).not.toBeVisible();

    await page.locator('#mobile-menu-open').click();
    await expect(mobileDrawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(mobileDrawer).not.toBeVisible();

    await page.locator('#mobile-menu-open').click();
    await mobileDrawer.locator('a[href="/werkstatt"]').click();
    await expect(page).toHaveURL('/werkstatt');
    await expect(page.locator('main h1')).toContainText('Hochleistungstechnik');
  });

  test('handles showroom empty filter combination + reset, price-on-request vehicle, and sold reference detail page', async ({
    page,
  }) => {
    await page.goto('/fahrzeuge');
    const visibleCards = page.locator('[data-vehicle-card]:not([hidden])');
    await expect(visibleCards).toHaveCount(5);

    // Select Porsche + E-Gear/Automatic transmission -> 0 matches -> empty state shown
    await page.selectOption('#filter-brand', 'Porsche');
    const transOptions = await page
      .locator('#filter-transmission option')
      .evaluateAll((opts) =>
        opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== 'all')
      );
    const nonPorscheTrans = transOptions.find((t) => !t.toLowerCase().includes('handschaltung'));
    expect(nonPorscheTrans).toBeDefined();

    await page.selectOption('#filter-transmission', nonPorscheTrans!);
    await expect(visibleCards).toHaveCount(0);
    await expect(page.locator('#showroom-empty-state')).toBeVisible();
    await expect(page.locator('[data-showroom-count]')).toContainText('0 von 5');

    // Reset filters -> all 5 vehicles visible again
    await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
    await expect(visibleCards).toHaveCount(5);
    await expect(page.locator('#showroom-empty-state')).toBeHidden();

    // Price-on-request detail page (/fahrzeuge/lamborghini-murcielago-6-2-v12)
    await page.goto('/fahrzeuge/lamborghini-murcielago-6-2-v12');
    await expect(page.locator('main h1')).toContainText('Murciélago');
    await expect(page.locator('body')).toContainText('Preis auf Anfrage');

    // Sold reference detail page (/fahrzeuge/referenz-lamborghini-diablo-se30)
    await page.goto('/fahrzeuge/referenz-lamborghini-diablo-se30');
    await expect(page.locator('main h1')).toContainText('Diablo SE30');
    await expect(page.locator('nav[aria-label="Brotkrumen-Navigation"]')).toContainText(
      'Referenzen'
    );
    const soldSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(
      soldSchemas.some((raw) => {
        const parsed = JSON.parse(raw);
        return (
          parsed['@type'] === 'Car' &&
          parsed.offers?.availability === 'https://schema.org/SoldOut'
        );
      })
    ).toBe(true);
  });

  test('verifies OEM search API, single-stock cap, shipping zones, sandbox checkout cancel (releasing reserved stock), webhook guards, and 404s', async ({
    page,
    request,
  }) => {
    // 1. Direct API search check
    const apiRes = await request.get('/api/products/search?q=086927755E');
    expect(apiRes.status()).toBe(200);
    const apiJson = (await apiRes.json()) as {
      count: number;
      items: Array<{ oemNumber: string; availableStock: number }>;
    };
    expect(apiJson.count).toBeGreaterThanOrEqual(1);
    expect(apiJson.items[0]?.oemNumber).toBe('086927755E');

    // 2. Zero-result search fallback inquiry CTA + single-stock cap + shipping zones
    await page.goto('/shop');
    await page.fill('#oem-search-input', 'NICHT-VORHANDEN-99999');
    await expect(page.locator('[data-product-card]')).toHaveCount(0);
    await expect(
      page.locator('a[href*="NICHT-VORHANDEN-99999"]')
    ).toBeVisible();

    // Add single-stock Gearbox ECU Murciélago (086927755E, 1.798,30 € >= 500 €)
    await page.fill('#oem-search-input', '086927755E');
    await page.locator('[data-add-to-cart="086927755E"]').click();

    const drawer = page.locator('[data-cart-drawer]');
    await expect(drawer).toBeVisible();

    // + button must be disabled because maxStock === 1
    const plusBtn = drawer.locator('button[aria-label*="Menge erhöhen"]');
    await expect(plusBtn).toBeDisabled();

    // Verify DE free shipping >= 500 €, EU 24,90 €, WORLD 59,00 €
    await expect(drawer).toContainText('0,00 € (Versandfrei)');
    await drawer.locator('#cart-shipping-zone').selectOption('EU');
    await expect(drawer).toContainText('24,90');
    await drawer.locator('#cart-shipping-zone').selectOption('WORLD');
    await expect(drawer).toContainText('59,00');
    await drawer.locator('#cart-shipping-zone').selectOption('DE');

    // Remove Gearbox ECU and add Water Pump Seal Countach (008611703, < 500 € -> 9,90 € DE shipping)
    await drawer.getByRole('button', { name: 'Entfernen' }).click();
    await drawer.locator('[data-cart-close]').click();

    await page.fill('#oem-search-input', '008611703');
    const stockBeforeRes = await request.get('/api/products/search?q=008611703');
    const stockBefore = (
      (await stockBeforeRes.json()) as { items: Array<{ availableStock: number }> }
    ).items[0]!.availableStock;

    await page.locator('[data-add-to-cart="008611703"]').click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('9,90');

    // Proceed to Sandbox Checkout and CANCEL -> stock reservation must be released & cart preserved!
    await drawer.locator('[data-cart-checkout-btn]').click();
    await expect(page).toHaveURL(/\/shop\/sandbox-checkout\?order=AK-/);

    await page.locator('[data-sandbox-cancel-btn]').click();
    await expect(page).toHaveURL(/\/shop\/abgebrochen\?order=AK-/);
    await expect(page.locator('main h1')).toContainText('gespeichert');
    await expect(page.locator('[data-cart-badge]').first()).toHaveText('1');

    const stockAfterCancelRes = await request.get('/api/products/search?q=008611703');
    const stockAfterCancel = (
      (await stockAfterCancelRes.json()) as { items: Array<{ availableStock: number }> }
    ).items[0]!.availableStock;
    expect(stockAfterCancel).toBe(stockBefore);

    // 3. Stripe Webhook Forged Signature & Live-Mode Rejection Guards
    const badSigRes = await request.post('/api/webhooks/stripe', {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1700000000,v1=deadbeef',
      },
      data: JSON.stringify({ id: 'evt_bad', type: 'checkout.session.completed', livemode: false }),
    });
    expect(badSigRes.status()).toBe(400);

    // 4. Shop & Global 404 checks
    const shop404 = await page.goto('/shop/unbekanntes-ersatzteil-xyz');
    expect(shop404?.status()).toBe(404);

    const global404 = await page.goto('/diese-seite-existiert-nicht');
    expect(global404?.status()).toBe(404);
    await expect(page.locator('main h1')).toContainText('Garage');
  });

  test('validates Consignment Wizard steps, supports German dot mileage ("28.500") + R2 PNG upload, and validates Contact Form blur + honeypot', async ({
    page,
    request,
  }) => {
    await page.goto('/fahrzeug-verkaufen');

    // Trigger Step 1 client validation errors
    await page.click('[data-step1-next]');
    await expect(page.locator('#consign-model')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#err-consign-model')).toBeVisible();

    // Fill Step 1 with German thousands separator in mileage ("28.500")
    await page.fill('#consign-model', 'Gallardo LP 570-4 Superleggera');
    await page.fill('#consign-year', '2011');
    await page.fill('#consign-mileage', '28.500');
    await page.fill('#consign-price', '189.000 €');
    await page.click('[data-step1-next]');

    // Step 2: test validation on short description, back-button state preservation, and real PNG file upload
    await page.click('[data-step2-next]');
    await expect(page.locator('#consign-notes')).toHaveAttribute('aria-invalid', 'true');

    await page.getByRole('button', { name: '← Zurück' }).click();
    await expect(page.locator('#consign-mileage')).toHaveValue('28.500');
    await page.click('[data-step1-next]');

    await page.fill(
      '#consign-notes',
      'Verde Ithaca, Carbon-Schalensitze, deutsche Erstauslieferung, frischer großer Service.'
    );
    await page.locator('#consign-photos').setInputFiles({
      name: 'gallardo-superleggera.png',
      mimeType: 'image/png',
      buffer: TINY_PNG_BUFFER,
    });
    await expect(page.locator('body')).toContainText('1 Foto ausgewählt');
    await page.click('[data-step2-next]');

    // Step 3: submit with R2 photo
    await page.fill('#consign-name', 'Markus Weber');
    await page.fill('#consign-email', 'm.weber@sammler-bonn.de');
    await page.fill('#consign-phone', '+49 228 776655');
    await page.check('input[name="privacyAccepted"]');
    await page.click('[data-consign-submit]');

    await expect(page.locator('[data-consignment-success]')).toBeVisible();
    await expect(page.locator('[data-consignment-success]')).toContainText('INQ-');

    // Contact form blur validation & immediate error clearing
    await page.goto('/kontakt?thema=ersatzteil&teil=400945095P');
    await expect(page.locator('#contact-reference')).toHaveValue('400945095P');

    await page.fill('#contact-name', 'A');
    await page.locator('#contact-name').blur();
    await expect(page.locator('#err-contact-name')).toBeVisible();

    await page.fill('#contact-name', 'Andrea Rossi');
    await expect(page.locator('#err-contact-name')).toHaveCount(0);

    // Honeypot anti-bot check on /api/inquiries/contact
    const honeyRes = await request.post('/api/inquiries/contact', {
      data: {
        topic: 'allgemein',
        senderName: 'Bot',
        senderEmail: 'bot@example.com',
        message: 'Automated spam message',
        privacyAccepted: true,
        turnstileToken: 'turnstile-local-pass-token',
        company_website: 'https://spam.example',
      },
    });
    expect(honeyRes.status()).toBe(200);
    const honeyJson = (await honeyRes.json()) as { inquiryNumber: string };
    expect(honeyJson.inquiryNumber).toBe('INQ-IGNORED');
  });

  test('executes authenticated Admin CRUD (R2 photo badge visibility, German comma product price update, and self-cleaning vehicle creation)', async ({
    browser,
  }) => {
    const adminContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-admin-token': 'ak-local-e2e-only-token',
      },
    });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin');

    // 1. Confirm the consignment inquiry with 1 R2 photo appears in Admin
    await expect(adminPage.locator('body')).toContainText('1 R2-Foto(s)');

    // 2. Update first OEM product price by stable ID using German comma format ("1.850,50"), verify, then restore original
    const firstProductInput = adminPage.locator('input[id^="price-"]').first();
    const targetInputId = await firstProductInput.getAttribute('id');
    expect(targetInputId).toBeTruthy();
    const stablePriceSelector = `#${targetInputId}`;

    const originalPriceVal = await adminPage.locator(stablePriceSelector).inputValue();
    await adminPage.locator(stablePriceSelector).fill('1.850,50');
    await adminPage
      .locator(stablePriceSelector)
      .locator('xpath=ancestor::form[1]')
      .locator('button[type="submit"]')
      .click();

    await expect(adminPage.locator('[data-admin-saved-banner]')).toBeVisible();
    await expect(adminPage.locator(stablePriceSelector)).toHaveValue('1850.50');

    // Restore original product price
    await adminPage.locator(stablePriceSelector).fill(originalPriceVal);
    await adminPage
      .locator(stablePriceSelector)
      .locator('xpath=ancestor::form[1]')
      .locator('button[type="submit"]')
      .click();
    await expect(adminPage.locator(stablePriceSelector)).toHaveValue(originalPriceVal);

    // 3. Create a new vehicle via "+ Neues Fahrzeug anlegen" with German mileage & price, verify detail page, then delete
    await adminPage.locator('summary', { hasText: 'Neues Fahrzeug anlegen' }).click();
    await adminPage.fill('#new-v-title', 'Lamborghini Huracán Performante Test');
    await adminPage.fill('#new-v-brand', 'Lamborghini');
    await adminPage.fill('#new-v-model', 'Huracán Performante');
    await adminPage.fill('#new-v-year', '2018');
    await adminPage.fill('#new-v-km', '14.200');
    await adminPage.fill('#new-v-ps', '640');
    await adminPage.fill('#new-v-price', '269.500');
    await adminPage.fill(
      '#new-v-summary',
      'E2E-Testfahrzeug zur Prüfung der Admin-Neuanlage mit deutschen Zahlenformaten.'
    );
    await adminPage.getByRole('button', { name: 'Fahrzeug speichern' }).click();

    await expect(adminPage.locator('[data-admin-saved-banner]')).toBeVisible();
    const createdRow = adminPage.locator('tr[data-admin-vehicle-row^="lamborghini-huracan-performante-2018-"]');
    await expect(createdRow).toHaveCount(1);
    const createdSlug = await createdRow.getAttribute('data-admin-vehicle-row');
    expect(createdSlug).toBeTruthy();

    // Open newly created vehicle detail page
    const detailRes = await adminPage.goto(`/fahrzeuge/${createdSlug}`);
    expect(detailRes?.status()).toBe(200);
    await expect(adminPage.locator('main h1')).toContainText('Huracán Performante Test');
    await expect(adminPage.locator('body')).toContainText('269.500');
    await expect(adminPage.locator('body')).toContainText('14.200 km');

    // Clean up test vehicle so canonical showroom count remains 5
    const delRes = await adminPage.request.post('/api/admin/inventory', {
      data: {
        action: 'delete_vehicle',
        slug: createdSlug,
      },
    });
    expect(delRes.status()).toBe(200);

    await adminContext.close();
  });
});
