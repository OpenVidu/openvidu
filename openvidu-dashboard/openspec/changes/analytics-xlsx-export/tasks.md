# Tasks

## 1. Dependency

- [x] 1.1 `write-excel-file` (check the latest stable on npm and its API on Context7): catalog entry, peer dependency
      of `dashboard-ui`, dependency of the CE frontend application. Verify: `pnpm install` and
      `./dashboard.sh check`; `pnpm audit` lists no advisory for it.

## 2. Frontend library

- [x] 2.1 Workbook model and writer (D3, D5): `WorkbookSheet`, the kind-to-format map (`workbookData`), the Info
      sheet, the lazy import of `write-excel-file/browser` behind the injectable `WORKBOOK_WRITER`, and the save
      through `saveDownload`. Verify: `analytics-workbook.spec.ts` checks the sheet names, the bold frozen header, the
      cell types and formats, and that the real writer gives a ZIP (`PK`) blob.
- [x] 2.2 `seriesSheets` and `breakdownSheet` (D3, D4): grouping by granularity and zone, sheet names, wall-clock
      dates in the page's zone, expanded metric columns, gaps as empty cells, the chart's breakdown order with its
      zeros. Verify: unit tests "Rooms over 24 hours", "Participants over a week", "Egress at two resolutions", "Gap
      in a series" and "Room topology".
- [x] 2.3 `AnalyticsPageContext.exportWorkbook` and the page implementation; `exportCsv`, `AnalyticsExportItems` and
      `AnalyticsDataService.exportCsv` removed. Verify: `analytics-page.spec.ts` "Export failure" and that no request
      is sent on export.
- [x] 2.4 `AnalyticsCard` (D6): "Export XLSX", the `export` output and the disabled rules; `ANALYTICS_PRO_SLOTS` Top
      rooms exportable; the page template with the sheets of each CE card. Verify: `analytics-page.spec.ts` "Card
      without data", "Strip in CE" and "Node scope".
- [x] 2.5 Public API: `exportWorkbook` on the context, `seriesSheets`, `breakdownSheet` and the sheet types. Verify:
      the library build (`ng build dashboard-ui`).

## 3. Tests

- [x] 3.1 e2e `analytics.spec.ts`: each CE card saves `analytics-<section>-….xlsx` with the sheets of its scenario; the
      Rooms workbook is read back (sheet names, header row, one date and one percentage cell); the locks show a
      disabled "Export XLSX"; no `export.csv` request is sent. Verify: `./dashboard.sh e2e`.
- [x] 3.2 Bundle budgets: the spreadsheet chunk is lazy and within 150 kB gzip. Verify: `ng build` and
      `scripts/check-bundle-size.mjs`.

## 4. Documentation and CHANGELOG

- [x] 4.1 `dashboard-ui` README, Analytics seams: `exportWorkbook`, `seriesSheets` and `breakdownSheet` replace
      `exportCsv`. `dashboard-ce/frontend/AGENTS.md`: Analytics cards export workbooks, lists export CSV. Verify:
      read-through.
- [x] 4.2 `CHANGELOG.md`, 3.10.0 Improved › UI: the Analytics line reads "…loads on demand, exports each section as an
      Excel workbook with a sheet per resolution and per breakdown…". Verify: read-through.

## 5. Final verification

- [x] 5.1 `./dashboard.sh check` and `./dashboard.sh e2e` green; `openspec validate analytics-xlsx-export --strict`
      green.
- [ ] 5.2 Manual check on `./dashboard.sh demo ce`:
      - each card's workbook opens in LibreOffice Calc and in Excel or Google Sheets, with local dates, percentages and
        frozen headers;
      - ranges of 24 h, 7 d and 30 d.

## Workflow follow-up

- Owner review, then archive when asked: sync the specs, update the `analytics-ui` Purpose ("CSV export per section"
  becomes "a workbook export per section"), delete the change folder, commit "archive analytics-xlsx-export, keep only
  the specs", and move the PRO `ce.ref` together with the PRO change `pro-exports`, whose cards use the new seam.
- Applied after `list-csv-export`.
