## MODIFIED Requirements

### Requirement: Rooms table
Edition: CE. The Rooms table SHALL render, in order, SID (detail link, copy button), Name (copy button), Status
(estimated and stale cues), Started, Ended, Duration (live), Unique identities (`participants.unique`), Active, Data up /
down, Features (badges E, I, A) and, with `per-node-breakdown` only, Node (`mediaNode`, hidden by default). Started
(`createdAt`, the default), Ended (`endedAt`), Duration (`duration`), Unique identities (`uniqueIdentities`) and Active
(`active`) sort.

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

#### Scenario: Node column
- **GIVEN** `features` with `per-node-breakdown` and a room item with `mediaNode: "mn-a"`
- **WHEN** the user shows the Node column from the Columns menu
- **THEN** its cell reads `mn-a`, and reads "—" for a room without `mediaNode`

#### Scenario: No Node column in CE
- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the table renders
- **THEN** it has no Node column and the Columns menu does not offer one

#### Scenario: Room of a node without media statistics

- **GIVEN** a page with room `RM_m1` (`mediaStats: false`) and room `RM_p1` (no `mediaStats`, 12 MB up, 48 MB down)
- **WHEN** the rows render
- **THEN** the Data up / down cell of `RM_m1` reads an unavailable "—" announced as "Not available" instead of
  "↑ 0 B ↓ 0 B", the cell of `RM_p1` reads "↑ 12.0 MB ↓ 48.0 MB", and the Data up / down header carries the column
  warning "Rooms on servers using mediasoup as RTC engine show no value here yet. This data will be available soon."

#### Scenario: Page without rooms lacking media statistics

- **GIVEN** a page whose rooms have no `mediaStats` field
- **WHEN** the table renders
- **THEN** the Data up / down header has no warning
