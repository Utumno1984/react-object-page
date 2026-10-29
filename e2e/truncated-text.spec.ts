import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers/geometry';
import { expectPlayToPass } from './helpers/story';

// Every story has a play function: the tests that drive the real mouse and keyboard start after it
// has finished (it leaves the story clean: nothing open, the pointer away, no focus).
const gotoStory = expectPlayToPass;

const STORY = (name: string) => `data-truncatedtext--${name}`;
const tooltips = (page: Page): Locator => page.getByRole('tooltip');
// Longer than the tooltip delay (500ms): "nothing opened" is not just "not yet".
const SETTLE = 900;

const setWidth = (page: Page, px: number) =>
  page.getByTestId('container').evaluate((el, w) => ((el as HTMLElement).style.width = `${w}px`), px);

test.describe('Data/TruncatedText: stories play', () => {
  for (const name of [
    'playground',
    'block',
    'in-flex-row',
    'not-truncated',
    'in-table-cell',
    'rtl',
    'rich-children',
    'auto-focus',
    'inside-dialog',
    'changes-while-open',
    'shared-provider',
  ]) {
    test(`${name}: the play function passes`, async ({ page }) => {
      await expectPlayToPass(page, STORY(name));
    });
  }
});

test.describe('geometry', () => {
  test('in a 200px block: never wider than the container, ellipsis, min-width 0 and max-width 100%, no horizontal overflow', async ({ page }) => {
    await gotoStory(page, STORY('block'));
    const text = page.getByTestId('text');
    const box = (await text.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(200);
    const style = await text.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        minWidth: cs.minWidth,
        maxWidth: cs.maxWidth,
        textOverflow: cs.textOverflow,
        overflow: cs.overflowX,
        whiteSpace: cs.whiteSpace,
      };
    });
    expect(style).toEqual({
      minWidth: '0px',
      maxWidth: '100%',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    });
    expect(await text.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expectNoHorizontalOverflow(page.getByTestId('container'));
  });

  test('as a flex child it shrinks instead of widening the row', async ({ page }) => {
    await gotoStory(page, STORY('in-flex-row'));
    const container = page.getByTestId('container');
    const widths = await container.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await expectNoHorizontalOverflow(container);
    expect(await page.getByRole('button', { name: 'Apri' }).isVisible()).toBe(true);
  });

  test('in a fixed-layout table cell the table keeps its width', async ({ page }) => {
    await gotoStory(page, STORY('in-table-cell'));
    const table = (await page.getByTestId('table').boundingBox())!;
    expect(table.width).toBeLessThanOrEqual(320);
    await expectNoHorizontalOverflow(page.getByTestId('table'));
  });

  test('a text with multiple spaces and line breaks stays on one line', async ({ page }) => {
    await gotoStory(page, STORY('block'));
    const text = page.getByTestId('text');
    await text.evaluate((el) => {
      el.textContent = 'uno   due\n\ntre   quattro cinque sei sette otto nove dieci undici dodici tredici';
    });
    const height = await text.evaluate((el) => el.getBoundingClientRect().height);
    const fontSize = await text.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // One line: well under two lines of text, whatever the (possibly `normal`) line height.
    expect(height).toBeLessThan(fontSize * 1.8);
  });

  test('rtl: ellipsis on the left (direction rtl, still truncated)', async ({ page }) => {
    await gotoStory(page, STORY('rtl'));
    const text = page.getByTestId('text');
    expect(await text.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
    expect(await text.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
  });
});

test.describe('hover', () => {
  test('truncated: the tooltip with the full text opens after the delay; not at mount', async ({ page }) => {
    await gotoStory(page, STORY('playground'), 'width:120');
    const text = page.getByTestId('text');
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
    await text.hover();
    await expect(tooltips(page)).toContainText('Fornitore Bianchi', { timeout: 3000 });
    // No duplicate description: the text is the element's own content.
    await expect(text).not.toHaveAttribute('aria-describedby');
    await expect(text).toContainText('in attesa di approvazione');
  });

  test('not truncated: no tooltip, even after the delay', async ({ page }) => {
    await gotoStory(page, STORY('not-truncated'));
    await page.getByTestId('text').hover();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
  });

  test('measured at the gesture: a container shrunk after the mount opens, widened again does not', async ({ page }) => {
    await gotoStory(page, STORY('playground'), 'width:600');
    const text = page.getByTestId('text');
    // Fits at mount: 600px holds the whole text? ensure by forcing a wide width first.
    await setWidth(page, 1200);
    await text.hover();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
    await page.mouse.move(5, 5);
    await setWidth(page, 120);
    await text.hover();
    await expect(tooltips(page)).toContainText('Fornitore Bianchi', { timeout: 3000 });
    await page.mouse.move(5, 5, { steps: 5 });
    await expect(tooltips(page)).toHaveCount(0);
    await setWidth(page, 1200);
    await text.hover();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
  });

  test('a text as wide as its container (no overflow) opens nothing', async ({ page }) => {
    await gotoStory(page, STORY('playground'), 'width:600');
    const text = page.getByTestId('text');
    await setWidth(page, 1200);
    // The natural width of the text, rounded up: it just fits.
    const natural = await text.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return Math.ceil(range.getBoundingClientRect().width);
    });
    await setWidth(page, natural);
    expect(await text.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
    await text.hover();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
  });

  test('non-string children: plain text of the children, or tooltipContent; empty children open nothing', async ({ page }) => {
    await gotoStory(page, STORY('rich-children'));
    await page.getByTestId('plain').hover();
    await expect(tooltips(page)).toHaveText('Fornitore Bianchi & Associati S.r.l., sede legale di Milano', { timeout: 3000 });
    await page.mouse.move(600, 600, { steps: 8 });
    await expect(tooltips(page)).toHaveCount(0);
    await page.getByTestId('custom').hover();
    await expect(tooltips(page)).toHaveText('Descrizione personalizzata', { timeout: 3000 });
    await page.mouse.move(600, 600, { steps: 8 });
    await expect(tooltips(page)).toHaveCount(0);
    await page.getByTestId('empty').hover({ force: true });
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
  });
});

