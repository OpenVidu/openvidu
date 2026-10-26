# egress-ui Specification

## Purpose
The Egress page: how egress data is laid out, filtered, paged, refreshed and linked, built from the shared UI
building blocks and driven by the URL state rules of the shell; the Egress detail page is locked in CE.

## Requirements

### Requirement: Egress page URL state

Edition: CE. `/egress` SHALL read its whole state from the query parameters `status`, `type`, `room`, `q`, `from`, `to`,
`tz`, `sort`, `order`, `cursor` and `limit` as the shell's URL-state rules describe; `sort` accepts `startedAt`,
`endedAt` and `duration`; invalid values fall back silently, and so does `endedAt` or `duration` with a range wider than
the ranked-sort limit, which falls back to `startedAt`.

#### Scenario: Deep link reproduces the view

- **GIVEN** `/egress?status=failed,aborted&type=room_composite&q=demo&from=now-7d&to=now&tz=UTC&order=asc&limit=50`
- **WHEN** it is opened in a new browser session
- **THEN** the search box reads `demo`, the type select shows Room composite, the status select shows Failed and
  Aborted, the range picker shows the 7-day preset in UTC, the table is sorted by Started ascending and shows 50 rows

#### Scenario: Ranked sort deep link

- **GIVEN** `/egress?sort=duration&order=asc&from=now-24h&to=now`
- **WHEN** it is opened
- **THEN** the table is sorted by Duration ascending and the Duration header shows the ascending sort

#### Scenario: Ranked sort beyond the limit

- **GIVEN** `/egress?sort=duration&from=now-30d&to=now` and the default 7-day limit
- **WHEN** it is opened
- **THEN** the table is sorted by Started descending, the Duration header is disabled with its tooltip and no list
  request carries `sort=duration`

#### Scenario: Filter change drops the cursor

- **GIVEN** the list on its third page
- **WHEN** the user selects the Active status
- **THEN** the URL has `status=starting,active,ending`, no `cursor`, and Back returns to the third page

#### Scenario: Defaults

- **WHEN** `/egress` opens without query parameters
- **THEN** it uses every status and type, `sort=startedAt`, `order=desc`, the global range and the stored page size

#### Scenario: Any state change drops the cursor

- **GIVEN** `/egress` with a `cursor` in the URL
- **WHEN** a filter, the search, the range, the sort or the page size changes
- **THEN** `cursor` is dropped and a history entry is created

### Requirement: Egress summary tiles

Edition: CE. The Egress page SHALL show four KPI tiles from the summary endpoint above the filters: Active, Started
in range (hint: count by type, in the fixed type order room composite, web, participant, track composite, track, with
type labels and without zero counts), Failed in range (hint: aborted and limit reached) and Recorded time (total
duration); approximate values carry a tooltip saying the range exceeds the exact-count limit, and the tiles keep their
last value while refreshing.

#### Scenario: Tiles after load

- **GIVEN** the summary answers `{ active: 3, startedInRange: 120, byType: { track: 20, room_composite: 100 },
  byEndStatus: { complete: 110, failed: 7, aborted: 2 }, totalDurationMs: 36000000, approximate: false }`
- **WHEN** the page renders
- **THEN** the tiles read 3, 120 with hint "Room composite 100 · Track 20", 7 with hint "Aborted 2", and "10 h 00 m"

#### Scenario: Stable hint order

- **GIVEN** a refresh that answers `byType` with its keys in another order
- **WHEN** the tile updates
- **THEN** the hint keeps the order "Room composite · Track"

### Requirement: Status, type, room and search filters

Edition: CE. The Egress page SHALL offer, in this order, the shared list search box labelled "Room name or egress ID"
(a room-name prefix or an exact egress ID), a multi-select type filter (the five types with their labels), a
multi-select status filter (Active, Complete, Failed, Aborted, Limit reached; Active writes `starting,active,ending`),
both reading "All" with nothing selected, and, when `room` is set, the shared room chip; filters are written to the URL
on change.

#### Scenario: Filter order

- **GIVEN** `/egress?room=RM_ab12cd`
- **WHEN** the page renders
- **THEN** the filter bar reads, from the start, the search box labelled "Room name or egress ID", Type, Status and
  the room chip

#### Scenario: Exact egress id

- **GIVEN** the user types `EG_ab12cd` in the search box
- **WHEN** the list answers one item
- **THEN** the table shows that single row, the hint reads "Exact ID: range and filters ignored · Enter opens it",
  and the row's detail link leads to `/egress/EG_ab12cd`

#### Scenario: Enter on an exact egress id

- **GIVEN** the search box holds `EG_ab12cd`
- **WHEN** the user presses Enter
- **THEN** `/egress/EG_ab12cd` opens with the current `from`, `to` and `tz`

#### Scenario: Room chip

- **GIVEN** `/egress?room=RM_ab12cd` opened from the page of room `demo-room`
- **WHEN** the page renders
- **THEN** a chip "Room: demo-room" (reading "Room: RM_ab12cd" until the name is known) with a link to the room and a
  remove button is shown, and removing it drops `room` and `cursor` from the URL

