# Spec Delta

## ADDED Requirements

### Requirement: Rooms CSV export

Edition: CE. `GET /api/v1/rooms/export.csv` SHALL export the rooms list (`api-conventions`) with the columns
`sid`, `name`, `status`, `createdAt`, `endedAt`, `durationMs`, `closedBy`, `participants.sessions`,
`participants.unique`, `participants.active`, `participants.peakActive`, `egress.total`, `egress.active`,
`ingress.sessions`, `ingress.active`, `bytes.up`, `bytes.down`, `features.egress`, `features.ingress`,
`features.agent`, `features.sip`, and `mediaNode` with `per-node-breakdown`.

#### Scenario: Header row

- **GIVEN** an edition without the `per-node-breakdown` feature
- **WHEN** the client requests the rooms export
- **THEN** the header row holds exactly those 21 columns, in that order

#### Scenario: Filters of the list

- **WHEN** the client requests `GET /api/v1/rooms/export.csv?status=closed&features=egress&q=sales&from=now-7d&to=now`
- **THEN** the rows are the closed rooms named `sales…` that used egress, created in the last 7 days, by `createdAt`
  descending

#### Scenario: Active room

- **GIVEN** an active room with three active STANDARD participants
- **WHEN** the export holds it
- **THEN** its `status` is `active`, `participants.active` is `3`, and `endedAt`, `durationMs` and `closedBy` are empty

#### Scenario: Room without media statistics

- **GIVEN** a room with `mediaStats: false`
- **WHEN** the export holds it
- **THEN** its `bytes.up` and `bytes.down` cells are empty, not `0`

#### Scenario: Media node column

- **GIVEN** the `per-node-breakdown` feature, a room with `mediaNode: "mn-a"` and a room without it
- **WHEN** the client requests the rooms export
- **THEN** the header ends with `mediaNode`, the first room's cell reads `mn-a` and the second's is empty
