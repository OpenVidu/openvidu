# server-analytics-writer Specification

## Purpose
How the OpenVidu server turns LiveKit analytics events and stats into the v2 analytics model of the
`data-model` capability: codec, projections, stats modes, batching and idempotency, database
initialization, shutdown and observability of the write path.

## Requirements

### Requirement: Event codec
Edition: CE and PRO. Stored payloads SHALL use the protobuf field names (snake_case), enum values as their
names, 64-bit integers as typed numbers, `google.protobuf.Timestamp` values as dates, oneof fields as the
single member that is set and no entry for unset fields.

#### Scenario: Egress info encoded
- **GIVEN** an `EGRESS_ENDED` event whose `egress` has `status: EGRESS_COMPLETE`, `started_at` in nanoseconds and one `file_results` entry with `size` above 2^31
- **WHEN** its raw event is stored
- **THEN** `payload.egress.status` is the string `"EGRESS_COMPLETE"`, `payload.egress.started_at` and `payload.egress.file_results[0].size` are 64-bit integers, and `payload.egress.request` holds only the oneof member that was set

#### Scenario: Unset fields omitted
- **GIVEN** a `TRACK_SUBSCRIBE_REQUESTED` event whose `track` has only `sid`
- **WHEN** its raw event is stored
- **THEN** `payload.track` contains `sid` and no other key

### Requirement: Pure projection into write models
Edition: CE and PRO. Each event SHALL be projected by a pure function of the event, the configuration and
the batch clock into write models (collection, filter, update) with no database read, and the write
models SHALL be idempotent and commutative so that replayed or reordered events converge on the same
contract fields.

#### Scenario: Every emitted type is projected
- **GIVEN** the recorded fixture set containing every event type the server emits
- **WHEN** each fixture is projected
- **THEN** each produces write models only for the collections of its family, no projector returns an error, and a type outside the catalogue produces no write model and increments a counter

#### Scenario: Replayed batch converges
- **GIVEN** a batch of room, participant, track, egress and ingress events
- **WHEN** the batch is applied twice
- **THEN** every entity document is identical after the second application

#### Scenario: Reordered batch converges
- **GIVEN** the same batch applied in reverse order on an empty database
- **WHEN** both runs are compared
- **THEN** every contract field of every entity document is identical

#### Scenario: Status never regresses
- **GIVEN** a participant document with `status: "active"`
- **WHEN** a late `PARTICIPANT_JOINED` of the same session is processed
- **THEN** `status` stays `"active"` and `joinedAt` is set from the event

### Requirement: Lifted keys and room resolution
Edition: CE and PRO. Every document SHALL carry lifted references resolved from the event: `ROOM_CREATED`
from `room.sid`, egress events from `egress.room_id` and `egress.room_name`, ingress events from
`ingress.state.room_id` and `ingress.room_name`, track events from the minimal `room {sid, name}`; a
missing room leaves the reference absent.

#### Scenario: ROOM_CREATED without room_id
- **GIVEN** a `ROOM_CREATED` event with empty `room_id`, `room.sid = "RM_x"` and `room.creation_time_ms`
- **WHEN** it is projected
- **THEN** the `rooms` document has `_id: "RM_x"` and `createdAt` from `creation_time_ms`, and the raw event has `roomSid: "RM_x"`

#### Scenario: Egress before any room event
- **GIVEN** an `EGRESS_STARTED` with `egress.room_id` and `egress.room_name` and no prior room event
- **WHEN** it is projected
- **THEN** the `egresses` document and the raw event carry `roomSid` and `roomName`, and the `rooms` document is upserted with `features.egress: true` and its egress counter

#### Scenario: Web egress without room
- **GIVEN** a web egress with empty `room_id`
- **WHEN** it is projected
- **THEN** `roomSid` is absent from the egress document and the raw event, and no `rooms` write model is produced

#### Scenario: Ingress session key
- **GIVEN** an `INGRESS_STARTED` with `ingress.state.resource_id`
- **WHEN** it is projected
- **THEN** the `ingress_sessions` document has `_id` equal to `resource_id`, `ingressId` and `roomSid` from `state.room_id`, and the raw event has `ingressSessionId`

