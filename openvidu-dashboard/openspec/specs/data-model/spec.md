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
Edition: CE and PRO. A `rooms` document SHALL describe one room session: identity and lifecycle, node and media node,
configuration, participant/track/egress/ingress counters, traffic, quality, feature flags and retention
fields, with the field list of the shared contract (`dashboard-ce/typings/src/data-model`).
`participants.sessions`, `unique`, `active`, `peakActive` and `aborted` SHALL count STANDARD sessions only;
`participants.byKind` SHALL count the sessions of every kind.

#### Scenario: Fields of a room document
- **WHEN** a room document is read
- **THEN** it has `name`, `nameLower`, `status` (`active` | `closed`), `createdAt`, `endedAt`, `durationMs`, `endReason`, `closedBy`, `nodeId`, `mediaNode` (only when the server that hosts it has a media node label), `config` (max participants, empty and departure timeouts, metadata when allowed), `participants { sessions, unique, active, peakActive, peakPublishers, aborted, byKind }`, `topology`, `tracks`, `egress` (by type), `ingress`, `bytes { up, down }`, `quality { scoreSum, scoreCount, minScore, poor, lost }`, `features { egress, ingress, agent, sip, recording }`, `lastEventAt`, `lastStatsAt`, `mediaStats` (only `false`, when its node does not report media statistics), `schemaVersion`, `expiresAt`

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

#### Scenario: Room written by an earlier writer
- **GIVEN** a room document written by a writer that does not classify rooms
- **WHEN** it is read
- **THEN** it has no `participants.peakPublishers`, no `topology` and no `features.recording`, and the dashboard reads it as before

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
its outputs, with the field list of the shared contract. `statusHistory` SHALL hold one entry per status, at its first
report. `roomNameLower` SHALL be the lower-cased `roomName`, written together with it.

#### Scenario: Fields of an egress document
- **WHEN** an egress document is read
- **THEN** it has `roomSid`, `roomName`, `roomNameLower`, `type` (`room_composite` | `web` | `participant` | `track_composite` | `track`), `sourceType`, `status` (`starting` | `active` | `ending` | `complete` | `failed` | `aborted` | `limit_reached`), `closedBy`, `startedAt`, `updatedAt`, `endedAt`, `durationMs`, `error`, `errorCode`, `request` (sanitized), `rawRequest?`, `outputs[] { kind, name or url, location, size, durationMs, status, error, startedAt, endedAt }`, `statusHistory[]` with at most 50 entries, `retryCount`, `backupStorageUsed`, `schemaVersion`, `expiresAt`

#### Scenario: Egress completes
- **GIVEN** `EGRESS_STARTED`, two `EGRESS_UPDATED` and `EGRESS_ENDED` with status COMPLETE and one file result
- **WHEN** all are processed
- **THEN** the document has `status: "complete"`, one output of kind `file` with its filename, location, size and duration, and four `statusHistory` entries

#### Scenario: Status reported twice
- **GIVEN** an egress with a file and a stream output whose two `EGRESS_UPDATED` report `active` at 09:06:49.336 and
  09:06:49.349
