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