#### Scenario: Subscriber identity resolved
- **GIVEN** a participant session `PA_1` already projected with identity `alice`
- **WHEN** a `TRACK_SUBSCRIBED` with `participant {sid: "PA_1"}` and `publisher {sid, identity}` is processed
- **THEN** the subscription has `subscriberIdentity: "alice"`, `publisherSid` and `publisherIdentity` from `publisher`

### Requirement: Unit normalization
Edition: CE and PRO. The writer SHALL store timestamps as UTC dates with millisecond precision, durations
as integer milliseconds and sizes as integer bytes, converting the protocol's seconds, milliseconds,
nanoseconds and microseconds; `rttMs` stays in milliseconds, `jitterMs` is derived from microseconds and
`score` is kept as the MOS value.

#### Scenario: Mixed units in one batch
- **GIVEN** a `PARTICIPANT_JOINED` with `joined_at` (s) and `joined_at_ms`, an `EGRESS_ENDED` with nanosecond timestamps and a stats sample with `jitter` 2500 µs
- **WHEN** they are projected
- **THEN** `joinedAt` has millisecond precision from `joined_at_ms`, `startedAt`, `endedAt` and `durationMs` of the egress are exact to the millisecond, and the stats document has `jitterMs: 2.5`

### Requirement: Secrets allow-list
Edition: CE and PRO. Projectors SHALL copy only fields named in an explicit allow-list into any document,
including raw payloads; every other field, present or future, SHALL be dropped. Egress stream, web and
webhook URLs SHALL be stored with userinfo, query string and the last path segment redacted.

#### Scenario: Fully populated messages
- **GIVEN** an `AnalyticsEvent` of every type with every string field set to a unique sentinel, including `room.turn_password`, egress storage credentials, webhook signing keys, egress tokens, `ingress.stream_key`, `ingress.url`, SIP credentials and `api_call` request bodies
- **WHEN** each is projected with `store_metadata` and IP storage enabled
- **THEN** the sentinels found in all write models are exactly those of the allow-list paths

#### Scenario: Stream URL redacted
- **GIVEN** an egress with stream URL `rtmps://user:pw@live.example.com/app/live_123?token=abc`
- **WHEN** it is projected
- **THEN** the stored output URL is `rtmps://live.example.com/app/***`

### Requirement: Personal data flags
Edition: CE and PRO. `anonymize_ip` SHALL remove `client_info.address` from every document, and
`store_metadata` SHALL gate room metadata, participant metadata and attributes and ingress participant
metadata; IP addresses and metadata are dropped by default, also from the documents of the legacy migration.

#### Scenario: Anonymized IP
- **GIVEN** the default configuration
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** neither the participant document nor the raw payload contains the address

#### Scenario: IP addresses kept
- **GIVEN** `anonymize_ip: false`
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** the participant document has `client.address` and the raw payload contains it

#### Scenario: Migrated legacy session
- **GIVEN** the default configuration and a legacy `PARTICIPANT_JOINED` with a client address
- **WHEN** the legacy migration replays it
- **THEN** the migrated participant document has no `client.address`

#### Scenario: Metadata enabled
- **GIVEN** `store_metadata: true`
- **WHEN** a room with metadata and a participant with attributes are projected
- **THEN** `config.metadata`, `metadata` and `attributes` are stored, and they are absent with the default configuration

### Requirement: Stored raw event types
Edition: CE and PRO. A raw `events` document SHALL be inserted only for types in the configured stored
set, while every type is still projected; the default set excludes `API_CALL`, `TRACK_PUBLISHED_UPDATE`,
`TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY` and `TRACK_SUBSCRIBE_REQUESTED`; `API_CALL` is never stored raw;
`INGRESS_UPDATED` is stored only when `ingress.state.status` changed.

#### Scenario: API_CALL counted only
- **GIVEN** an `API_CALL` for `RoomService.CreateRoom` with a Twirp error
- **WHEN** it is processed
- **THEN** no raw event or entity document is written and the hourly rollups of both scopes increment `apiCalls.byMethod.RoomService_CreateRoom` and `apiErrors`

