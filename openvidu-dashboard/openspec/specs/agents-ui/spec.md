# agents-ui Specification

## Purpose
The Agents page (CE) that lists agent participant sessions with their room, status, published sources and node, a
live counter and links to the participant and room details, which stay locked in CE like those of the other lists.

## Requirements

### Requirement: Agents route
Edition: CE. The `/agents` route and its sidenav entry SHALL be available in every edition, never locked and without a
required feature; the page loads its data from `GET /api/v1/agents` and registers the header refresh control like the
other lists.

#### Scenario: Agents in CE
- **GIVEN** the CE dashboard with `features: []`
- **WHEN** the user opens `/agents`
- **THEN** the sidenav entry shows no lock icon, the page renders its tiles, filters and table, the header shows the refresh control and the request `GET /api/v1/agents?…` is sent

### Requirement: Agents page state and filters
Edition: CE. The Agents page SHALL read `from`, `to`, `tz`, `q`, `status`, `room`, `sort`, `order`, `limit` and
`cursor` from the URL, offer the shared list search box labelled "Identity or SID" (sent as `q`; an exact `PA_` SID
shows only that session ignoring the range and every filter, and Enter opens it keeping the range), a status select
(All, Joining, Active, Left, Aborted), the global range and the shared room chip, and drop `cursor` on any change.

#### Scenario: Active agents filter
- **WHEN** the user selects status Active
- **THEN** the URL gets `status=active` without `cursor` and the list request is `GET /api/v1/agents?status=active&…`

#### Scenario: Search by identity
- **WHEN** the user types `agent-` and the debounce elapses
- **THEN** the URL gets `q=agent-` without `cursor` and the list request is `GET /api/v1/agents?q=agent-&…`

#### Scenario: Exact SID
- **GIVEN** the status filter reads Left and the agent session `PA_z9` is active
- **WHEN** the user types `PA_z9`
- **THEN** the table shows only that session with the hint "Exact ID: range and filters ignored · Enter opens it", and Enter navigates to `/participants/PA_z9` keeping `from`, `to` and `tz`

#### Scenario: Room chip
- **GIVEN** `/agents?room=RM_abc`
- **WHEN** the page loads
- **THEN** a chip reads "Room: demo-room" with a link to `/rooms/RM_abc` and a remove button, and removing it drops `room` and `cursor`


### Requirement: Agents table
Edition: CE. The table SHALL show, in order, SID (participant detail link with copy button), Identity (copy button),
Name, Room (link to the room detail), Status (stale cue), Joined, Left, Duration (live), Published (source icons) and
Node (hidden by default), with times formatted as on the other lists and the time-zone header hint; Joined (the
default), Left and Duration are sortable; the cursor paginator and the shared skeleton, error and empty states apply.

#### Scenario: Agent row
- **GIVEN** an active agent `agent-1` (session `PA_z9`, name "Support bot") in `demo-room` on node `node-a` publishing a microphone
- **WHEN** the row renders
- **THEN** the cells read, in order, `PA_z9` once, linking to `/participants/PA_z9` with its copy button, `agent-1` with its copy button, "Support bot", `demo-room` linking to `/rooms/RM_abc`, "active", the join time, "—", a duration counting up live and the microphone source icon, and the Node column is hidden until chosen in the Columns menu

#### Scenario: Detail links in CE
- **GIVEN** the CE dashboard with `features: []`
- **WHEN** the user follows the SID link `PA_z9` or the room link `demo-room` of an agent row
- **THEN** `/participants/PA_z9` or `/rooms/RM_abc` renders the full-page lock of its detail, as from the Participants and Rooms lists

#### Scenario: No agents
- **GIVEN** `?status=active&q=zzz`
- **WHEN** the list is empty
- **THEN** the empty state reads "No agents match" with the hint "Change the filters or widen the time range.", "Clear filters" (drops `q`, `status` and `room`) and "Widen range" (opens the range picker)

#### Scenario: Dates as on the other lists
- **GIVEN** today is 2026-10-18 in the time zone `Europe/Madrid`, an agent that joined today at 12:31:05 and one that joined yesterday at 09:00:00
- **WHEN** the rows render with the default 24 h range
- **THEN** the Joined cells read "12:31:05" and "2026-10-17 09:00:00", and the Joined and Left headers carry the time-zone hint `Europe/Madrid`

#### Scenario: Stale agent
- **GIVEN** an active agent session that the list response marks `stale: true`
- **WHEN** the row renders
- **THEN** its status badge carries the stale cue, judged by the API and never by the browser clock


### Requirement: Live agents counter tile
Edition: CE. Above the filters, the page SHALL show a KPI tile "Agents now" with the number of active agent sessions
across all rooms, read from the overview live counters and refreshed at the auto-refresh interval, keeping the last
value while refreshing.

#### Scenario: Counter refresh
- **GIVEN** the tile shows 3
- **WHEN** a refresh reports 4
- **THEN** the tile reads 4 with the change highlight and the table is reloaded with the current URL state


### Requirement: Agents are participants notice
Edition: CE. The page SHALL show, as a dismissible info notice of the shared notice component, the statement that
agents are shown as participant sessions of kind AGENT and that no agent telemetry (jobs, dispatch, tool calls) is
collected, with a link to the Participants page filtered by `kind=AGENT`.

#### Scenario: Notice link
- **WHEN** the user follows the notice link
- **THEN** the application navigates to `/participants?kind=AGENT` keeping `from`, `to` and `tz`

#### Scenario: Notice dismissed
- **WHEN** the user dismisses the notice
- **THEN** the info notice disappears and stays hidden on the next visit to `/agents`


### Requirement: Agent sessions tile
Edition: CE. Next to "Agents now", the page SHALL show a KPI tile "Agent sessions in range" with the agent
sessions joined in the global range, read from the participants summary (`sessions.byKind.AGENT`, "≈" and the rollup
tooltip when approximate) and refreshed with the page.

#### Scenario: Sessions in range
- **GIVEN** the participants summary answers `sessions.byKind.AGENT: 12` with `approximate: false`
- **WHEN** the page renders
- **THEN** the tile reads 12

#### Scenario: Approximate sessions
- **GIVEN** a 30-day range and `approximate: true`
- **WHEN** the tile renders
- **THEN** it shows "≈" before the value and the rollup tooltip on that mark


### Requirement: Agents ranked sort limit
Edition: CE. The Left and Duration sorts of the Agents table SHALL be offered only while the resolved range is at most
`limits.participantRankedSortMaxRangeMs` of `GET /api/v1/info` (24 h by default), or with any range while `room` is
set; otherwise their headers SHALL be disabled with the tooltip "Narrow the range to <n> to sort by <column>", and a URL
asking for one of them SHALL fall back silently to Joined descending. Joined is sortable with any range.

#### Scenario: Sort by duration
- **GIVEN** the default 24 h range
- **WHEN** the user activates the Duration header
- **THEN** the URL gets `sort=duration&order=desc` without `cursor` and the request is `GET /api/v1/agents?sort=duration&order=desc&…`

#### Scenario: Range beyond the limit
- **GIVEN** a 7-day range and no `room`
- **WHEN** the table renders
- **THEN** the Left and Duration headers are disabled, hovering Duration shows "Narrow the range to <n> to sort by Duration" with <n> naming the 24-hour limit, and Joined stays sortable

#### Scenario: Room filter lifts the limit
- **GIVEN** a 7-day range and `room=RM_abc`
- **WHEN** the user activates the Left header
- **THEN** the URL gets `sort=leftAt&order=desc` without `cursor` and the request carries `room=RM_abc`
