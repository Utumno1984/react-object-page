import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { gotoStory } from './helpers/story';

const STORY = 'foundations-tokens--overview';

test.describe('Foundations/Tokens', () => {
  test('renders palette, typography with a monospace identifier, and passes axe', async ({ page }) => {
    await gotoStory(page, STORY);
    await expect(page.getByRole('heading', { name: 'Palette' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Typography' })).toBeVisible();
    await expect(page.getByTestId('swatch-rop-error')).toBeVisible();
    await expect(page.getByTestId('mono-sample')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('the stylesheet is really loaded: the mono sample uses the monospace token', async ({ page }) => {
    await gotoStory(page, STORY);
    const family = await page.getByTestId('mono-sample').evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain('monospace');
    const swatch = await page
      .getByTestId('swatch-rop-primary')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(swatch).toBe('rgb(10, 110, 209)');
  });

  test('the z-index scale is listed in strictly increasing order: sticky, overlay, modal, popover, tooltip', async ({
    page,
  }) => {
    await gotoStory(page, STORY);
    const items = await page.getByTestId('z-scale').getByRole('listitem').allTextContents();
    expect(items.map((t) => t.split(':')[0]?.trim())).toEqual([
      'rop-sticky',
      'rop-overlay',
      'rop-modal',
      'rop-popover',
      'rop-tooltip',
    ]);
    const values = items.map((t) => Number(t.split(':')[1]));
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1] as number);
    }
  });

  test('the library CSS does not reset the host page (no preflight)', async ({ page }) => {
    await gotoStory(page, STORY);
    const boxSizing = await page.evaluate(() => getComputedStyle(document.body).boxSizing);
    expect(boxSizing).toBe('content-box');
  });
});
