## MODIFIED Requirements

### Requirement: Active peaks
Edition: CE and PRO servers. Every run SHALL count the active rooms, STANDARD participant sessions, egresses and ingress
sessions, and write the counts with `$max` as `rooms.peakActive`, `participants.peakActive`, `egress.peakActive` and
`ingress.peakActive` into the global documents of the bucket containing the run time in `analytics_hourly` and
`analytics_daily`, and all but `ingress.peakActive` in `analytics_5min`, writing `0` when nothing is active.

#### Scenario: Busy minute
- **GIVEN** 3 active rooms, 7 active and 1 `joining` STANDARD sessions, 2 active EGRESS sessions, 2 open egresses and 1 publishing ingress session
- **WHEN** a run executes at 10:02 UTC
- **THEN** the global documents of `…T10:00:00Z` in `analytics_5min` and `analytics_hourly`, and of that UTC day in `analytics_daily`, have `rooms.peakActive` of at least 3, `participants.peakActive` of at least 7 and `egress.peakActive` of at least 2, and the hourly and daily ones `ingress.peakActive` of at least 1

#### Scenario: What counts as active
- **GIVEN** egresses with status `starting`, `active`, `ending`, `complete` and `failed`, and ingress sessions with status `buffering`, `publishing`, `error` and `complete`
- **WHEN** a run executes on an otherwise idle deployment
- **THEN** it writes `egress.peakActive: 3` and `ingress.peakActive: 2`

#### Scenario: Peak kept across samples
- **GIVEN** runs at 10:01 and 10:03 UTC that count 4 and then 2 active rooms
- **WHEN** both have written
- **THEN** the 5-minute document of `…T10:00:00Z` keeps `rooms.peakActive: 4`, and the hourly document of `…T10:00:00Z` has at least 4

#### Scenario: Idle deployment
- **GIVEN** no active room, session, egress or ingress session
- **WHEN** a run executes
- **THEN** the global documents of the current bucket exist with `rooms.peakActive: 0`, `participants.peakActive: 0` and `egress.peakActive: 0`, the hourly and daily ones also with `ingress.peakActive: 0`, and no other counter is set by the run

#### Scenario: No ingress in the 5-minute rollups
- **GIVEN** 2 publishing ingress sessions
- **WHEN** a run executes
- **THEN** the hourly and daily documents of the bucket have `ingress.peakActive` of at least 2, and the 5-minute document has no `ingress` field

#### Scenario: Media statistics marks untouched
- **WHEN** a run writes a rollup document
- **THEN** it sets neither `mediaStats.reported` nor `mediaStats.missing`

### Requirement: Active peaks per media node
Edition: CE and PRO servers. Every run SHALL also write the room and participant peaks into the `node:<label>`
documents of each media node label held by an active room or session (counting the entities with that `mediaNode`)
and of each live labelled node (a `nodes` document with that `mediaNode`, without `stoppedAt` and within its silent
window), with `0` when that label has nothing active; unlabelled entities, egresses and ingress sessions count in the
global scope only.

#### Scenario: Two media nodes
- **GIVEN** active rooms `mediaNode: "mn-1"` (2) and `"mn-2"` (1), holding 5 and 2 active STANDARD sessions with the same labels
- **WHEN** a run executes
- **THEN** the `node:mn-1` documents of the current buckets have `rooms.peakActive` at least 2 and `participants.peakActive` at least 5, and `node:mn-2` at least 1 and 2

#### Scenario: Egress and ingress stay global
- **GIVEN** an active room on `mn-1` with 2 open egresses and 1 publishing ingress session
- **WHEN** a run executes
- **THEN** the global documents of the current buckets get `egress.peakActive` and `ingress.peakActive`, and the `node:mn-1` documents have neither an `egress` nor an `ingress` field

#### Scenario: Idle live node
- **GIVEN** a node document with `mediaNode: "mn-3"`, a `lastSeenAt` 5 s ago, no `stoppedAt` and no active entity on `mn-3`
- **WHEN** a run executes
- **THEN** the `node:mn-3` documents of the current buckets have `rooms.peakActive: 0` and `participants.peakActive: 0`

#### Scenario: Stopped node
- **GIVEN** a node document with `mediaNode: "mn-4"` and `stoppedAt` set, and no active entity on `mn-4`
- **WHEN** a run executes
- **THEN** no `node:mn-4` document is written for the current buckets

#### Scenario: Server without a label
- **GIVEN** active rooms and sessions without `mediaNode`
- **WHEN** a run executes
- **THEN** only the global documents get the peaks
