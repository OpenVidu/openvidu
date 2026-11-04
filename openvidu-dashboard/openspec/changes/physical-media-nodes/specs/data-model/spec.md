## ADDED Requirements

### Requirement: Generated media nodes
Edition: CE and PRO. With `--media-nodes` the data generator SHALL label its nodes `media-node-10-0-0-1` to `-3`,
stamp the label on the rooms and sessions of each node, key the node rollup scopes (`--node-rollups`) by it, and add
for the first label an earlier, stopped process: a node document whose `lastSeenAt` and `stoppedAt` precede the
current one's `firstSeenAt`, host of some older rooms. Without it nothing carries a label and `--node-rollups` is
rejected.

#### Scenario: Labelled generated database
- **GIVEN** a database generated with `--media-nodes --node-rollups`
- **WHEN** `nodes`, `rooms` and `analytics_hourly` are read
- **THEN** there are four node documents for three labels, two of them with `mediaNode: "media-node-10-0-0-1"` and
  only the earlier one with `stoppedAt`, every room has the `mediaNode` of its node document, and every node scope of
  the rollups is `node:media-node-10-0-0-<n>`

#### Scenario: Keep-alive and the stopped process
- **GIVEN** that database kept live by the generator's keep-alive
- **WHEN** `nodes` is read ten minutes later
- **THEN** the three current documents have a fresh `lastSeenAt` and the stopped one keeps its `lastSeenAt` and
  `stoppedAt`

## MODIFIED Requirements

### Requirement: Room document
Edition: CE and PRO. A `rooms` document SHALL describe one room session: identity and lifecycle, node and media node,
configuration, participant/track/egress/ingress counters, traffic, quality, feature flags and retention
fields, with the field list of the shared contract (`dashboard-ce/typings/src/data-model`).
`participants.sessions`, `unique`, `active`, `peakActive` and `aborted` SHALL count STANDARD sessions only;
`participants.byKind` SHALL count the sessions of every kind.

#### Scenario: Fields of a room document
- **WHEN** a room document is read
- **THEN** it has `name`, `nameLower`, `status` (`active` | `closed`), `createdAt`, `endedAt`, `durationMs`, `endReason`, `closedBy`, `nodeId`, `mediaNode` (only when the server that hosts it has a media node label), `config` (max participants, empty and departure timeouts, metadata when allowed), `participants { sessions, unique, active, peakActive, aborted, byKind }`, `tracks`, `egress` (by type), `ingress`, `bytes { up, down }`, `quality { scoreSum, scoreCount, minScore, poor, lost }`, `features { egress, ingress, agent, sip }`, `lastEventAt`, `lastStatsAt`, `mediaStats` (only `false`, when its node does not report media statistics), `schemaVersion`, `expiresAt`

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
identity, room, kind, lifecycle status, connection facts, node and media node, client facts, track and subscription counters,
traffic, quality and retention fields, with the field list of the shared contract.

#### Scenario: Fields of a participant document
- **WHEN** a participant document is read
- **THEN** it has `identity`, `identityLower`, `name`, `roomSid`, `roomName`, `kind`, `kindDetails`, `status` (`joining` | `active` | `left` | `aborted`), `joinedAt`, `activeAt`, `leftAt`, `durationMs`, `disconnectReason`, `closedBy`, `connectTimeMs`, `connectionType`, `region`, `nodeId`, `mediaNode` (only when the server that hosts it has a media node label), `resumes`, `client { sdk, version, os, osVersion, browser, browserVersion, deviceModel, network, address }`, `permission`, `isPublisher`, `metadata` and `attributes` (when allowed), `tracks { published, bySource, subscribed, subscribeFailures }`, `bytes`, `quality`, `lastEventAt`, `lastStatsAt`, `mediaStats` (only `false`, when its node does not report media statistics), `schemaVersion`, `expiresAt`

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

