# ingress-ui Specification

## Purpose
The Ingress page: the list of ingress definitions with summary tiles, filters, search and live refresh; the
Ingress detail page is locked in CE.

## Requirements

### Requirement: Ingress page URL state

Edition: CE. `/ingress` SHALL read its whole state from the query parameters `status`, `inputType`, `q`, `from`, `to`,
`tz`, `sort`, `order`, `cursor` and `limit` as the shell's URL-state rules describe; `sort` accepts `createdAt`,
`totalDuration`, `sessions` and `lastSession`; invalid values fall back silently, and so does a metric sort with a range
wider than the ranked-sort limit, which falls back to `createdAt`.

#### Scenario: Deep link reproduces the view

- **GIVEN** `/ingress?status=publishing&inputType=rtmp&q=cam&from=now-7d&to=now&tz=UTC&order=asc&limit=50`
- **WHEN** it is opened in a new browser session
- **THEN** the search box reads `cam`, the input select shows RTMP, the status select shows Publishing, the range
  picker shows the 7-day preset in UTC, the table is sorted by Created ascending and shows 50 rows

#### Scenario: Metric sort deep link

- **GIVEN** `/ingress?sort=lastSession&from=now-24h&to=now`
- **WHEN** it is opened
- **THEN** the table is sorted by Last session descending and the Last session header shows the sort

#### Scenario: Metric sort beyond the limit

- **GIVEN** `/ingress?sort=sessions&from=now-30d&to=now` and the default 7-day limit
- **WHEN** it is opened
- **THEN** the table is sorted by Created descending, the Sessions header is disabled with its tooltip and no list
  request carries `sort=sessions`

#### Scenario: Filter change drops the cursor

- **GIVEN** the list on its third page
- **WHEN** the user selects the WHIP input type
- **THEN** the URL has `inputType=whip`, no `cursor`, and Back returns to the third page

#### Scenario: Defaults

- **WHEN** `/ingress` opens without query parameters
- **THEN** it uses every status and input type, `sort=createdAt`, `order=desc`, the global range and the stored page
  size

#### Scenario: Any state change drops the cursor

- **GIVEN** `/ingress` with a `cursor` in the URL
- **WHEN** a filter, the search, the range, the sort or the page size changes
- **THEN** `cursor` is dropped and a history entry is created

### Requirement: Ingress summary tiles

Edition: CE. The Ingress page SHALL show four KPI tiles from the summary endpoint above the filters: Publishing now,
Ingress in range (with the input type breakdown as hint), Sessions in range and Total duration; approximate values
carry a tooltip saying the numbers are hour-aligned; tiles keep their value while the list reloads or fails.

#### Scenario: Tiles of a range

- **GIVEN** the summary answers `{ publishingNow: 2, ingressesInRange: 5, byInputType: { rtmp: 3, whip: 2, url: 0 },
  sessionsInRange: 12, totalDurationMs: 21600000, approximate: true }`
- **WHEN** the tiles render
- **THEN** they read "Publishing now 2", "Ingress in range 5" with hint "RTMP 3 · WHIP 2 · URL 0", "Sessions in
  range 12" and "Total duration 6 h 00 m", the last two with the approximate tooltip

#### Scenario: Failed list keeps the tiles

- **GIVEN** tiles already rendered
- **WHEN** the list request fails
- **THEN** the tiles keep their values and the error banner appears over the table only

### Requirement: Status and input type filters

Edition: CE. The Ingress page SHALL offer, after the search box and in this order, an input type select (All, RTMP,
WHIP, URL) bound to `inputType` and a status select (All, Publishing, Buffering, Idle, Error, Complete, Deleted)
bound to `status`; both write the URL on change and show their current value from the URL.

#### Scenario: Filter order

- **WHEN** the Ingress page renders
- **THEN** the filter bar reads, from the start, the search box labelled "Ingress name or ID", Input and Status

#### Scenario: Status select writes the URL

- **WHEN** the user selects Idle
- **THEN** the URL has `status=inactive` and the table shows idle ingresses only

#### Scenario: Labels map to statuses

- **GIVEN** `?status=inactive`
- **WHEN** the page renders
- **THEN** the status select shows Idle

### Requirement: Ingress search

Edition: CE. The Ingress page SHALL offer the shared list search box labelled "Ingress name or ID" for an ingress name
prefix or an `IN_` ID, which writes `q` after a 300 ms debounce, shows the hint "Type at least 2 characters" and
writes nothing on one character, shows the hint "Exact ID: range and filters ignored · Enter opens it" on an exact
`IN_` ID, and opens that ingress with the current range when Enter is pressed on it.

#### Scenario: Prefix search

- **WHEN** the user types `ca`
- **THEN** after 300 ms the URL has `q=ca`, no `cursor`, and the table shows the matching ingresses

#### Scenario: Exact id

- **GIVEN** `?status=publishing`
- **WHEN** the user types `IN_ab12cd`
- **THEN** the URL has `q=IN_ab12cd`, the table shows that single ingress whatever its status and the hint reads
  "Exact ID: range and filters ignored · Enter opens it"

