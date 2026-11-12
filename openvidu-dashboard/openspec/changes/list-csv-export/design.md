# Design

## Context

See proposal.md for the motivation. Current state:

- **Backend lists:** `RoomsService.list`, `ParticipantsService.list` and `.agents`, `EgressService.list` and
  `IngressService.list`.
  - Each takes its validated params, `limit` included, and answers `{ items, nextCursor, prevCursor, total? }`.
  - Index-ordered sorts read `limit + 1` documents of a range index.
  - Ranked sorts rank every document of the range in memory at `asOf`, then slice the page.
  - The `limit` cap of 100 lives in the query schema (`limitParam`), not in the services.
- **Route order:** list routes are registered before the locks of their detail routes (`/rooms/summary` before
  `/rooms/{sid}`), and the PRO detail routes replace those locks in place.
- **Analytics CSV:**
  - `analytics/analytics-csv.ts` holds the RFC 4180 writer (`toCsv`);
  - typings hold `ANALYTICS_CSV_CONTENT_TYPE` and `analyticsCsvFileName`, which PRO does not use;
  - the route sends the body with `res.attachment(fileName)`.
- **Frontend:**
  - `HttpService.download` returns `{ blob, fileName }`;
  - `AnalyticsDataService.exportCsv` saves the blob through a temporary link;
  - the data table toolbar holds, on cards, the sort select and order, and, outside a section card, the Columns button;
  - the list pages build their request params in their data services (`RoomsDataService.list`, …).
- **Features:** the backend reads them through `TOKENS.Features` (`() => FeatureKey[]`).

## Goals / Non-Goals

**Goals:**
- One export path for the five lists, reusing their queries, validation and order exactly.
- A bounded cost: at most the work of one ranked page, or of one index scan of 10,001 documents.
- Pieces an edition can register for its own tables without copying them.

**Non-Goals:**
- Streaming bodies beyond the cap.
- Asynchronous or background export jobs.

## Decisions

### D1. One `export.csv` route per list

- Paths: `/rooms/export.csv`, `/participants/export.csv`, `/agents/export.csv`, `/egresses/export.csv`,
  `/ingresses/export.csv`.
- Each is registered right after its list route, so it is matched before the detail lock (as `/rooms/summary` is).
- Operation ids: `exportRoomsCsv`, `exportParticipantsCsv`, `exportAgentsCsv`, `exportEgressesCsv`,
  `exportIngressesCsv`.
- The query schema is the list's, without `cursor` and `limit`: the same `rangedQuery` shape built with the same
  fields, so the validation errors match.

Rejected alternatives:
- **`?format=csv` on the list routes.** One operation would document two response shapes and two parameter sets, and
  `limit` would mean different things.
- **A generic `/exports/{list}.csv`.** It moves each export away from the resource it documents, and its OpenAPI
  parameters would be the union of every list.

### D2. One list call with the cap as its limit

- The export calls the service's `list` with `{ ...params, cursor: undefined, limit: LIST_EXPORT_MAX_ROWS }` (10,000):
  - its `items` are the rows;
  - `nextCursor !== null` means the list holds more, so the export is cut.
- Cost:
  - an index-ordered export reads 10,001 documents of the range index;
  - a ranked one ranks the range once, as one page does.
- The list's `total` count is skipped for an export, through a service option (`withTotal: false`), since nothing
  reads it.
- Memory is bounded by the cap: 10,000 mapped items, a few megabytes.

Rejected alternatives:
- **Walking 100-row pages through the cursor.**
  - 100 round trips to MongoDB;
  - each ranked page ranks the whole range again: 100 times the work of one page.
- **Streaming the body from a MongoDB cursor.**
  - The truncation header must precede the body, and HTTP trailers cannot be read from `fetch`.
  - The ranked sorts need the whole range in memory anyway.

### D3. Columns as data next to each mapper

- `CsvColumn<T> = { header: string; value: (item: T) => CsvCell }`.
- Each resource defines its columns in `<resource>-csv.ts` (`ROOM_CSV_COLUMNS`, …) from its list item, never from the
  document, so a CSV cannot carry a field the list does not return.
- The `mediaNode` column is appended when `features()` includes `per-node-breakdown`.
- The rooms columns write `bytes.up` and `bytes.down` empty when the item has `mediaStats: false`.

Rejected alternative: **flattening each item generically.** Optional fields would appear or vanish between files, and
the column order would follow object key order.

### D4. One CSV writer in `api/csv.ts`

- `toCsv` and the cell encoding move from `analytics/analytics-csv.ts` to `api/csv.ts`; the Analytics series and
  breakdowns writers import them.
- Cell encoding:
  - `null` and `undefined` are empty;
  - booleans `true` / `false`;
  - arrays joined by `;`;
  - numbers with `String()`;
  - strings quoted when they hold `"`, `,`, CR or LF.