#### Scenario: Ingress updates without state change
- **GIVEN** three consecutive `INGRESS_UPDATED` events, the first two with `ENDPOINT_PUBLISHING` and the third with `ENDPOINT_BUFFERING`
- **WHEN** they are processed
- **THEN** the first and the third are stored as raw events and all three update the `ingress_sessions` document

#### Scenario: Configured stored set
- **GIVEN** `events.store_types` set to `[ROOM_CREATED, ROOM_ENDED, API_CALL]`
- **WHEN** a `ROOM_CREATED`, a `PARTICIPANT_JOINED` and an `API_CALL` are processed
- **THEN** only the `ROOM_CREATED` raw event exists and the participant document is still written

### Requirement: API call events
Edition: CE and PRO. The server SHALL emit an `API_CALL` analytics event with its node id for every Twirp API
response of the room, egress, ingress, SIP and agent dispatch services, so that the rollups count API calls and
errors per method.

#### Scenario: API call counted
- **GIVEN** analytics enabled on node `n1`
- **WHEN** a client calls `RoomService.ListRooms` at 10:20 UTC
- **THEN** the hourly and daily documents of `global` and `node:n1` increment `apiCalls.total` and `apiCalls.byMethod.RoomService_ListRooms` by 1 and no raw event is stored

### Requirement: Stats detail modes
Edition: CE and PRO. In `participant` mode the writer SHALL merge, per flush, the media tracks of one
participant and direction into one `track_stats` document; in `track` mode it SHALL write one document
per track and direction. Both modes produce the same document shape.

#### Scenario: Participant mode merge rules
- **GIVEN** `stats_detail: participant` and one flush with camera and microphone upstream stats of the same participant
- **WHEN** it is stored
- **THEN** one upstream document exists with `bytes`, `packets`, `packetsLost`, `nacks`, `plis`, `firs` and `frames` summed, `rttMs` and `jitterMs` at their maximum, `score` as the mean of the non-zero scores, `minScore` as the minimum, `medianScore` as the median of the track medians, `layers` summed per layer index and no `mimeType`

#### Scenario: Track mode
- **GIVEN** `stats_detail: track` and the same flush
- **WHEN** it is stored
- **THEN** two upstream documents exist, each with `meta.trackSid` and its own `mimeType`

### Requirement: Signal and data pseudo-tracks
Edition: CE and PRO. Stats whose track id starts with `TR_SG` or `TR_DT` SHALL NOT produce `track_stats`
documents; their bytes SHALL be added to the participant's `bytes` for their direction and `lastStatsAt`
SHALL be updated.

#### Scenario: Signal-only participant
- **GIVEN** a participant whose flush contains only `TR_SG…` upstream and downstream stats
- **WHEN** it is stored
- **THEN** no `track_stats` document is written, the participant's `bytes.up` and `bytes.down` grow by the sample bytes and `lastStatsAt` equals the flush time

### Requirement: Stats deltas into entities and rollups
Edition: CE and PRO. Each stats batch SHALL add its byte totals and quality samples (score sum, sample
count, minimum score, poor and lost counts) to the participant, the room and the `global` and
`node:<nodeId>` documents of `analytics_5min` and `analytics_hourly` of the flush bucket, and SHALL set
`lastStatsAt` on the participant and the room to the latest flush time.

#### Scenario: Bucket attribution
- **GIVEN** a flush stamped 10:04:59 UTC with 1 000 upstream bytes
- **WHEN** it is stored
- **THEN** `analytics_5min` `global:…T10:00:00Z` and `analytics_hourly` `global:…T10:00:00Z` grow `bytes.up` by 1 000, and so do the `node:<nodeId>` documents

#### Scenario: Quality bands
- **GIVEN** samples with scores 4.3, 1.5 and 1.0
- **WHEN** they are stored
- **THEN** the room and the rollups grow `quality.scoreSum` by 6.8, `scoreCount` by 3, `poor` by 2 and `lost` by 1, and `quality.minScore` is 1.0

