# Tasks

## 1. Typings

- [x] 1.1 `api/csv.ts`:
      - `CSV_CONTENT_TYPE` (replacing `ANALYTICS_CSV_CONTENT_TYPE` and its uses);
      - `LIST_EXPORT_MAX_ROWS = 10_000`;
      - `EXPORT_TRUNCATED_HEADER = 'X-Export-Truncated'`;
      - `listCsvFileName(list, from, to)`.
      Verify: `api-contract.test.ts` checks the file name without colons and the constants.

## 2. Backend

- [x] 2.1 `api/csv.ts` (D4): `toCsv` and the cell encoding moved from `analytics/analytics-csv.ts`, with booleans,
      `;`-joined arrays and the formula prefix; the Analytics writers import them. Verify: unit tests cover quoting,
      empty cells, arrays, `=`/`+`/`-`/`@`/TAB/CR prefixes and unprefixed negative numbers; the Analytics CSV unit tests
      still pass.
- [x] 2.2 `api/csv-export.ts` (D6): `registerCsvExport` (attachment, header, OpenAPI `200` with `text/csv` and the
      `X-Export-Truncated` header) and `listRows` (D2), plus the `withTotal: false` option of the five list methods.
      Verify: unit tests of a cut and a whole export over a stub list.
- [x] 2.3 Columns (D3): `rooms-csv.ts`, `participants-csv.ts` (participants and agents), `egress-csv.ts` and
      `ingress-csv.ts`, with `mediaNode` under `per-node-breakdown` and the empty bytes of a room without media
      statistics. Verify: unit tests of each header and of the scenarios "Active room", "Room without media
      statistics", "Session without client information" and "Web egress without room".
- [x] 2.4 The five routes, each registered right after its list route, with the list query without `cursor` and
      `limit` (D1). Verify:
      - integration tests per list: the filters, the ranked order, the exact ID and the empty export;
      - `SORT_RANGE_TOO_WIDE` as JSON;
      - 12,000 participants cut with the header, and 10,000 whole without it.
- [x] 2.5 The lock `/rooms/{sid}/participants/export.csv` (`room-detail`). Verify: `rooms-api.test.ts` answers
      `PRO_FEATURE` on it, and `list-exports-api.test.ts` answers each list export before its detail route.
- [x] 2.6 Export the seam from `src/index.ts`: `registerCsvExport`, `listRows`, `CsvColumn`, `toCsv` and the column
      sets. Verify: typecheck; the PRO change consumes them.
- [x] 2.7 OpenAPI: the five operations with their ids, parameters, `text/csv` `200` and the truncation header, and
      their `400` and `401`. Verify: `openapi-document.test.ts`.
- [x] 2.8 Query plans: each `*-query-plan.test.ts` explains its export with the default and a ranked sort and reports
      its p95 against the 2 s budget at scenario M for 7 days. Verify: `./dashboard.sh test-integration`.

## 3. Frontend library

- [x] 3.1 `HttpService.download` with `truncated`, and `saveDownload` in `core/http`, used by `AnalyticsDataService`.
      Verify: `http.spec.ts` reads the header; the Analytics export tests pass.
- [x] 3.2 `ovd-export-button` (D7): the running state, the save, and the cap and failure toasts, with the exported
      `exportFailedMessage()` and `EXPORT_TRUNCATED_MESSAGE`, which the Analytics page also uses. Verify:
      `export-button.spec.ts` "Cut export", "Failed export" and the disabled state; the Analytics failure test passes.
- [x] 3.3 The data table's `exportCsv` input: the button at the end of the toolbar, as a table and as cards, or after
      Columns in the section header; forwarded by `ovd-rooms-table` and the participant sessions table. Verify: `data-table.spec.ts` "Toolbar of a list" and
      "Cards on a phone".
- [x] 3.4 `export(request)` in the rooms, participants, agents, egress and ingress data services, and the button on
      the five pages, disabled with no rows. Verify: each page spec checks the scenario of its UI requirement (the
      parameters sent, no `cursor` or `limit`).

## 4. Tests

- [x] 4.1 e2e:
      - the Rooms list exports with its filters and saves `rooms-….csv`;
      - a mocked cut export shows the cap toast;
      - the button is disabled on an empty list;
      - the axe checks pass.
      Verify: `./dashboard.sh e2e`.

## 5. Documentation and CHANGELOG

- [x] 5.1 AGENTS.md files:
      - `dashboard-ce/backend/AGENTS.md`: CSV routes through `registerCsvExport`, and columns next to the mappers;
      - `dashboard-ce/frontend/AGENTS.md`: the `exportCsv` input of `ovd-data-table` and `saveDownload()`.
      Verify: read-through.
- [x] 5.2 `CHANGELOG.md`, 3.10.0:
      - Added › UI: "Every list exports what it shows as CSV, across all its pages, up to 10,000 rows.";
      - Added › Data: the versioned API line names the CSV exports.
      Verify: read-through.

## 6. Final verification

- [x] 6.1 `./dashboard.sh check`, `./dashboard.sh test-integration` and `./dashboard.sh e2e` green;
      `openspec validate list-csv-export --strict` green.
- [ ] 6.2 Manual check on `./dashboard.sh demo ce`:
      - each list exports and the file opens in a spreadsheet with its columns;
      - a range of more than 10,000 participant sessions shows the cap toast.

## Workflow follow-up

- Owner review, then archive when asked: sync the specs, delete the change folder, commit "archive list-csv-export,
  keep only the specs", and move the PRO `ce.ref`.
- The documentation page of the dashboard (openvidu.io) describes the exports and that their files leave the
  dashboard's access control.
- The PRO change `pro-exports` registers the room participants export on this seam.
