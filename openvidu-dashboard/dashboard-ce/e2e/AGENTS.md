# End-to-end tests (`@openvidu-dashboard/e2e`)

- Playwright on Chromium against the production build served by `scripts/serve.mjs`, which also strips a `/dashboard/`
  prefix for the base href test. The API is mocked by `fixtures/api.ts` (`page.route()`).
- Suites include axe checks and light and dark baseline screenshots. `maxDiffPixelRatio` 0.01 lets small UI changes
  pass; regenerate with `--update-snapshots=all` when a change is intended.
- `tests-backend/` (`playwright.backend.config.ts`) runs the session flow against the real backend on a MongoDB seeded
  from the contract fixtures (`scripts/serve-dashboard.mjs`, `scripts/seed-rooms.mjs`); `./dashboard.sh e2e` runs it
  when Docker or `DASHBOARD_TEST_MONGO_URI` is available and reports it skipped otherwise.
- The server and the fixtures are exported for the suites of extending applications (`@openvidu-dashboard/e2e/serve`
  with `E2E_APP_ROOT`, `@openvidu-dashboard/e2e/fixtures`): the `routes` option of `MockApi` answers the paths the CE
  mock does not know, and `analytics` adds series values and breakdown keys. To run the suite after a build:
  `pnpm --filter @openvidu-dashboard/e2e run e2e [playwright args]`.
- Install the browser once: `pnpm --filter @openvidu-dashboard/e2e exec playwright install chromium`.
