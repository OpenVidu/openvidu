# data-model Specification

## Purpose

The analytics read model stored in MongoDB: the collections, fields, indexes, retention and versioning
contract shared by the OpenVidu server (writer) and OpenVidu Dashboard (reader), and the write rules that
keep the model consistent when events are delayed, replayed or duplicated.

## Requirements

### Requirement: Schema version contract
Edition: CE and PRO. The writer SHALL record the schema version it implements in `schema_meta` (`_id:
"schema"`, integer `version`, `writerVersion`, `updatedAt`) at startup. The dashboard SHALL compare that
version with the one it supports and refuse to serve data when the writer is older than its minimum.

#### Scenario: Writer writes its version
- **GIVEN** a server with analytics enabled starting against an empty database
- **WHEN** it finishes initialization
- **THEN** `schema_meta` contains `{ _id: "schema", version: <writer schema version> }` and the collections and indexes of this specification exist

#### Scenario: Dashboard rejects an older writer
- **GIVEN** `schema_meta.version` lower than the dashboard's minimum supported version
- **WHEN** the dashboard starts
- **THEN** it exits with a message naming both versions and the server version to install

#### Scenario: Dashboard tolerates a newer writer
- **GIVEN** `schema_meta.version` higher than the dashboard's version
- **WHEN** the dashboard starts
- **THEN** it serves data and `GET /api/v1/info` reports the mismatch as a warning

### Requirement: Writer metadata documents
Edition: CE and PRO. Besides `schema`, `schema_meta` SHALL hold `retention`, `capabilities` and `config`, which the
writer replaces at every initialization, `migration` (`server-legacy-migration`) and `reconciler`
(`server-reconciler`); `_id: "dashboard"` is reserved for non-secret facts written by the dashboard.

#### Scenario: Retention document
- **GIVEN** a writer initialized with the default retention
- **WHEN** `schema_meta` `_id: "retention"` is read
- **THEN** it has `eventsMs`, `statsMs`, `tracksMs` and `rollups5MinMs` 604 800 000, `entitiesMs` 7 776 000 000, `rollupsHourlyMs` 34 560 000 000, `rollupsDailyMs: null` (daily rollups kept forever) and `updatedAt`

#### Scenario: Daily rollup retention recorded
- **GIVEN** a writer initialized with `retention.rollups_daily: 1825d`
- **WHEN** `schema_meta` `_id: "retention"` is read
- **THEN** `rollupsDailyMs` is 157 680 000 000

#### Scenario: Capabilities and config documents
- **WHEN** `schema_meta` `_id: "capabilities"` and `_id: "config"` are read
- **THEN** `capabilities` has `timeseries`, `transactions`, `serverVersion` and `detectedAt`, and `config` has the writer's `statsDetail` (`participant` | `track`) and `recordedAt`

### Requirement: Entity documents keyed by LiveKit identifiers
Edition: CE and PRO. Each room session, participant session, published track, subscription, egress,
ingress and ingress session SHALL be represented by exactly one document whose `_id` is its LiveKit
identifier (`RM_…`, `PA_…`, `TR_…`, `<trackSid>:<subscriberSid>`, `EG_…`, `IN_…`, ingress `resource_id`),
created by the first event that mentions it and updated in place by later events.

#### Scenario: Events out of order
- **GIVEN** a `PARTICIPANT_ACTIVE` event processed before its `PARTICIPANT_JOINED`
- **WHEN** both have been processed in any order
- **THEN** there is one `participants` document with `status: "active"`, `joinedAt` from JOINED and `activeAt` from ACTIVE

#### Scenario: Replayed event
- **GIVEN** a document already updated by an event
- **WHEN** the same event (same LiveKit event id) is processed again
- **THEN** the document is unchanged and no counter has moved

### Requirement: Writer bookkeeping
Edition: CE and PRO. The set-based counters of `rooms`, `participants`, `tracks` and `ingresses` documents SHALL be
derived from id sets kept under the writer-only `internal` field, so that a replayed or reordered event never
counts twice; `internal` is not part of the read contract: the dashboard never reads it and the API never returns it.

