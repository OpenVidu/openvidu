# Proposal

## Why

"Export CSV" on an Analytics card downloads one CSV of one shape and one resolution, so it cannot hold what the card
draws:
- **Missing charts:** a card that draws time series and breakdowns exports only its series. Room topology, Room size,
  Participant kind, Egress type and Ingress input type are never exported.
- **One resolution:** a card whose charts use several resolutions exports all of them at the coarsest. Over 24 hours,
  Active rooms and Rooms created are drawn every 5 minutes but exported per hour, because Recorded rooms is hourly.
- **Unique identities:** drawn per UTC day, it is left out unless the page itself is daily.
- **Readability:** bucket starts are UTC instants, so a day of a Madrid range reads as 23:00 of the day before.

The owner chose a spreadsheet workbook per card (2026-11-12): one sheet per resolution and per breakdown, so the file
matches the charts.

## What Changes

- **Export XLSX:** each Analytics section card has "Export XLSX" in its header, in place of "Export CSV". It saves an
  `.xlsx` workbook of what the card draws, built in the browser from the data the page already loaded, with no new
  request. Sheets:
  - **Info:** the section, the range in the page's time zone, the zone, the node scope with `per-node-breakdown`, and
    the export time.
  - **One sheet per time resolution** of the card's series, named after it ("5 min", "1 h", "1 d (UTC)"…):
    - a first column with the bucket start in the page's zone (UTC for the daily unique identities);
    - one column per series, named after its chart;
    - an empty cell where the chart shows a gap.
  - **One sheet per breakdown**, named after its chart: the labels the chart shows, in its order, with their count
    and share.
- **Typed cells:**
  - dates as spreadsheet dates;
  - counts as numbers;
  - rates as percentages;
  - bytes as whole numbers;
  - text as text, which a spreadsheet never evaluates as a formula.
- **States:** the button is disabled:
  - while the card has no data;
  - on locked cards, the Top rooms lock included;
  - for Egress and Ingress in a node scope;
  - while the file is built.
  A failure is toasted.
- **Seam:** the page context builds and saves a workbook from sheets that an edition's card describes, with helpers for
  series and breakdown sheets.

Not in scope:
- The KPI tiles, which stay out of the workbook.
- The CSV export API (`GET /api/v1/analytics/export.csv`): it stays as it is for scripts, but the page no longer calls
  it.
- Lists, which export CSV in `list-csv-export`.

Edition: CE. The PRO cards (Quality, Diagnostics, Top rooms) adopt the workbook in a PRO change.

Repositories: Dashboard CE (specs, frontend library, its dependencies, e2e, `CHANGELOG.md`). Dashboard PRO: `ce.ref`
move, then the PRO change.

CHANGELOG (`CHANGELOG.md`, 3.10.0, Improved › UI, unreleased): the Analytics line reads "…loads on demand and exports
CSV…". It becomes "…loads on demand, exports each section as an Excel workbook with a sheet per resolution and per
breakdown…".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `analytics-ui`:
  - the CSV export per section is replaced by the workbook export, its sheets and its cells;
  - the locked cards and the node scope disable "Export XLSX".
- `ui-building-blocks`: the section card scenario names "Export XLSX".
- `ui-shell`: the scenario of a slow download moves from the Analytics CSV to a list CSV export.

## Impact

- **Dependency:** `write-excel-file` (4.1.1, MIT, its only dependency `fflate`) for `dashboard-ui`, loaded on the
  first export.
- **Frontend library:**
  - `features/analytics/`: the card's button, the page's workbook export and sheet helpers, the page template;
  - `AnalyticsDataService.exportCsv` is removed;
  - `ANALYTICS_PRO_SLOTS`: Top rooms exportable;
  - unit tests.
- **e2e:** `analytics.spec.ts` saves and reads a workbook.
- **No change to:**
  - the API, data model or writer;
  - PRO, until it moves `ce.ref`; its cards then move to the workbook in the PRO change.
- **Order:**
  - applied after `list-csv-export`, whose download and toast helpers it uses;
  - the ui-shell scenario names a list export.
