import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { expectPlayToPass, gotoStory } from './helpers/story';

const OVERVIEW = 'foundations-typography--overview';

const style = (el: import('@playwright/test').Locator, prop: 'fontFamily' | 'fontSize' | 'lineHeight' | 'height') =>
  el.evaluate((node, p) => (p === 'height' ? node.getBoundingClientRect().height : getComputedStyle(node)[p]), prop);

test.describe('Foundations/Typography', () => {
  test('renders every variant and passes axe', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    await expect(page.getByTestId('text-body')).toBeVisible();
    await expect(page.getByTestId('text-caption')).toBeVisible();
    await expect(page.getByTestId('text-label')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('the variants have the sizes of the type scale', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    expect(await style(page.getByTestId('text-body'), 'fontSize')).toBe('14px');
    expect(await style(page.getByTestId('text-caption'), 'fontSize')).toBe('12px');
    expect(await style(page.getByTestId('title-lg'), 'fontSize')).toBe('24px');
    expect(await style(page.getByTestId('title-sm'), 'fontSize')).toBe('16px');
  });

  test('mono uses the monospace token whatever the variant (mono + caption = caption in monospace)', async ({
    page,
  }) => {
    await gotoStory(page, OVERVIEW);
    const sans = await style(page.getByTestId('text-body'), 'fontFamily');
    expect(sans).not.toContain('monospace');
    for (const variant of ['body', 'caption', 'label']) {
      const mono = page.getByTestId(`mono-${variant}`);
      expect(await style(mono, 'fontFamily'), variant).toContain('monospace');
      // Same size as the non-mono sibling of that variant.
      expect(await style(mono, 'fontSize'), variant).toBe(await style(page.getByTestId(`text-${variant}`), 'fontSize'));
    }
    expect(await style(page.getByTestId('mono-caption'), 'fontSize')).toBe('12px');
  });

  test('Title: size is independent from level (h1 with the small scale)', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const h1 = page.getByTestId('title-h1-sm');
    expect(await h1.evaluate((n) => n.tagName)).toBe('H1');
    expect(await style(h1, 'fontSize')).toBe('16px');
  });

  test('an icon inside a caption line does not change the line height', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const plain = await style(page.getByTestId('caption-plain'), 'height');
    const withIcon = await style(page.getByTestId('caption-with-icon'), 'height');
    expect(withIcon).toBe(plain);
  });

  test('the play functions (Interactions) of Text and Title really pass', async ({ page }) => {
    await expectPlayToPass(page, 'foundations-typography--text-playground');
    await expect(page.getByText('INV-2026-00042')).toBeVisible();
    await expectNoA11yViolations(page);
    await expectPlayToPass(page, 'foundations-typography--title-playground');
    await expect(page.getByRole('heading', { level: 1, name: 'Invoice approvals' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('the play helper does detect a failing play (mono switched off via Controls)', async ({ page }) => {
    await expect(expectPlayToPass(page, 'foundations-typography--text-playground', 'mono:!false')).rejects.toThrow(
      /play function/,
    );
  });

  test('as="label" + htmlFor: clicking the label focuses the field', async ({ page }) => {
    await expectPlayToPass(page, 'foundations-typography--as-label');
    await page.getByText('Supplier code').click();
    await expect(page.getByRole('textbox', { name: 'Supplier code' })).toBeFocused();
    await expectNoA11yViolations(page);
  });
});
