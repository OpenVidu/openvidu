import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4310);
const ci = process.env.CI !== undefined;

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: ci,
	retries: ci ? 1 : 0,
	workers: 2,
	reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${String(port)}`,
		timezoneId: 'Europe/Madrid',
		locale: 'en-US',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'node scripts/serve.mjs',
		url: `http://127.0.0.1:${String(port)}/`,
		reuseExistingServer: !ci,
		timeout: 30_000
	}
});