#### Scenario: Enter on an exact id

- **GIVEN** the search box holds `IN_ab12cd`
- **WHEN** the user presses Enter
- **THEN** `/ingress/IN_ab12cd` opens with the current `from`, `to` and `tz`

#### Scenario: One character

- **WHEN** the user types `c`
- **THEN** no request is sent and the hint reads "Type at least 2 characters"

### Requirement: Ingress table

Edition: CE. The Ingress table SHALL render, in this order, the columns Ingress ID, Name, Room, Input, Status, Created
(sortable, default desc), Total duration (sortable), Sessions (sortable) and Last session (sortable); Ingress ID, Status
and Created cannot be hidden, Created and Last session carry the time-zone header hint, and narrow widths use the card
layout.

#### Scenario: Publishing row

- **GIVEN** a reusable RTMP ingress `cam-1` publishing into `demo-room` with 3 sessions
- **WHEN** the row renders
- **THEN** it shows, in order, `IN_c3d4` once, as a link to `/ingress/IN_c3d4` with its copy button, `cam-1` with its
  copy button, `demo-room` linking to `/rooms?q=demo-room`, the "RTMP" badge, the publishing badge without a live
  chip, the creation time, the total duration counting up every second, `3` and the last session time

#### Scenario: Deleted row

- **GIVEN** an ingress with `status: "deleted"`
- **WHEN** the row renders
- **THEN** the status cell shows the neutral "deleted" status badge with the deletion time in its tooltip

#### Scenario: Idle ingress with an error

- **GIVEN** an ingress with `status: "inactive"` and `hasError: true`
- **WHEN** the row renders
- **THEN** the status cell shows the "idle" badge in the neutral colour with the error icon and the tooltip "Last
  session ended with an error"

#### Scenario: Disabled ingress

- **GIVEN** an idle ingress with `enabled: false`
- **WHEN** the row renders
- **THEN** the status cell shows the "idle" badge followed by a "disabled" badge in the same badge style, not plain
  text

#### Scenario: Never used

- **GIVEN** an ingress with `sessions: 0` and no `lastSessionAt`
- **WHEN** the row renders
- **THEN** Sessions reads `0`, Total duration reads `—` and Last session reads `—`

#### Scenario: Columns

- **WHEN** the Ingress table renders a row
- **THEN** Ingress ID links to the detail with a copy button, Name has a copy button ("—" without a name), Room links to
  `/rooms?q=<roomName>` carrying the range, Input shows the kind badge, Status shows the status badge, idle in the
  neutral colour and deleted with the deletion time in its tooltip, followed by the error icon when `hasError` and a
  "disabled" badge when not enabled, and Total duration counts up live while a session runs

### Requirement: Ingress pagination

Edition: CE. The Ingress page SHALL use the cursor paginator with Prev/Next bound to `prevCursor`/`nextCursor`, the page
size select bound to `limit` (10, 25, 50, 100) and "Showing x–y of total" when `total` is present, and hide the
paginator while the first page is empty.

#### Scenario: Next page

- **GIVEN** the first page of 25 with `nextCursor` set
- **WHEN** the user clicks Next
- **THEN** the URL has that `cursor`, the table shows rows 26-50 and the paginator reads "Showing 26–50 of 60"

#### Scenario: Long range without total

- **GIVEN** `?from=now-30d`
- **WHEN** the page renders
- **THEN** the paginator reads "Showing 1–25" without a total

#### Scenario: Empty first page

- **GIVEN** a filter that matches no ingress
- **WHEN** the list answers no items
- **THEN** the empty state is shown and no paginator is rendered under it

### Requirement: Ingress live refresh

Edition: CE. The Ingress page SHALL be a live view following the shell's auto-refresh policy (default 10 s): each tick
reloads the summary and the current page in place; publishing rows are told by their status badge, without a live
chip; refresh pauses while the tab is hidden and skips ticks while a request is in flight.

#### Scenario: In-place refresh

- **GIVEN** the list showing 25 ingresses with the scroll at row 20
- **WHEN** a refresh completes with a session count changed on one row
- **THEN** the rows update without skeletons, the scroll position is kept and no row flashes

#### Scenario: Session ends during refresh

- **GIVEN** a row with the publishing badge
- **WHEN** a refresh returns that ingress as `inactive`
- **THEN** the status badge reads "idle" in the neutral colour and its Total duration stops counting up

### Requirement: Ingress page states

Edition: CE. The Ingress page SHALL show skeleton rows equal to the page size only until the first response, keep the
rows or the empty state on screen during a refresh, show the shared list empty state "No ingress match" when no row
matches, "Ingress <ID> was not found" with "Clear search" when an exact ingress ID finds nothing, and the error banner
with retry and request id while keeping the previous rows when a load fails.

#### Scenario: Empty filtered list

- **GIVEN** `?status=error&q=zzz`
- **WHEN** the list answers no items
- **THEN** the empty state reads "No ingress match" and offers "Clear filters" (removes `status`, `inputType` and
  `q`) and "Widen range" (opens the range picker)

#### Scenario: Unknown ingress id

