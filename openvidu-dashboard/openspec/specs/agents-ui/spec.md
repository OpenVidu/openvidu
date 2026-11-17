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
Edition: CE. The table SHALL show, in order, SID (detail link, copy button), Agent, Identity (copy button), Name, Room
(room detail link), Status (stale cue), Joined, Left, Duration (live), Published (source icons) and, with
`per-node-breakdown` only, Node (`mediaNode`, hidden by default), with the time formats and time-zone header hint of the
other lists; Joined (the default), Left and Duration are sortable, with the cursor paginator and the shared skeleton,
error and empty states.

#### Scenario: Agent row
- **GIVEN** an active agent `agent-1` (session `PA_z9`, name "Support bot", agent name `support`) in `demo-room` publishing a microphone, and a viewer who has not chosen the columns of the table
- **WHEN** the row renders
- **THEN** the cells read, in order, `PA_z9` once, linking to `/participants/PA_z9` with its copy button, "support", `agent-1` with its copy button, `demo-room` linking to `/rooms/RM_abc`, "active", the join time, "—", a duration counting up live and the microphone source icon, with no Name cell, and, with `features: []`, no Node column is offered

#### Scenario: Detail links in CE
- **GIVEN** the CE dashboard with `features: []`
- **WHEN** the user follows the SID link `PA_z9` or the room link `demo-room` of an agent row
- **THEN** `/participants/PA_z9` or `/rooms/RM_abc` renders the full-page lock of its detail, as from the Participants and Rooms lists

#### Scenario: No agents
- **GIVEN** `?status=active&origin=openvidu&q=zzz`
- **WHEN** the list is empty
- **THEN** the empty state reads "No agents match" with the hint "Change the filters or widen the time range.", "Clear filters" (drops `q`, `status`, `origin` and `room`) and "Widen range" (opens the range picker)

#### Scenario: Dates as on the other lists
- **GIVEN** today is 2026-10-18 in the time zone `Europe/Madrid`, an agent that joined today at 12:31:05 and one that joined yesterday at 09:00:00
- **WHEN** the rows render with the default 24 h range
- **THEN** the Joined cells read "12:31:05" and "2026-10-17 09:00:00", and the Joined and Left headers carry the time-zone hint `Europe/Madrid`

#### Scenario: Stale agent
- **GIVEN** an active agent session that the list response marks `stale: true`
- **WHEN** the row renders
- **THEN** its status badge carries the stale cue, judged by the API and never by the browser clock

### Requirement: Live agents counter tile
Edition: CE. Above the filters, the page SHALL show first a KPI tile "Active now" with the number of active agent
sessions across all rooms, read from the overview live counters and refreshed at the auto-refresh interval, keeping the
last value while refreshing.

#### Scenario: Counter refresh
- **GIVEN** the Active now tile shows 3
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
Edition: CE. After "Active now", the page SHALL show a KPI tile "Agent sessions in range" with the agent sessions
joined in the global range, read from the participants summary (`sessions.byKind.AGENT`, "≈" and the rollup tooltip
when approximate) and refreshed with the page.

#### Scenario: Sessions in range
- **GIVEN** the participants summary answers `sessions.byKind.AGENT: 12` with `approximate: false`
- **WHEN** the page renders
- **THEN** the tiles read "Active now" and then "Agent sessions in range 12"

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

### Requirement: Agents CSV export

Edition: CE. The Agents table SHALL offer "Export CSV", which downloads `GET /api/v1/agents/export.csv` with the
parameters of the list request it shows (range, `q`, `status`, `room`, `sort` and `order`), without `cursor` and
`limit`, and saves `agents-<from>-<to>.csv`.

#### Scenario: Active agents

- **GIVEN** `/agents?status=active&sort=duration`
- **WHEN** the user clicks "Export CSV"
- **THEN** the request carries `status=active` and `sort=duration`, and the browser saves `agents-<from>-<to>.csv`

### Requirement: Agent column
Edition: CE. The Agent cell of the Agents table SHALL read the agent name of the session (`agent.name`), without one
the OpenVidu agent type (`agent.openvidu`), and "—" with neither. On a session with `agent.openvidu` the text SHALL be
followed by a tag that reads "OpenVidu", in the shared tag style and explained by its tooltip; no other session
carries a tag. The column is not sortable, can be hidden and shows in the card layout.

#### Scenario: OpenVidu agent with a name
- **GIVEN** an agent row whose item has `agent: { name: "speech-processing-dev", openvidu: "speech-processing" }`
- **WHEN** the row renders
- **THEN** the Agent cell reads "speech-processing-dev" followed by the tag "OpenVidu", which is 24 px high as the status badge of the row

