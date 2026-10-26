# @openvidu-dashboard/ui

All the dashboard UI: shell, pages, services, building blocks, theme and icons. The CE application
(`dashboard-ce/frontend/src`) and the applications that extend it only compose it.

## Composing an application

```ts
providers: [
  provideZonelessChangeDetection(),
  provideRouter(composeRoutes(DASHBOARD_ROUTES, APP_ROUTES)),
  provideHttpClient(withInterceptors([...DASHBOARD_INTERCEPTORS])),
  provideDashboard()
];
```

```scss
@use '@fontsource-variable/inter/index' as inter;
@use '@fontsource-variable/jetbrains-mono/index' as jetbrains-mono;
@use '@openvidu-dashboard/ui/styles' as ovd;

@include ovd.theme;
```

The application copies `assets/` (logo, and the icon sprite unless it builds its own) to `assets/` of its build and
runs `scripts/icons.mjs build` before building. `icons.mjs build|check [--sprite <file>] [<icons.json>...]` compiles and
checks the sprite of several manifests, each listing its `icons` and the `sources` directories that use them, so an
application adds its own manifest to the library one.

## Extension points

- **Routes.** `DASHBOARD_ROUTES` are `DashboardRoute` configs; `composeRoutes(...configs)` lets a later config replace
  any route by path (children merge by path) while keeping the `data` keys it does not set. A page of an extending
  application replaces a locked CE page by declaring the same path, e.g. `{ path: '', children: [{ path: 'rooms', children: [{ path: ':roomSid',
loadComponent: … }] }] }`.
- **Navigation metadata.** `data.navigation` is a `NavigationMeta` (label, icon, path, order, `feature`, `liveCapable`,
  `rangeScoped`, and on range-scoped routes `retention`, the `GET /api/v1/info` retention of the page's data that the
  range picker warns about); orders leave gaps of 10 for new entries. Detail routes declare `data.page` (`PageMeta`),
  `data.breadcrumb` and `data.entity`. `navigationEntries()` derives the sidenav from the composed routes.
- **Feature flags.** `FeatureService` reads the features of `GET /api/v1/info` (`InfoService`); `FeatureGate` with
  `FeatureContent` renders its content only when the feature is enabled and `ProLockOverlay` otherwise, without any
  request. `FEATURE_COPY` holds the lock texts.
- **Component seams.** The library renders a lock while the feature is disabled, and the component an application
  provides once it is enabled, loaded on first use:
  - `ANALYTICS_PRO_CARDS`: per slot of the Analytics PRO strip (`quality`, `diagnostics`, `topRooms`), a
    `loadComponent()` and the metrics and dimensions it adds to the page's combined requests. The card components
    inject `AnalyticsPageContext` (state, zone, refresh count, series, breakdowns, chart ranges and notes, CSV export,
    widen and retry) and render an `ovd-analytics-card` with `CardContent`.
  - `ANALYTICS_SCOPE_SELECT` (Analytics header) and `ROOMS_NODE_FILTER` (Rooms filter bar): loaders of the node
    selects, which send their own scopes requests.
  - `OVERVIEW_NODES_CARD`: the "By node" card of the Overview, given `overview`, the last overview response.
- **Status styles.** `provideStatusStyles()` registers status domains beyond the CE ones of `ovd-status-badge`, with
  the styles of `STATUS_FAMILY_STYLES`.
- **Chart colours.** `ChartColorsService.colors()` resolves the theme's chart tokens; `resolved(tokens)` resolves an
  application's own custom properties under the applied scheme.
- **Injection tokens.** `SEARCH_SOURCES` (lists searched by the header), `BROWSER_STORAGE` (storage behind
  `StorageService`). Root services such as `InfoService` can be replaced with a provider.
- **Shell slots.** `DashboardShell` projects `[ovdBanner]` content under the header, next to the migration, schema and
  connectivity banners.
- **Page helpers.** `injectRefreshScheduler()` registers a page loader with the header refresh control;
  `EntityPreviewService` hands list rows to detail headers and breadcrumbs; `QueryStateService` and
  `ListStateService` own the URL state and the range carried across pages.
- **Test support.** `src/testing/` (fixtures, harnesses, media queries, icons, the Analytics page harness and the unit
  test providers) is shared with the application specs as `@openvidu-dashboard/ui/testing` through tsconfig `paths`.