#### Scenario: Session counted once
- **GIVEN** a `PARTICIPANT_JOINED` of a STANDARD session already applied to its room
- **WHEN** the same event is applied again in a later batch
- **THEN** the room's `participants.sessions` is unchanged and equals the size of the STANDARD session id set under `internal`

### Requirement: Room document
Edition: CE and PRO. A `rooms` document SHALL describe one room session: identity and lifecycle, node,
configuration, participant/track/egress/ingress counters, traffic, quality, feature flags and retention
fields, with the field list of the shared contract (`dashboard-ce/typings/src/data-model`).
`participants.sessions`, `unique`, `active`, `peakActive` and `aborted` SHALL count STANDARD sessions only;
`participants.byKind` SHALL count the sessions of every kind.

#### Scenario: Fields of a room document
- **WHEN** a room document is read
- **THEN** it has `name`, `nameLower`, `status` (`active` | `closed`), `createdAt`, `endedAt`, `durationMs`, `endReason`, `closedBy`, `nodeId`, `config` (max participants, empty and departure timeouts, metadata when allowed), `participants { sessions, unique, active, peakActive, aborted, byKind }`, `tracks`, `egress` (by type), `ingress`, `bytes { up, down }`, `quality { scoreSum, scoreCount, minScore, poor, lost }`, `features { egress, ingress, agent, sip }`, `lastEventAt`, `lastStatsAt`, `schemaVersion`, `expiresAt`

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
- **THEN** it has `identity`, `identityLower`, `name`, `roomSid`, `roomName`, `kind`, `kindDetails`, `status` (`joining` | `active` | `left` | `aborted`), `joinedAt`, `activeAt`, `leftAt`, `durationMs`, `disconnectReason`, `closedBy`, `connectTimeMs`, `connectionType`, `region`, `nodeId`, `resumes`, `client { sdk, version, os, osVersion, browser, browserVersion, deviceModel, network, address }`, `permission`, `isPublisher`, `metadata` and `attributes` (when allowed), `tracks { published, bySource, subscribed, subscribeFailures }`, `bytes`, `quality`, `lastEventAt`, `lastStatsAt`, `schemaVersion`, `expiresAt`

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

### Requirement: Track and subscription documents
Edition: CE and PRO. A `tracks` document SHALL describe one published track (references, media facts,
lifecycle, subscriber counters, final publish statistics) and a `track_subscriptions` document SHALL
describe one (track, subscriber) pair (references, lifecycle, error, final subscribe statistics).

#### Scenario: Fields of track and subscription documents
- **WHEN** a track and a subscription document are read
- **THEN** the track has `roomSid`, `participantSid`, `identity`, `type`, `source`, `mimeType`, `name`, `status` (`published` | `unpublished`), `publishedAt`, `unpublishedAt`, `durationMs`, `closedBy`, `muted`, `width`, `height`, `simulcast`, `codecs[]`, `encryption`, `subscribers { current, total, failed }`, `publishStats`; and the subscription has `trackSid`, `roomSid`, `subscriberSid`, `subscriberIdentity`, `publisherSid`, `publisherIdentity`, `source`, `status` (`requested` | `subscribed` | `unsubscribed` | `failed`), `error`, `subscribedAt`, `unsubscribedAt`, `durationMs`, `closedBy`, `subscribeStats`

#### Scenario: Track closed by participant leave
- **GIVEN** a published track whose `TRACK_UNPUBLISHED` was never emitted
- **WHEN** the publisher's `PARTICIPANT_LEFT` is processed
- **THEN** the track becomes `unpublished` with `unpublishedAt = leftAt` and its open subscriptions become `unsubscribed`

#### Scenario: Subscription failure
- **GIVEN** `TRACK_SUBSCRIBE_REQUESTED` then `TRACK_SUBSCRIBE_FAILED` with an error
- **WHEN** both are processed
- **THEN** the subscription has `status: "failed"` and `error` set, and the subscriber's `tracks.subscribeFailures` is 1

### Requirement: Egress document
Edition: CE and PRO. An `egresses` document SHALL describe one egress: room reference, type, source,
lifecycle status with history, timestamps, error, a sanitized request summary, the request in raw payload encoding and
its outputs, with the field list of the shared contract. `roomNameLower` SHALL be the lower-cased `roomName`, written
together with it.