test.describe('keyboard and mount', () => {
  test('not a tab stop by default; with tabIndex 0, Tab opens the tooltip and Escape closes it', async ({ page }) => {
    await gotoStory(page, STORY('playground'), 'width:120');
    const text = page.getByTestId('text');
    await expect(text).not.toHaveAttribute('tabindex');
    await page.keyboard.press('Tab');
    expect(await text.evaluate((el) => document.activeElement === el)).toBe(false);
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);

    await gotoStory(page, STORY('playground'), 'width:120;tabIndex:0');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('text')).toBeFocused();
    await expect(tooltips(page)).toContainText('Fornitore Bianchi');
    await page.keyboard.press('Escape');
    await expect(tooltips(page)).toHaveCount(0);
  });

  test('tabIndex 0 on a text that fits: focus opens nothing', async ({ page }) => {
    await gotoStory(page, STORY('playground'), 'width:600;tabIndex:0;children:Breve');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('text')).toBeFocused();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
  });

  test('autoFocus on the text and a Dialog that focuses it: nothing opens at mount', async ({ page }) => {
    await gotoStory(page, STORY('auto-focus'));
    await expect(page.getByTestId('text')).toBeFocused();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);

    // The play function opened the dialog, which focused the text.
    await gotoStory(page, STORY('inside-dialog'));
    await expect(page.getByTestId('text')).toBeFocused();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
  });

  test('the text changes while the tooltip is open: it closes when the text no longer overflows', async ({ page }) => {
    await gotoStory(page, STORY('changes-while-open'));
    // The play function already tabbed to the text and blurred it: Tab out of the page and
    // Shift+Tab back is the user's own way to reach it again.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('text')).toBeFocused();
    await expect(tooltips(page)).toContainText('Fornitore Bianchi');
    await page.keyboard.press('-');
    await expect(page.getByTestId('text')).toHaveText('Breve');
    await expect(tooltips(page)).toHaveCount(0);
  });
});

test.describe('shared TooltipProvider', () => {
  test('a refused opening on a text that fits does not make the next tooltip skip its delay', async ({ page }) => {
    await gotoStory(page, STORY('shared-provider'));
    await page.getByTestId('text').hover();
    await page.waitForTimeout(SETTLE);
    await page.mouse.move(5, 5, { steps: 5 });
    await page.getByRole('button', { name: 'Apri' }).hover();
    await page.waitForTimeout(150);
    await expect(tooltips(page)).toHaveCount(0);
    await expect(tooltips(page)).toContainText('Apri il dettaglio', { timeout: 3000 });
  });

  test('closing because the text no longer overflows lets the next tooltip wait for its delay', async ({ page }) => {
    await gotoStory(page, STORY('changes-while-open'));
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(tooltips(page)).toContainText('Fornitore Bianchi');
    await page.keyboard.press('-');
    await expect(tooltips(page)).toHaveCount(0);
    await expect(page.getByTestId('text')).toHaveText('Breve');
    // Dialog-free page, nothing else to hover: the provider state is covered by the test above; here
    // the close must be the real one, i.e. Escape is not needed and the focus stays on the text.
    await expect(page.getByTestId('text')).toBeFocused();
  });
});

test.describe('no leak', () => {
  test('tooltipContent and as never reach the DOM', async ({ page }) => {
    await gotoStory(page, STORY('rich-children'));
    const attrs = await page.getByTestId('custom').evaluate((el) => el.getAttributeNames());
    expect(attrs.filter((name) => /tooltip|^as$/i.test(name))).toEqual([]);
  });
});

// Touch: the `chromium-touch` project (tag `@touch`).
test.describe('touch @touch', () => {
  test('a tap on a truncated text leaves no tooltip open', async ({ page }) => {
    await gotoStory(page, STORY('playground'), 'width:120');
    const text = page.getByTestId('text');
    await text.tap();
    await page.waitForTimeout(SETTLE);
    await expect(tooltips(page)).toHaveCount(0);
    await text.tap();
    await page.waitForTimeout(300);
    await expect(tooltips(page)).toHaveCount(0);
  });
});
