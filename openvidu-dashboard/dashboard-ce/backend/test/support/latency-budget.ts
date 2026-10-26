import { expect } from 'vitest';

/**
 * Fails with the latency budget overruns, or prints each as a GitHub warning annotation when
 * `DASHBOARD_TEST_LATENCY_BUDGETS` is `report` (CI on shared runners). Query plan assertions fail either way.
 * @param overruns `<query>: <measured> ms > <budget> ms` lines
 */
export function expectWithinBudgets(overruns: string[]): void {
	if (process.env.DASHBOARD_TEST_LATENCY_BUDGETS !== 'report') {
		expect(overruns).toEqual([]);

		return;
	}

	for (const overrun of overruns) {
		console.log(`::warning title=Latency budget exceeded::${overrun}`);
	}
}
