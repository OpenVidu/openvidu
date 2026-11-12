# Design

## Context

See proposal.md for the motivation. Current state of `projects/dashboard-ui/src/lib/features/analytics`:

- **Combined requests:** the page loads its data with `analyticsPlan()`:
  - one series request at the page granularity;
  - one at `1h` for the hourly-only metrics while the page is finer;
  - one at `1d` for `uniqueIdentities` while the page is not daily (its points on UTC days, `basis: 'utcDay'`);
  - one breakdowns request.
- **Chart data:**
  - `chart(metrics)`, `chartRange(metric)` and `note(metric)` hand each chart its series, axis range and bucket note;
  - `entries(dimension, labels)` hands each breakdown chart its labelled entries;
  - ordered breakdowns keep their keys at 0.
- **Export today:** `AnalyticsCard` renders "Export CSV" and emits `exportCsv`. `AnalyticsPage.exportCsv(card, items)`
  calls `AnalyticsDataService.exportCsv`, which downloads `GET analytics/export.csv` and saves it through a temporary
  link.
  - `AnalyticsPageContext` exposes `exportCsv` and `isExporting` to the PRO cards.
- **Libraries:**
  - `dashboard-ui` takes its libraries as peer dependencies from the catalog (`echarts`, `@date-fns/tz`…), and the
    applications list them;
  - lazy chunks have a 150 kB gzip budget.
- **Rates:** the series give percentages on a 0-100 scale (`share(…, 100)`).
- **Helpers from `list-csv-export`:** `saveDownload` saves a blob through a temporary link; `exportFailedMessage()`
  is the shared toast text.

## Goals / Non-Goals

**Goals:**
- A workbook equal to the charts: same buckets, resolutions, labels and order, with no request of its own.
- A seam an edition's card can describe its sheets with, without touching the spreadsheet library.

**Non-Goals:**
- A server-side spreadsheet API.
- Styling beyond a bold, frozen header row and number formats.

## Decisions

### D1. Built in the browser from the loaded data

- The page already holds every series at the resolution its chart draws, and every breakdown as its chart shows it.
- The card's workbook is built from that data:
  - nothing is requested;
  - the file cannot drift from the charts;
  - the backend and the PRO executable carry no spreadsheet code.

Rejected alternatives:
- **A server endpoint (`export.xlsx`).**
  - It would repeat the page's request plan (hourly-only split, UTC days) in the backend.
  - It would ship the library in both backends and in the PRO executable.
- **Several tables in one CSV.** It is not a table any more: filters, sorts and importers break.
- **One CSV per resolution from a menu.** The owner preferred one file per card.

### D2. `write-excel-file`, loaded on the first export

- Version 4.1.1, MIT, with one dependency (`fflate`).
- It writes several named sheets, `Date` cells with a format, number formats, column widths and frozen rows, and its
  `write-excel-file/browser` entry returns a `Blob`.
- It goes in the catalog, as a peer dependency of `dashboard-ui` and a dependency of the CE application. The PRO
  application lists it in its change.
- The page imports it with `import('write-excel-file/browser')` on the first export, so it lands in a lazy chunk under
  the 150 kB budget.

Rejected alternatives:
- **`xlsx` (SheetJS).** The npm package is frozen at 0.18.5, with known advisories; newer builds are only outside npm.
- **`exceljs` 4.4.0.** Nine dependencies (archiver, unzipper…) and no recent release.
- **Writing the OOXML and ZIP by hand.** Maintenance for no gain.

### D3. Workbook model and seam

- **Sheet model:** `WorkbookSheet = { name; columns: WorkbookColumn[]; rows: WorkbookCell[][] }`.
  - A column has a `header`, a `kind` (`date`, `count`, `bytes`, `percent`, `score`, `duration`, `text`) and a width.
- **`AnalyticsPageContext.exportWorkbook(card, sheets)`:**
  - prepends the Info sheet;
  - names the file `analytics-<sectionId>-<from>-<to>.xlsx`;
  - loads the library and maps the kinds to cell types and formats;
  - saves through `saveDownload`;
  - tracks `isExporting(card)`;
  - toasts `exportFailedMessage()` on failure.