### Requirement: Rollups
Edition: CE and PRO. `analytics_5min`, `analytics_hourly` and `analytics_daily` SHALL hold one document per
scope (`global`, and `node:<label>` for the media node label of a labelled server) and bucket with pre-aggregated counters, so that long ranges never read
entity or stats documents. Map keys SHALL be enum names or a fixed vocabulary, never user input. Every
participant counter SHALL count STANDARD sessions only, except `participants.byKind` and the 5-minute
`participants.connected` (participants with stats), which count every kind.

#### Scenario: Fields of the rollup documents
- **WHEN** hourly or daily rollup documents are read
- **THEN** they have counters for rooms (created, ended, by end reason, `durationMsSum`, `participantsSum`), participants (joined, active, aborted, left, by kind, SDK, OS, browser, connection type, disconnect reason, connect time, minutes), tracks, egress (started, by type, by end status, duration), ingress sessions (started, ended, started by input type, duration), bytes, quality (score sum/count, poor, lost), API calls and API errors (total and by method), and daily documents also `uniqueIdentities` (set by the server's reconciler once the UTC day has closed); 5-minute documents have bytes, quality, `participants.connected` (distinct participants with stats), the `PARTICIPANT_ACTIVE` count and the lifecycle counters (rooms created/ended, participants joined/left/aborted, egress started/ended)

#### Scenario: Five-minute bandwidth
- **GIVEN** stats flushed between 10:00 and 10:05 UTC
- **WHEN** `analytics_5min` is read for `global:…T10:00:00Z`
- **THEN** `bytes.up` and `bytes.down` equal the sum of the flushed upstream and downstream bytes and `quality.scoreCount` equals the number of samples

#### Scenario: Hourly counters
- **GIVEN** five rooms created and two ended between 10:00 and 11:00 UTC on a server with the media node label `mn-a`
- **WHEN** the events are processed
- **THEN** `analytics_hourly` has `global:2026-…T10:00:00Z` and `node:mn-a:2026-…T10:00:00Z` with `rooms.created: 5` and `rooms.ended: 2`

#### Scenario: Replayed batch does not double count
- **GIVEN** a batch whose raw events were already inserted
- **WHEN** the batch is processed again
- **THEN** rollup counters are unchanged

#### Scenario: Services in rollups
- **GIVEN** between 10:00 and 11:00 UTC three STANDARD, one EGRESS and one AGENT participant joined, and the AGENT left after 10 minutes
- **WHEN** the hourly rollup is read
- **THEN** `participants.joined` is 3, `participants.left` is 0, `participants.minutes` counts only the STANDARD sessions and `participants.byKind` is `{ STANDARD: 3, EGRESS: 1, AGENT: 1 }`

#### Scenario: Ingress sessions by input type
- **GIVEN** two RTMP and one WHIP ingress sessions started between 10:00 and 11:00 UTC
- **WHEN** the hourly rollup is read
- **THEN** it has `ingress.sessionsStarted: 3` and `ingress.byInputType: { rtmp: 2, whip: 1 }`

### Requirement: Nodes
Edition: CE and PRO. The `nodes` collection SHALL hold one document per server process (its node id: a restart
writes a new one) with `firstSeenAt`, `lastSeenAt`, `serverVersion`, `region`, `batchIntervalMs` (int32 milliseconds,
at least 1 000), `mediaStats`, the optional `mediaNode` and `stoppedAt`, and SHALL expire it 30 days after its last
heartbeat. A document without `batchIntervalMs` SHALL be read as a 10 s interval, and one without `mediaStats` as
`true`.

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

#### Scenario: Restarted labelled server
- **GIVEN** a server with the media node label `mn-a` that stopped gracefully and started again
- **WHEN** `nodes` is read
- **THEN** it holds two documents with `mediaNode: "mn-a"`: the earlier one with `stoppedAt`, the new one with a later
  `firstSeenAt` and no `stoppedAt`