#### Scenario: Active participants per five minutes
- **GIVEN** stats of three distinct participants flushed twice within the same 5-minute bucket
- **WHEN** they are stored
- **THEN** the `analytics_5min` document reports 3 active participants

### Requirement: Rollup counters from events
Edition: CE and PRO. Each projected event SHALL increment the hourly and daily counters of its UTC bucket
in both scopes exactly once: increments are applied only for events whose raw insert succeeded, or whose
rollup step has not yet succeeded in an in-process retry, so retried and replayed batches never double
count. Map keys SHALL be enum names or a fixed vocabulary, never user input.

#### Scenario: Batch retried after a transient error
- **GIVEN** a batch whose raw inserts succeeded and whose rollup step failed with a network error
- **WHEN** the batch is retried
- **THEN** raw inserts are skipped as duplicates, the rollup step is applied once and the counters equal the event counts

#### Scenario: Replayed events from another process
- **GIVEN** events already stored by a previous process
- **WHEN** they are processed again
- **THEN** the rollup counters are unchanged

#### Scenario: Vocabulary keys
- **GIVEN** a `PARTICIPANT_JOINED` with `client_info.sdk: JS`, `os: "Windows 11"` and `browser: "Chrome 130"`
- **WHEN** it is projected
- **THEN** the hourly rollup increments `participants.bySdk.JS`, `participants.byOs.windows` and `participants.byBrowser.chrome`, and a value outside the vocabulary increments `other`

### Requirement: Per-node batch cycle
Edition: CE and PRO. Every `interval` each node SHALL drain its event and stats queues into one batch,
merge the write models of the same document in event order, apply them with one unordered bulk write per
collection and insert raw events and stats with unordered inserts, without any cluster-wide lock.

#### Scenario: Two nodes write concurrently
- **GIVEN** two nodes with batches due at the same time
- **WHEN** both flush
- **THEN** both batches are written without waiting for each other and no lock key exists in Redis

#### Scenario: Same document twice in a batch
- **GIVEN** a `PARTICIPANT_JOINED`, `PARTICIPANT_ACTIVE` and `PARTICIPANT_LEFT` of one session in one batch
- **WHEN** the batch is applied
- **THEN** the collection receives one update for the session and the document ends with `status: "left"`, `joinedAt`, `activeAt` and `leftAt` set

### Requirement: Bounded queues
Edition: CE and PRO. The event and stats queues SHALL be bounded by configuration; when a queue is full the
oldest entry SHALL be dropped and counted, and the queue SHALL log at warn, at most once per batch interval, how
many entries it dropped since its previous warning; enqueueing SHALL never block the server's telemetry workers;
at most one batch SHALL be in flight per node.

#### Scenario: Overflow during an outage
- **GIVEN** `queue.max_events: 100` and an unreachable database
- **WHEN** 150 events are ingested
- **THEN** the queue holds the latest 100, the dropped counter reports 50 and the telemetry workers were never blocked

#### Scenario: Overflow warning
- **GIVEN** `queue.max_events: 1000`, the default interval and an unreachable database
- **WHEN** 1 500 events are ingested within one batch interval and none in the next one
- **THEN** one warn line names the `events` queue, its limit 1000 and 500 dropped entries, and no other overflow line is logged for that queue in the next interval

#### Scenario: Recovery after an outage
- **GIVEN** a database unavailable for two batch intervals with queues under their limits
- **WHEN** it becomes available
- **THEN** the next batch writes every queued event and stat and no entry was dropped

### Requirement: Retry policy
Edition: CE and PRO. A batch SHALL be retried, keeping its entries ahead of newer ones, only after
transient errors (network, timeout, not primary, write concern); on non-transient errors (validation in
`error` mode, oversized or unencodable document) the offending entries SHALL be dropped and counted while
the rest of the batch is applied.

#### Scenario: Primary election
- **GIVEN** a batch that fails with a not-primary error
- **WHEN** the next interval elapses
- **THEN** the same batch is written first, followed by the entries queued meanwhile