- **`seriesSheets(columns)`:**
  - takes `{ metric, heading }` entries; each column's kind follows the metric's unit in its metric info (`count`,
    `bytes`, `percent`, and `mos` as `score`), so an edition's metrics work through their `metricInfo`;
  - reads the page's series, grouping them by request (granularity and basis);
  - names each sheet after its resolution;
  - adds " · <series name>" to the heading of an expanded metric (`egressEnded.<status>`) with its legend label.
- **`breakdownSheet(heading, entries)`:** a pure function over the `BreakdownEntry[]` the chart draws, so labels, order
  and the keys at 0 match; the share is the entry over the sum, as the chart computes it.
- **Exports:** `exportWorkbook` and `seriesSheets` are members of the context, since they read the page's requests;
  `breakdownSheet`, `wallClock` and the sheet types are exported functions and types. `exportCsv` and
  `AnalyticsExportItems` are removed from the context.
- **CE template:** each card passes its sheets in its `(export)` handler, for example Rooms:
  ```ts
  exportWorkbook('rooms', [
    ...seriesSheets([
      { metric: 'roomsPeakActive', heading: 'Active rooms' },
      { metric: 'roomsCreated', heading: 'Rooms created' },
      { metric: 'recordedRoomsRate', heading: 'Recorded rooms' }
    ]),
    breakdownSheet('Room topology', breakdowns().roomTopology),
    breakdownSheet('Room size', breakdowns().roomSize)
  ])
  ```

Rejected alternative: **letting each card build the workbook itself.** Every card would repeat the Info sheet, the
file name, the formats and the error handling.

### D4. Dates in the page's zone

- Spreadsheet dates carry no zone.
- Each bucket start is converted to its wall-clock time in the page's zone with `@date-fns/tz`, written as that
  calendar time, with the format `yyyy-mm-dd hh:mm`.
- The header names the zone: "Bucket start (Europe/Madrid)". The UTC-day series use "UTC".
- Series that share a granularity and a zone share a sheet. The sheet is named after `GRANULARITY_LABELS` ("5 min",
  "1 h"…), plus " (UTC)" when its zone is UTC and the page's is not.
- The Info sheet writes the range and the export time the same way.

### D5. Cell formats

| Kind      | Value written         | Format    |
| --------- | --------------------- | --------- |
| `count`   | the number            | `#,##0`   |
| `bytes`   | the number            | `#,##0`   |
| `percent` | value / 100           | `0.0%`    |
| `score`   | the number            | `0.00`    |
| `duration`| milliseconds / 1 day  | `[h]:mm:ss` |
| `text`    | the string, as text   | —         |

- `null` is an empty cell.
- Text cells are strings, never formulas, so a label starting with `=` is shown and not run.
- Bytes headers end in " (bytes)".
- Breakdown sheets have the columns `<heading>` (text), "Count" (count) and "Share" (percent).
- Every sheet freezes its bold header row.

### D6. The card's button

- `AnalyticsCard` renders "Export XLSX" with the `download` icon and emits `export`.
- The button is disabled while:
  - `locked` or `exportDisabled` is set;
  - the card is loading or empty;
  - `exporting` is set.
- `ANALYTICS_PRO_SLOTS` marks Top rooms `exportable: true`, so its lock shows the disabled button too.
- `AnalyticsDataService.exportCsv` and the page's CSV path are removed. `GET /api/v1/analytics/export.csv` stays in the
  backend and its spec.

## Risks / Trade-offs

- **[A larger download on the first export]** → The chunk is lazy and budgeted. `scripts/check-bundle-size.mjs` checks
  it after `ng build`.
- **[A spreadsheet in another locale]** → The format codes are locale independent, and the application shows the
  locale's separators.
- **[The workbook mirrors the screen]** → It holds what the charts draw. Retried or partial data is exported as shown,
  and the Info sheet records the export time.

## Migration Plan

Frontend only. A rollback reverts the commits. The PRO cards keep calling `exportCsv` until they move `ce.ref`, so the
PRO change lands in the same `ce.ref` move: the removed context method makes PRO fail to build until its cards adopt
`exportWorkbook`.
