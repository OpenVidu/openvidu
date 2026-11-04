## ADDED Requirements

### Requirement: Media node label
Edition: CE and PRO. A server edition MAY give the writer, before the analytics start, a media node label: a name of
the machine that stays the same across restarts. With a label the writer SHALL stamp it as `mediaNode` on the rooms and
participant sessions it hosts, following their `nodeId` as `mediaStats` does, and key the node scope of its rollups by
it; without one it SHALL write no `mediaNode` and no node scope. The CE server sets no label.

#### Scenario: Room created on a labelled node
- **GIVEN** a server with the media node label `mn-a`
- **WHEN** it writes `ROOM_CREATED` and `PARTICIPANT_JOINED` of a new room
- **THEN** the room and the participant session have its `nodeId` and `mediaNode: "mn-a"`, and the hourly rollup of
  the bucket has the `global` and `node:mn-a` documents with `rooms.created` incremented

#### Scenario: Server without a label
- **GIVEN** a CE server
- **WHEN** it writes `ROOM_CREATED`
- **THEN** the room has no `mediaNode` field and the rollups of the bucket get only the `global` document

#### Scenario: Restart keeps the label
- **GIVEN** a server with the label `mn-a` that restarts and gets a new node id
- **WHEN** it writes a new room
- **THEN** the room has the new `nodeId` and `mediaNode: "mn-a"`, and its rollups go to `node:mn-a`

#### Scenario: Room touched first by another node
- **GIVEN** a room document created by an egress event written by a server with the label `mn-b`
- **WHEN** the server with the label `mn-a` that hosts the room writes its `ROOM_CREATED`
- **THEN** the room has that server's `nodeId` and `mediaNode: "mn-a"`

## MODIFIED Requirements

### Requirement: Node heartbeat
Edition: CE and PRO. On every batch tick, including empty batches, the writer SHALL upsert the node's
`nodes` document with `lastSeenAt`, `serverVersion`, `region`, `batchIntervalMs` (the configured
`openvidu.analytics.interval` in milliseconds), `mediaStats` and, when the server has one, its media node label as
`mediaNode`, setting `firstSeenAt` on insert.

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

### Requirement: Graceful shutdown
Edition: CE and PRO. On a first stop signal the server drains: it takes no new participants and waits for the present
ones to leave, whose leave events are written as usual; a second signal closes the rooms with `SERVER_SHUTDOWN`. Once
the rooms are closed the server SHALL flush the telemetry stats workers and operation queue into the writer, write
every queued event and stat and then set `stoppedAt` on its node document, waiting at most 5 s in all; entries not
written in that window SHALL be counted as dropped.

#### Scenario: Planned restart
- **GIVEN** a node with active rooms and participants
- **WHEN** it receives `SIGTERM` and then a second `SIGTERM`
- **THEN** the database holds the `ROOM_ENDED (ROOM_END_SERVER_SHUTDOWN)` and `PARTICIPANT_LEFT` events and the entities are `closed`/`left` with the final stats flushed

#### Scenario: Stop recorded
- **GIVEN** a node with no rooms
- **WHEN** it receives `SIGTERM` and exits
- **THEN** its node document has `stoppedAt` no earlier than its last `lastSeenAt` and within 5 s of the signal

#### Scenario: Killed while draining
- **GIVEN** a node with active participants that receives one `SIGTERM`
- **WHEN** it is killed before they leave, as `docker-compose down` does after its grace period
- **THEN** no end event of those sessions is written, its node document has no `stoppedAt`, and the reconciler closes
  them as for a crashed node, with `closedBy: "reconciler"`

#### Scenario: Database unavailable at shutdown
- **GIVEN** an unreachable database
- **WHEN** the node receives `SIGTERM`
- **THEN** the process exits within 5 s of the signal and logs the number of dropped entries

### Requirement: Stats deltas into entities and rollups
Edition: CE and PRO. Each stats batch SHALL add its byte totals and quality samples (score sum, sample
count, minimum score, poor and lost counts) to the participant, the room and the `global` documents, plus the node
scope when the server has a media node label, of `analytics_5min`, `analytics_hourly` and `analytics_daily` of the
flush bucket, SHALL add every participant with stats to the 5-minute `participants.connected` count, and SHALL set
`lastStatsAt` on the participant and the room to the latest flush time.

#### Scenario: Bucket attribution
- **GIVEN** a flush stamped 10:04:59 UTC with 1 000 upstream bytes on a server with the label `mn-a`
- **WHEN** it is stored
- **THEN** `analytics_5min` `global:…T10:00:00Z`, `analytics_hourly` `global:…T10:00:00Z` and `analytics_daily` `global:…T00:00:00Z` grow `bytes.up` by 1 000, and so do the `node:mn-a` documents

#### Scenario: Quality bands
- **GIVEN** samples with scores 4.3, 1.5 and 1.0
- **WHEN** they are stored
- **THEN** the room and the rollups grow `quality.scoreSum` by 6.8, `scoreCount` by 3, `poor` by 2 and `lost` by 1, and `quality.minScore` is 1.0

#### Scenario: Active participants per five minutes
- **GIVEN** stats of three distinct participants flushed twice within the same 5-minute bucket
- **WHEN** they are stored
- **THEN** the `analytics_5min` document reports 3 active participants

### Requirement: API call events
Edition: CE and PRO. The server SHALL emit an `API_CALL` analytics event with its node id for every Twirp API
response of the room, egress, ingress, SIP and agent dispatch services, so that the rollups count API calls and
errors per method.

#### Scenario: API call counted
- **GIVEN** analytics enabled on a server with the media node label `n1`
- **WHEN** a client calls `RoomService.ListRooms` at 10:20 UTC
- **THEN** the hourly and daily documents of `global` and `node:n1` increment `apiCalls.total` and `apiCalls.byMethod.RoomService_ListRooms` by 1 and no raw event is stored

### Requirement: Ingress sessions by input type in the rollups

Edition: CE and PRO. Each projected `INGRESS_STARTED` SHALL increment, besides `ingress.sessionsStarted`, the hourly
and daily counter `ingress.byInputType.<type>` of its bucket in each of its scopes (`global`, and the node scope of a
labelled server), where `<type>` is the lowercase input type of the ingress (`rtmp`, `whip` or `url`), with the same
exactly-once rule as every rollup counter.

#### Scenario: RTMP session started

- **GIVEN** an `INGRESS_STARTED` of an ingress with `input_type: RTMP_INPUT` at 10:20 UTC on a server with the media
  node label `n1`
- **WHEN** it is projected
- **THEN** the hourly and daily documents of `global` and `node:n1` increment `ingress.sessionsStarted` and
  `ingress.byInputType.rtmp` by 1

#### Scenario: Replayed start

- **GIVEN** an `INGRESS_STARTED` already stored by a previous process
- **WHEN** it is processed again
- **THEN** `ingress.byInputType` is unchanged