#### Scenario: Fields of an egress document
- **WHEN** an egress document is read
- **THEN** it has `roomSid`, `roomName`, `roomNameLower`, `type` (`room_composite` | `web` | `participant` | `track_composite` | `track`), `sourceType`, `status` (`starting` | `active` | `ending` | `complete` | `failed` | `aborted` | `limit_reached`), `closedBy`, `startedAt`, `updatedAt`, `endedAt`, `durationMs`, `error`, `errorCode`, `request` (sanitized), `rawRequest?`, `outputs[] { kind, name or url, location, size, durationMs, status, error, startedAt, endedAt }`, `statusHistory[]` with at most 50 entries, `retryCount`, `backupStorageUsed`, `schemaVersion`, `expiresAt`

#### Scenario: Egress completes
- **GIVEN** `EGRESS_STARTED`, two `EGRESS_UPDATED` and `EGRESS_ENDED` with status COMPLETE and one file result
- **WHEN** all are processed
- **THEN** the document has `status: "complete"`, one output of kind `file` with its filename, location, size and duration, and four `statusHistory` entries

#### Scenario: Credentials are never stored
- **GIVEN** an egress request with S3 credentials and a stream URL containing a key
- **WHEN** the egress is projected
- **THEN** neither `request` nor `rawRequest` contains a credential field, and the stream output URL has its key redacted

#### Scenario: Room name search field
- **GIVEN** an egress of room `Demo-Room`
- **WHEN** its document is read
- **THEN** it has `roomName: "Demo-Room"` and `roomNameLower: "demo-room"`

#### Scenario: Web egress without room
- **GIVEN** a web egress, which has no room
- **WHEN** its document is read
- **THEN** it has neither `roomName` nor `roomNameLower`

### Requirement: Raw egress request
Edition: CE and PRO. `rawRequest` SHALL hold the request as the raw events of the egress store `egress.request`: the
member of the request oneof that is set, under its protocol name, through the secrets allow-list.

#### Scenario: Raw request
- **GIVEN** a room composite egress of room `Demo-Room` with layout `grid`, preset `H264_720P_30`, an MP4 file output with path `recordings/demo.mp4` uploaded to S3 with credentials, and a stream output to `rtmps://live.example.com/app/live_123?token=abc`
- **WHEN** its `EGRESS_STARTED` event is processed
- **THEN** `rawRequest` is `{ room_composite: { room_name: "Demo-Room", layout: "grid", options: { preset: "H264_720P_30" }, file_outputs: [{ file_type: "MP4", filepath: "recordings/demo.mp4" }], stream_outputs: [{ urls: ["rtmps://live.example.com/app/***"] }] } }`, the value of `payload.egress.request` in the stored event

### Requirement: Ingress and ingress session documents
Edition: CE and PRO. An `ingresses` document SHALL describe one ingress definition and its aggregate
session facts, and an `ingress_sessions` document SHALL describe one publishing session (`resource_id`)
with its room, lifecycle and negotiated media parameters.

#### Scenario: Fields of ingress documents
- **WHEN** an ingress and an ingress session document are read
- **THEN** the ingress has `name`, `nameLower`, `inputType` (`rtmp` | `whip` | `url`), sanitized `url`, `roomName`, `participantIdentity`, `participantName`, `reusable`, `enabled`, `enableTranscoding`, `createdAt`, `deletedAt`, `status`, `lastError`, `sessions`, `totalDurationMs`, `lastSessionAt`; and the session has `ingressId`, `ingressName`, `inputType`, `roomSid`, `roomName`, `participantIdentity`, `status`, `error`, `closedBy`, `startedAt`, `endedAt`, `durationMs`, `video { mimeType, averageBitrate, width, height, framerate }`, `audio { mimeType, averageBitrate, channels, sampleRate }`

#### Scenario: Reusable ingress with two sessions
- **GIVEN** `INGRESS_CREATED`, then `INGRESS_STARTED`/`INGRESS_ENDED` twice with different `resource_id`
- **WHEN** all are processed
- **THEN** one `ingresses` document has `sessions: 2` and `totalDurationMs` equal to the sum of both sessions, and two `ingress_sessions` documents exist

#### Scenario: Stream key is never stored
- **GIVEN** an RTMP ingress with a stream key
- **WHEN** it is projected
- **THEN** no document contains the stream key