#### Scenario: Short search text

- **GIVEN** the user types `d`
- **WHEN** the debounce elapses
- **THEN** no request is sent and the hint reads "Type at least 2 characters"

### Requirement: Egress table

Edition: CE. The egress table SHALL show the columns Egress ID, Room, Type, Status, Started (sortable), Ended
(sortable), Duration (sortable) and Outputs, plus an error marker with tooltip on rows with `hasError` whose status does
not already say so (not failed, aborted or limit reached); Started and Ended carry the time-zone header hint.

#### Scenario: Row of an active recording

- **GIVEN** a `room_composite` egress active for 40 minutes in `demo-room` with one file output
- **WHEN** the row renders
- **THEN** it reads `EG_a1b2` once, linking to `/egress/EG_a1b2` with its copy button, `demo-room` linking to
  `/rooms/RM_ab12cd`, the "Room composite" badge, the green "active" badge, the start time, a dash for Ended,
  "40 m 00 s" counting up every second and the file icon without count badge

#### Scenario: Failed row

- **GIVEN** a `track` egress with `status: "failed"`, `hasError: true` and `errorCode: 403`
- **WHEN** the row renders
- **THEN** the red "failed" badge is shown with no error marker beside it

#### Scenario: Error behind a complete status

- **GIVEN** a `room_composite` egress with `status: "complete"`, `hasError: true` and `errorCode: 403`
- **WHEN** the row renders
- **THEN** an error marker whose tooltip reads "Egress failed (code 403) — open the detail for the error" follows the
  "complete" badge, without the code part when the egress has no `errorCode`

#### Scenario: Reconciler-closed egress

- **GIVEN** an egress with `closedBy: "reconciler"`
- **WHEN** the row renders
- **THEN** the status badge has the dotted outline and the tooltip "Closed by the reconciler: the end time is
  estimated"

#### Scenario: Phone layout

- **GIVEN** a 375 px viewport
- **WHEN** the table renders
- **THEN** each row is a card with the egress id link and its copy button, room, status, start time and output icons,
  and a sort select offering Started, Ended and Duration is shown above

#### Scenario: Columns

- **WHEN** the egress table renders a row
- **THEN** Egress ID is a detail link with a copy button, Room a link to the room page ("—" for a web egress without
  room), Type the kind badge with the type label (such as "Room composite"), Status the status badge with, when the
  reconciler closed the egress, the estimated cue and the tooltip "Closed by the reconciler: the end time is estimated",
  Duration counts up live for an in-flight egress and Outputs shows one icon per kind with a count badge above one

### Requirement: Egress pagination

