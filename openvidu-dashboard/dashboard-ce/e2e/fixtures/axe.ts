import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Fails with the rule and targets of every WCAG 2.2 AA violation on the page. */
export async function expectNoViolations(page: Page): Promise<void> {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();

	expect(
		results.violations.map(
			(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`
		)
	).toEqual([]);
}
