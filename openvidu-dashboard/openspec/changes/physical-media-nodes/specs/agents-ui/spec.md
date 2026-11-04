## MODIFIED Requirements

### Requirement: Agents table
Edition: CE. The table SHALL show, in order, SID (participant detail link with copy button), Identity (copy button),
Name, Room (link to the room detail), Status (stale cue), Joined, Left, Duration (live), Published (source icons) and,
with `per-node-breakdown` only, Node (`mediaNode`, hidden by default), with times formatted as on the other lists and the time-zone header hint; Joined (the
default), Left and Duration are sortable; the cursor paginator and the shared skeleton, error and empty states apply.

#### Scenario: Agent row
- **GIVEN** an active agent `agent-1` (session `PA_z9`, name "Support bot") in `demo-room` publishing a microphone
- **WHEN** the row renders
- **THEN** the cells read, in order, `PA_z9` once, linking to `/participants/PA_z9` with its copy button, `agent-1` with its copy button, "Support bot", `demo-room` linking to `/rooms/RM_abc`, "active", the join time, "—", a duration counting up live and the microphone source icon, and, with `features: []`, no Node column is offered

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

