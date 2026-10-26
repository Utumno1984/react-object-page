import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { expectNoHorizontalOverflow } from './helpers/geometry';
import { expectPlayToPass, gotoStory } from './helpers/story';

const STRIP_OVERVIEW = 'primitives-messagestrip--overview';
const FIELD_STORY = 'primitives-fieldmessage--side-by-side';

test.describe('Primitives/MessageStrip', () => {
  test('the visual matrix renders every tone and passes axe', async ({ page }) => {
    await gotoStory(page, STRIP_OVERVIEW);
    for (const tone of ['info', 'success', 'warning', 'error']) {
      await expect(page.getByTestId(`tone-${tone}`)).toBeVisible();
    }
    await expectNoA11yViolations(page);
  });

  test('the Playground, Dismissible and DistinctCloseNames play functions pass', async ({ page }) => {
    await expectPlayToPass(page, 'primitives-messagestrip--playground');
    await expectPlayToPass(page, 'primitives-messagestrip--dismissible');
    await expectPlayToPass(page, 'primitives-messagestrip--distinct-close-names');
  });

  test('Enter and Space on the close button each call onDismiss exactly once; the strip stays', async ({ page }) => {
    // The play function presses Enter (count 1), then Space (count 2): it fails on any other count.
    await expectPlayToPass(page, 'primitives-messagestrip--dismiss-count');
    await expect(page.getByTestId('dismiss-count')).toHaveText('2');
    // The strip does not hide itself: the consumer owns the unmount.
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('the live roles are alert for error and status for the others', async ({ page }) => {
    await gotoStory(page, 'primitives-messagestrip--distinct-close-names');
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveCount(1);
  });

  test('a long unbreakable word in a 280px strip wraps inside the borders', async ({ page }) => {
    await gotoStory(page, STRIP_OVERVIEW);
    await expectNoHorizontalOverflow(page.getByTestId('narrow'));
    const widths = await page.getByTestId('narrow').evaluate((el) => ({
      box: el.getBoundingClientRect().width,
      strip: el.firstElementChild?.getBoundingClientRect().width,
    }));
    expect(widths.box).toBe(280);
    expect(widths.strip).toBeLessThanOrEqual(280);
  });

  test('stacked strips keep a constant vertical gap', async ({ page }) => {
    await gotoStory(page, STRIP_OVERVIEW);
    const gaps = await page.getByTestId('stack').evaluate((el) => {
      const rects = Array.from(el.children).map((c) => c.getBoundingClientRect());
      return rects.slice(1).map((r, i) => r.top - (rects[i]?.bottom ?? 0));
    });
    expect(gaps).toEqual([8, 8]);
  });

  test('the title is bold and the content is not', async ({ page }) => {
    await gotoStory(page, STRIP_OVERVIEW);
    const weights = await page.getByTestId('full-info').evaluate((el) => ({
      title: getComputedStyle(el.querySelector('strong') as Element).fontWeight,
      body: getComputedStyle(el).fontWeight,
    }));
    expect(weights).toEqual({ title: '700', body: '400' });
  });

  test('the title-only strip has no extra content block', async ({ page }) => {
    await gotoStory(page, STRIP_OVERVIEW);
    const withTitle = await page.getByTestId('title-only').evaluate((el) => el.getBoundingClientRect().height);
    // padding 12*2 + border 2 + one 20px body line
    expect(withTitle).toBe(46);
    const tags = await page
      .getByTestId('title-only')
      .evaluate((el) => Array.from(el.querySelector('.min-w-0')?.children ?? []).map((c) => c.tagName));
    expect(tags).toEqual(['SPAN', 'STRONG']);
  });
});

test.describe('Primitives/FieldMessage', () => {
  test('help and error share font-size, line-height and margin-top', async ({ page }) => {
    await gotoStory(page, FIELD_STORY);
    const style = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { fontSize: cs.fontSize, lineHeight: cs.lineHeight, marginTop: cs.marginTop, color: cs.color };
      });
    const help = await style('help');
    const error = await style('error');
    expect({ ...help, color: '' }).toEqual({ ...error, color: '' });
    expect(help.color).not.toBe(error.color);
  });

  test('switching help to error on one line does not change the height', async ({ page }) => {
    await gotoStory(page, FIELD_STORY);
    const height = (id: string) => page.getByTestId(id).evaluate((el) => el.getBoundingClientRect().height);
    expect(await height('error')).toBe(await height('help'));
    expect(await height('help')).toBe(16);
  });

  test('the long word wraps inside its column and passes axe', async ({ page }) => {
    await gotoStory(page, FIELD_STORY);
    const long = page.getByTestId('long');
    expect(await long.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await expectNoA11yViolations(page);
  });

  test('the Playground play function passes', async ({ page }) => {
    await expectPlayToPass(page, 'primitives-fieldmessage--playground');
    await expectPlayToPass(page, FIELD_STORY);
  });
});
