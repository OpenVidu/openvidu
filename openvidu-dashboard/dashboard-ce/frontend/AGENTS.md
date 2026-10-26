# Frontend (`@openvidu-dashboard/frontend` and `@openvidu-dashboard/ui`)

Angular 22 standalone, zoneless and signals: OnPush is the default (do not set it), `inject()` instead of constructor
injection, `@Service()` for root services, Signal Forms for forms. All UI lives in the library
`projects/dashboard-ui` (`src/lib/`: `core/` services, `shell/`, `components/` building blocks, `charts/`, `format/`,
`features/<resource>/` data services, helpers and pages, `routes.ts`); its README describes composition and the
extension points. Behaviour is specified in `openspec/specs/ui-*` and the `*-ui` specs.

## Routes and pages

- Routes are `DashboardRoute` configs in `src/lib/routes.ts` (`DASHBOARD_ROUTES`) whose `data` carries `navigation`,
  `page` (`liveCapable`, `rangeScoped`, `timed`, `feature`), `breadcrumb` and `entity`; applications pass them to
  `composeRoutes()`, where a later config replaces a route by path. Pages are lazy and never exported from
  `public-api.ts`, or the library build folds them into the initial chunk.
- The library holds what CE renders, locks included. What only an extending edition renders lives in its own
  application: its pages replace the locked CE routes and its pieces of CE pages fill the extension points of the
  library README. `features/analytics/` holds the Analytics page with the locks of its PRO strip.

## State and data

- The URL is the single source of a page's state through `QueryStateService` (drops `cursor` and `page` on any other
  change; `keepCursor` for panel parameters). Relative times are resolved to ISO in `tz` before calling the API; the zone
  is one per session (`SessionZoneService`), written into the URL of `timed` pages by `ListStateService`.
- HTTP only through `HttpService` (paths relative to `api/v1/`, errors as `ApiRequestError`); browser storage only
  through `StorageService`.
- Pages load through `injectListLoader()` or `injectRefreshScheduler()` (`manual` for on-demand pages, `paused` with a
  reason); `injectLiveCounters()` polls the overview counters outside the header control. The shell polls
  `GET /api/v1/status` through `injectServerStatusPoll()` into `ServerStatusService`, the one source of the status
  banners, the live chip and the Data pipeline card; `InfoService` holds edition, features, retention and limits.
- Freshness is judged at the last response (`generatedAt`) with the typings `freshnessWindows()`, never extrapolated by
  the ticker; running durations render with `ovd-duration`, never `Date.now()` in templates.

## Building blocks

- Cards, sections, charts and empty states take a `heading` input, never `title` (Angular would render it as a native
  tooltip over the whole host).
- A term a newcomer would not understand gets an info tip through the `info` input of tiles, cards, charts,
  `TableColumn` and `EntityFact`, with its text in `INFO_TEXTS` (`format/info-texts.ts`); labels carry no hover text of
  their own.
- Charts: bucket and zone in the `note` (`seriesNote()`), options merged into the kept instance (`bindChartOptions()`),
  colours from `chartSlots()`, no zoom on wheel.
- Identifiers appear once, with `ovd-copy-button` beside the visible value; navigation uses links, never row clicks.
- Lists use `ovd-list-search` inside `.ovd-filter-bar`, `ovd-room-chip` for the room filter, ranked sorts from
  `rankedSortReasons()` and `ovd-data-table`.
- Messages use `ovd-notice` (`ovd-error-banner` for errors with Retry) and enum labels `enumLabel()`
  (`format/labels.ts`).
- Icons are Material Symbols Rounded listed in `projects/dashboard-ui/icons.json` and compiled by
  `scripts/icons.mjs build`, which also takes the manifests of an extending application; lint fails on an icon used but
  unlisted, listed but unused, or unknown. Theme tokens are `light-dark()` pairs in
  `projects/dashboard-ui/styles/_tokens.scss`.

## Builds and tests

- Gzip budgets checked after `ng build` (`scripts/check-bundle-size.mjs`): 400 kB initial, 150 kB per lazy chunk, 250 kB
  for the ECharts chunk.
- Unit tests: `pnpm exec ng test dashboard-ui --watch=false` (Vitest, jsdom; `--include=<spec>` for one file). `vitest-base.config.mts` adds the `source` condition;
  `projects/dashboard-ui/src/testing/` holds setup, shared providers and fixtures.
- `vitest-base.config.mts` turns off Vitest's file system module cache, which would serve modules compiled from older
  sources to the Angular builder. When the demo goes blank after a typings change ("does not provide an export named"),
  delete `.angular/cache/*/frontend/vite` and restart it.
