## MODIFIED Requirements

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

#### Scenario: Room of a node without media statistics

- **GIVEN** a room item with `mediaStats: false`
- **WHEN** the row renders
- **THEN** the Data up / down cell reads "—" with the tooltip "Not reported: this room's server does not report media
  statistics" instead of "↑ 0 B ↓ 0 B"
