# rooms-ui Specification

## Purpose
The Rooms page: how room data is laid out, filtered, paged, refreshed and linked, built from the shared UI
building blocks and driven by the URL state rules of the shell; the Room detail page is locked in CE.

## Requirements

### Requirement: Rooms page URL state

Edition: CE. `/rooms` SHALL read its whole state from the query parameters `status`, `q`, `features`, `nodeId`,
`from`, `to`, `tz`, `sort`, `order`, `cursor` and `limit` as the shell's URL-state rules describe: defaults
`status=all`, `sort=createdAt`, `order=desc`, the global range and the stored page size; the range always applies to
the start time; invalid values fall back silently; any change of filter, search, range, sort or page size drops
`cursor` and creates a history entry.

#### Scenario: Deep link reproduces the view

- **GIVEN** `/rooms?status=closed&q=demo&features=egress,agent&from=now-7d&to=now&tz=UTC&sort=endedAt&order=asc&limit=50`
- **WHEN** it is opened in a new browser session
- **THEN** the status segment shows Closed, the search box reads `demo`, the Egress and Agent feature chips are
  selected, the range picker shows the 7-day preset in UTC, the table lists rooms started in that range sorted by Ended
  ascending and shows 50 rows

#### Scenario: Filter change drops the cursor

- **GIVEN** the list on its third page
- **WHEN** the user selects the Active status
- **THEN** the URL has `status=active`, no `cursor`, and Back returns to the third page

### Requirement: Summary tiles

Edition: CE. The Rooms page SHALL show four KPI tiles from the summary endpoint above the filters: Active rooms, Rooms
in range, Participant sessions and Active participants; approximate values carry a tooltip saying the range exceeds the
exact-count limit, and the tiles keep their last value while refreshing.

#### Scenario: Tiles after load

- **GIVEN** the summary answers `{ activeRooms: 7, roomsInRange: 120, participantSessions: 900, activeParticipants: 31, approximate: false }`
- **WHEN** the page renders
- **THEN** the tiles read 7, 120, 900 and 31 with tabular figures and no approximation hint

#### Scenario: Approximate counts

- **GIVEN** a 30-day range and `approximate: true`
- **WHEN** the tiles render
- **THEN** Rooms in range and Participant sessions show a "≈" prefix and the tooltip explains the counts are
  hour-aligned rollup sums

### Requirement: Status, search and feature filters

Edition: CE. The Rooms page SHALL offer a status segment (Active, Closed, All), the shared list search box labelled
"Room name or SID" for a room name prefix or an `RM_` SID, and a multi-select of feature chips (Egress, Ingress, Agent);
an exact SID shows only that room ignoring the range and every filter, and Enter on it opens the room keeping the
range. SIP is not offered as a feature chip nor shown as a room feature.

#### Scenario: Short search text

- **GIVEN** the user typed `d`
- **WHEN** the debounce elapses
- **THEN** `q` is not written, the list is unchanged and the box shows the hint "Type at least 2 characters"

#### Scenario: Exact SID

- **GIVEN** the user typed `RM_ab12cd`, the room exists and the status filter is Active
- **WHEN** the result arrives
- **THEN** the table shows that one room regardless of range and status, and the box shows the hint "Exact ID: range
  and filters ignored · Enter opens it"

#### Scenario: Enter on an exact SID

- **GIVEN** the box reads `RM_ab12cd`
- **WHEN** the user presses Enter
- **THEN** the application navigates to `/rooms/RM_ab12cd` keeping `from`, `to` and `tz`

#### Scenario: Feature chips

- **WHEN** the user selects Egress and Agent
- **THEN** the URL reads `features=egress,agent`, `cursor` is dropped and the table shows rooms with either flag

#### Scenario: SIP hidden

- **GIVEN** a room with `features.sip: true` and no other feature
- **WHEN** the Rooms page renders
- **THEN** the feature chips offer Egress, Ingress and Agent only and the room's Features cell is empty

### Requirement: Rooms table

Edition: CE. The Rooms table SHALL render, in order, the columns SID (detail link with copy button), Name (copy
button), Status (estimated and stale cues), Started, Ended, Duration (live), Unique identities (`participants.unique`),
Active, Data up / down, Features (badges E, I, A) and Node (hidden by default); the sortable headers are Started
(`createdAt`, the default), Ended (`endedAt`), Duration (`duration`), Unique identities (`uniqueIdentities`) and Active
(`active`).

