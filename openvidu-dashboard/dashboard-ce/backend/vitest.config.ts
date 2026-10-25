import { defineConfig } from 'vitest/config';

const PLANS = 'test/integration/**/*query-plan.test.ts';

export default defineConfig({
	ssr: {
		resolve: {
			// Workspace packages resolve to their TypeScript sources through the `source` export condition.
			conditions: ['source', 'module', 'node', 'development|production']
		}
	},
	test: {
		environment: 'node',
		projects: [
			{
				extends: true,
				test: { name: 'unit', include: ['test/unit/**/*.test.ts'] }
			},
			{
				extends: true,
				test: {
					name: 'integration',
					include: ['test/integration/**/*.test.ts'],
					exclude: [PLANS],
					globalSetup: ['test/support/global-mongo.ts'],
					testTimeout: 120_000,
					hookTimeout: 600_000
				}
			},
			{
				extends: true,
				test: {
					// The data generations of the query plan suites saturate the machine; running them after the API
					// suites keeps the latency budgets of those meaningful.
					name: 'integration-plans',
					include: [PLANS],
					globalSetup: ['test/support/global-mongo.ts'],
					sequence: { groupOrder: 1 },
					testTimeout: 120_000,
					hookTimeout: 600_000
				}
			}
		]
	}
});
