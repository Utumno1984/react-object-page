import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Rules that only make sense for a whole page, not for a component rendered alone
 * in a story: they would fail for any "bare" component.
 */
const PAGE_LEVEL_RULES = ['landmark-one-main', 'page-has-heading-one', 'region'];

/**
 * Fails if axe finds any WCAG 2.x A/AA violation in the page (or inside `include`).
 * The whole document is scanned by default so that portals (Dialog/Popover) are covered.
 */
export async function expectNoA11yViolations(
  page: Page,
  options: { include?: string } = {},
): Promise<void> {
  let builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(PAGE_LEVEL_RULES);
  if (options.include) builder = builder.include(options.include);
  const { violations } = await builder.analyze();
  const summary = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));
  expect(violations, `axe violations:\n${JSON.stringify(summary, null, 2)}`).toEqual([]);
}