#### Scenario: One invalid document
- **GIVEN** `validation_action: error` and a batch with one document rejected by a validator
- **WHEN** the batch is applied
- **THEN** every other document is written, the rejected one is counted as a write error and the batch is not retried

### Requirement: Graceful shutdown
Edition: CE and PRO. On `SIGTERM` or `SIGINT`, after rooms are closed with `SERVER_SHUTDOWN`, the server
SHALL flush the telemetry stats workers and operation queue into the writer and write every queued event
and stat before exiting, waiting at most 5 s; entries not written in that window SHALL be counted as
dropped.

#### Scenario: Planned restart
- **GIVEN** a node with active rooms and participants
- **WHEN** it receives `SIGTERM`
- **THEN** the database holds the `ROOM_ENDED (ROOM_END_SERVER_SHUTDOWN)` and `PARTICIPANT_LEFT` events and the entities are `closed`/`left` with the final stats flushed

#### Scenario: Database unavailable at shutdown
- **GIVEN** an unreachable database
- **WHEN** the node receives `SIGTERM`
- **THEN** the process exits within 5 s of the signal and logs the number of dropped entries

### Requirement: Database initialization
Edition: CE and PRO. Before ingesting, the writer SHALL create or update the collections, validators (with
the configured action), indexes and TTL values of the `data-model` contract, create `track_stats` as a
time-series collection with a plain-collection fallback, write `schema_meta` documents `schema`,
`retention`, `capabilities` and `config`, and stop the server when initialization fails; nodes starting at
the same time SHALL all complete it.

#### Scenario: Empty database
- **GIVEN** an empty database
- **WHEN** the server starts
- **THEN** every collection of the contract exists with its validator and indexes, `track_stats` is a time-series collection and `schema_meta` has `schema`, `retention` and `capabilities` documents

#### Scenario: Time-series unsupported
- **GIVEN** a server that rejects time-series collection creation
- **WHEN** the writer initializes
- **THEN** `track_stats` is a plain collection with the contract's indexes and a TTL index on `ts`, and `schema_meta.capabilities` records `timeseries: false` and the server version

#### Scenario: Retention change
- **GIVEN** an initialized database and `retention.events` changed from 7d to 30d
- **WHEN** the server restarts
- **THEN** the TTL index of `events` has `expireAfterSeconds` 2 592 000 and `schema_meta.retention` shows the new value

#### Scenario: Daily rollup retention set
- **GIVEN** an initialized database without a TTL index on `analytics_daily`
- **WHEN** the server restarts with `retention.rollups_daily: 1825d`
- **THEN** `analytics_daily` has the TTL index `bucket_ttl` on `bucket` with `expireAfterSeconds` 157 680 000 and `schema_meta.retention.rollupsDailyMs` is 157 680 000 000

#### Scenario: Daily rollup retention removed
- **GIVEN** a database initialized with `retention.rollups_daily: 1825d`
- **WHEN** the server restarts without `retention.rollups_daily`
- **THEN** `analytics_daily` has no TTL index, no daily document expires and `schema_meta.retention.rollupsDailyMs` is `null`

#### Scenario: 5-minute rollups retention
- **GIVEN** `retention.stats: 7d` and `retention.rollups_5min: 2d`
- **WHEN** the server initializes the database
- **THEN** the TTL index of `analytics_5min` has `expireAfterSeconds` 172 800 and `track_stats` keeps the stats retention of 604 800 s

#### Scenario: Restart without changes
- **GIVEN** an initialized database
- **WHEN** the server restarts with the same configuration
- **THEN** initialization completes without errors and no index is recreated

#### Scenario: Indexes missing from an initialized database
- **GIVEN** a database initialized from a contract without the `egresses` index `roomNameLower_startedAt` and the `ingresses` index `lastSessionAt_id`
- **WHEN** the server starts
- **THEN** both indexes exist with their keys and partial filters, together with the rest of the contract's index list, and no other index is recreated

#### Scenario: Nodes starting together
- **GIVEN** an empty database or a legacy-shaped `events` collection
- **WHEN** several nodes initialize at the same time
- **THEN** every node completes initialization and the legacy documents end up once in `legacy_events`

