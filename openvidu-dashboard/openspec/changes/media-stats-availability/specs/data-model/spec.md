## MODIFIED Requirements

### Requirement: Room document
Edition: CE and PRO. A `rooms` document SHALL describe one room session: identity and lifecycle, node,
configuration, participant/track/egress/ingress counters, traffic, quality, feature flags and retention
fields, with the field list of the shared contract (`dashboard-ce/typings/src/data-model`).
`participants.sessions`, `unique`, `active`, `peakActive` and `aborted` SHALL count STANDARD sessions only;
`participants.byKind` SHALL count the sessions of every kind.

#### Scenario: Fields of a room document
- **WHEN** a room document is read
- **THEN** it has `name`, `nameLower`, `status` (`active` | `closed`), `createdAt`, `endedAt`, `durationMs`, `endReason`, `closedBy`, `nodeId`, `config` (max participants, empty and departure timeouts, metadata when allowed), `participants { sessions, unique, active, peakActive, aborted, byKind }`, `tracks`, `egress` (by type), `ingress`, `bytes { up, down }`, `quality { scoreSum, scoreCount, minScore, poor, lost }`, `features { egress, ingress, agent, sip }`, `lastEventAt`, `lastStatsAt`, `mediaStats` (only `false`, when its node does not report media statistics), `schemaVersion`, `expiresAt`

#### Scenario: Room lifecycle
- **GIVEN** `ROOM_CREATED`, three `PARTICIPANT_JOINED`/`ACTIVE`, one `PARTICIPANT_LEFT`, `ROOM_ENDED (API_DELETE)`
- **WHEN** all are processed
- **THEN** the room has `status: "closed"`, `endReason: "API_DELETE"`, `participants.sessions: 3`, `participants.active: 0`, `participants.peakActive: 3`, `durationMs = endedAt - createdAt`, `closedBy: "event"`

#### Scenario: Dependent participants do not count as room size
- **GIVEN** a room with two STANDARD participants and one EGRESS participant
- **WHEN** counters are read
- **THEN** `participants.byKind.EGRESS` is 1 and `participants.active`/`peakActive` count only the two STANDARD participants

#### Scenario: Only standard participants count as participants
- **GIVEN** an active room with two active STANDARD participants of different identities, one EGRESS, one INGRESS and one AGENT participant, and one aborted SIP session
- **WHEN** counters are read
- **THEN** `participants.sessions` is 2, `unique` is 2, `active` is 2, `peakActive` is 2, `aborted` is 0 and `participants.byKind` is `{ STANDARD: 2, EGRESS: 1, INGRESS: 1, AGENT: 1, SIP: 1 }`

### Requirement: Participant session document
Edition: CE and PRO. A `participants` document SHALL represent one participant session (one SID) with its
identity, room, kind, lifecycle status, connection facts, client facts, track and subscription counters,
traffic, quality and retention fields, with the field list of the shared contract.

#### Scenario: Fields of a participant document
- **WHEN** a participant document is read
- **THEN** it has `identity`, `identityLower`, `name`, `roomSid`, `roomName`, `kind`, `kindDetails`, `status` (`joining` | `active` | `left` | `aborted`), `joinedAt`, `activeAt`, `leftAt`, `durationMs`, `disconnectReason`, `closedBy`, `connectTimeMs`, `connectionType`, `region`, `nodeId`, `resumes`, `client { sdk, version, os, osVersion, browser, browserVersion, deviceModel, network, address }`, `permission`, `isPublisher`, `metadata` and `attributes` (when allowed), `tracks { published, bySource, subscribed, subscribeFailures }`, `bytes`, `quality`, `lastEventAt`, `lastStatsAt`, `mediaStats` (only `false`, when its node does not report media statistics), `schemaVersion`, `expiresAt`

#### Scenario: Connection aborted
- **GIVEN** `PARTICIPANT_JOINED` followed by `PARTICIPANT_CONNECTION_ABORTED`
- **WHEN** both are processed
- **THEN** the document has `status: "aborted"`, `activeAt` absent, `leftAt` set and `disconnectReason` from the event

#### Scenario: Reconnect creates a new session
- **GIVEN** a participant that reconnects with the same identity and receives a new SID
- **WHEN** `PARTICIPANT_LEFT (DUPLICATE_IDENTITY)` and the new `PARTICIPANT_JOINED` are processed
- **THEN** two documents exist with the same `identity` and `roomSid`, the first `left` and the second `joining` or `active`

#### Scenario: Resume keeps the session
- **GIVEN** an active participant that resumes its signal connection
- **WHEN** `PARTICIPANT_RESUMED` is processed
- **THEN** the same document stays `active` and `resumes` increases by one

### Requirement: Nodes
Edition: CE and PRO. The `nodes` collection SHALL hold one document per server node with `firstSeenAt`,
`lastSeenAt`, `serverVersion`, `region`, `batchIntervalMs` (int32 milliseconds, at least 1 000: the node's
configured batch interval) and `mediaStats`, updated by every writer batch, and SHALL expire documents 30 days after
their last heartbeat so decommissioned nodes disappear. A document without `batchIntervalMs` SHALL be read as a 10 s
interval, and one without `mediaStats` as `true`.

#### Scenario: Node heartbeat
- **GIVEN** a node writing batches every 10 s
- **WHEN** `nodes` is read
- **THEN** its document has `lastSeenAt` within the last batch interval and `batchIntervalMs: 10000`

#### Scenario: Node document without the interval
- **GIVEN** a `nodes` document without `batchIntervalMs`
- **WHEN** the dashboard derives that node's freshness windows
- **THEN** it uses a 10 000 ms interval

#### Scenario: Interval below the minimum
- **GIVEN** the test configuration
- **WHEN** a `nodes` document with `batchIntervalMs: 500` is written
- **THEN** the write is rejected by the validator

#### Scenario: Node document without media statistics
- **GIVEN** a `nodes` document without `mediaStats`
- **WHEN** the dashboard reads it
- **THEN** it treats the node as reporting media statistics
