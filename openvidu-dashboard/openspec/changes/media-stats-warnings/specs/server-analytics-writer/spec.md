## ADDED Requirements

### Requirement: Media statistics marks of rollup buckets
Edition: CE and PRO. Every update of an `analytics_5min`, `analytics_hourly` or `analytics_daily` document SHALL also
set, with `$max`, `mediaStats.reported: true` when the server that writes it reports media statistics and
`mediaStats.missing: true` when it does not, in the `global` and the node scope alike. The increments of a reconciler
closure SHALL carry the mark of the closed room or session (its `mediaStats`), not the reconciling server's.

#### Scenario: Bucket of a server without media statistics
- **GIVEN** a server that does not report media statistics and no earlier write in the hour
- **WHEN** it writes a `ROOM_CREATED` at 10:12 UTC
- **THEN** the `global` documents of `analytics_5min` (10:10), `analytics_hourly` (10:00) and `analytics_daily` of
  the bucket have `mediaStats.missing: true` and no `mediaStats.reported`

#### Scenario: Two kinds of server in one bucket
- **GIVEN** the server labelled `mn-a`, which reports media statistics, and `mn-b`, which does not, both creating
  rooms between 10:00 and 11:00 UTC
- **WHEN** the hourly rollups are read
- **THEN** `global:…T10:00:00Z` has `mediaStats.reported: true` and `mediaStats.missing: true`, `node:mn-a` only
  `reported` and `node:mn-b` only `missing`

#### Scenario: Stats of a server reporting them
- **GIVEN** a server that reports media statistics flushing stats at 10:04:59 UTC
- **WHEN** they are stored
- **THEN** the 5-minute, hourly and daily `global` documents of the flush bucket have `mediaStats.reported: true`

#### Scenario: Room closed by the reconciler
- **GIVEN** a room with `mediaStats: false` whose server died, and the reconciler running on a server that reports
  media statistics
- **WHEN** it closes the room
- **THEN** the rollup documents its closure increments carry `mediaStats.missing: true`, and none of them gets
  `mediaStats.reported` from that closure

#### Scenario: Replayed batch
- **GIVEN** a batch already applied
- **WHEN** it is applied again
- **THEN** the marks are unchanged, and no mark is ever set to `false`
