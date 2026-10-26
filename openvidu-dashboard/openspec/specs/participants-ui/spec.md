# participants-ui Specification

## Purpose
The Participants page where operators search participant sessions; the Participant detail page is locked in CE.

## Requirements

### Requirement: Participants page state
Edition: CE. The `/participants` route SHALL render the Participants page with its state read only from the
URL parameters `from`, `to`, `tz`, `q`, `kind`, `status`, `room`, `publisher`, `sort`, `order`, `limit` and `cursor`;
changing any filter, the search text, the sort or `limit` SHALL drop `cursor`, and an invalid value SHALL
be replaced by its default without an error page. An absent `kind` SHALL mean STANDARD and `kind=all` every kind.

#### Scenario: Reproducible from the URL
- **GIVEN** `/participants?from=now-7d&to=now&tz=UTC&q=ali&kind=STANDARD,EGRESS&status=left&limit=50`
- **WHEN** the page loads
- **THEN** the search box reads `ali`, the kind filter shows Standard and Egress, the status filter reads Left, the page size is 50 and the list request carries the same parameters

#### Scenario: Default kind
- **GIVEN** `/participants` without `kind`
- **WHEN** the page loads
- **THEN** the kind filter shows Standard and the list request carries `kind=STANDARD`

#### Scenario: Every kind
- **GIVEN** `/participants?kind=all`
- **WHEN** the page loads
- **THEN** the kind filter shows "All kinds" and the list request carries no `kind`

#### Scenario: Filter change drops the cursor
- **GIVEN** the page is on its third page
- **WHEN** the user selects status Active
- **THEN** the URL gets `status=active` and loses `cursor`

#### Scenario: Publishers and sort from the URL
- **GIVEN** `/participants?status=active&publisher=true&sort=leftAt&order=asc`
- **WHEN** the page loads with the default 24 h range
- **THEN** the list request carries `status=active`, `publisher=true`, `sort=leftAt` and `order=asc`, and the table is sorted by Left ascending

### Requirement: Participants search box
Edition: CE. The Participants page SHALL use the shared list search box labelled "Identity or SID": it writes `q` once
the trimmed text has at least two characters (showing "Type at least 2 characters" below that) and clears `q` when
emptied; an exact `PA_` SID SHALL show only that session ignoring the range and every filter, with the hint "Exact ID:
range and filters ignored · Enter opens it", and Enter SHALL open `/participants/{sid}` keeping the range.

#### Scenario: Short text
- **WHEN** the user types `a`
- **THEN** no request is sent, the URL has no `q` and the hint is shown

#### Scenario: Exact SID
- **WHEN** the user types `PA_x1y2` and presses Enter
- **THEN** the application navigates to `/participants/PA_x1y2` keeping `from`, `to` and `tz`

#### Scenario: Exact SID filters the list
- **GIVEN** the status filter reads Left and the session `PA_x1y2` is active and joined before the range
- **WHEN** the user types `PA_x1y2` and the debounce elapses
- **THEN** the table shows only that session and the box shows the hint "Exact ID: range and filters ignored · Enter opens it"

### Requirement: Participants filters and room chip
Edition: CE. The page SHALL offer a multi-select kind filter (Standard, Ingress, Egress, Agent; clearing it selects
every kind), a status select (All, Joining, Active, Left, Aborted), the global range from the header, the shared room
chip "Room: <name>" (the SID until the name is known) with a link to the room and a remove button that clears `room`,
and the removable chip "Publishers" while `publisher=true`. SIP, CONNECTOR and BRIDGE SHALL not be offered.

#### Scenario: Arriving from a room
- **GIVEN** `/participants?room=RM_abc`
- **WHEN** the page loads
- **THEN** a chip reads "Room: demo-room" with a link to `/rooms/RM_abc` and a remove button, and removing it drops `room` and reloads the list

#### Scenario: Clearing the kind filter
- **GIVEN** the kind filter shows Standard
- **WHEN** the user deselects it
- **THEN** the URL reads `kind=all` and the filter shows "All kinds"

#### Scenario: Publishers chip
- **GIVEN** `/participants?status=active&publisher=true` opened from the Overview Publishers tile
- **WHEN** the page loads
- **THEN** a chip reads "Publishers" with a remove button, the list request carries `publisher=true`, and removing the chip drops `publisher` and `cursor` and reloads the list

### Requirement: Participants table
Edition: CE. The table SHALL show, in order, the columns SID (link to the detail with a copy button), Identity (copy
button), Name, Room (link to the room detail), Kind (kind badge), Status (status badge with the stale cue), Joined,
Left, Duration (live), Published (source icons) and Node (hidden by default); the sortable headers are Joined
(`joinedAt`, the default), Left (`leftAt`) and Duration (`duration`); links never trigger on row click.

#### Scenario: Row rendering
- **GIVEN** an active STANDARD session `PA_x1y2` of `alice` in `demo-room` publishing a camera and a microphone
- **WHEN** the row renders
- **THEN** the cells read, in order, `PA_x1y2` once, linking to `/participants/PA_x1y2` with its copy button, `alice` with its copy button, the name, `demo-room` linking to `/rooms/RM_abc`, the Standard kind badge, "active", the join time, "—", a duration counting up live and the camera and microphone source icons

#### Scenario: Sort toggles order
- **GIVEN** the default `joinedAt` descending
- **WHEN** the user activates the Joined header
- **THEN** the URL gets `sort=joinedAt&order=asc` without `cursor`

#### Scenario: Nothing published
- **GIVEN** a session with empty `publishedSources`
- **WHEN** the row renders
- **THEN** the Published cell reads "—"