### Requirement: Legacy events collection at first start
Edition: CE and PRO. Before initializing, the writer SHALL rename an `events` collection written by the
previous writer (one holding a document without `ts` while `schema_meta` has no `schema` document) to
`legacy_events`, keeping its documents for the legacy migration, and SHALL never overwrite an existing
`legacy_events` collection.

#### Scenario: Legacy events collection
- **GIVEN** an `events` collection whose documents have the previous writer's shape and no `schema_meta.schema`
- **WHEN** the server starts
- **THEN** that collection is renamed to `legacy_events` with its documents, a new `events` collection with the contract's validator is created, and a later restart renames nothing

#### Scenario: Legacy collections in conflict
- **GIVEN** a legacy-shaped `events` collection and an existing `legacy_events` collection
- **WHEN** the server starts
- **THEN** startup fails with an error naming both collections

### Requirement: Node heartbeat
Edition: CE and PRO. On every batch tick, including empty batches, the writer SHALL upsert the node's
`nodes` document with `lastSeenAt`, `serverVersion`, `region` and `batchIntervalMs` (the configured
`openvidu.analytics.interval` in milliseconds), setting `firstSeenAt` on insert.

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

### Requirement: Write path metrics
Edition: CE and PRO. The writer SHALL expose Prometheus metrics on the server's metrics endpoint with the
`openvidu_analytics_` prefix: queue depth per queue, batches by result, batch duration, dropped entries by
queue and reason, and write errors by collection and kind.

#### Scenario: Metric names
- **GIVEN** a server with analytics enabled and `prometheus_port` configured
- **WHEN** the metrics endpoint is scraped after one batch
- **THEN** it exposes `openvidu_analytics_queue_depth{queue}`, `openvidu_analytics_batches_total{result}`, `openvidu_analytics_batch_duration_seconds`, `openvidu_analytics_dropped_total{queue,reason}` and `openvidu_analytics_write_errors_total{collection,kind}`

### Requirement: Structured logs
Edition: CE and PRO. The writer SHALL log initialization results (capabilities, fallback, retention) at
info, batch summaries at debug, and drops, retries and non-transient errors at warn with counts, at most
one line per cause per interval; log lines SHALL never contain event payloads or credentials.

#### Scenario: Outage logging
- **GIVEN** a database unavailable for one minute with the default interval
- **WHEN** the logs are read
- **THEN** there are at most six warn lines for the outage, each with the retry count and queue depths, and none contains a payload or the connection string credentials

### Requirement: Contract conformance
Edition: CE and PRO. The writer SHALL vendor the `data-model` contract (JSON Schemas, index definitions,
fixtures and contract version) and its projections SHALL reproduce the canonical fixture documents from
the recorded events; the version written to `schema_meta.schema` SHALL equal the vendored contract
version.

#### Scenario: Fixture replay
- **GIVEN** the vendored fixtures and the recorded events that produced them
- **WHEN** the events are projected and applied to an empty database
- **THEN** every resulting document equals its fixture in every contract field and validates against its JSON Schema

#### Scenario: Version drift
- **GIVEN** a vendored contract version different from the writer's schema version constant
- **WHEN** the test suite runs
- **THEN** the contract test fails naming both versions

### Requirement: Legacy write path removed
Edition: CE and PRO. The writer SHALL NOT write the legacy `stats`, `active_entities` and `last_alive`
collections, SHALL NOT run the active-entities fixer or acquire the legacy Redis write lock, and SHALL
NOT include a Redis sink.