#### Scenario: Third-party agent
- **GIVEN** an agent row whose item has `agent: { name: "dummy-agent" }`
- **WHEN** the row renders
- **THEN** the Agent cell reads "dummy-agent" and the row has no "OpenVidu" tag

#### Scenario: OpenVidu agent without a name
- **GIVEN** an agent row whose item has `agent: { openvidu: "speech-processing" }`
- **WHEN** the row renders
- **THEN** the Agent cell reads "speech-processing" followed by the tag "OpenVidu"

#### Scenario: Agent without agent facts
- **GIVEN** an agent row whose item has no `agent` property
- **WHEN** the row renders
- **THEN** the Agent cell reads "—" and the row has no "OpenVidu" tag

#### Scenario: Agent column not sortable
- **WHEN** the Agents table renders
- **THEN** the Agent header has no sort control, and the Columns menu offers to hide Agent

### Requirement: Name column of the Agents table
Edition: CE. Of the columns of the Agents table, Name, the participant's display name that agents rarely set, SHALL be
hidden by default and offered by the Columns menu, which shows it between Identity and Room. A viewer who has already
chosen the columns of the Agents table SHALL keep that choice, Name included. The Participants table keeps Name shown
by default.

#### Scenario: Name hidden by default
- **GIVEN** a viewer who has not chosen the columns of the Agents table
- **WHEN** the Agents table renders
- **THEN** its headers read SID, Agent, Identity, Room, Status, Joined, Left, Duration and Published, and the Columns menu lists Name as not shown

#### Scenario: Name shown from the Columns menu
- **GIVEN** the Agents table with its default columns and an agent whose participant name is "Support bot"
- **WHEN** the viewer selects Name in the Columns menu
- **THEN** the Name column shows between Identity and Room, its cell reads "Support bot", or "—" for an agent without a name, and it is still shown when the page is reopened

#### Scenario: Stored column choice kept
- **GIVEN** a viewer whose stored columns of the Agents table hide only Published
- **WHEN** the Agents table renders
- **THEN** Name shows and Published does not

#### Scenario: Name stays on the Participants table
- **GIVEN** a viewer who has not chosen the columns of the Participants table
- **WHEN** the Participants table renders
- **THEN** its headers include Name, between Identity and Room

### Requirement: OpenVidu tag tooltip
Edition: CE. The "OpenVidu" tag of the Agent cell SHALL show, on hover and on keyboard focus, a tooltip that reads
"This agent belongs to the official collection of OpenVidu agents". The tag SHALL be in the tab order and its
accessible name SHALL be "OpenVidu, This agent belongs to the official collection of OpenVidu agents", as on the
status and kind badges that carry a tooltip.

#### Scenario: OpenVidu tag tooltip
- **GIVEN** an agent row whose item has `agent: { name: "speech-processing-dev", openvidu: "speech-processing" }`
- **WHEN** the user rests the pointer on its "OpenVidu" tag, or moves the keyboard focus to it with Tab
- **THEN** in both cases a tooltip reads "This agent belongs to the official collection of OpenVidu agents", and with the focus on the tag Escape hides it

#### Scenario: OpenVidu tag name for screen readers
- **GIVEN** an agent row with the "OpenVidu" tag and a third-party agent row
- **WHEN** the rows render
- **THEN** the tag is focusable and its accessible name is "OpenVidu, This agent belongs to the official collection of OpenVidu agents", the third-party row has no such element, and the page has no accessibility violation in the light and dark themes

### Requirement: Agent origin filter
Edition: CE. The Agents page SHALL read `origin` from the URL and offer, after the status select, an Origin select with
All (no `origin`), OpenVidu (`origin=openvidu`) and Third-party (`origin=third-party`). A change SHALL drop `cursor`,
any other value of `origin` SHALL read as All without an error page, and the list request and "Export CSV" SHALL carry
the selected `origin`.

#### Scenario: OpenVidu origin selected
- **WHEN** the user selects Origin OpenVidu
- **THEN** the URL gets `origin=openvidu` without `cursor` and the list request is `GET /api/v1/agents?origin=openvidu&…`

#### Scenario: Third-party origin from the URL
- **GIVEN** `/agents?origin=third-party&status=left`
- **WHEN** the page loads
- **THEN** the Origin select reads Third-party, the status select reads Left and the list request carries `origin=third-party` and `status=left`

#### Scenario: Invalid origin in the URL
- **GIVEN** `/agents?origin=livekit`
- **WHEN** the page loads
- **THEN** the Origin select reads All, the list request carries no `origin` and no error is shown

#### Scenario: Origin in the CSV export
- **GIVEN** `/agents?origin=openvidu&status=active`
- **WHEN** the user clicks "Export CSV"
- **THEN** the request to `GET /api/v1/agents/export.csv` carries `origin=openvidu` and `status=active`, without `cursor` and `limit`
