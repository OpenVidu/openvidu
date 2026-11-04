## MODIFIED Requirements

### Requirement: Rooms page URL state

Edition: CE. `/rooms` SHALL read its whole state from the query parameters `status`, `q`, `features`, `node`,
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

### Requirement: Rooms table

Edition: CE. The Rooms table SHALL render, in order, the columns SID (detail link with copy button), Name (copy
button), Status (estimated and stale cues), Started, Ended, Duration (live), Unique identities (`participants.unique`),
Active, Data up / down, Features (badges E, I, A) and, with `per-node-breakdown` only, Node (the room's `mediaNode`,
hidden by default); the sortable headers are Started
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

#### Scenario: Node column
- **GIVEN** `features` with `per-node-breakdown` and a room item with `mediaNode: "mn-a"`
- **WHEN** the user shows the Node column from the Columns menu
- **THEN** its cell reads `mn-a`, and reads "—" for a room without `mediaNode`

#### Scenario: No Node column in CE
- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the table renders
- **THEN** it has no Node column and the Columns menu does not offer one

#### Scenario: Room of a node without media statistics

- **GIVEN** a room item with `mediaStats: false`
- **WHEN** the row renders
- **THEN** the Data up / down cell reads "—" with the tooltip "Not reported: this room's server does not report media
  statistics" instead of "↑ 0 B ↓ 0 B"

### Requirement: Rooms page states

Edition: CE. The Rooms page SHALL show skeleton rows equal to the page size on first load only, the shared list empty
state "No rooms match" with "Clear filters" and "Widen range" when no row matches, "Room <SID> was not found" with
"Clear search" when an exact SID matches nothing, and the error banner with retry and request id while keeping the
previous rows when a load fails.

#### Scenario: Empty filtered list

- **GIVEN** `?status=active&q=zzz`
- **WHEN** the list answers no items
- **THEN** the empty state reads "No rooms match" with the hint "Change the filters or widen the time range." and offers
  "Clear filters" (removes `status`, `q`, `features` and `node`) and "Widen range" (opens the range picker)

#### Scenario: Failed refresh

- **GIVEN** rows from the previous load
- **WHEN** the next request fails with `500`
- **THEN** the rows stay visible under the error banner showing the `X-Request-Id` and a Retry action

#### Scenario: Unknown SID

- **GIVEN** the search box reads `RM_missing`
- **WHEN** the list answers no items
- **THEN** the empty state reads "Room RM_missing was not found" with "Clear search", which removes `q`


### Requirement: Rooms node filter

Edition: CE. Without the `per-node-breakdown` feature the Rooms page SHALL show no Node select, lock or text about
nodes, SHALL ignore `node` and SHALL NOT request the scopes; with it, it renders the Node select the edition provides,
which sets `node` to a media node label, and sends it to the list as `mediaNode`.

#### Scenario: Node filter in CE

- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the Rooms page renders
- **THEN** the filter bar has no Node select and no lock, and no request to `/api/v1/analytics/scopes` is sent

#### Scenario: Node in a CE URL

- **GIVEN** `features` without `per-node-breakdown` and `/rooms?node=mn-a`
- **WHEN** the page loads
- **THEN** the list request carries no `mediaNode`

#### Scenario: Node filter with the feature

- **GIVEN** `features` with `per-node-breakdown` and `/rooms?node=mn-a`
- **WHEN** the page loads
- **THEN** the list request carries `mediaNode=mn-a`