### Requirement: Raw events
Edition: CE and PRO. The `events` collection SHALL store one document per stored event, keyed by the LiveKit
event id, with the type, timestamp, lifted entity references, node, a synthetic flag and a payload without
secrets. The set of stored types SHALL be configurable with a default that excludes chatty and sensitive
types.

#### Scenario: Fields of a raw event
- **WHEN** a raw event is read
- **THEN** it has `_id` (LiveKit event id), `type`, `ts`, `roomSid`, `roomName`, `participantSid`, `identity`, `trackSid`, `egressId`, `ingressId`, `ingressSessionId` (those that apply), `nodeId`, `synthetic` and `payload`

#### Scenario: Default stored types
- **GIVEN** default configuration
- **WHEN** `API_CALL`, `TRACK_PUBLISHED_UPDATE`, `TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY`, `TRACK_SUBSCRIBE_REQUESTED` and two identical consecutive `INGRESS_UPDATED` events are received
- **THEN** no `API_CALL`, `TRACK_PUBLISHED_UPDATE`, `TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY` or `TRACK_SUBSCRIBE_REQUESTED` document is stored and only the first `INGRESS_UPDATED` is stored

#### Scenario: Room timeline
- **GIVEN** events of a room within the events retention window
- **WHEN** `events` is queried by `roomSid` and `ts`
- **THEN** every stored event of the room is returned in time order with its lifted references, and none of them is an `API_CALL`

#### Scenario: Closure by the reconciler
- **GIVEN** an active participant on a dead node
- **WHEN** the reconciler closes it
- **THEN** the document has `status: "left"` (or `"aborted"` when it never became active), `closedBy: "reconciler"`, `disconnectReason: "RECONCILED"` and `leftAt` equal to the latest of `lastStatsAt` and `lastEventAt`

#### Scenario: Synthetic close event
- **GIVEN** the reconciler closes a stale participant
- **WHEN** it records the closure
- **THEN** an `events` document with `type: "PARTICIPANT_LEFT"`, `synthetic: true` and an `_id` prefixed `AE_SYN_` exists

### Requirement: Track statistics time series
Edition: CE and PRO. `track_stats` SHALL hold one document per 30-second flush per participant and
direction (`participant` mode) or per track and direction (`track` mode), with normalized units, and
signal/data pseudo-tracks SHALL only add to the participant byte totals, without `track_stats` documents.

#### Scenario: Fields of a stats document
- **WHEN** a stats document is read
- **THEN** it has `ts`, `meta { roomSid, participantSid, trackSid (track mode only), kind (`up` | `down`), nodeId }`, `score`, `minScore`, `medianScore`, `bytes`, `packets`, `packetsLost`, `rttMs`, `jitterMs`, `nacks`, `plis`, `firs`, `frames`, `layers[] { layer, bytes, packets, frames }`, `mimeType` (track mode only)

#### Scenario: Participant mode merges tracks
- **GIVEN** `participant` mode and one flush with camera and microphone upstream stats of the same participant
- **WHEN** the flush is stored
- **THEN** one upstream document exists for the participant with `bytes` equal to the sum and `score` equal to the mean of the two tracks

#### Scenario: Fallback without time-series support
- **GIVEN** a MongoDB-compatible server that rejects time-series collections
- **WHEN** the writer initializes
- **THEN** `track_stats` is created as a plain collection with the same document shape, the same secondary indexes and a TTL index on `ts`

### Requirement: Rollups
Edition: CE and PRO. `analytics_5min`, `analytics_hourly` and `analytics_daily` SHALL hold one document per
scope (`global` and `node:<nodeId>`) and bucket with pre-aggregated counters, so that long ranges never read
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
- **GIVEN** five rooms created and two ended between 10:00 and 11:00 UTC on one node
- **WHEN** the events are processed
- **THEN** `analytics_hourly` has `global:2026-…T10:00:00Z` and `node:<id>:2026-…T10:00:00Z` with `rooms.created: 5` and `rooms.ended: 2`

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
Edition: CE and PRO. The `nodes` collection SHALL hold one document per server node with `firstSeenAt`,
`lastSeenAt`, `serverVersion`, `region` and `batchIntervalMs` (int32 milliseconds, at least 1 000: the node's
configured batch interval), updated by every writer batch, and SHALL expire documents 30 days after their last
heartbeat so decommissioned nodes disappear. A document without `batchIntervalMs` SHALL be read as a 10 s interval.

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