#### Scenario: Row of an active room

- **GIVEN** an active room `demo-room` / `RM_ab12cd` with 6 unique identities, 7 sessions, 5 active, 12 MB up, 48 MB
  down, an egress and an agent
- **WHEN** the row renders
- **THEN** it shows, in order, `RM_ab12cd` once, as a link to `/rooms/RM_ab12cd` with its copy button, `demo-room` with
  its copy button, the active badge without a LIVE chip, the start time, a dash for Ended, a live duration, 6, 5,
  "↑ 12.0 MB ↓ 48.0 MB" and the E and A badges, under headers that include "Unique identities" and "Data up / down"

#### Scenario: Sort by Ended

- **GIVEN** `status=all` and the default 24 h range
- **WHEN** the user activates the Ended header
- **THEN** the URL gets `sort=endedAt&order=desc` without `cursor`, the list holds the rooms started in the range,
  and the active rooms, which have no end yet, come first

#### Scenario: Sort by unique identities

- **GIVEN** the default 24 h range
- **WHEN** the user activates the Unique identities header
- **THEN** the URL gets `sort=uniqueIdentities&order=desc` without `cursor` and the rooms with the most distinct
  STANDARD identities come first

#### Scenario: Reconciler-closed room

- **GIVEN** a room with `closedBy: "reconciler"`
- **WHEN** the row renders
- **THEN** the status badge has the dotted outline and the Ended cell carries the tooltip "Closed by the reconciler:
  the end time is estimated"

### Requirement: Rooms pagination

Edition: CE. The Rooms page SHALL use the cursor paginator with Prev/Next bound to `prevCursor`/`nextCursor` for every
sort key, the page size select bound to `limit` (10, 25, 50, 100) and "Showing x–y of total" when `total` is present.

#### Scenario: Next page

- **GIVEN** a response with `nextCursor: "abc"`
- **WHEN** the user presses Next
- **THEN** the URL gets `cursor=abc`, the table shows the next page and Prev becomes enabled

#### Scenario: Long range without total

- **GIVEN** a 30-day range
- **WHEN** the paginator renders
- **THEN** it reads "Showing 1–25" without a total

#### Scenario: Next page of a ranked sort

- **GIVEN** `sort=duration` and a response with `nextCursor: "def"`
- **WHEN** the user presses Next
- **THEN** the URL gets `cursor=def` and keeps `sort=duration`, and the request carries both

### Requirement: Rooms live refresh

Edition: CE. The Rooms page SHALL be a live view following the shell's auto-refresh policy (default 10 s): each tick
reloads the summary and the current page in place; an active row that the list response marks `stale: true` carries
the stale cue on its status badge, judged by the API with its own clock and never by the browser; refresh pauses while
the tab is hidden and skips ticks while a request is in flight.

#### Scenario: In-place refresh

- **GIVEN** the list showing 25 rooms with the scroll at row 20
- **WHEN** a refresh completes with a changed participant count
- **THEN** the rows update without skeletons, the scroll position is kept and no row flashes

#### Scenario: Stale active room

- **GIVEN** an active room that the list response marks `stale: true`, with `lastStatsAt` at 12:31:05
- **WHEN** the row renders
- **THEN** its status badge carries the clock cue with the tooltip "No stats since 12:31:05"

#### Scenario: Fresh room under a long interval

- **GIVEN** the auto-refresh at 5 min and an active room without `stale` in the last list response
- **WHEN** four minutes pass without a new response
- **THEN** its status badge carries no stale cue

### Requirement: Rooms page states

Edition: CE. The Rooms page SHALL show skeleton rows equal to the page size on first load only, the shared list empty
state "No rooms match" with "Clear filters" and "Widen range" when no row matches, "Room <SID> was not found" with
"Clear search" when an exact SID matches nothing, and the error banner with retry and request id while keeping the
previous rows when a load fails.

#### Scenario: Empty filtered list

- **GIVEN** `?status=active&q=zzz`
- **WHEN** the list answers no items
- **THEN** the empty state reads "No rooms match" with the hint "Change the filters or widen the time range." and offers
  "Clear filters" (removes `status`, `q`, `features` and `nodeId`) and "Widen range" (opens the range picker)

