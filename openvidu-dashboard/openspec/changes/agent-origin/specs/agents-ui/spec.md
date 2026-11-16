# Spec Delta

## MODIFIED Requirements

### Requirement: Agents table
Edition: CE. The table SHALL show, in order, SID (detail link, copy button), Agent, Identity (copy button), Name, Room
(room detail link), Status (stale cue), Joined, Left, Duration (live), Published (source icons) and, with
`per-node-breakdown` only, Node (`mediaNode`, hidden by default), with the time formats and time-zone header hint of the
other lists; Joined (the default), Left and Duration are sortable, with the cursor paginator and the shared skeleton,
error and empty states.

#### Scenario: Agent row
- **GIVEN** an active agent `agent-1` (session `PA_z9`, name "Support bot", agent name `support`) in `demo-room` publishing a microphone
- **WHEN** the row renders
- **THEN** the cells read, in order, `PA_z9` once, linking to `/participants/PA_z9` with its copy button, "support", `agent-1` with its copy button, "Support bot", `demo-room` linking to `/rooms/RM_abc`, "active", the join time, "—", a duration counting up live and the microphone source icon, and, with `features: []`, no Node column is offered

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

## ADDED Requirements

### Requirement: Agent column
Edition: CE. The Agent cell of the Agents table SHALL read the agent name of the session (`agent.name`), without one
the OpenVidu agent type (`agent.openvidu`), and "—" with neither. On a session with `agent.openvidu` the text SHALL be
followed by a tag that reads "OpenVidu", in the shared tag style and without a tooltip; no other session carries a
tag. The column is not sortable, can be hidden and shows in the card layout.

#### Scenario: OpenVidu agent with a name
- **GIVEN** an agent row whose item has `agent: { name: "speech-processing-dev", openvidu: "speech-processing" }`
- **WHEN** the row renders
- **THEN** the Agent cell reads "speech-processing-dev" followed by the tag "OpenVidu", which is 24 px high as the status badge of the row and has no tooltip

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
