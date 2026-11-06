## MODIFIED Requirements

### Requirement: Node heartbeat
Edition: CE and PRO. On every batch tick, including empty batches, the writer SHALL upsert the node's `nodes` document
with `lastSeenAt`, `serverVersion`, `batchIntervalMs` (the configured `openvidu.analytics.interval` in milliseconds),
`mediaStats`, `rtcEngine` and, when the server has them, its media node label as `mediaNode`, the machine's `ip` and
`drainingAt`, setting `firstSeenAt` on insert. It SHALL write no `region`.

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

#### Scenario: Labelled node
- **GIVEN** a server with the media node label `mn-a`
- **WHEN** a batch tick runs
- **THEN** the node's document has `mediaNode: "mn-a"`, and the document of a server without a label has no
  `mediaNode` field

#### Scenario: No region
- **GIVEN** a LiveKit configuration with a `region`
- **WHEN** a batch tick runs
- **THEN** the node's document has no `region` field

## ADDED Requirements

### Requirement: Media node IP
Edition: CE and PRO. A server edition that gives the writer a media node label MAY also give it the machine's IP. The
writer SHALL publish it as `ip` on the node heartbeat, and SHALL write no `ip` without a label. The CE server gives
neither.

#### Scenario: Labelled node with its IP
- **GIVEN** a server with the media node label `mn-a` and the IP `10.0.1.23`
- **WHEN** a batch tick runs
- **THEN** the node's document has `mediaNode: "mn-a"` and `ip: "10.0.1.23"`

#### Scenario: CE server
- **GIVEN** a CE server
- **WHEN** a batch tick runs
- **THEN** the node's document has neither `mediaNode` nor `ip`

### Requirement: RTC engine of the server
Edition: CE and PRO. A server edition MAY tell the writer, before the analytics start, which RTC engine the server
runs: `pion` or `mediasoup`. The writer SHALL publish it as `rtcEngine` on every heartbeat, and `pion` when it is not
told, as for the CE server.

#### Scenario: CE server
- **GIVEN** a CE server
- **WHEN** a batch tick runs
- **THEN** the node's document has `rtcEngine: "pion"`

#### Scenario: Server running mediasoup
- **GIVEN** a server whose edition tells the writer `mediasoup`
- **WHEN** a batch tick runs
- **THEN** the node's document has `rtcEngine: "mediasoup"`

### Requirement: Drain start
Edition: CE and PRO. While LiveKit drains the server (its node state is `SHUTTING_DOWN`, so it gets no new rooms and
waits for its participants to leave), every heartbeat SHALL set `drainingAt` on the node document to the time of the
first heartbeat that saw the drain, and never move it afterwards.

#### Scenario: Draining with participants
- **GIVEN** a node with active participants
- **WHEN** it receives `SIGTERM` and its participants leave over the next ten minutes
- **THEN** its document has `drainingAt` within one batch interval of the signal, `lastSeenAt` keeps advancing until
  the last participant leaves, and `stoppedAt` is set after that

#### Scenario: Killed while draining
- **GIVEN** a draining node
- **WHEN** it is killed before its participants leave
- **THEN** its document keeps `drainingAt` and has no `stoppedAt`

#### Scenario: Node that never drained
- **GIVEN** a node that has not received a stop signal
- **WHEN** `nodes` is read
- **THEN** its document has no `drainingAt`

### Requirement: Rooms per server
Edition: CE and PRO. A node document SHALL count in `rooms.hosted` the rooms whose `ROOM_CREATED` its server wrote as
their host, once per room as the rollup counters count events. It SHALL count in `rooms.reconciled` the rooms whose
`nodeId` is its server and that the reconciler closed, once per closure, whichever server runs the reconciler.

#### Scenario: Hosted rooms
- **GIVEN** a server that hosts three new rooms
- **WHEN** their `ROOM_CREATED` events are processed, one of them twice after a retried batch
- **THEN** its node document has `rooms.hosted: 3`

#### Scenario: Room first touched by another server
- **GIVEN** a room document created by an egress event written by server B
- **WHEN** server A, which hosts the room, writes its `ROOM_CREATED`
- **THEN** server A's document counts the room in `rooms.hosted` and server B's does not

#### Scenario: Rooms of a crashed server
- **GIVEN** server A crashed with two open rooms, and the reconciler running on server B
- **WHEN** the reconciler closes both rooms
- **THEN** server A's node document has `rooms.reconciled: 2` and server B's is unchanged

#### Scenario: Late real end after a reconciler closure
- **GIVEN** a room of server A closed by the reconciler
- **WHEN** its real `ROOM_ENDED` is processed later
- **THEN** `rooms.reconciled` of server A is unchanged