#### Scenario: Failed refresh

- **GIVEN** rows from the previous load
- **WHEN** the next request fails with `500`
- **THEN** the rows stay visible under the error banner showing the `X-Request-Id` and a Retry action

#### Scenario: Unknown SID

- **GIVEN** the search box reads `RM_missing`
- **WHEN** the list answers no items
- **THEN** the empty state reads "Room RM_missing was not found" with "Clear search", which removes `q`

### Requirement: Room detail route and CE lock

Edition: CE. `/rooms/:roomSid` SHALL be registered in CE as a timed route that is not range-scoped and declares the
feature `room-detail`, and in CE render the breadcrumbs, a title (room name, or SID) with its copy button and the
status badge, filled from the list cache or else from `GET /api/v1/rooms?q=<sid>`, and the full-page lock over a
silhouette of three tiles and a block, with no other header row, no refresh control and no PRO request.

#### Scenario: Locked from the list

- **GIVEN** CE and the user follows the `RM_ab12cd` link from the list
- **WHEN** the page renders
- **THEN** the breadcrumbs read `Rooms / RM_ab12cd`, the title reads `demo-room` with its copy button followed by the
  status badge from the list data, no SID chip, start time or other row is shown, the header has no refresh control,
  the silhouette behind the lock shows three tiles and one block, the lock card reads "Room detail is available in
  OpenVidu PRO" with "Learn about OpenVidu PRO" and "Back to rooms", and no request to `/api/v1/rooms/RM_ab12cd` is sent

#### Scenario: Locked deep link

- **GIVEN** CE and `/rooms/RM_ab12cd` opened directly
- **WHEN** the page renders
- **THEN** the header is filled from `GET /api/v1/rooms?q=RM_ab12cd` and the lock card is shown

#### Scenario: Locked room not in the list

- **GIVEN** CE and `/rooms/RM_ab12cd` opened directly for a room that the list lookup does not return
- **WHEN** the page renders
- **THEN** the title reads `RM_ab12cd` with its copy button, no status badge is shown and the lock card is shown

### Requirement: Rooms ranked sort limit

Edition: CE. The Ended, Duration, Unique identities and Active sorts of the Rooms table SHALL be offered only while the
resolved range is at most `limits.rankedSortMaxRangeMs` of `GET /api/v1/info` (7 days by default); beyond it their
headers SHALL be disabled with the tooltip "Narrow the range to <n> to sort by <column>", and a URL asking for one of
them SHALL fall back silently to Started descending. Started is sortable with any range.

#### Scenario: Range within the limit

- **GIVEN** the default 24 h range and `limits.rankedSortMaxRangeMs` of 7 days
- **WHEN** the user activates the Duration header
- **THEN** the URL gets `sort=duration&order=desc` without `cursor` and the list request carries `sort=duration`

#### Scenario: Range beyond the limit

- **GIVEN** a 30-day range and `limits.rankedSortMaxRangeMs` of 7 days
- **WHEN** the table renders
- **THEN** the Ended, Duration, Unique identities and Active headers are disabled, hovering Duration shows "Narrow the
  range to <n> to sort by Duration" with <n> naming the 7-day limit, and Started stays sortable

#### Scenario: Deep link beyond the limit

- **GIVEN** `/rooms?sort=active&from=now-30d&to=now`
- **WHEN** the page loads
- **THEN** no error is shown, the list request carries `sort=createdAt` and the table is sorted by Started descending

### Requirement: Rooms node filter

Edition: CE. Without the `per-node-breakdown` feature the Rooms page SHALL show the Node select disabled on "All nodes"
with a lock icon whose tooltip says filtering by node is available in OpenVidu PRO, SHALL ignore `nodeId` and SHALL
NOT request the scopes.

#### Scenario: Node filter in CE

- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the Rooms page renders
- **THEN** the Node select reads "All nodes", is disabled with the lock icon and its tooltip, and no request to
  `/api/v1/analytics/scopes` is sent

#### Scenario: Node in a CE URL

- **GIVEN** `features` without `per-node-breakdown` and `/rooms?nodeId=a`
- **WHEN** the page loads
- **THEN** the list request carries no `nodeId`