### Requirement: Retention
Edition: CE and PRO. Retention SHALL be configurable per class with defaults events 7 d, stats 7 d,
tracks (tracks and subscriptions) 7 d, entities (rooms, participants, egress, ingress) 90 d, 5-minute rollups 7 d,
hourly rollups 400 d, daily rollups unlimited unless configured. A closed entity document SHALL carry `expiresAt` = its
end time plus its class retention, computed when written, and an open one `expiresAt: null`; `events`, `track_stats`
and the rollups expire by TTL indexes.

#### Scenario: TTL indexes
- **GIVEN** a writer that finished initialization with the default retention
- **WHEN** the TTL indexes are listed
- **THEN** `events` expires by `ts` after `retention.events`, `track_stats` by `ts` after `retention.stats`, `analytics_5min` by `bucket` after `retention.rollups_5min`, `analytics_hourly` by `bucket` after `retention.rollups_hourly`, every entity collection by `expiresAt` with `expireAfterSeconds: 0`, `nodes` by `lastSeenAt` after 30 days, and `analytics_daily` has no TTL index

#### Scenario: Daily rollups with a retention
- **GIVEN** a writer that finished initialization with `retention.rollups_daily: 1825d`
- **WHEN** the TTL indexes of `analytics_daily` are listed
- **THEN** it expires by `bucket` after 1 825 days

#### Scenario: Expiry of closed entities
- **WHEN** closed entity documents are read
- **THEN** `expiresAt` is `endedAt` + `retention.entities` for rooms, `leftAt` + `retention.entities` for participants, `endedAt` (else `updatedAt`) + `retention.entities` for egresses in a terminal status, `endedAt` (else `startedAt`) + `retention.entities` for ended ingress sessions, `unpublishedAt` + `retention.tracks` for tracks, `unsubscribedAt` + `retention.tracks` for subscriptions and the failure time + `retention.tracks` for failed subscriptions

#### Scenario: Ingress definition
- **GIVEN** a reusable ingress
- **WHEN** its document is read before and after its `INGRESS_DELETED`
- **THEN** `expiresAt` is `null` before, whatever its sessions, and `deletedAt` + `retention.entities` after

#### Scenario: Entities retention change
- **GIVEN** a room closed while `retention.entities` was `90d`
- **WHEN** the writer restarts with `retention.entities: 30d`
- **THEN** that room keeps its `expiresAt` and rooms closed afterwards get `endedAt` + 30 days

#### Scenario: Active entity never expires
- **GIVEN** a room active for longer than the entities retention
- **WHEN** the TTL monitor runs
- **THEN** the room document exists

#### Scenario: Retention change applies to existing data
- **GIVEN** a deployment that changes `retention.events` from 7 d to 30 d
- **WHEN** the writer restarts
- **THEN** the TTL index of `events` has the new `expireAfterSeconds` and `schema_meta` (`_id: "retention"`) reflects the configured values

### Requirement: Secrets and personal data
Edition: CE and PRO. No document SHALL contain `turn_password`, storage credentials, stream keys, signing
keys, tokens or SIP credentials. Client IP addresses SHALL be stored only when `anonymize_ip` is `false`, and
participant metadata, attributes, room metadata and ingress participant metadata SHALL be stored only when
`store_metadata` is enabled.

#### Scenario: Anonymized IP
- **GIVEN** the default configuration
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** `client.address` is absent from the participant document and from the raw event payload

#### Scenario: IP addresses stored on request
- **GIVEN** `anonymize_ip: false`
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** the participant document has `client.address`

#### Scenario: Metadata disabled by default
- **GIVEN** default configuration
- **WHEN** a room with metadata and a participant with attributes are projected
- **THEN** neither `config.metadata` nor `metadata`/`attributes` are stored

### Requirement: Index-backed queries
Edition: CE and PRO. The writer SHALL create the indexes of the shared contract
(`dashboard-ce/typings/contract/indexes.ts`) at initialization, and every list, detail and time-series query of the
dashboard API SHALL use an index (no collection scan) on collections with more than a configurable threshold of
documents.

