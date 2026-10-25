import { expect, test } from '@playwright/test';
import {
  expectFocusRingVisible,
  expectNoHorizontalOverflow,
  expectSingleScroller,
} from './helpers/geometry';
import { gotoStory } from './helpers/story';

const root = (page: import('@playwright/test').Page) => page.getByTestId('root');

test.describe('expectSingleScroller', () => {
  test('passes with a single scroller', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--single-scroller-healthy');
    await expectSingleScroller(root(page));
  });

  test('fails on a nested (double) scroller', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--double-scroll');
    await expect(expectSingleScroller(root(page))).rejects.toThrow(/2 elements scroll on the y axis/);
  });
});

test.describe('expectNoHorizontalOverflow', () => {
  test('passes when everything fits', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--no-overflow-healthy');
    await expectNoHorizontalOverflow(root(page));
  });

  test('fails when the container scrolls horizontally', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--horizontal-scroll');
    await expect(expectNoHorizontalOverflow(root(page))).rejects.toThrow(/scrollWidth/);
  });

  test('fails when a descendant sticks out of the container', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--descendant-sticks-out');
    await expect(expectNoHorizontalOverflow(root(page))).rejects.toThrow(/spans/);
  });
});

test.describe('expectFocusRingVisible', () => {
  test('passes when the ring has room', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-visible');
    await expectFocusRingVisible(page.getByTestId('target'));
  });

  test('fails when an overflow:hidden ancestor clips the ring', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-clipped');
    await expect(expectFocusRingVisible(page.getByTestId('target'))).rejects.toThrow(/clipped by ancestor/);
  });

  test('fails when there is no focus indicator at all', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-missing');
    await expect(expectFocusRingVisible(page.getByTestId('target'))).rejects.toThrow(/no focus indicator/);
  });
});

test.describe('expectSingleScroller (page scroll)', () => {
  test('fails when the page scrolls AND an inner panel scrolls', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--page-and-panel-scroll');
    await expect(expectSingleScroller(root(page))).rejects.toThrow(/2 elements scroll on the y axis \(.*page/);
  });

  test('passes when only the page scrolls', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--page-scroll-only-healthy');
    await expectSingleScroller(root(page));
  });
});

test.describe('expectNoHorizontalOverflow (legitimate patterns)', () => {
  for (const name of ['scrollable-table-wrapper-healthy', 'truncated-cell-healthy', 'offscreen-text-healthy']) {
    test(`passes: ${name}`, async ({ page }) => {
      await gotoStory(page, `internal-geometryfixtures--${name}`);
      await expectNoHorizontalOverflow(root(page));
    });
  }

  test('still fails on wide content that no ancestor clips', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--unclipped-wide-wrapper');
    await expect(expectNoHorizontalOverflow(root(page))).rejects.toThrow(/spans/);
  });
});

test.describe('expectFocusRingVisible (focus vs. no focus)', () => {
  const target = (page: import('@playwright/test').Page) => page.getByTestId('target');

  test('passes for a real ring that fades in with a CSS transition', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-with-transition');
    await expectFocusRingVisible(target(page));
  });

  test('fails (clipped) for a ring mid-transition: transitions are frozen before measuring', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-clipped-with-transition');
    await expect(expectFocusRingVisible(target(page))).rejects.toThrow(/clipped by ancestor/);
  });

  test('passes for a real inner ring fully inside the border box', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-fully-inside-healthy');
    await expectFocusRingVisible(target(page));
  });

  test('fails for a permanent faint shadow with no focus style', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-permanent-shadow');
    await expect(expectFocusRingVisible(target(page))).rejects.toThrow(/same with and without focus/);
  });

  test('fails for a transparent outline (outline-none in Tailwind v3)', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-transparent-outline');
    await expect(expectFocusRingVisible(target(page))).rejects.toThrow(/no focus indicator/);
  });

  test('fails for a real inner ring with negative offset cut by overflow:hidden', async ({ page }) => {
    await gotoStory(page, 'internal-geometryfixtures--focus-ring-inset-offset-clipped');
    await expect(expectFocusRingVisible(target(page))).rejects.toThrow(/clipped by ancestor/);
  });
});
