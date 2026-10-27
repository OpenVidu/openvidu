# Backend (`@openvidu-dashboard/backend`)

Express 5, Inversify, Zod and the official `mongodb` driver; TypeScript 6 strict ESM, relative imports end in `.js`.
Behaviour is specified in `openspec/specs/*-api`, `api-conventions`, `auth`, `status-api` and `editions-info`.

## Structure

- `src/lifecycle/startup.ts`: `startDashboard(options)` reads the configuration, connects to MongoDB, applies the
  writer schema gate, builds the container, calls `configure` and the startup hooks, then listens. Exit codes go
  through `Shutdown.run(code)`.
- `src/di/container.ts`: `buildContainer()` binds the CE services and extension tokens and registers the CE routes.
  `TOKENS` (`src/di/tokens.ts`) are bound with `toResolvedValue` factories, without decorators, so esbuild and Vitest
  need no metadata.
- Routes are declared once in the `RouteRegistry` (`src/api/route-registry.ts`): method, path under `/api/v1`, edition,
  `feature` of a PRO route, a unique `operationId` (camelCase, verb first: `listRooms`, `getRoomsSummary`), tags
  declared first with `registry.tag(name, description)`, security (`public`, `bearer`, `optional-bearer`, plus
  `refreshCookie` for the auth routes), Zod schemas of params, query, body and responses, and the handler. It drives
  validation, authentication and the OpenAPI document (`src/api/openapi.ts`, only when `NODE_ENV` is not `production`).
- OpenAPI rules, enforced by `test/integration/openapi-document.test.ts` through `documentationIssues()`
  (`test/support/openapi-checks.ts`): every parameter has a description (`.meta({ description })`; the generator lifts
  one set before `.default()` or `.optional()`), comma-separated lists use `csvParam()` or an array `override`, errors
  without a schema get `ApiError`, `400` and `401` are added from the input and the security, and a response only one
  edition answers carries `edition`.
- PRO routes are only locks here: `registry.lock({ method, path, feature })` answers `403 PRO_FEATURE` after
  authentication and stays out of the OpenAPI document. An edition that extends CE registers the full definition in the
  lock's place (mount order kept) and swaps a CE route for its extension with `registry.replace()`; a `pro` startup
  that leaves a lock without a definition exits with code 1, naming it.
- Extension tokens that `configure` can rebind: `Features`, `LicenseInfo`, `AnalyticsCatalogue` (metrics and
  dimensions the analytics endpoints compute) and `OverviewExtension` (extra overview fields, merged before the
  `ETag`). A `configure` that throws stops the startup with code 1.
- A resource slice is `src/<resource>/`: `*-schemas.ts` (Zod), `*-query.ts` (pure filter builders), `*-repository.ts`
  (MongoDB), `*-service.ts` (paging, mapping), `*-responses.ts` (OpenAPI response schemas, checked against the mappers
  in unit tests) and `*-routes.ts` (`register<Resource>Routes`: the CE routes and the locks of the PRO ones).
- Zod schemas live here because typings has no runtime dependencies; typings declares the matching types in
  `src/api/`. Errors use `{ error: { code, message, details? } }` with `ErrorCode`.
- Shared query pieces in `src/api/`: `rangedQuery(now, shape)` for ranged queries (relative grammar resolved at parse
  time) and `optionalRangeQuery(now, shape)` when the bounds are optional, `pageQuery()` for keyset pages on an index
  ending in `_id`, `indexOrderedPage()` when the index does not order by `_id`, and `rankedPage()` with
  `assertRankedRange()` (`src/api/ranked.ts`) for metric sorts ranked in memory at the cursor's `asOf`. Calendar math in
  a time zone uses date-fns and `@date-fns/tz`.
- `src/stats/stats-mode.ts`: `StatsModeReader` reads the writer's `stats_detail` for `GET /info`.
- `src/analytics/` answers from the rollup collections only: `analytics-planner.ts` picks the granularity, source
  collection and bucket grid, `analytics-counters.ts` folds the documents in process with the definitions of the
  catalogue, `AnalyticsCache` keeps the folds of completed documents and `AnalyticsFeatureGate` rejects PRO metrics,
  dimensions and node scopes on CE.
- `src/status/freshness.ts` marks active rooms and participants `stale` with the backend clock, from the typings
  `freshnessWindows()`.
- `src/index.ts` exports what an extending backend builds on: the startup, tokens and registry, the generic query,
  cursor, response and freshness pieces, and the list pieces that entity details extend.
- Exact identifiers (`RM_`, `PA_`, `EG_`, `IN_`, `TR_`) are matched with `ENTITY_ID_PATTERNS`, `isEntityId()` and
  `entityIdKind()` from typings.
- Configuration variables are new `DASHBOARD_*`, or `DATABASE_*` for database connection settings; legacy names keep
  their 3.9 meaning (`src/config/variables.ts`, unit-tested). The README lists them all.
- `scripts/dev.ts` (exported as `@openvidu-dashboard/backend/dev`) serves `./dashboard.sh dev`: `loadDevEnv()` (the
  environment, then `.env`, then `dev.env`; `scripts/dev-preload.ts` for `tsx watch --import`) and
  `checkDevConfig()` (`scripts/dev-check.ts`). `dev.env` holds the openvidu-local-deployment defaults; never give
  `src/` defaults for required variables, since a deployment must fail when they are missing.

## Rules

- Repositories own the queries. Every list, detail and time-series query is backed by an index and asserted with
  `expectIndexBacked` (`test/support/query-plan.ts`: no COLLSCAN above 1 000 documents, bounded `totalDocsExamined`).

## Tests

- Unit tests: Vitest (`pnpm test`).
- Integration tests: `test/integration/`, Vitest projects `integration` and `integration-plans` (the `*query-plan`
  suites, run after the rest so their data generation does not skew the latency budgets). `test/support/` starts a
  replica set with Testcontainers on `openvidu/mongodb:8.0.29-r1` (the official `mongo:8.0` refuses Linux kernels 6.19
  and newer), or uses `DASHBOARD_TEST_MONGO_URI`; `DASHBOARD_TEST_MONGO_IMAGE` overrides the image. Through pnpm
  without Docker the suites report themselves skipped; `./dashboard.sh test-integration` fails instead.
- They also need `openssl` (test CA of the TLS case) and build the package to run `dist/server.js` as a process.
  `test/support/boot.ts` starts the dashboard in-process on a fresh database with a controllable clock.
- `test/support/` is exported to the suites of extending packages as `@openvidu-dashboard/backend/testing` (source
  only, never in `dist`), and the MongoDB global setup as `@openvidu-dashboard/backend/testing/global-mongo`.
- Query-plan suites generate data with `dashboard-ce/tools/data-generator` and report the p95 of their budget. Design
  figures come from scenario M over 7 days on a MongoDB with room for it, run alone:

  ```bash
  DASHBOARD_TEST_MONGO_URI=<uri> ROOMS_PLAN_SCENARIO=M ROOMS_PLAN_DAYS=7 ROOMS_PLAN_REPORT=<file> \
    pnpm --filter @openvidu-dashboard/backend exec vitest run --project integration-plans \
    test/integration/rooms-query-plan.test.ts
  ```

  The other suites take the prefixes `PARTICIPANTS_PLAN_`, `EGRESS_PLAN_`, `INGRESS_PLAN_`, `OVERVIEW_PLAN_` and
  `ANALYTICS_PLAN_`. `DASHBOARD_TEST_LATENCY_BUDGETS=report` (set in CI) turns p95 overruns into warnings; plan
  assertions fail either way.