Edition: CE. The Egress page SHALL use the cursor paginator with the stored page size (10, 25, 50 or 100, never
above the API's 100), send back the response's opaque `nextCursor` or `prevCursor` unchanged, show "Showing x–y of
total" only when the response carries `total`, and hide the paginator while the first page is empty.

#### Scenario: Next page

- **GIVEN** a response with `nextCursor`
- **WHEN** the user presses Next
- **THEN** the URL gets `cursor=<nextCursor>` and the paginator reads "Showing 26–50 of 212"

#### Scenario: Empty first page

- **GIVEN** a filter that matches no egress
- **WHEN** the list answers no items
- **THEN** the empty state is shown and no paginator is rendered under it

### Requirement: Egress live refresh

Edition: CE. The Egress page SHALL follow the shell's auto-refresh policy (default 10 s), refresh the list and the
tiles in place, show no live chip (the status badges say which egresses are in flight), and offer no "stale" state
because egresses report no periodic heartbeat.

#### Scenario: In-place refresh

- **GIVEN** the list showing an active egress
- **WHEN** a tick returns it as `complete`
- **THEN** the row's badge changes without a skeleton, the Active tile decrements and no LIVE chip is shown at any
  point

### Requirement: Egress page states

Edition: CE. The Egress page SHALL render skeleton rows only until the first response, keep the rows or the empty
state on screen during a refresh, render the shared list empty state "No egress match" with the hint "Change the
filters or widen the time range." and the actions "Clear filters" and "Widen range", render "Egress <ID> was not
found" with "Clear search" when an exact egress ID finds nothing, and show the error banner keeping the previous rows
with retry and the request id.

#### Scenario: Empty filtered list

- **GIVEN** `?status=failed&type=web` returns no rows
- **WHEN** the empty state renders
- **THEN** it reads "No egress match" with the hint "Change the filters or widen the time range.", "Clear filters"
  (dropping `status`, `type`, `room` and `q`) and "Widen range"

#### Scenario: Unknown egress id

- **GIVEN** the user searches `EG_missing`
- **WHEN** the list answers no items
- **THEN** the page reads "Egress EG_missing was not found" with "Clear search", which empties the search box and
  drops `q`

#### Scenario: Refresh keeps the rows

- **GIVEN** rows on screen
- **WHEN** a refresh runs
- **THEN** the rows stay and no skeleton replaces them

#### Scenario: Failed refresh

- **GIVEN** rows from the previous load
- **WHEN** the refresh request fails
- **THEN** the rows stay visible under the inline error banner with retry and the request id

### Requirement: Egress detail route and CE lock

Edition: CE. `/egress/:egressId` SHALL be registered in CE as a timed route that is not range-scoped and declares the
feature `egress-detail`, and in CE render the full-page lock over a dimmed silhouette of three tiles and one block,
under the breadcrumbs and a header holding only the title (the egress ID) with its copy button and the status badge
with its estimated cue; the header shows no refresh control and no PRO endpoint is called.

#### Scenario: Locked from the list

- **GIVEN** CE and the user follows the `EG_a1b2` link from the list
- **WHEN** the page renders
- **THEN** the breadcrumbs read `Egress / EG_a1b2`, the title reads `EG_a1b2` with its copy button followed by the
  status badge from the list data, no type badge, facts or refresh control are shown, the lock card reads "Egress
  detail is available in OpenVidu PRO" with "Learn about OpenVidu PRO" and "Back to egress", and no request to
  `/api/v1/egresses/EG_a1b2` is sent

#### Scenario: Locked deep link

- **GIVEN** CE and `/egress/EG_a1b2` opened directly
- **WHEN** the page renders
- **THEN** the header is filled from `GET /api/v1/egresses?q=EG_a1b2` and the lock card is shown

#### Scenario: Silhouette

- **GIVEN** CE and the locked egress page
- **WHEN** the lock renders
- **THEN** the dimmed silhouette behind it shows three tiles and one block, and no bar above them

#### Scenario: Header data source

- **GIVEN** CE and the locked page of `EG_a1b2`
- **WHEN** its header renders
- **THEN** the header is filled from the list cache or, when the cache has no entry, from
  `GET /api/v1/egresses?q=EG_a1b2`

### Requirement: Egress sort keys

Edition: CE. The egress table SHALL sort by Started (`sort=startedAt`, the default, newest first), Ended
(`sort=endedAt`) or Duration (`sort=duration`), in the `order` the header toggles. The range always selects on the
start time. Ended and Duration rank the egresses of the range: an in-flight egress ranks as ending now and by its
elapsed time, both taken at the first page's request time, which the cursor keeps for the following pages.

#### Scenario: Sort by duration

- **GIVEN** the Egress page on the default 24 h range
- **WHEN** the user activates the Duration header
- **THEN** the URL has `sort=duration` and `order=desc` without `cursor`, and the longest egresses started in the
  range come first, an in-flight one placed by the time it has been running

#### Scenario: In-flight egress sorted by Ended

- **GIVEN** two active egresses and ten ended ones started in the range
- **WHEN** the table is sorted by Ended descending
- **THEN** the two active egresses come first, as if ending now, followed by the ended ones from the latest end

#### Scenario: Next page keeps the ranking

- **GIVEN** the list sorted by Duration with an active egress on the first page
- **WHEN** the user presses Next a minute later
- **THEN** the second page continues the ranking of the first page, the active egress does not move to it and no
  row of the first page reappears

#### Scenario: Range on the start time

- **GIVEN** `sort=endedAt` and the last 24 h
- **WHEN** the list loads
- **THEN** it holds only egresses started in the last 24 h, whatever their end time

### Requirement: Egress ranked sort limit

Edition: CE. While the resolved range is wider than the ranked-sort limit of `GET /info`
(`limits.rankedSortMaxRangeMs`, 7 days by default), the Ended and Duration headers, and their options in the sort
select of the card layout, SHALL be disabled with the tooltip "Narrow the range to <n> to sort by <column>";
Started SHALL stay sortable for any range.

#### Scenario: Thirty-day range

- **GIVEN** `from=now-30d&to=now` and the default limit
- **WHEN** the user hovers or focuses the Duration header
- **THEN** the header is disabled and its tooltip reads "Narrow the range to <n> to sort by Duration", with <n>
  naming the 7-day limit, while the Started header toggles the order

#### Scenario: Range narrowed back

- **GIVEN** the 30-day range with the Duration header disabled
- **WHEN** the user picks the 7-day preset
- **THEN** the Ended and Duration headers become sortable

### Requirement: Egress room-name search

Edition: CE. A search text of at least two characters that is not an egress ID SHALL list, through `q`, the egresses
of the range whose room name starts with that text, case-insensitively, with no limit on the number of matching
rooms.

#### Scenario: Prefix matching many rooms

- **GIVEN** 150 rooms whose name starts with `load-`, each with an egress started in the range
- **WHEN** the user types `LOAD-`
- **THEN** after the debounce the URL has `q=LOAD-` and the paginator walks through the egresses of all 150 rooms

#### Scenario: Prefix only

- **GIVEN** egresses in rooms `Demo-Room`, `demo-2` and `my-demo` started in the range
- **WHEN** the user types `de`
- **THEN** the table lists the egresses of `Demo-Room` and `demo-2`, and none of `my-demo`