#### Scenario: Collections after a run
- **GIVEN** a server started against an empty database
- **WHEN** it has processed traffic for several minutes
- **THEN** no `stats`, `active_entities` or `last_alive` collection exists and Redis holds no `analytics-db-operations-lock` or `active-entities-lock` key (the reconciler's own `analytics-reconciler-lock` is the only analytics lock)

### Requirement: Standard participant counters
Edition: CE and PRO servers. The writer SHALL count only STANDARD sessions in the room participant counters
(`sessions`, `unique`, `active`, `peakActive`, `aborted`), in every rollup participant counter (joined, active, left,
aborted, minutes, connect time, SDK, OS, browser, connection type, disconnect reasons), in `rooms.participantsSum` and
in the daily `uniqueIdentities`; `participants.byKind` SHALL count the sessions of every kind. Which kinds keep a room
open SHALL not change.

#### Scenario: Egress participant joins
- **GIVEN** an active room with one active STANDARD participant
- **WHEN** a `PARTICIPANT_JOINED` and `PARTICIPANT_ACTIVE` of kind EGRESS are projected
- **THEN** the room keeps `participants.sessions: 1` and `active: 1`, `participants.byKind.EGRESS` becomes 1, the hourly rollup increments `participants.byKind.EGRESS` and leaves `participants.joined`, `participants.active` and `participants.bySdk` unchanged

#### Scenario: Ingress participant leaves
- **GIVEN** an INGRESS participant active for 30 minutes
- **WHEN** its `PARTICIPANT_LEFT` is projected
- **THEN** neither `participants.left`, `participants.disconnectReasons` nor `participants.minutes` of the rollups change

#### Scenario: Room size at room end
- **GIVEN** a room that held four STANDARD, one INGRESS and one AGENT session
- **WHEN** its `ROOM_ENDED` is projected
- **THEN** the hourly rollup adds 4 to `rooms.participantsSum`

#### Scenario: Daily unique identities
- **GIVEN** a closed UTC day with the STANDARD identities `alice` and `bob` and the INGRESS identity `cam-1`
- **WHEN** the reconciler writes the day's `uniqueIdentities`
- **THEN** the daily rollup has `uniqueIdentities: 2`

#### Scenario: Service keeps the room open
- **GIVEN** an active room whose only open session is of kind INGRESS
- **WHEN** the reconciler evaluates it
- **THEN** the room is not a closure candidate, although its `participants.active` is 0

### Requirement: Ingress sessions by input type in the rollups

Edition: CE and PRO. Each projected `INGRESS_STARTED` SHALL increment, besides `ingress.sessionsStarted`, the hourly
and daily counter `ingress.byInputType.<type>` of its bucket in both scopes, where `<type>` is the lowercase input type
of the ingress (`rtmp`, `whip` or `url`), with the same exactly-once rule as every rollup counter.

#### Scenario: RTMP session started

- **GIVEN** an `INGRESS_STARTED` of an ingress with `input_type: RTMP_INPUT` at 10:20 UTC on node `n1`
- **WHEN** it is projected
- **THEN** the hourly and daily documents of `global` and `node:n1` increment `ingress.sessionsStarted` and
  `ingress.byInputType.rtmp` by 1

#### Scenario: Replayed start

- **GIVEN** an `INGRESS_STARTED` already stored by a previous process
- **WHEN** it is processed again
- **THEN** `ingress.byInputType` is unchanged

### Requirement: Egress room-name search field
Edition: CE and PRO. Every egress upsert that sets `roomName` SHALL also set `roomNameLower` to the lower-cased room
name, with the same precedence rule as `roomName`, so that the stored `roomNameLower` always equals the lower-cased
stored `roomName`; an egress without a room name SHALL get neither field.

#### Scenario: Egress of a room
- **GIVEN** an `EGRESS_STARTED` whose `egress.room_name` is `Demo-Room`
- **WHEN** it is projected
- **THEN** the `egresses` document has `roomName: "Demo-Room"` and `roomNameLower: "demo-room"`

#### Scenario: Later events of the same egress
- **GIVEN** an egress document with `roomName: "Demo-Room"` and `roomNameLower: "demo-room"`
- **WHEN** its `EGRESS_UPDATED` and `EGRESS_ENDED` are projected, in any order
- **THEN** `roomName` and `roomNameLower` keep those values

#### Scenario: Web egress without room
- **GIVEN** a web egress with empty `room_name`
- **WHEN** it is projected
- **THEN** the `egresses` document has neither `roomName` nor `roomNameLower`