- **WHEN** they are processed, in either order
- **THEN** `statusHistory` holds one `active` entry, at 09:06:49.336

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
- **THEN** it has `ts`, `meta { roomSid, participantSid, trackSid (track mode only), kind (`up` | `down`), nodeId }`, `score`, `minScore`, `medianScore`, `bytes`, `packets`, `packetsLost`, `rttMs`, `jitterMs`, `nacks`, `plis`, `firs`, `layers[] { layer, bytes, packets }`, `mimeType` (track mode only)

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
scope (`global`, and `node:<label>` for a labelled server's media node) and bucket with pre-aggregated counters. Map
keys SHALL be enum names or a fixed vocabulary, never user input. Participant counters SHALL count STANDARD sessions
only, except `participants.byKind` and the 5-minute `participants.connected` (participants with stats), which count
every kind.

#### Scenario: Fields of the rollup documents
- **WHEN** hourly or daily rollup documents are read
- **THEN** they have counters for rooms (created, ended, by end reason, `durationMsSum`, `participantsSum`, `byTopology`, `recorded`, `bySize`), participants (joined, active, aborted, left, by kind, SDK, OS, browser, connection type, disconnect reason, connect time, minutes), tracks, egress (started, by type, by end status, duration), ingress sessions (started, ended, started by input type, duration), bytes, quality (score sum/count, poor, lost), API calls and API errors (total and by method), and daily documents also `uniqueIdentities` (set by the server's aggregator once the UTC day has closed); 5-minute documents have bytes, quality, `participants.connected` (distinct participants with stats), the `PARTICIPANT_ACTIVE` count and the lifecycle counters (rooms created/ended, participants joined/left/aborted, egress started/ended); documents of the three collections may also have `rooms.peakActive`, `participants.peakActive` and `egress.peakActive`, and hourly and daily documents `ingress.peakActive` (int32, written by the server's aggregator)

#### Scenario: Peaks of active rooms and participants
- **GIVEN** the server's aggregator counted 4 active rooms and 11 active STANDARD sessions at 10:01 UTC and 6 and 9 at 10:40 UTC, no more at any other minute of that hour, and no server wrote any other counter in it
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute document of `…T10:00:00Z` has `rooms.peakActive: 4` and `participants.peakActive: 11`, the one of `…T10:40:00Z` has 6 and 9, and the hourly document of `…T10:00:00Z` has `rooms.peakActive: 6` and `participants.peakActive: 11` and no other counter

#### Scenario: Peaks of active egress and ingress
- **GIVEN** the server's aggregator counted 2 open egresses and 1 publishing ingress session at 10:01 UTC and 3 and 0 at 10:40 UTC, no more at any other minute of that hour
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:00:00Z` and `…T10:40:00Z` have `egress.peakActive` 2 and 3 and no `ingress` field, and the hourly document of `…T10:00:00Z` has `egress.peakActive: 3` and `ingress.peakActive: 1`

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

#### Scenario: Room topology and recording counters
- **GIVEN** a server with the media node label `mn-a` on which, between 10:00 and 11:00 UTC, a recorded 1:1 room ends,
  a 1:N room with N = 30 ends and an N:M room with N = 4 ends
- **WHEN** `analytics_hourly` is read for `global:…T10:00:00Z` and `node:mn-a:…T10:00:00Z`
- **THEN** both have `rooms.byTopology: { one_to_one: 1, one_to_many: 1, many_to_many: 1 }`, `rooms.recorded: 1` and
  `rooms.bySize: { "0-5": 2, "26-50": 1 }`, and no `analytics_5min` document has any of the three

### Requirement: Nodes
Edition: CE and PRO. The `nodes` collection SHALL hold one document per server process (its node id: a restart
writes a new one) with `firstSeenAt`, `lastSeenAt`, `serverVersion`, `batchIntervalMs` (int32 milliseconds, at least
1 000), `mediaStats`, `rtcEngine` (`pion` | `mediasoup`), `rooms.hosted` and `rooms.reconciled` (int32), and the
optional `mediaNode`, `ip`, `drainingAt` and `stoppedAt`, and SHALL expire it `retention.entities` after its last
heartbeat.

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

#### Scenario: Document written before the new fields
- **GIVEN** a `nodes` document without `rtcEngine` or `rooms`, with a `region`
- **WHEN** the dashboard reads it and the reconciler increments its `rooms.reconciled`
- **THEN** it reads each missing field as its default, `rtcEngine` as `pion` and both counters as 0, and the
  validator accepts the update with the `region` left in place

#### Scenario: Retention of node documents
- **GIVEN** `retention.entities: 90d` and a server whose last heartbeat was 60 days ago
- **WHEN** the TTL monitor runs
- **THEN** its document exists, and the document of a server last seen 91 days ago is gone

#### Scenario: Servers of a media node
- **WHEN** the dashboard reads the documents with `mediaNode: "mn-a"`, newest `firstSeenAt` first
- **THEN** the query uses the partial index `mediaNode_firstSeenAt` (`mediaNode` ascending, `firstSeenAt` descending,
  documents with `mediaNode` only)

### Requirement: Retention
Edition: CE and PRO. Retention SHALL be configurable per class with defaults events 7 d, stats 7 d,
tracks (tracks and subscriptions) 7 d, entities (rooms, participants, egress, ingress) 90 d, 5-minute rollups 7 d,
hourly rollups 400 d, daily rollups unlimited unless configured. A closed entity document SHALL carry `expiresAt` = its
end time plus its class retention, computed when written, and an open one `expiresAt: null`; `events`, `track_stats`,
the rollups and `nodes` expire by TTL indexes.

#### Scenario: TTL indexes
- **GIVEN** a writer that finished initialization with the default retention
- **WHEN** the TTL indexes are listed
- **THEN** `events` expires by `ts` after `retention.events`, `track_stats` by `ts` after `retention.stats`, `analytics_5min` by `bucket` after `retention.rollups_5min`, `analytics_hourly` by `bucket` after `retention.rollups_hourly`, every entity collection by `expiresAt` with `expireAfterSeconds: 0`, `nodes` by `lastSeenAt` after `retention.entities`, and `analytics_daily` has no TTL index

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

#### Scenario: Node retention follows the entities
- **GIVEN** a writer that restarts with `retention.entities: 30d` after running with the default
- **WHEN** the TTL indexes of `nodes` are listed
- **THEN** `lastSeenAt_ttl` has `expireAfterSeconds` of 30 days

### Requirement: Stored secrets and personal data
Edition: CE and PRO. No document SHALL contain `turn_password`, storage credentials, stream keys, signing
keys, tokens or SIP credentials. Client IP addresses SHALL be stored only when `anonymize_ip` is `false`, and
participant metadata, attributes, room metadata and ingress participant metadata SHALL be stored only when
`store_metadata` is enabled, except the attributes `lk.agent_name`, `openvidu.agent` and `openvidu.agent.*` of a
participant of kind `AGENT`, which are always stored.

#### Scenario: Client address absent by default
- **GIVEN** the default configuration
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** `client.address` is absent from the participant document and from the raw event payload

#### Scenario: IP addresses stored on request
- **GIVEN** `anonymize_ip: false`
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** the participant document has `client.address`

#### Scenario: Metadata disabled by default
- **GIVEN** default configuration
- **WHEN** a room with metadata and a STANDARD participant with metadata and attributes are projected
- **THEN** neither `config.metadata` nor `metadata`/`attributes` are stored

#### Scenario: Agent attributes in the contract fixtures
- **GIVEN** the contract fixtures, written as the default `store_metadata: false` writes them
- **WHEN** the participant fixtures are validated and read
- **THEN** the agent session passes the `participants` validator with `attributes` equal to `{ "lk.agent_name": "speech-processing", "openvidu.agent": "speech-processing" }`, and no other participant fixture has `attributes` or `metadata`

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

### Requirement: Rooms end time not indexed
Edition: CE and PRO. The shared contract SHALL define no `rooms` index whose key contains `endedAt`. Room lists and
counts read the creation range on `createdAt` and rank by the end time in memory, so such an index serves no query and
only competes in the planner's trials with the indexes the range bounds.

#### Scenario: No rooms index on endedAt
- **GIVEN** the index list of the contract (`schema/indexes.json`)
- **WHEN** its `rooms` entries are read
- **THEN** none has `endedAt` in its key and none is named `status_endedAt_id`

### Requirement: Generated data follows the writer's shape
Edition: CE and PRO. The data generator SHALL write documents in the writer's shape: event payloads as the writer's
protojson (snake_case names nested under `room`, `participant`, `track`, `egress` and `ingress`, 64-bit integers as
64-bit numbers, as in the contract event fixtures), ingress `nameLower` and egress `roomNameLower` as the lower-cased
`name` and `roomName`, and node heartbeats with `batchIntervalMs` 10 000, or 30 000 for the slow media node
`media-node-10-0-0-6`.

#### Scenario: Generated event payload
- **GIVEN** a database generated by the data generator
- **WHEN** a generated `PARTICIPANT_JOINED` event is read
- **THEN** its payload has `room.sid`, `participant.sid`, `participant.identity` and `client_info.sdk`, has no camelCase key such as `clientInfo`, and satisfies the payload interfaces of the typings

#### Scenario: Lower-cased search fields
- **GIVEN** a generated ingress named `Studio-A` and a generated egress of room `Demo-Room`
- **WHEN** their documents are read
- **THEN** the ingress has `nameLower: "studio-a"` and the egress has `roomNameLower: "demo-room"`

#### Scenario: Generated node heartbeats
- **GIVEN** a database generated with `--media-nodes`, and one generated without it, both kept live by the keep-alive
- **WHEN** `nodes` is read
- **THEN** every document of `media-node-10-0-0-6` has `batchIntervalMs: 30000` and every other document
  `batchIntervalMs: 10000`, before and after the keep-alive ticks

### Requirement: Media statistics marks of the rollups
Edition: CE and PRO. A rollup document of `analytics_5min`, `analytics_hourly` or `analytics_daily` MAY carry
`mediaStats` with the optional booleans `reported` and `missing`, each only ever `true`; a document without
`mediaStats`, written before the marks existed, counts as reported. The data generator SHALL mark its rollups as the
writer does, from the `mediaStats` of the node of each room or session it counts.

#### Scenario: Validator
- **GIVEN** the contract validators
- **WHEN** an hourly document with `mediaStats: { reported: true, missing: true }` is written, and then one with
  `mediaStats: { other: true }`
- **THEN** the first is accepted and the second is rejected

#### Scenario: Generated rollups of nodes without media statistics
- **GIVEN** a database generated with `--media-nodes --node-rollups --nodes-without-media-stats 1`
- **WHEN** the hourly `global` documents and the `node:media-node-10-0-0-2` documents are read
- **THEN** the `global` buckets that count rooms of the first `-2` server and of another server have both marks, no
  bucket after that server's `stoppedAt` has `missing`, and the `node:media-node-10-0-0-2` buckets with counters have
  only `missing` before it and only `reported` after the second server's `firstSeenAt`

#### Scenario: Generated rollups of servers reporting media statistics
- **GIVEN** a database generated without `--nodes-without-media-stats`
- **WHEN** the rollups are read
- **THEN** every document with counters has `mediaStats.reported: true` and none has `mediaStats.missing`

### Requirement: Generated active peaks
Edition: CE and PRO. The data generator SHALL write `rooms.peakActive` and `participants.peakActive` on every rollup
document it writes, and `egress.peakActive` on every global one and `ingress.peakActive` on every global hourly and
daily one, from the generated rooms, STANDARD sessions, egresses and ingress sessions active at each minute of the
bucket counted as the server's aggregator counts them, and SHALL write the global documents of the buckets without
activity with every peak at `0`.

#### Scenario: Generated peaks
- **GIVEN** a database generated with `--five-minute-rollups` whose rooms `A` (10:00–10:20 UTC) and `B` (10:10–10:30 UTC) are the only ones that day, each with one STANDARD session for its whole life
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:10:00Z` and `…T10:15:00Z` have `rooms.peakActive: 2` and `participants.peakActive: 2`, the one of `…T10:25:00Z` has 1 and 1, and the hourly document of `…T10:00:00Z` has 2 and 2

#### Scenario: Generated egress and ingress peaks
- **GIVEN** a generated egress of room `A` from 10:05 to 10:15 UTC and an ingress session from 10:12 to 10:40 UTC, the only ones that day
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:05:00Z` and `…T10:10:00Z` have `egress.peakActive: 1`, the one of `…T10:20:00Z` has `egress.peakActive: 0`, none has an `ingress` field, and the hourly document of `…T10:00:00Z` has `egress.peakActive: 1` and `ingress.peakActive: 1`

#### Scenario: Idle generated hour
- **GIVEN** a generated range with an hour without any room
- **WHEN** `analytics_hourly` is read for that hour and the `global` scope
- **THEN** the document exists with `rooms.peakActive: 0`, `participants.peakActive: 0`, `egress.peakActive: 0` and `ingress.peakActive: 0`

### Requirement: Egress and ingress rollups in the global scope only
Edition: CE and PRO. Egress and ingress counters and peaks SHALL be written to the `global` rollup documents only: a
`node:<label>` document SHALL carry no `egress` or `ingress` field, because the media node that runs an egress or an
ingress session is not known.

#### Scenario: Egress and ingress on a labelled server
- **GIVEN** a server with the media node label `mn-a` that writes the start and end of an egress and of an ingress session between 10:00 and 11:00 UTC, while the aggregator samples both active
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the bucket
- **THEN** the `global` documents have the egress and ingress counters and peaks, and the `node:mn-a` documents have neither an `egress` nor an `ingress` field

### Requirement: Generated egress and ingress rollups stay global
Edition: CE and PRO. The data generator SHALL write the egress and ingress counters and peaks into the global rollup
documents only, and SHALL write no `mediaNode` on egresses or ingress sessions, with or without `--media-nodes`.

#### Scenario: Labelled generated database
- **GIVEN** a database generated with `--media-nodes --node-rollups`
- **WHEN** the rollups, `egresses` and `ingress_sessions` are read
- **THEN** no `node:` rollup document has an `egress` or `ingress` field, the global documents count every generated egress and ingress session, and no egress or ingress session has a `mediaNode` field

### Requirement: Room topology class
Edition: CE and PRO. A room's `topology` SHALL be one of six classes, from N (`participants.peakActive`) and P
(`participants.peakPublishers`): `empty` (N = 0), `single_participant` (N = 1), `no_publishers` (N ≥ 2, P = 0),
`one_to_one` (N = 2, P ≥ 1), `one_to_many` (N ≥ 3, P = 1) and `many_to_many` (N ≥ 3, P ≥ 2). It SHALL follow the
room's counters while the room is active and keep the value it has when the room closes.

#### Scenario: Classes from the peaks
- **GIVEN** closed rooms whose (N, P) are (0, 0), (1, 1), (5, 0), (2, 1), (2, 2), (40, 1) and (6, 3)
- **WHEN** their documents are read
- **THEN** their `topology` values are `empty`, `single_participant`, `no_publishers`, `one_to_one`, `one_to_one`,
  `one_to_many` and `many_to_many`

#### Scenario: Active room
- **GIVEN** an active room with two STANDARD participants, only one of which has sent media
- **WHEN** a third STANDARD participant joins and stays muted, and later unmutes its microphone
- **THEN** `topology` reads `one_to_one`, then `one_to_many` after the join, then `many_to_many` after the unmute

### Requirement: Room size ranges
Edition: CE and PRO. The size range of a room with a `topology` SHALL be the range of its N among `0-5`, `6-10`,
`11-25`, `26-50`, `51-100` and `101+`, whatever its class.

#### Scenario: Range bounds
- **GIVEN** rooms with N of 0, 1, 2, 5, 6, 100 and 101
- **WHEN** their size ranges are taken
- **THEN** they are `0-5`, `0-5`, `0-5`, `0-5`, `6-10`, `51-100` and `101+`

### Requirement: Generated topologies and recordings
Edition: CE and PRO. The data generator SHALL give its rooms every topology class in a mix that resembles real use,
derive `participants.peakPublishers`, `topology` and `features.recording` from its sessions, tracks and egresses as the
writer does, and, with `--room-sums`, write `rooms.byTopology`, `rooms.recorded` and `rooms.bySize` in the
hourly and daily rollups of each room's end bucket, in its scopes.

#### Scenario: Generated classes
- **GIVEN** a database generated with the scenario `S` over 7 days
- **WHEN** the closed rooms are grouped by `topology`
- **THEN** every class has rooms, `one_to_one` and `many_to_many` are the most frequent, and each room's class matches
  its `participants.peakActive` and `participants.peakPublishers`

#### Scenario: Generated rollups match the rooms
- **GIVEN** a database generated with `--room-sums` and `--node-rollups`
- **WHEN** the hourly `global` documents of a day are summed, and the `node:` documents of each node apart
- **THEN** their `rooms.byTopology`, `rooms.recorded` and `rooms.bySize` equal the counts, by class, recording
  and size range, of the rooms that ended that day, and of those of each node

### Requirement: Generated agent attributes
Edition: CE. The data generator SHALL give every agent session the `attributes` the writer keeps by default:
`lk.agent_name` always, empty for agents without a registered name, and `openvidu.agent` on the agents it generates
as OpenVidu agents, with no other key; sessions of other kinds get no `attributes`. A generated dataset with agents
SHALL hold agents with the mark and agents without it.

#### Scenario: Generated agents of both origins
- **GIVEN** a dataset generated at scenario S over 2 days
- **WHEN** its participant sessions are read
- **THEN** every `AGENT` session has `attributes` with `lk.agent_name` and no key other than it and `openvidu.agent`, at least one has a non-empty `openvidu.agent` and at least one has none, no session of another kind has `attributes`, and every session passes the `participants` validator

### Requirement: Dashboard deletion records
Edition: CE and PRO. The `schema_meta` document `_id: "dashboard"` SHALL hold, written only by the dashboard, the
latest deletion job (`deletion`: class, cutoff, state, heartbeat, progress, error, the instance running it) and the
last outcome of each class (`deletions`); the writer never reads or writes them, and the validator, the schema version
and the generated contract stay unchanged.

#### Scenario: Records accepted by the validator
- **GIVEN** the test configuration, whose validators reject invalid documents
- **WHEN** the dashboard writes a running job and a completed Events record into `schema_meta` `_id: "dashboard"`
- **THEN** the writes succeed and the writer's `schema`, `retention`, `capabilities`, `config`, `migration` and
  `reconciler` documents are unchanged

#### Scenario: Contract unchanged
- **GIVEN** the contract sources of this change
- **WHEN** the generated `schema/` and the schema version are compared with those before it
- **THEN** both are identical

### Requirement: Generated single node
Edition: CE and PRO. Without `--media-nodes` the data generator SHALL write a single-node deployment: one machine
without label or `ip` and three servers, one `nodes` document each. The first stops at a planned upgrade halfway
through the range, the second is lost three quarters of the way through it and the third is alive, each started a
minute or two after the previous one ended. It SHALL write no node scope and create no room while no server takes
rooms.

#### Scenario: Generated single node
- **GIVEN** a database generated without `--media-nodes` over 2 days
- **WHEN** `nodes`, `rooms` and the hourly scopes are read
- **THEN** there are three documents, none with `mediaNode` or `ip`, all with `rtcEngine: "pion"` and
  `mediaStats: true`:
  - the first has `drainingAt` 2 minutes before `stoppedAt` at the middle of the range;
  - the second was first seen a minute after that stop and last seen at three quarters of the range, without
    `stoppedAt`;
  - the third was first seen 2 minutes after that and is alive.
  No room was created between the first server's `drainingAt` and the second's `firstSeenAt`, or between the second's
  `lastSeenAt` and the third's `firstSeenAt`. Every rollup scope is `global`.

### Requirement: Generated server versions
Edition: CE and PRO. Generated servers started before the middle of the range SHALL run `3.10.0` and later ones
`3.10.1`; the `schema` meta SHALL give the newest one. `--nodes-without-media-stats` SHALL take 0 or 1: with 1, the
servers of the mediasoup machine (`-2`, or the single node, which then runs mediasoup) started before that upgrade
report no media statistics, and every other server reports them.

#### Scenario: Generated server versions
- **GIVEN** a database generated with `--media-nodes --nodes-without-media-stats 1`
- **WHEN** `nodes`, `rooms`, `participants`, `track_stats` and `schema_meta` are read
- **THEN**:
  - the servers first seen before the middle of the range have `serverVersion: "3.10.0"` and the others `"3.10.1"`,
    and the `schema` document has `writerVersion: "3.10.1"`;
  - the first `-2` server has `rtcEngine: "mediasoup"` and `mediaStats: false`, and its rooms and sessions have
    `mediaStats: false`, no bytes or quality and no `track_stats`;
  - every other server has `mediaStats: true`, and the first `-1` server runs pion and its later two mediasoup.
  Generated without `--media-nodes`, the same option gives the three servers of the single node `rtcEngine:
  "mediasoup"`, with `mediaStats: false` on the first only. `--nodes-without-media-stats 2` is rejected.

### Requirement: Rooms of generated servers
Edition: CE and PRO. The data generator SHALL host each room and its sessions on a server up and taking rooms when the
room is created (from its `firstSeenAt`, before its `drainingAt` and its end), and active rooms only on servers alive
at the end. A room open when its server stops SHALL end then with `SERVER_SHUTDOWN`, beside the random share that keeps
that reason. A room open when its server goes silent SHALL be closed by the reconciler, reason `node-dead`.

#### Scenario: Rooms of generated servers
- **GIVEN** a database generated with `--media-nodes --node-rollups` over 2 days
- **WHEN** `nodes`, `rooms`, `participants` and the room events are read
- **THEN**:
  - every room was created at or after the `firstSeenAt` of the document whose `nodeId` and `mediaNode` it has, and
    before its `drainingAt`, `stoppedAt` and `lastSeenAt`; its sessions have the same `nodeId` and `mediaNode` and
    joined at or after that `firstSeenAt`;
  - no active room belongs to a stopped or silent server, and no room of such a server ended after its `stoppedAt` or
    `lastSeenAt`;
  - the second `-1` server and `-4` each have a room with `closedBy: "reconciler"`, whose synthetic `ROOM_ENDED` event
    gives reason `node-dead`;
  - each document's `rooms.hosted` equals the rooms with its `nodeId`, and `rooms.reconciled` those of them closed by
    the reconciler.

### Requirement: Generated multi-node deployment
Edition: CE and PRO. With `--media-nodes` the data generator SHALL write a multi-node deployment: seven media nodes
`media-node-10-0-0-1` to `-7`, with `ip` `10.0.0.1` to `.7`, and ten servers, one `nodes` document each, covering the
server histories an edition shows: restarts, a lost server, draining, stopped, not reporting, a late and a slow node.
`--node-rollups` SHALL key the node scopes by the label and SHALL be rejected without `--media-nodes`.

#### Scenario: Generated media node servers
- **GIVEN** a database generated with `--media-nodes --node-rollups` over 2 days, whose end is the latest `lastSeenAt`
- **WHEN** `nodes` and the hourly scopes are read
- **THEN** there are ten documents. Each document whose server started before the range has `firstSeenAt` before its
  `lastSeenAt` and before the range, and the alive ones have `lastSeenAt` at the end:
  - `-1` has three: the first, pion, with `drainingAt` 10 minutes before `stoppedAt` at the middle of the range; the
    second, mediasoup, first seen a minute later and last seen 5 h 2 min before the end without `stoppedAt`; the
    third, mediasoup, first seen 5 h before the end and alive;
  - `-2` has two, mediasoup: the first with `drainingAt` 20 minutes and `stoppedAt` 30 minutes after the middle of the
    range, the second first seen a minute after that stop and alive;
  - `-3`, pion, is alive with `drainingAt` 20 minutes before the end;
  - `-4`, pion, has `drainingAt` 3 h 10 min before the end, `lastSeenAt` 3 hours before it and no `stoppedAt`;
  - `-5`, pion, has `drainingAt` 40 minutes and `stoppedAt` 30 minutes before the end;
  - `-6`, pion, was first seen at three quarters of the range and is alive;
  - `-7`, pion, was last seen 3 days before the end, without `drainingAt` or `stoppedAt`.
  The node scopes of the rollups are `node:media-node-10-0-0-<n>` of the labels that hosted rooms in the range.

#### Scenario: Keep-alive of generated servers
- **GIVEN** that database, and one generated without `--media-nodes`, kept live by the keep-alive
- **WHEN** `nodes` is read ten minutes later
- **THEN** only the alive servers have a fresh `lastSeenAt` (the third of `-1`, the second of `-2`, `-3` and `-6`, or
  the third server of the single node), each keeping its `batchIntervalMs` and `-3` its `drainingAt`, and every
  stopped or silent server keeps its `lastSeenAt`, `drainingAt` and `stoppedAt`

### Requirement: Demo data modes
Edition: CE and PRO. The local demo SHALL take `DASHBOARD_DEMO_DATA`, `frozen` by default or `live`, in every edition
and deployment. `frozen` SHALL write nothing after generation but the keep-alive of the heartbeats and stats times,
whatever wrote the data; `live` SHALL run the live writer with the options of the generation. Any other value SHALL stop
the demo with a message before it starts MongoDB or a server.

#### Scenario: Demo data mode selection
- **GIVEN** the demo of CE, and the PRO demo with the Elastic options (track stats, media nodes, node rollups)
- **WHEN** each prepares its data without `DASHBOARD_DEMO_DATA`, and then with `DASHBOARD_DEMO_DATA=live`
- **THEN** without it the data generator runs the keep-alive, and with `live` it runs the live writer with the stats
  mode and the generator options of that demo

#### Scenario: Unknown demo data mode
- **GIVEN** `DASHBOARD_DEMO_DATA=snapshot`
- **WHEN** `./dashboard.sh demo ce` starts
- **THEN** it exits with a non-zero code and a message naming `frozen` and `live`, before it starts a container or a
  server

#### Scenario: Frozen keep-alive writes nothing new
- **GIVEN** a database generated with `--media-nodes --node-rollups` and kept in `frozen` mode
- **WHEN** ten minutes of keep-alive ticks run
- **THEN** every collection holds the same documents, and only `lastSeenAt` of the alive servers and `lastStatsAt` of
  the active rooms and sessions changed

#### Scenario: Frozen restart on kept live data
- **GIVEN** a database left by a `live` run, with rooms in progress and a media node draining at its last heartbeat
- **WHEN** the demo starts again in `frozen` mode with `DASHBOARD_DEMO_KEEP_DATA=true` and the keep-alive ticks
- **THEN** no room, session or server is closed or added, the rooms stay in progress, the media node stays draining,
  and only the heartbeats of the alive servers and the stats times of the active rooms and sessions move

### Requirement: Live rooms and sessions
Edition: CE and PRO. In `live` mode the live writer SHALL write the room and session lifecycle of the generated world
within one batch interval (10 s) of each instant: rooms created and ended, sessions joining, active, resumed and
leaving, tracks published, muted and unpublished, subscriptions, egresses and ingress sessions with their statuses, each
with its events, in the writer's shape and accepted by the contract validators. The rooms in progress at generation
SHALL end on their own.

#### Scenario: Live room lifecycle
- **GIVEN** a database generated at T and written live with validators that reject invalid documents
- **WHEN** ticks run every 10 s until T + 3 hours
- **THEN** rooms created after T exist, some of them closed with `endedAt`, `durationMs`, `endReason` and `expiresAt`,
  their sessions joined after their creation and left by their end, their `ROOM_CREATED`, `PARTICIPANT_JOINED`,
  `PARTICIPANT_LEFT` and `ROOM_ENDED` events are dated at those instants, and every room's `participants.active`
  equals its active STANDARD sessions

#### Scenario: Rooms in progress at generation end
- **GIVEN** a database generated at T with ten or more rooms in progress
- **WHEN** ticks run until T + 6 hours
- **THEN** each of those rooms is closed, none of its sessions is still open and none joined after the room's end

#### Scenario: Generated rooms in progress stretched 30 minutes at most
- **GIVEN** a database generated at T with ten or more rooms in progress, and the length drawn for each of their
  sessions
- **WHEN** ticks run until T + 100 minutes
- **THEN** every STANDARD session of those rooms that joined before T left at or before the later of T + 30 minutes
  and the end of its drawn length, and each of those rooms closed at or before its departure timeout after the later
  of T and the last leave of its sessions other than EGRESS ones

#### Scenario: Nothing written ahead of time
- **GIVEN** a live database ticked at instant t
- **WHEN** its documents are read
- **THEN** no event, stats document, creation, join, publication, end or `lastStatsAt` is dated after t, and every
  event of the world dated at or before t is stored, except the reconciler closures that are not due yet (3 to 4
  minutes after the last signal they are dated at)

### Requirement: Live room floor
Edition: CE and PRO. In `live` mode at least 10 rooms SHALL be in progress at every minute, except in the 10 minutes
after the live writer starts on kept data and, for a single node, from its daily drain until 10 minutes after its new
server starts, and more rooms SHALL be created around 14:00 UTC, following the generator's daily curve at the pace of
the scenario.

#### Scenario: Live room floor
- **GIVEN** a live database of scenario S, with and without `--media-nodes`
- **WHEN** ticks run for 24 hours
- **THEN** at every minute outside those exceptions at least 10 rooms are `active`

#### Scenario: Live daily curve
- **GIVEN** the same 24 hours of live writing
- **WHEN** the active rooms are counted at every minute
- **THEN** their mean between 13:00 and 15:00 UTC is higher than their mean between 01:00 and 03:00 UTC

### Requirement: Live stats
Edition: CE and PRO. In `live` mode the live writer SHALL write a `track_stats` flush every 30 s per track and direction
(`track` mode) or per participant and direction (`participant` mode) while a session sends or receives media, nothing
while a track is muted or after a session leaves, and SHALL add each flush's bytes and quality to the session, the room
and the rollups and move their `lastStatsAt` to it.

#### Scenario: Live stats per mode
- **GIVEN** two live databases, one in `track` mode and one in `participant` mode, each with an active session sending
  an unmuted camera and microphone
- **WHEN** two minutes of ticks run
- **THEN** the `track` one has four new upstream documents per track, 30 s apart, each with `meta.trackSid` and
  `mimeType`, the `participant` one four per participant without them, and in both the room's `bytes.up` grew by the
  sum of those documents' bytes, the session's by that sum plus the signal channel's bytes of each flush, and their
  `lastStatsAt` is the latest flush

#### Scenario: No live stats while muted or after leaving
- **GIVEN** a live session that mutes its camera at M, unmutes it at U and leaves at L
- **WHEN** ticks run past L
- **THEN** no upstream document of the camera is dated more than 30 s after M and before U, a flush of the camera dated
  after M and before U carries only what the camera sent before the mute, no document of the session is dated after
  L, and its `lastStatsAt` is at or before L

### Requirement: Live rollups
Edition: CE and PRO. In `live` mode the live writer SHALL increment the 5-minute, hourly and daily rollups of the bucket
of each event and flush it writes, in the global scope and, with node rollups, the media node scope, SHALL write the
active peaks every 60 s with `$max`, and SHALL write the daily unique identities of a closed UTC day after 00:05 UTC, as
the writer and the aggregator do.

#### Scenario: Live rollups match the entities
- **GIVEN** a database generated at T with `--media-nodes --node-rollups --room-sums` and written live
- **WHEN** ticks run until T + 2 hours
- **THEN** for each hour from the one containing T, the global hourly document counts the rooms created, the STANDARD
  sessions joined and the rooms ended in that hour, and its upstream bytes equal those of the hour's `track_stats`
  documents, and the media node documents of each label count those of its rooms and sessions

#### Scenario: Live active peaks
- **GIVEN** the same live database
- **WHEN** the global 5-minute documents of the completed buckets after T are read
- **THEN** each one's `rooms.peakActive` and `participants.peakActive` are the most rooms and active STANDARD sessions
  counted at the minutes of its bucket

#### Scenario: Live unique identities at day close
- **GIVEN** a live database ticked from 23:50 to 00:10 UTC
- **WHEN** the global daily document of the day that closed is read
- **THEN** its `uniqueIdentities` equals the distinct identities of the STANDARD sessions of that day

### Requirement: Live egress and ingress shares
Edition: CE and PRO. In `live` mode half of the rooms the live writer creates SHALL have an egress and one in ten an
ingress, while the generation, and with it the generated history and the `frozen` mode, SHALL keep 30 % of rooms with
an egress and 2 % with an ingress.

#### Scenario: Live egress and ingress shares
- **GIVEN** a database generated at T with scenario S over 2 days and written live for 24 hours
- **WHEN** the rooms created before T and those created after T are grouped by whether they have an egress or an
  ingress
- **THEN** between 25 % and 35 % of the rooms created before T have an egress and between 1 % and 3 % an ingress, and
  between 45 % and 55 % of the rooms created after T have an egress and between 7 % and 13 % an ingress

### Requirement: Live short-lived states
Edition: CE and PRO. In `live` mode half of the STANDARD sessions SHALL take 1 to 3 minutes to connect before they
become active or abort; egresses SHALL spend 20 to 60 s starting and ending; ingress sessions
SHALL buffer 1 to 2 minutes; and at least one room per UTC hour SHALL stop reporting and be closed by the reconciler 3 to
4 minutes after its last signal, dated at it.

#### Scenario: Live connecting participants
- **GIVEN** a live database ticked for 2 hours
- **WHEN** the sessions joined in that time are read, and the rooms are sampled at every minute
- **THEN** every session that took over a minute to connect stayed `joining` 60 to 180 s and then became `active` or
  `aborted`, and in at least half of the minutes some room in progress held a `joining` session

#### Scenario: Live egress and ingress transitions
- **GIVEN** the same 2 hours of live writing
- **WHEN** the egresses and ingress sessions started in that time are read
- **THEN** each egress stayed `starting` 20 to 60 s, each one stopped while active stayed `ending` 20 to 60 s, and each
  ingress session stayed `buffering` 60 to 120 s before it published or ended

#### Scenario: Live stale room
- **GIVEN** a live database ticked for one UTC hour
- **WHEN** its rooms are read at every tick
- **THEN** at least one room stayed `active` with a `lastStatsAt` older than 90 s for at least a minute, and was then
  closed with `closedBy: "reconciler"`, its `endedAt` at its last signal and its closure written 3 to 4 minutes after it

### Requirement: Live server operations
Edition: CE and PRO. In `live` mode with media nodes, at each even UTC hour the next reporting media node in turn SHALL
drain for 20 minutes, stop and return 10 minutes later as a new server, and at 15:00 UTC one SHALL be lost, its rooms
closed by the reconciler, and return 6 hours later; a single node SHALL restart at 04:00 UTC: draining 2 minutes,
stopping and a new server a minute later. Rooms open at a stop SHALL end with `SERVER_SHUTDOWN`.

#### Scenario: Live rolling restart
- **GIVEN** a live database with `--media-nodes` ticked from 01:50 to 02:40 UTC
- **WHEN** `nodes` and the rooms of the media node in turn are read
- **THEN** its server has `drainingAt` 02:00 and `stoppedAt` 02:20, no room of it was created after 02:00, its rooms
  open at 02:20 ended then with `SERVER_SHUTDOWN`, and a new server of the same label was first seen at 02:30 and is
  alive

#### Scenario: Live lost server
- **GIVEN** a live database with `--media-nodes` ticked from 14:50 UTC to 21:10 UTC
- **WHEN** `nodes` and the rooms of the media node lost at 15:00 are read
- **THEN** its server's `lastSeenAt` is 15:00 without `stoppedAt`, its rooms open then were closed by the reconciler
  with reason `node-dead` dated at their last signal, and a new server of the same label was first seen at 21:00

#### Scenario: Live single node restart
- **GIVEN** a live database without `--media-nodes` ticked from 03:50 to 04:20 UTC
- **WHEN** `nodes` and `rooms` are read
- **THEN** the server has `drainingAt` 04:00 and `stoppedAt` 04:02, its rooms open then ended with `SERVER_SHUTDOWN`, a
  new server was first seen at 04:03, and no room was created between 04:00 and 04:03

#### Scenario: Live servers of the generation instant
- **GIVEN** a database generated at T with `--media-nodes` and written live until T + 4 hours
- **WHEN** `nodes` is read
- **THEN** `-3`, draining at T, stopped at T + 20 minutes and has a new server since T + 30 minutes, `-4` has a new
  server since T + 3 hours, six hours after it was lost, and `-7` is still silent

### Requirement: Live restart on kept data
Edition: CE and PRO. When the demo starts in `live` mode on kept data, the live writer SHALL treat the time since the
last heartbeat as an outage: it SHALL close the rooms, sessions, egresses and ingress sessions still open with the
reconciler at their last signal, leave every server alive then lost, start a new server on each of their machines and
write nothing dated inside the gap.

#### Scenario: Live restart after a stop
- **GIVEN** a database whose last heartbeat is 2 hours old, with rooms, sessions and an egress in progress, left by a
  `live` run and, in another case, by a `frozen` run
- **WHEN** the demo starts in `live` mode with `DASHBOARD_DEMO_KEEP_DATA=true`
- **THEN** those rooms, sessions and the egress are closed by the reconciler with reason `node-dead` at or before that
  heartbeat, the servers alive then keep their `lastSeenAt` without `stoppedAt`, each of their machines has a new server
  first seen at the restart, nothing is dated between the heartbeat and the restart, and 10 minutes later at least 10
  rooms are in progress

### Requirement: Live writing and deletions
Edition: CE and PRO. In `live` mode the live writer SHALL write entities and rollups as updates and increments of the
documents it changes, never rewriting a whole rollup bucket, and SHALL NOT write again a room, session, egress or
ingress session after the tick that wrote its end, so a deletion from Settings affects the live data as it affects a
deployment's.

#### Scenario: Live writing after a deletion
- **GIVEN** a live database on which the dashboard's Total deletion ran, removing the closed rooms ended over 5 minutes
  before its cutoff with their data and the rollup buckets before the previous one, and from which the rollup
  documents of the buckets at or before the cutoff were then removed as well
- **WHEN** ticks run for 30 more minutes
- **THEN** none of the removed rooms or sessions is stored again, the rooms in progress at the cutoff keep all their
  data, and the hourly document of the current hour holds only what was written after its removal

### Requirement: Live data is deterministic
Edition: CE and PRO. Given the seed, the generator options and the instant the world starts (the generation, or the
live start on kept data), the live writer SHALL store the same documents at a given instant whatever the interval
between its ticks, its rollup increments summing to the same values.

#### Scenario: Same live data at any tick cadence
- **GIVEN** two databases generated with the same seed, options and generation instant T
- **WHEN** one is ticked every 10 s and the other every 60 s, both until T + 1 hour
- **THEN** both hold the same rooms, sessions, tracks, subscriptions, egresses, ingresses, events, `track_stats` and
  `nodes`, and rollup documents with the same values
