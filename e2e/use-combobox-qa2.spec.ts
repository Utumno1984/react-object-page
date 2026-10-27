import { expect, test, type Locator, type Page } from '@playwright/test';
import { gotoStory } from './helpers/story';

const STORY = 'internal-usecomboboxfixture--manual';
const input = (page: Page): Locator => page.getByRole('combobox', { name: 'City' });
const log = (page: Page): Locator => page.getByTestId('log').getByRole('listitem');
const active = (page: Page): Locator => page.getByTestId('active-index');

async function selectTorino(page: Page): Promise<void> {
  await input(page).click();
  await page.keyboard.type('tor');
  await page.keyboard.press('Enter');
  await expect(input(page)).toHaveValue('Torino');
}

test.describe('useCombobox QA round 2', () => {
  test('emptied text: no active option, Enter keeps the selection (clearOnEmpty off)', async ({ page }) => {
    await gotoStory(page, STORY);
    await selectTorino(page);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await expect(page.getByRole('option')).toHaveCount(5);
    await expect(active(page)).toHaveText('-1');
    await expect(input(page)).not.toHaveAttribute('aria-activedescendant', /.+/);
    await page.keyboard.press('Enter');
    await expect(input(page)).toHaveValue('Torino');
    await expect(page.getByTestId('selected')).toHaveText('Torino');
    await expect(log(page)).toHaveCount(1);
  });

  test('clearOnEmpty on: emptied text + Enter clears exactly once', async ({ page }) => {
    await gotoStory(page, STORY, 'clearOnEmpty:!true');
    await selectTorino(page);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await expect(active(page)).toHaveText('-1');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('selected')).toHaveText('none');
    await expect(input(page)).toHaveValue('');
    await expect(log(page)).toHaveCount(2);
    await expect(log(page).nth(1)).toHaveText('onSelectedItemChange(null)');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(log(page)).toHaveCount(2);
  });

  test('window blur (input still activeElement) does not close nor restore', async ({ page }) => {
    await gotoStory(page, STORY);
    await selectTorino(page);
    await page.keyboard.type('x');
    await expect(input(page)).toHaveValue('Torinox');
    await input(page).dispatchEvent('focusout'); // React's `onBlur` listens to focusout, not blur
    await expect(input(page)).toHaveValue('Torinox');
    await expect(input(page)).toHaveAttribute('aria-expanded', 'true');
  });

  test('real Tab away closes and restores the selected text', async ({ page }) => {
    await gotoStory(page, STORY);
    await selectTorino(page);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('zz');
    await expect(input(page)).toHaveValue('zz');
    await page.keyboard.press('Tab');
    await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(input(page)).toHaveValue('Torino');
    await expect(log(page)).toHaveCount(1);
  });

  test('real click outside closes and restores', async ({ page }) => {
    await gotoStory(page, STORY);
    await selectTorino(page);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('mod');
    await expect(page.getByRole('option')).toHaveCount(1);
    await page.getByTestId('debug').click();
    await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(input(page)).toHaveValue('Torino');
  });

  test('real click on the other button closes and restores (no typed text, no loop)', async ({ page }) => {
    await gotoStory(page, STORY);
    await input(page).click();
    await page.keyboard.type('mil');
    await page.getByRole('button', { name: 'Other control' }).click();
    await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(input(page)).toHaveValue('');
  });

  test('hover on an option makes it active (by key), including after filtering', async ({ page }) => {
    await gotoStory(page, STORY);
    await input(page).click();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('option', { name: 'Torino' }).hover();
    await expect(active(page)).toHaveText('4');
    await expect(input(page)).toHaveAttribute('aria-activedescendant', /option-to/);
    await page.getByRole('option', { name: 'Modena' }).hover();
    await expect(active(page)).toHaveText('1');
    await page.getByRole('option', { name: 'Mantova' }).hover(); // disabled: stays
    await expect(active(page)).toHaveText('1');
    await page.keyboard.type('m');
    await page.getByRole('option', { name: 'Modena' }).hover();
    await page.keyboard.press('Enter');
    await expect(input(page)).toHaveValue('Modena');
  });
});
