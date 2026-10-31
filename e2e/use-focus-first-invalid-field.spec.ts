import { expect, test, type Page } from '@playwright/test';
import { expectPlayToPass, gotoStory } from './helpers/story';

const ALL_EMPTY = 'internal-useobjectpageformfixture--focus-first-invalid-all-empty';
const SKIPS_VALID = 'internal-useobjectpageformfixture--focus-first-invalid-skips-valid';
const TYPING = 'internal-useobjectpageformfixture--focus-first-invalid-typing-clears';

const save = (page: Page) => page.getByRole('button', { name: 'Save' });
const inViewport = (page: Page, label: string) =>
  page.getByLabel(label).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });

test.describe('useFocusFirstInvalidField: stories', () => {
  for (const id of [ALL_EMPTY, SKIPS_VALID, TYPING]) {
    test(`${id}: the play function passes`, async ({ page }) => {
      await expectPlayToPass(page, id);
    });
  }
});

test.describe('useFocusFirstInvalidField: behavior in a real browser', () => {
  test('all empty: focus and scroll go to the first field in visual order, even though the errors are keyed D, C, B, A', async ({
    page,
  }) => {
    await gotoStory(page, ALL_EMPTY);
    await page.getByLabel('Field D').scrollIntoViewIfNeeded(); // start far from the first field
    await save(page).click();
    await expect(page.getByLabel('Field A')).toBeFocused();
    expect(await inViewport(page, 'Field A')).toBe(true);
    await expect(page.getByTestId('field-error-count')).toHaveText('field errors: 4');
  });

  test('a valid field above two invalid ones is skipped: the focus stops on the first invalid one', async ({ page }) => {
    await gotoStory(page, SKIPS_VALID);
    await save(page).click();
    await expect(page.getByLabel('Field B')).toBeFocused();
    expect(await inViewport(page, 'Field B')).toBe(true);
    await expect(page.getByLabel('Field A')).not.toBeFocused();
    await expect(page.getByLabel('Field C')).not.toBeFocused();
  });

  test('typing after a failure clears every field error at once', async ({ page }) => {
    await gotoStory(page, TYPING);
    await save(page).click();
    await expect(page.getByLabel('Field A')).toBeFocused();
    await page.keyboard.type('x');
    await expect(page.getByTestId('field-error-count')).toHaveText('field errors: 0');
    await expect(page.getByText('is required')).toHaveCount(0);
  });

  test('the focused field is centered, not stuck at an edge', async ({ page }) => {
    await gotoStory(page, SKIPS_VALID);
    await save(page).click();
    await expect(page.getByLabel('Field B')).toBeFocused();
    const { top, height, vh } = await page.getByLabel('Field B').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height, vh: window.innerHeight };
    });
    expect(Math.abs(top + height / 2 - vh / 2)).toBeLessThan(vh * 0.2);
  });
});
