## MODIFIED Requirements

### Requirement: Room list item

Edition: CE. Each rooms list item SHALL be the room document's public projection: identity, lifecycle, node,
participant, egress and ingress counters, bandwidth, feature flags, the end cause behind the "estimated" cue, the last
stats flush, the media statistics mark and the `stale` flag of `api-conventions`, never internal id arrays,
`schemaVersion` or `expiresAt`.
Participant counters count STANDARD sessions only; `participants.unique` counts distinct STANDARD identities.

#### Scenario: Fields of an item

- **WHEN** an item is read
- **THEN** it has `sid`, `name`, `status` (`active` | `closed`), `createdAt`, `endedAt?`, `durationMs?`, `closedBy?`
  (`event` | `reconciler`), `nodeId?`, `participants { sessions, unique, active, peakActive }`,
  `egress { total, active }`, `ingress { sessions, active }`, `bytes { up, down }`,
  `features { egress, ingress, agent, sip }`, `lastStatsAt?`, `stale?`, `mediaStats?` and no `participantSids`,
  `identities` or similar array

#### Scenario: Active room

- **GIVEN** a room still open with three active STANDARD participants and one active EGRESS participant
- **WHEN** it is returned
- **THEN** `status` is `active`, `endedAt`, `durationMs` and `closedBy` are absent and `participants.active` is 3

#### Scenario: Unique identities

- **GIVEN** a closed room where STANDARD identity `alice` had three sessions, `bob` one, and an AGENT session joined
- **WHEN** it is returned
- **THEN** `participants.sessions` is 4 and `participants.unique` is 2

#### Scenario: Stale active room

- **GIVEN** the default writer batch interval of 10 s and an active room whose `lastStatsAt` is 3 minutes old at the
  server's clock
- **WHEN** it is returned
- **THEN** it has `stale: true`, and an active room whose `lastStatsAt` is 20 s old has no `stale` property

#### Scenario: Room of a node without media statistics

- **GIVEN** a room document with `mediaStats: false` and `bytes { up: 0, down: 0 }`
- **WHEN** it is returned
- **THEN** it has `mediaStats: false` and `bytes { up: 0, down: 0 }`, and an item of a room without the field has no
  `mediaStats` property
