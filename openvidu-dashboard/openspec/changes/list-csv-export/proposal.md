# Proposal

## Why

The lists hold what an administrator reports on: which rooms ran and for how long, who joined and from which client,
which recordings failed. Taking that out of the dashboard today means copying it a page of at most 100 rows at a time.

The owner reviewed where an export pays off (2026-11-12) and chose every CE list, with a cap of 10,000 rows.

## What Changes

- **Export CSV on every CE list:** Rooms, Participants, Agents, Egress and Ingress get an "Export CSV" button in the
  toolbar of their table. It downloads what the list shows:
  - the range, the search, the filters, the sort and its order;
  - across all pages, not only the visible one.
- **Export endpoints:**
  - `GET /api/v1/rooms/export.csv`, `/participants/export.csv`, `/agents/export.csv`, `/egresses/export.csv` and
    `/ingresses/export.csv`;
  - each takes its list's parameters except `cursor` and `limit`;
  - the same validation, ranked sort limits and errors as the list.
- **Columns:**
  - the list item's fields, flattened: IDs, ISO 8601 UTC instants, durations in milliseconds, bytes and counters, never
    the formatted text of the table;
  - the columns the table hides are included;
  - the media node label only with `per-node-breakdown`, as the table's Node column.
- **Cap:**
  - at most 10,000 rows, in the list's order;
  - a cut file carries a response header, and the UI says so: "Exported the first 10,000 rows. Narrow the range or
    the filters to export the rest."
- **Seam:** the backend's CSV writer and export route, and the frontend's export button and download helper, are
  exported for an edition's own tables. CE locks the PRO export route `/rooms/{sid}/participants/export.csv`
  (`room-detail`) like the other PRO routes.

Not in scope:
- The Overview page and the Analytics page (the Analytics cards export workbooks in `analytics-xlsx-export`).
- Other formats for lists (JSON, XLSX), scheduled exports, column selection.
- Fields the list item does not carry: no egress locations or URLs, no ingress URL or stream key, no client address.

Security: room names, identities and client values come from the applications and their users. A text cell starting
with `=`, `+`, `-` or `@` is prefixed with `'` in every CSV, Analytics included, so a spreadsheet does not run it as a
formula.

Edition: CE. PRO exports the room detail's participants on this seam in a PRO change.

Repositories: Dashboard CE (typings, backend, frontend library, e2e, specs, `CHANGELOG.md`). Dashboard PRO: `ce.ref`
move, then the PRO change.

CHANGELOG (`CHANGELOG.md`, 3.10.0, unreleased):
- **Added › UI:** "Every list exports what it shows as CSV, across all its pages, up to 10,000 rows."
- **Added › Data:** the versioned API line reads "rooms, participants and agents, egress and ingress lists with their
  summaries". It becomes "…lists with their summaries and CSV exports…".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-conventions`:
  - the shared contract of a list CSV export: parameters, cells, file name, row cap and its header;
  - text cells that a spreadsheet would read as a formula are neutralized in every CSV, the Analytics ones included.
- `rooms-api`, `participants-api` (participants and agents), `egress-api`, `ingress-api`: each list's export endpoint
  and its columns.
- `editions-info`: the PRO export route locked on CE, and the export routes kept apart from the locked detail
  routes.
- `ui-building-blocks`: the export button of a table, its states and messages.
- `rooms-ui`, `participants-ui`, `agents-ui`, `egress-ui`, `ingress-ui`: each list's export.

## Impact

- **Typings:**
  - the row cap;
  - the truncation header name;
  - the CSV content type, shared with Analytics;
  - the list file names.
- **Backend:**
  - a shared CSV writer, moved from `analytics/analytics-csv.ts` to `api/`;
  - a list export helper over the list services;
  - five routes with their columns;
  - the PRO lock of the room participants export;
  - the OpenAPI document;
  - integration and query-plan tests.
- **Frontend library:**
  - the export button in the data table toolbar;
  - the download helper, with the truncation flag;
  - the five list pages and their data services;
  - unit tests.
- **e2e:** one list export and its truncation notice.
- **No change to the data model, the writer or the existing list responses.**
