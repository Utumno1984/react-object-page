import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './helpers/a11y';
import { gotoStory } from './helpers/story';

test.describe('gotoStory', () => {
  test('opens an existing story and waits for it to render', async ({ page }) => {
    await gotoStory(page, 'internal-harness--valid');
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('fails with an explicit error (not a timeout) for an unknown story id', async ({ page }) => {
    const started = Date.now();
    await expect(gotoStory(page, 'internal-harness--does-not-exist')).rejects.toThrow(
      /story "internal-harness--does-not-exist" not found in index\.json/,
    );
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});

test.describe('expectNoA11yViolations', () => {
  test('passes on a valid fixture', async ({ page }) => {
    await gotoStory(page, 'internal-harness--valid');
    await expectNoA11yViolations(page);
  });

  test('detects a button without an accessible name', async ({ page }) => {
    await gotoStory(page, 'internal-harness--button-without-name');
    await expect(page.getByTestId('nameless')).toBeVisible();
    await expect(expectNoA11yViolations(page)).rejects.toThrow(/button-name/);
  });
});