#### Scenario: Explain plans in tests
- **GIVEN** a database generated by the data generator at scenario M
- **WHEN** each API query is explained
- **THEN** no winning plan contains a `COLLSCAN` stage and `totalDocsExamined` is bounded by the page size plus the filtered range

### Requirement: Units and time
Edition: CE and PRO. All timestamps SHALL be stored as UTC `Date`, durations as integer milliseconds and
sizes as integer bytes; the writer SHALL convert the protocol's seconds, milliseconds, nanoseconds and
microseconds accordingly. Bucketing by calendar unit SHALL be done at read time with the caller's timezone.

#### Scenario: Egress nanoseconds normalized
- **GIVEN** an `EgressInfo` with `started_at` and `ended_at` in nanoseconds
- **WHEN** projected
- **THEN** `startedAt` and `endedAt` are `Date` values and `durationMs` is their difference in milliseconds

### Requirement: Document validators
Edition: CE and PRO. Each collection SHALL have a JSON Schema validator derived from the shared contract,
applied with `validationAction: "warn"` in production and `"error"` in tests, so a writer defect is
visible in logs without losing data.

#### Scenario: Invalid document in tests
- **GIVEN** the test configuration
- **WHEN** a room document with `createdAt` as a string is inserted
- **THEN** the insert is rejected by the validator

### Requirement: Egress room-name search index
Edition: CE and PRO. `egresses` SHALL have the index `roomNameLower_startedAt` `{ roomNameLower: 1, startedAt: -1 }`,
partial on `roomNameLower` existing, which backs the case-insensitive prefix search on the egress room name with the
range on `startedAt`. An egress document without `roomNameLower` is not matched by that search.

#### Scenario: Index of an initialized database
- **GIVEN** a writer that finished initialization
- **WHEN** the indexes of `egresses` are listed
- **THEN** `roomNameLower_startedAt` exists with the key `{ roomNameLower: 1, startedAt: -1 }` and the partial filter `{ roomNameLower: { $exists: true } }`

#### Scenario: Document without the search field
- **GIVEN** an egress document of room `demo-room` without `roomNameLower`
- **WHEN** the egress list is searched by the room name `demo`
- **THEN** that egress is not returned, and egresses of the same room that carry `roomNameLower` are

### Requirement: Ingress last-session index
Edition: CE and PRO. `ingresses` SHALL have the index `lastSessionAt_id` `{ lastSessionAt: -1, _id: -1 }`, partial on
`lastSessionAt` existing, which backs the selection of the ingresses whose last session started in a time range.

#### Scenario: Index of an initialized database
- **GIVEN** a writer that finished initialization
- **WHEN** the indexes of `ingresses` are listed
- **THEN** `lastSessionAt_id` exists with the key `{ lastSessionAt: -1, _id: -1 }` and the partial filter `{ lastSessionAt: { $exists: true } }`

### Requirement: Generated data follows the writer's shape
Edition: CE and PRO. The data generator SHALL write documents in the writer's shape: event payloads as the writer's
protojson (snake_case names nested under `room`, `participant`, `track`, `egress` and `ingress`, 64-bit integers as
64-bit numbers, as in the contract event fixtures), ingress `nameLower` and egress `roomNameLower` as the lower-cased
`name` and `roomName`, and node heartbeats with `batchIntervalMs` 10 000.

#### Scenario: Generated event payload
- **GIVEN** a database generated by the data generator
- **WHEN** a generated `PARTICIPANT_JOINED` event is read
- **THEN** its payload has `room.sid`, `participant.sid`, `participant.identity` and `client_info.sdk`, has no camelCase key such as `clientInfo`, and satisfies the payload interfaces of the typings

#### Scenario: Lower-cased search fields
- **GIVEN** a generated ingress named `Studio-A` and a generated egress of room `Demo-Room`
- **WHEN** their documents are read
- **THEN** the ingress has `nameLower: "studio-a"` and the egress has `roomNameLower: "demo-room"`

#### Scenario: Generated node heartbeats
- **GIVEN** a database generated by the data generator, kept live by its keep-alive
- **WHEN** `nodes` is read
- **THEN** every document has `batchIntervalMs: 10000`