- **Formula neutralization:**
  - a string starting with `=`, `+`, `-`, `@`, TAB or CR gets a leading `'` before quoting;
  - instants (`2026-…`) and enum values never start with those characters, so only free text changes;
  - numbers are never prefixed, so a negative number stays a number.
- Typings: `CSV_CONTENT_TYPE` replaces `ANALYTICS_CSV_CONTENT_TYPE` (unreleased, unused by PRO).
  `listCsvFileName(list, from, to)` follows `analyticsCsvFileName`: colons removed.

Rejected alternative for the formulas: **leaving it to the reader.** The dashboard's CSV is meant to be opened in a
spreadsheet, and its text comes from client applications and their users (room names, identities, user agents).

### D5. `X-Export-Truncated: true` for a cut file

- Set only when `nextCursor !== null`, and declared in the `200` headers of each export operation.
- The typings export the header name for the frontend.

Rejected alternatives:
- **A trailing comment or marker row.** It breaks CSV parsers and spreadsheets.
- **An error past the cap.** The user would lose the 10,000 rows they could have had.
- **A count before the export.** `total` is exact only within `DASHBOARD_LIST_TOTAL_MAX_RANGE`.

### D6. Backend seam

`registerCsvExport(registry, definition)` registers a CSV route.
- **Input:**
  - the route metadata;
  - the query (and path) schemas;
  - a `rows(input)` function returning `{ items, truncated }`;
  - the columns;
  - the file name.
- **What it does:**
  - writes the attachment;
  - sets the header;
  - declares the OpenAPI response.
- **Helper:** `listRows(list, params)` implements D2 for any service method of the list shape.
- **Exports from the backend package:** both functions, `CsvColumn`, `toCsv` and the five column sets.
- PRO registers its room participants export with them.

### D7. Frontend pieces

- **`HttpService.download`:** returns `truncated: boolean`, read from the header.
- **`saveDownload(document, download, fallbackName)` in `core/http`:** the temporary link; `AnalyticsDataService` uses
  it.
- **Toast texts:** `exportFailedMessage(error)` ("Export failed: <message> Request <id>") and
  `EXPORT_TRUNCATED_MESSAGE` are exported, so the Analytics page and an edition's own export controls read the same.
- **`ovd-export-button`** (`components/export-button/`):
  - takes `run: () => Promise<Download>` and `disabled`;
  - shows "Export CSV" with the `download` icon;
  - disables itself while running;
  - saves the file, and toasts the cap notice or "Export failed: <message> Request <id>".
- **Data table:**
  - takes an `exportCsv` input, a function returning the `Download`;
  - renders `ovd-export-button` with it, disabled without rows: at the end of its toolbar, as a table and as cards,
    or, inside a section card, registered after Columns in the section header, both in one registration so the order
    holds when the layout toggles;
  - `ovd-rooms-table` and the participant sessions table forward the input.
  - Pages stay declarative: `[exportCsv]="exportCsv"`, with `exportCsv = () => this.data.export(this.request())`.
- **Data services:** each list data service gains `export(request)`, built by the same params function as `list`
  without `cursor` and `limit`.

Rejected alternatives:
- **Building the CSV in the browser from the list API.** It needs 100 requests of 100 rows, and it repeats the ranking
  cost on the server for every page.
- **A content slot `[ovdTableActions]` in the toolbar.** The wrapper tables would re-project it, which hides it from the
  table's content queries, and inside a section card each page would have to place the button itself.

## Risks / Trade-offs

- **[A ranked export over a 7-day range loads MongoDB]** → It reads what one ranked page reads, the participants'
  ranked range is capped at 24 h, and the p95 budget is measured.
- **[Personal data leaves the dashboard]** → Exports carry only fields the list shows, behind the same bearer token.
  The dashboard's documentation page states that exported files leave its access control.
- **[Rows change while exporting]** → One call reads one snapshot, and ranked sorts use one `asOf`.
- **[A text value starting with `-` gains a `'`]** → This is the accepted cost of neutralizing formulas. Numbers keep
  their sign.

## Performance budget

- **Dataset:** generated at scenario M for 7 days: about 14,000 rooms and 140,000 participant sessions.
- **Budget:** a 10,000-row export answers within 2 s at the p95 of 20 runs.
- **Verification:** each of `rooms-`, `participants-`, `egress-` and `ingress-query-plan.test.ts`:
  - explains the export query with the default and a ranked sort, asserting the list index and no `COLLSCAN`;
  - adds the export to its p95 report.

## Migration Plan

New routes only; the list responses do not change. A rollback reverts the commits. PRO adopts the seam after moving
`ce.ref`.
