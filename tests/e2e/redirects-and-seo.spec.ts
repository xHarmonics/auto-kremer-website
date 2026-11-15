import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const EXPECTED_301_REDIRECTS: Array<[string, string]> = [
  ['/verkaufsraum', '/fahrzeuge'],
  ['/sold-cars', '/referenzen'],
  ['/consign-your-car', '/fahrzeug-verkaufen'],
  ['/about-us', '/ueber-uns'],
  ['/news', '/ueber-uns#chronik'],
  ['/service', '/werkstatt'],
  ['/contact-us', '/kontakt'],
  ['/category/all-products', '/shop'],
  ['/datenschutzerkl%C3%A4rung', '/datenschutz'],
  ['/wartungsarbeiten', '/'],
];

test.describe('Wix 301 Redirects, Sitemap, Zero External Requests, Lead Forms, Admin & WCAG AA Audit', () => {
  test('returns exact HTTP 301 for all legacy Wix pages & product slugs, and 410 Gone for empty Wix leftovers', async ({
    request,
  }) => {
    for (const [oldPath, expectedLocation] of EXPECTED_301_REDIRECTS) {
      const res = await request.get(oldPath, { maxRedirects: 0 });
      expect(res.status(), `Expected 301 for ${oldPath}`).toBe(301);
      const loc = res.headers()['location'] ?? '';
      expect(
        loc.endsWith(expectedLocation),
        `Expected ${oldPath} -> ${expectedLocation}, got ${loc}`
      ).toBe(true);
    }

    // Both canonical and -1 duplicate Wix product URLs resolve to the exact same clean /shop/ slug
    const prodA = await request.get('/product-page/gearbox-ecu-murcielago', {
      maxRedirects: 0,
    });
    const prodB = await request.get('/product-page/gearbox-ecu-murcielago-1', {
      maxRedirects: 0,
    });
    expect(prodA.status()).toBe(301);
    expect(prodB.status()).toBe(301);
    expect(prodA.headers()['location']).toMatch(/^\/shop\//);
    expect(prodA.headers()['location']).toBe(prodB.headers()['location']);

    // Follow redirect and confirm 200 on destination product page
    const destRes = await request.get(prodA.headers()['location']!);
    expect(destRes.status()).toBe(200);

    // Empty Wix leftovers return 410 Gone
    for (const gonePath of ['/blog', '/event-list', '/payment-request-page']) {
      const res = await request.get(gonePath, { maxRedirects: 0 });
      expect(res.status(), `Expected 410 for ${gonePath}`).toBe(410);
    }
  });

  test('serves valid canonical /sitemap.xml and /robots.txt without /admin or 301 legacy paths', async ({
    request,
  }) => {
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain('Disallow: /admin');
    expect(robotsTxt).toContain('Sitemap: https://www.auto-kremer.com/sitemap.xml');

    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);
    expect(sitemapRes.headers()['content-type']).toContain('application/xml');
    const xml = await sitemapRes.text();

    expect(xml).toContain('https://www.auto-kremer.com/fahrzeuge');
    expect(xml).toContain(
      'https://www.auto-kremer.com/fahrzeuge/porsche-993-carrera-rs-clubsport-1995'
    );
    expect(xml).toContain('https://www.auto-kremer.com/shop');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/product-page/');
    expect(xml).not.toContain('/verkaufsraum');
  });

  test('completes 3-step Consignment Wizard and prefilled Contact Form end-to-end', async ({
    page,
  }) => {
    // 1. Consignment Wizard (/fahrzeug-verkaufen)
    await page.goto('/fahrzeug-verkaufen');
    await expect(page.locator('h1')).toContainText('besten Händen');

    await page.fill('#consign-model', 'Countach 5000 QV');
    await page.fill('#consign-year', '1986');
    await page.fill('#consign-mileage', '24100');
    await page.click('[data-step1-next]');

    await page.fill(
      '#consign-notes',
      'Erstauslieferung Schweiz, Bianco Polo Park, Scheckheft und Werkzeuge vollständig.'
    );
    await page.click('[data-step2-next]');

    await page.fill('#consign-name', 'Dr. Stefan Berger');
    await page.fill('#consign-email', 's.berger@sammlung.de');
    await page.fill('#consign-phone', '+49 228 998877');
    await page.check('input[name="privacyAccepted"]');
    await page.click('[data-consign-submit]');

    await expect(page.locator('[data-consignment-success]')).toBeVisible();
    await expect(page.locator('[data-consignment-success]')).toContainText('INQ-');

    // 2. Contact Form with URL prefill (/kontakt?thema=fahrzeug&fahrzeug=...)
    await page.goto(
      '/kontakt?thema=fahrzeug&fahrzeug=Porsche%20993%20Carrera%20RS%20Clubsport%20(1995)'
    );
    await expect(page.locator('#contact-reference')).toHaveValue(
      'Porsche 993 Carrera RS Clubsport (1995)'
    );

    await page.fill('#contact-name', 'Thomas Richter');
    await page.fill('#contact-email', 't.richter@beispiel.de');
    await page.fill(
      '#contact-message',
      'Ich bitte um Terminvorschlag zur Besichtigung des 993 RS Clubsport in Bonn.'
    );
    await page.check('#contact-privacy');
    await page.click('[data-contact-submit]');

    await expect(page.locator('[data-contact-success]')).toBeVisible();
    await expect(page.locator('[data-contact-success]')).toContainText('INQ-');
  });

  test('blocks unauthenticated /admin with 401 and allows authenticated 1-click vehicle sold toggle', async ({
    browser,
    request,
  }) => {
    const unauthPage = await request.get('/admin');
    expect(unauthPage.status()).toBe(401);

    const unauthApi = await request.post('/api/admin/inventory', {
      data: { action: 'toggle_vehicle_status', vehicleId: 1, status: 'sold' },
    });
    expect(unauthApi.status()).toBe(401);

    const adminContext = await browser.newContext({
      extraHTTPHeaders: {
        'x-admin-token': 'ak-local-e2e-only-token',
      },
    });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin');
    await expect(adminPage.locator('h1')).toContainText('Fahrzeugbestand');

    // Toggle Alfa Romeo 4C Coupé to sold and verify on /referenzen, then toggle back to available
    const toggleSelector = '[data-toggle-status-btn="alfa-romeo-4c-2016"]';
    await expect(adminPage.locator(toggleSelector)).toContainText('Als verkauft markieren');
    await adminPage.click(toggleSelector);
    await expect(adminPage.locator('[data-admin-saved-banner]')).toBeVisible();
    await expect(adminPage.locator(toggleSelector)).toContainText('Wieder verfügbar setzen');

    await adminPage.goto('/referenzen');
    await expect(adminPage.locator('body')).toContainText('Alfa Romeo 4C Coupé');

    // Restore original status cleanly
    await adminPage.goto('/admin');
    await adminPage.click(toggleSelector);
    await expect(adminPage.locator(toggleSelector)).toContainText('Als verkauft markieren');

    await adminContext.close();
  });

  test('enforces zero third-party network requests and zero critical/serious Axe WCAG AA violations across core pages', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
        externalRequests.push(req.url());
      }
    });

    const routesToAudit = [
      '/',
      '/fahrzeuge',
      '/fahrzeuge/porsche-993-carrera-rs-clubsport-1995',
      '/referenzen',
      '/werkstatt',
      '/shop',
      '/fahrzeug-verkaufen',
      '/ueber-uns',
      '/kontakt',
      '/impressum',
      '/datenschutz',
      '/versand',
    ];

    for (const route of routesToAudit) {
      const res = await page.goto(route);
      expect(res?.status(), `Expected HTTP 200 on ${route}`).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);

      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blockingViolations = axeResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(
        blockingViolations,
        `Axe violations on ${route}: ${JSON.stringify(blockingViolations, null, 2)}`
      ).toEqual([]);
    }

    expect(externalRequests).toEqual([]);
  });
});
