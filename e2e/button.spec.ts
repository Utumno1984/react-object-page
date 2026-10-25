import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { expectFocusRingVisible } from './helpers/geometry';
import { expectPlayToPass, gotoStory } from './helpers/story';

const OVERVIEW = 'primitives-button--overview';

test.describe('Primitives/Button', () => {
  test('the visual matrix renders every variant x size and passes axe', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    for (const variant of ['primary', 'secondary', 'ghost', 'danger']) {
      for (const size of ['sm', 'md', 'lg']) {
        await expect(page.getByTestId(`matrix-${variant}-${size}`)).toBeVisible();
      }
    }
    await expectNoA11yViolations(page);
  });

  test('size="inline" inside a paragraph does not widen the line', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const heightOf = (id: string) =>
      page.getByTestId(id).evaluate((el) => el.getBoundingClientRect().height);
    const plain = await heightOf('inline-without');
    const withButton = await heightOf('inline-with');
    expect(plain).toBe(20); // text-rop-body line height
    expect(withButton).toBe(plain);
    const button = await page.getByTestId('inline-button').evaluate((el) => el.getBoundingClientRect().height);
    expect(button).toBeLessThanOrEqual(20);
  });

  test('a consumer className="h-12" wins over the size height', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const height = (id: string) => page.getByTestId(id).evaluate((el) => getComputedStyle(el).height);
    expect(await height('override-height')).toBe('48px');
    expect(await height('no-override')).toBe('36px');
  });

  test('keyboard focus shows a visible, unclipped indicator; a mouse click does not', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const target = page.getByTestId('focus-target');
    await expectFocusRingVisible(target);
    await target.blur();
    await target.click();
    expect(await target.evaluate((el) => el.matches(':focus-visible'))).toBe(false);
    expect(await target.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  });

  test('a long label in a narrow sm button wraps and stays inside the button', async ({ page }) => {
    await gotoStory(page, OVERVIEW);
    const metrics = await page.getByTestId('long-label').evaluate((el) => ({
      width: el.getBoundingClientRect().width,
      overflowX: el.scrollWidth - el.clientWidth,
      height: el.getBoundingClientRect().height,
    }));
    expect(metrics.width).toBeLessThanOrEqual(160);
    expect(metrics.overflowX).toBeLessThanOrEqual(1);
    expect(metrics.height).toBeGreaterThan(32);
  });

  test('disabled buttons and the aria-disabled link are never reached by Tab, and clicking the link goes nowhere', async ({
    page,
  }) => {
    await gotoStory(page, OVERVIEW);
    const disabled = page.locator('#storybook-root').getByText(/disabled$/);
    await expect(disabled).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'primary disabled' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Link disabled' })).toHaveAttribute('aria-disabled', 'true');
    const total = await page.locator('#storybook-root').locator('button:not(:disabled), a[href]').count();
    const reached: string[] = [];
    for (let i = 0; i < total + 1; i += 1) {
      await page.keyboard.press('Tab');
      reached.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          const blocked = !!el && (el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true');
          return `${blocked ? 'BLOCKED:' : ''}${el?.textContent?.trim().slice(0, 20) ?? ''}`;
        }),
      );
    }
    expect(reached.filter((r) => r.startsWith('BLOCKED:'))).toEqual([]);
    // A click on the disabled link is blocked: the navigation to its href (`#x`) never happens.
    await page.getByRole('link', { name: 'Link disabled' }).click({ force: true }); // (Playwright treats aria-disabled as not actionable)
    expect(new URL(page.url()).hash).toBe('');
  });

  test('disabled: the play function (Interactions) passes', async ({ page }) => {
    await expectPlayToPass(page, 'primitives-button--disabled');
  });

  test('the play functions of Playground, IconOnly and AsLink really pass; asChild renders no <button>', async ({
    page,
  }) => {
    await expectPlayToPass(page, 'primitives-button--playground');
    await expectNoA11yViolations(page);
    await expectPlayToPass(page, 'primitives-button--icon-only');
    await expect(page.getByRole('button', { name: 'Chiudi' })).toBeVisible();
    await expectNoA11yViolations(page);
    await expectPlayToPass(page, 'primitives-button--as-link');
    await expect(page.locator('#storybook-root button')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Vai al dettaglio' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
