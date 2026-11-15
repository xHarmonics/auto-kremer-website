import { expect, test } from '@playwright/test';

test.describe('Ricambi Originali Shop & Stripe Sandbox Checkout E2E', () => {
  test('searches by OEM number, filters out-of-stock parts, adds to persistent CartDrawer, completes Stripe Sandbox checkout, and decrements stock', async ({
    page,
  }) => {
    await page.goto('/shop');
    await expect(page.locator('h1')).toHaveCount(1);

    // Search for out-of-stock Guarnizione Diablo GT (0074004842) -> must NOT have add-to-cart button, only inquiry link
    const searchInput = page.locator('#oem-search-input');
    await searchInput.fill('0074004842');
    await expect(page.locator('[data-product-card]')).toHaveCount(1);
    await expect(page.locator('[data-inquire-part="0074004842"]')).toBeVisible();
    await expect(page.locator('[data-add-to-cart="0074004842"]')).toHaveCount(0);

    // Now search for multi-stock Water Pump Seal Countach (008611703)
    await searchInput.fill('008611703');
    await expect(page.locator('[data-product-card]')).toHaveCount(1);
    await expect(page.getByText('inkl. 19 % MwSt.')).toBeVisible();

    // Open product detail page
    await page.locator('[data-product-card] a').first().click();
    await expect(page).toHaveURL(/\/shop\/008611703/);
    await expect(page.locator('h1')).toContainText('Water Pump');

    // Add to Cart -> opens slide-over CartDrawer modal <dialog>
    await page.locator('[data-product-add-btn]').click();
    const drawer = page.locator('[data-cart-drawer]');
    await expect(drawer).toBeVisible();
    await expect(page.locator('[data-cart-badge]').first()).toHaveText('1');

    // Reload page and confirm cart persists across reloads
    await page.reload();
    await expect(page.locator('[data-cart-badge]').first()).toHaveText('1');

    // Open CartDrawer from header button and proceed to Stripe Sandbox Checkout
    await page.locator('[data-cart-open]').first().click();
    await expect(drawer).toBeVisible();
    await page.locator('[data-cart-checkout-btn]').click();

    // Arrives at local Stripe Sandbox Checkout Simulator
    await expect(page).toHaveURL(/\/shop\/sandbox-checkout\?order=AK-/);
    await expect(page.getByText('STRIPE SANDBOX TESTMODUS')).toBeVisible();

    // Authorize Sandbox Test Payment -> runs signed webhook -> redirects to /shop/erfolg
    await page.locator('[data-sandbox-pay-btn]').click();
    await expect(page).toHaveURL(/\/shop\/erfolg\?order=AK-/);
    await expect(page.locator('[data-order-number]')).toContainText('AK-');

    // Verify client cart was cleared automatically
    await expect(page.locator('[data-cart-badge]').first()).toHaveText('0');
  });
});
