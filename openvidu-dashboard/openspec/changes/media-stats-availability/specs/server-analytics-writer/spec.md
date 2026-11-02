## MODIFIED Requirements

### Requirement: Signal and data pseudo-tracks
Edition: CE and PRO. Stats whose track id starts with `TR_SG` or `TR_DT` SHALL NOT produce `track_stats`
documents; their bytes SHALL be added to the participant's `bytes` for their direction and `lastStatsAt`
SHALL be updated on the participant and on its room, without adding bytes or quality samples to the room.

#### Scenario: Signal-only participant
- **GIVEN** a participant whose flush contains only `TR_SG…` upstream and downstream stats
- **WHEN** it is stored
- **THEN** no `track_stats` document is written, the participant's `bytes.up` and `bytes.down` grow by the sample bytes, and the participant's and the room's `lastStatsAt` equal the flush time while the room's `bytes` and `quality` are unchanged

### Requirement: Node heartbeat
Edition: CE and PRO. On every batch tick, including empty batches, the writer SHALL upsert the node's
`nodes` document with `lastSeenAt`, `serverVersion`, `region`, `batchIntervalMs` (the configured
`openvidu.analytics.interval` in milliseconds) and `mediaStats`, setting `firstSeenAt` on insert.

#### Scenario: Idle node
- **GIVEN** a node with no traffic for ten minutes
- **WHEN** `nodes` is read
- **THEN** its document has `lastSeenAt` within the last batch interval and `firstSeenAt` unchanged

#### Scenario: Configured interval published
- **GIVEN** `openvidu.analytics.interval: 30s`
- **WHEN** a batch tick runs
- **THEN** the node's document has `batchIntervalMs: 30000`

#### Scenario: Interval changed on restart
- **GIVEN** a node document with `batchIntervalMs: 10000`
- **WHEN** the node restarts with `openvidu.analytics.interval: 60s` and runs a batch tick
- **THEN** its document has `batchIntervalMs: 60000` and `firstSeenAt` unchanged

#### Scenario: Node reporting media statistics
- **GIVEN** a server that reports media statistics
- **WHEN** a batch tick runs
- **THEN** the node's document has `mediaStats: true`

## ADDED Requirements

### Requirement: Nodes without media statistics
Edition: CE and PRO. A server whose media engine does not report media statistics SHALL tell the writer so, and the
writer SHALL then publish `mediaStats: false` on its node document and stamp `mediaStats: false` on the rooms and
participant sessions it creates, following their `nodeId`; the rooms and sessions of a node that reports them carry no
`mediaStats` field.

#### Scenario: Room created on such a node
- **GIVEN** a node whose server does not report media statistics
- **WHEN** it writes `ROOM_CREATED` and `PARTICIPANT_JOINED` of a new room
- **THEN** its `nodes` document has `mediaStats: false`, and the room and the participant session both have `nodeId` of that node and `mediaStats: false`

#### Scenario: Room created on a node reporting media statistics
- **GIVEN** a node whose server reports media statistics
- **WHEN** it writes `ROOM_CREATED` and `PARTICIPANT_JOINED`
- **THEN** neither the room nor the participant session has a `mediaStats` field

#### Scenario: Room touched first by another node
- **GIVEN** a room document created by an egress event written by a node reporting media statistics, without `mediaStats`
- **WHEN** a node that does not report them writes its `ROOM_CREATED`
- **THEN** the room has that node's `nodeId` and `mediaStats: false`