#### Scenario: Node column
- **WHEN** the table renders with the default columns
- **THEN** the Node column is hidden and the Columns menu offers it

### Requirement: Participants page states
Edition: CE. The page SHALL show skeleton rows only while the first page loads, keep the rows under an inline
error banner with retry and request id when a refresh fails, show the shared list empty state with "Clear filters"
and "Widen range" when no session matches, and "Participant <SID> was not found" with "Clear search" when an exact SID
matches nothing.

#### Scenario: Empty search
- **WHEN** `q=zzz` matches nothing
- **THEN** the empty state reads "No participants match" with the hint "Change the filters or widen the time range." and both actions, and "Clear filters" drops `q`, `kind`, `status`, `room` and `publisher`

#### Scenario: Unknown SID
- **GIVEN** the search box reads `PA_missing`
- **WHEN** the list answers no items
- **THEN** the empty state reads "Participant PA_missing was not found" with "Clear search", which removes `q`

### Requirement: Participant detail route and lock

Edition: CE. The route `/participants/:participantSid` SHALL require the feature `participant-detail`; when it is
absent the page SHALL render the breadcrumbs, a title (identity from the list item when available, else the SID) with
its copy button and the status badge, and the full-page lock over the silhouette of three tiles and a block, with no
other header row, no refresh control and no call to any PRO endpoint. The route is live-capable and not range-scoped.

#### Scenario: Locked in CE
- **GIVEN** `features` without `participant-detail`
- **WHEN** the user follows the `PA_x1y2` link of `alice`
- **THEN** the breadcrumbs read `Participants / PA_x1y2`, the title reads `alice` with its copy button followed by the status badge, no other header row and no refresh control are shown, the lock page names the Participant detail feature over three silhouette tiles and one block, and no request to `/api/v1/participants/PA_x1y2` is sent

### Requirement: Participants summary tiles
Edition: CE. The Participants page SHALL show three KPI tiles from the participants summary above the filters:
Active now (STANDARD), Sessions in range (STANDARD, "≈" and the rollup tooltip when approximate) and Services now
(active sessions of the other kinds, with the visible kinds that have active sessions as hint, explained by its info
tip and carrying no tooltip of its own); the tiles keep their last value while refreshing.

#### Scenario: Tiles after load
- **GIVEN** the summary answers `active { participants: 31, services: 5, byKind { EGRESS: 3, AGENT: 2 } }` and `sessions { participants: 900 }` with `approximate: false`
- **WHEN** the page renders
- **THEN** the tiles read 31, 900 and 5, and the Services now hint reads "Egress 3 · Agent 2"

#### Scenario: Approximate sessions
- **GIVEN** a 30-day range and `approximate: true`
- **WHEN** the tiles render
- **THEN** Sessions in range shows a "≈" prefix whose tooltip says the count is an hour-aligned rollup sum

#### Scenario: Services explained
- **WHEN** the user hovers the Services now tile outside its info icon, and then opens the info icon
- **THEN** the first shows nothing and the info tip reads "Egress, ingress, agent and other non-user sessions. They join rooms as participants but are not counted as participants."

### Requirement: Participants live refresh
Edition: CE. The Participants page SHALL be a live view following the shell's auto-refresh policy (default 10 s) with
the refresh control in the header: each tick reloads the summary and the current page in place, an active row that the
list response marks `stale: true` carries the stale cue on its status badge, and refresh pauses while the tab is hidden
and skips ticks while a request is in flight.

#### Scenario: Refresh control
- **WHEN** `/participants` renders
- **THEN** the header shows the refresh control with the live interval preference

#### Scenario: In-place refresh
- **GIVEN** the list showing 25 sessions
- **WHEN** a refresh completes with a session that left
- **THEN** its row shows the left badge without skeletons and the page keeps its scroll position

#### Scenario: Stale active session
- **GIVEN** an active session that the list response marks `stale: true`
- **WHEN** the row renders
- **THEN** its status badge carries the stale cue that stale rooms carry, judged by the API and never by the browser clock

### Requirement: Participants ranked sort limit

Edition: CE. The Left and Duration sorts of the Participants table SHALL be offered only while the resolved range is at
most `limits.participantRankedSortMaxRangeMs` of `GET /api/v1/info` (24 h by default), or with any range while `room`
is set; otherwise their headers SHALL be disabled with the tooltip "Narrow the range to <n> to sort by <column>", and a
URL asking for one of them SHALL fall back silently to Joined descending. Joined is sortable with any range.

#### Scenario: Range within the limit

- **GIVEN** the default 24 h range
- **WHEN** the user activates the Duration header
- **THEN** the URL gets `sort=duration&order=desc` without `cursor` and the list request carries `sort=duration`

#### Scenario: Range beyond the limit

- **GIVEN** a 7-day range, no `room` and `limits.participantRankedSortMaxRangeMs` of 24 h
- **WHEN** the table renders
- **THEN** the Left and Duration headers are disabled, hovering Left shows "Narrow the range to <n> to sort by Left"
  with <n> naming the 24-hour limit, and Joined stays sortable

#### Scenario: Room filter lifts the limit

- **GIVEN** a 30-day range and `room=RM_abc`
- **WHEN** the user activates the Left header
- **THEN** the URL gets `sort=leftAt&order=desc` without `cursor` and the list request carries `sort=leftAt` and
  `room=RM_abc`

#### Scenario: Deep link beyond the limit

- **GIVEN** `/participants?sort=duration&from=now-7d&to=now`
- **WHEN** the page loads
- **THEN** no error is shown, the list request carries `sort=joinedAt` and the table is sorted by Joined descending
