import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_BACKEND_PORT ?? 4320);
const ci = process.env.CI !== undefined;

/** The real backend on a seeded MongoDB, serving the production build (see scripts/serve-dashboard.mjs). */
export default defineConfig({
	testDir: './tests-backend',
	outputDir: './test-results/backend',
	forbidOnly: ci,
	retries: ci ? 1 : 0,
	workers: 1,
	reporter: ci ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report/backend' }]] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${String(port)}`,
		timezoneId: 'Europe/Madrid',
		locale: 'en-US',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'node scripts/serve-dashboard.mjs',
		url: `http://127.0.0.1:${String(port)}/api/healthcheck`,
		reuseExistingServer: false,
		timeout: 120_000
	}
});