- **GIVEN** the user searches `IN_missing`
- **WHEN** the list answers no items
- **THEN** the page reads "Ingress IN_missing was not found" with "Clear search", which empties the search box and
  drops `q`

#### Scenario: Failed refresh

- **GIVEN** rows from the previous load
- **WHEN** the next request fails with `500`
- **THEN** the rows stay visible under the error banner showing the `X-Request-Id` and a Retry action

#### Scenario: No match hint and actions

- **WHEN** no row matches
- **THEN** the shared list empty state "No ingress match" shows the hint "Change the filters or widen the time range."
  and the actions "Clear filters" and "Widen range"

### Requirement: Ingress detail route and CE lock

Edition: CE. `/ingress/:ingressId` SHALL be registered in CE as a timed route that is not range-scoped and declares the
feature `ingress-detail`, and in CE render the full-page lock over a dimmed silhouette of three tiles and one block,
under the breadcrumbs and a header holding only the title (the name, or the ID without one) with its copy button and
the status badge; the header has no refresh control and no PRO endpoint is called.

#### Scenario: Locked from the list

- **GIVEN** CE and the user follows the `IN_c3d4` link from the list
- **WHEN** the page renders
- **THEN** the breadcrumbs read `Ingress / IN_c3d4`, the title reads `cam-1` with its copy button followed by the
  status badge from the list data, no input badge, facts or refresh control are shown, the lock card reads "Ingress
  detail is available in OpenVidu PRO" with "Learn about OpenVidu PRO" and "Back to ingress", and no request to
  `/api/v1/ingresses/IN_c3d4` is sent

#### Scenario: Locked deep link

- **GIVEN** CE and `/ingress/IN_c3d4` opened directly
- **WHEN** the page renders
- **THEN** the header is filled from `GET /api/v1/ingresses?q=IN_c3d4` and the lock card is shown

#### Scenario: Ingress without name

- **GIVEN** CE and an ingress `IN_c3d4` without name
- **WHEN** the locked page renders
- **THEN** the title reads `IN_c3d4` with its copy button

#### Scenario: Header data source

- **GIVEN** CE and the locked page of `IN_c3d4`
- **WHEN** its header renders
- **THEN** the header is filled from the list cache or, when the cache has no entry, from
  `GET /api/v1/ingresses?q=IN_c3d4`

### Requirement: Ingress range by activity

Edition: CE. With a range, the Ingress list SHALL hold the ingress created in it, the ingress whose last session
started in it, and the ingress publishing now that were created before its end, so an ingress created long before
the range that streamed inside it is listed.

#### Scenario: Old ingress used in the range

- **GIVEN** the last 24 h, ingress `cam-1` created 10 days ago whose last session started 2 hours ago and has ended,
  ingress `cam-2` created 30 days ago and publishing since 3 days ago, and ingress `cam-3` created 5 days ago and
  unused since
- **WHEN** the list loads
- **THEN** it holds `cam-1` and `cam-2`, and not `cam-3`

#### Scenario: Ingress created in the range

- **GIVEN** the last 24 h and an ingress created an hour ago that never published
- **WHEN** the list loads
- **THEN** the ingress is listed with Sessions `0`

### Requirement: Ingress sort keys

Edition: CE. The ingress table SHALL sort by Created (`sort=createdAt`, the default, newest first, for any range),
Total duration (`sort=totalDuration`, the running session included), Sessions (`sort=sessions`) or Last session
(`sort=lastSession`), in the `order` the header toggles; the three metric sorts rank the ingress of the range with
their values at the first page's request time, which the cursor keeps for the following pages.

#### Scenario: Sort by total duration

- **GIVEN** the Ingress page on the default 24 h range with a publishing ingress
- **WHEN** the user activates the Total duration header
- **THEN** the URL has `sort=totalDuration` and `order=desc` without `cursor`, and the publishing ingress is placed by
  its stored total plus the time its running session has been publishing

#### Scenario: Next page keeps the ranking

- **GIVEN** the list sorted by Total duration with a publishing ingress on the first page
- **WHEN** the user presses Next a minute later
- **THEN** the second page continues the ranking of the first page and no row of the first page reappears

#### Scenario: Created on a long range

- **GIVEN** `from=now-90d&to=now`
- **WHEN** the user toggles the Created header
- **THEN** the list is sorted by Created ascending, whatever the length of the range

### Requirement: Ingress ranked sort limit

Edition: CE. While the resolved range is wider than the ranked-sort limit of `GET /info`
(`limits.rankedSortMaxRangeMs`, 7 days by default), the Total duration, Sessions and Last session headers, and their
options in the sort select of the card layout, SHALL be disabled with the tooltip "Narrow the range to <n> to
sort by <column>"; Created SHALL stay sortable for any range.

#### Scenario: Thirty-day range

- **GIVEN** `from=now-30d&to=now` and the default limit
- **WHEN** the user hovers or focuses the Sessions header
- **THEN** the header is disabled and its tooltip reads "Narrow the range to <n> to sort by Sessions", with <n>
  naming the 7-day limit, while the Created header toggles the order
