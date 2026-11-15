import { expect, test } from '@playwright/test';

const ALL_PUBLIC_ROUTES = [
  '/api/health',
  '/',
  '/ueber-uns',
  '/werkstatt',
  '/fahrzeuge',
  '/fahrzeuge/porsche-993-carrera-rs-clubsport-1995',
  '/referenzen',
  '/shop',
  '/shop/008611703-water-pump-seal-countach',
  '/fahrzeug-verkaufen',
  '/kontakt',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/widerruf',
  '/versand',
  '/sitemap.xml',
  '/robots.txt',
];

test.describe('Dev & Runtime Smoke Diagnostics', () => {
  test('loads all primary routes with HTTP 200 and zero runtime/hydration/resource errors', async ({
    page,
  }) => {
    const failures: string[] = [];

    for (const route of ALL_PUBLIC_ROUTES) {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedResponses: string[] = [];

      const onConsole = (msg: { type(): string; text(): string }) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };
      const onPageError = (err: Error) => {
        pageErrors.push(`${err.message}\n${err.stack ?? ''}`);
      };
      const onResponse = (res: { status(): number; url(): string }) => {
        if (res.status() >= 400) {
          failedResponses.push(`${res.status()} ${res.url()}`);
        }
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      page.on('response', onResponse);

      const res = await page.goto(route, { waitUntil: 'networkidle' });
      const status = res?.status() ?? 0;

      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);

      if (status !== 200 || consoleErrors.length > 0 || pageErrors.length > 0 || failedResponses.length > 0) {
        const bodyDiagnostic = await page.evaluate(() => {
          const viteOverlay = document.querySelector('vite-error-overlay');
          const shadowText = viteOverlay?.shadowRoot?.textContent ?? '';
          return [
            (document.body?.innerText ?? '').slice(0, 1200),
            shadowText ? `--- VITE OVERLAY ---\n${shadowText.slice(0, 2000)}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        });
        failures.push(
          [
            `=== ${route} (HTTP ${status}) ===`,
            failedResponses.length ? `Failed HTTP responses: ${failedResponses.join(', ')}` : '',
            consoleErrors.length ? `Console errors: ${consoleErrors.join(' | ')}` : '',
            pageErrors.length ? `Page errors: ${pageErrors.join(' | ')}` : '',
            status >= 500 ? `Body:\n${bodyDiagnostic}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        );
      }
    }

    if (failures.length > 0) {
      console.error('\n' + failures.join('\n\n'));
    }
    expect(failures).toEqual([]);
  });
});
