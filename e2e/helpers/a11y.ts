import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Fails if axe finds any accessibility violation in the page (or inside `include`). */
export async function expectNoA11yViolations(
  page: Page,
  options: { include?: string } = {},
): Promise<void> {
  let builder = new AxeBuilder({ page });
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
