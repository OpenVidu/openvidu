# server-legacy-migration Specification

## Purpose
Conversion of the legacy analytics collections (`events`, `stats`, `active_entities`, `last_alive`), written by
OpenVidu 3.9 and earlier, into the analytics model by the OpenVidu server, so that an upgraded deployment keeps its
history, closes the entities the legacy writer left open and exposes the progress to the dashboard.

## Requirements

### Requirement: Migration trigger at writer startup
Edition: CE and PRO. After renaming a legacy `events` collection and initializing the analytics collections, a writer
that finds no `schema_meta` `_id: "migration"` document and a legacy collection (`legacy_events`, `stats`,
`active_entities` or `last_alive`) SHALL write `_id: "migration"` with `state: "pending"` and start the migration in
the background; every later start resumes a migration that is not `completed`. Without legacy collections no
migration document SHALL be written.

#### Scenario: Legacy deployment upgraded
- **GIVEN** a database written by OpenVidu 3.9 or earlier and no `schema_meta` `_id: "schema"` document
- **WHEN** the writer starts
- **THEN** `legacy_events` holds the legacy documents with their indexes, the analytics collections exist, the live write path accepts events immediately and `schema_meta` `_id: "migration"` has `state: "pending"`, `total`, `writerVersion` and `fromSchemaVersion: 0`

#### Scenario: Fresh deployment
- **GIVEN** an empty database
- **WHEN** the writer starts
- **THEN** no `migration` document exists and nothing is renamed

#### Scenario: Legacy collection next to an analytics schema
- **GIVEN** a `schema_meta` `_id: "schema"` document written by the analytics writer, no `migration` document and a legacy `last_alive` collection
- **WHEN** the writer starts
- **THEN** `schema_meta` `_id: "migration"` is written with `state: "pending"`, whatever the recorded schema version

#### Scenario: Migration already completed
- **GIVEN** `schema_meta` `_id: "migration"` with `state: "completed"`
- **WHEN** the writer restarts
- **THEN** the document is unchanged and no replay runs

#### Scenario: Migration disabled
- **GIVEN** `openvidu.analytics.migration.enabled: false` and a pending migration
- **WHEN** the writer starts
- **THEN** the document stays `pending`, a warning names the setting and the live path runs normally

### Requirement: Migration state document
Edition: CE and PRO. `schema_meta` `_id: "migration"` SHALL carry `state` (`pending` | `running` |
`completed` | `failed`), `processed`, `total`, `checkpoint { phase, events, stats }`, `startedAt`,
`finishedAt`, `error`, `writerVersion`, `nodeId`, `counts { events, stats, synthetic, skipped }` and
`legacyRetainedUntil`, updated after every batch, so the dashboard can show progress without any other
access to the writer.

#### Scenario: Progress visible while running
- **GIVEN** a migration in progress
- **WHEN** `schema_meta` `_id: "migration"` is read
- **THEN** `state` is `running`, `processed` is at most one batch behind the documents applied, `total` is the document count of `legacy_events` plus `stats` at start, and `startedAt` and `nodeId` are set

#### Scenario: Completed with counts
- **GIVEN** a migration that finished all phases
- **WHEN** the document is read
- **THEN** `state` is `completed`, `finishedAt` is set, `counts` reports replayed events, stats, synthetic closures and skipped documents, and `legacyRetainedUntil` equals the latest `openvidu_expire_at` of the legacy collections

### Requirement: Single runner across nodes
Edition: CE and PRO. The migration SHALL run on at most one node at a time, elected with the Redis lock
`analytics-migration-lock` (TTL 60 s, refreshed after every batch; a process-local lock in a deployment without
Redis); a node that cannot obtain the lock SHALL serve the live path and retry the lock every minute, so it takes over
when the runner dies.

#### Scenario: Two nodes start together
- **GIVEN** a pending migration and two writer nodes starting at the same time
- **WHEN** both try to run it
- **THEN** exactly one runs, the other logs that another node holds the migration and both write live batches

#### Scenario: Runner node dies
- **GIVEN** a migration `running` on node A and node B waiting for the lock
- **WHEN** A crashes and its lock expires
- **THEN** node B obtains the lock at its next attempt, without a restart, and resumes from the stored checkpoint

### Requirement: Replay order and batching
Edition: CE and PRO. Legacy events SHALL be replayed in `timestamp.seconds` then `timestamp.nanos` order and stats in
`time_stamp.seconds` order, in batches of `batch_size` documents (fewer at the end) extended until the second of their
last document is complete, so that a batch never splits a second, read through a streaming cursor that holds one batch
in memory, with a pause after each batch so the throughput does not exceed `rate` documents per second.

#### Scenario: Throttle respected
- **GIVEN** `rate: 1000` and 10 000 legacy events
- **WHEN** the replay runs
- **THEN** it takes at least 10 s and live batches keep their interval during the run

#### Scenario: Batch keeps whole seconds
- **GIVEN** `batch_size: 500` and 700 events with the same `timestamp.seconds`
- **WHEN** the batch containing that second is read
- **THEN** all 700 events are in it and the checkpoint moves past that second only after they are applied

#### Scenario: Unthrottled
- **GIVEN** `rate: 0`
- **WHEN** the replay runs
- **THEN** no pause is inserted between batches

#### Scenario: Defaults
- **GIVEN** no `openvidu.analytics.migration` keys
- **WHEN** the replay runs
- **THEN** batches hold 500 documents, extended until the second of their last document is complete (fewer at the end), and the throughput stays at or below 2000 documents per second

### Requirement: Legacy document decoding
Edition: CE and PRO. Each legacy document SHALL be decoded into the protocol message the live writer
receives: numbers stored as doubles converted to the field's integer type, enums accepted as the enum
name or its number, oneof wrappers keyed by Go names, absent fields treated as zero values and
`ROOM_CREATED` without `room_id` resolved from `room.sid`. A document that cannot be decoded SHALL be
skipped, counted and logged with its `_id`.

#### Scenario: Float numbers
- **GIVEN** a legacy `ROOM_CREATED` with `room.creation_time: 1.728e9` and an `EGRESS_ENDED` with `egress.started_at` as a double of nanoseconds
- **WHEN** they are replayed
- **THEN** the room has `createdAt` as a `Date` and the egress `startedAt` and `durationMs` are exact to the millisecond

#### Scenario: Enums as names or numbers
- **GIVEN** a legacy `PARTICIPANT_LEFT` with `type: "PARTICIPANT_LEFT"`, `participant.kind: 4` and `participant.disconnect_reason: 1`
- **WHEN** it is replayed
- **THEN** the participant document has `kind: "EGRESS"` and `disconnectReason: "CLIENT_INITIATED"`

#### Scenario: Oneof by Go name
- **GIVEN** a legacy `EGRESS_STARTED` whose request is under `egress.Request.RoomComposite`
- **WHEN** it is replayed
- **THEN** the egress document has `type: "room_composite"` and a sanitized `request`

#### Scenario: ROOM_CREATED without room_id
- **GIVEN** a legacy `ROOM_CREATED` with `room.sid` and no `room_id`
- **WHEN** it is replayed
- **THEN** one `rooms` document with `_id` equal to `room.sid` exists

#### Scenario: Undecodable document
- **GIVEN** a legacy document whose `type` is unknown
- **WHEN** the batch is replayed
- **THEN** the document is skipped, `counts.skipped` increases, a warning carries its `_id` and the migration continues

### Requirement: Raw event identity
Edition: CE and PRO. A replayed legacy event SHALL be stored as a raw event whose `_id` is the legacy
`id` field (`AE_…`) when present and otherwise `AE_LEG_` followed by the legacy `_id`, so that a second
replay of the same document is a no-op; events of types not in `events.store_types` are projected but
not stored raw.

#### Scenario: Event with LiveKit id
- **GIVEN** a legacy event with `id: "AE_abc"`
- **WHEN** it is replayed twice
- **THEN** exactly one `events` document with `_id: "AE_abc"` exists and counters moved once

#### Scenario: Event without LiveKit id
- **GIVEN** a legacy event with string `_id` (md5) and no `id`
- **WHEN** it is replayed
- **THEN** the raw event `_id` is `AE_LEG_<md5>`

### Requirement: Fixer events become synthetic closures
Edition: CE and PRO. A legacy close event inserted by the active-entities fixer (ObjectId `_id`, no
`id`) SHALL not be projected as an authentic event: it SHALL close its entity through the reconciler's
closure routine at the fake event's timestamp with `closedBy: "reconciler"` and record a synthetic raw
event (`_id` `AE_SYN_` followed by the entity id). An authentic close event of the same entity SHALL override
the synthetic closure without counting it twice.

#### Scenario: Fake PARTICIPANT_LEFT
- **GIVEN** a legacy fake `PARTICIPANT_LEFT` for a participant whose `PARTICIPANT_ACTIVE` was replayed
- **WHEN** it is replayed
- **THEN** the participant has `status: "left"`, `closedBy: "reconciler"`, `disconnectReason: "RECONCILED"`, `leftAt` equal to the fake timestamp, and a raw event with `synthetic: true` and `payload.reconciler.reason: "legacy-fixer"` exists

#### Scenario: Fake EGRESS_ENDED claims COMPLETE
- **GIVEN** a legacy fake `EGRESS_ENDED` with `egress.status: "EGRESS_COMPLETE"`
- **WHEN** it is replayed
- **THEN** the egress is closed with `closedBy: "reconciler"` and the terminal status the reconciler uses for lost egresses, never `complete`

#### Scenario: Authentic close after fake close
- **GIVEN** a fake `ROOM_ENDED` and an authentic `ROOM_ENDED` for the same room
- **WHEN** both are replayed in any order
- **THEN** the room has `closedBy: "event"`, `endReason` from the authentic event and `endedAt` from it

### Requirement: Live events during the migration
Edition: CE and PRO. Live events SHALL be processed normally while the migration runs, and an entity
touched by both a replayed and a live event SHALL converge to the same document as if all events had
arrived live. Until the migration completes, the live reconciler SHALL not close candidates of nodes that never
wrote a heartbeat (legacy nodes), which the replay closes later.

#### Scenario: Room active across the upgrade
- **GIVEN** a room whose `ROOM_CREATED` and `PARTICIPANT_ACTIVE` are legacy and whose `PARTICIPANT_LEFT` and `ROOM_ENDED` arrive live during the replay
- **WHEN** the migration completes
- **THEN** one `rooms` document exists with `status: "closed"`, `closedBy: "event"`, `participants.sessions: 1` and `participants.active: 0`

#### Scenario: Live reconciler during the replay
- **GIVEN** a running migration, an open replayed legacy participant and a participant of a crashed node that wrote heartbeats
- **WHEN** the live reconciler runs
- **THEN** it closes the participant of the crashed node and leaves the legacy participant to the replay

### Requirement: Checkpoint and resume
Edition: CE and PRO. The checkpoint (`phase` and the last fully applied second of each collection) SHALL
be persisted after every batch; a restart, a lost lock or a failure SHALL leave a checkpoint from which
the next run resumes without reapplying any document. A non-transient error, or a transient one that persists
through five attempts, SHALL set `state: "failed"` with a clear `error`, and the next writer start SHALL retry from
the checkpoint.

#### Scenario: Killed mid-run
- **GIVEN** a migration killed after 40 % of the events
- **WHEN** the writer restarts
- **THEN** the replay resumes after the checkpointed second, no `track_stats` sample is duplicated and the final documents equal those of an uninterrupted run

#### Scenario: Database error
- **GIVEN** a MongoDB outage during a batch
- **WHEN** the batch fails five attempts in a row, spaced 1, 2, 4 and 8 s
- **THEN** `state` is `failed`, `error` names the failure and the checkpoint, and the next writer start retries from the checkpoint

#### Scenario: Transient error with progress
- **GIVEN** a phase that fails with a network error four times, applies more batches and fails again
- **WHEN** it is retried
- **THEN** the attempt count starts again after the progress and the migration keeps `state: "running"`

### Requirement: Stats replay
Edition: CE and PRO. Legacy `stats` SHALL be replayed after the events through the live stats pipeline,
producing `track_stats` documents and the same participant, room and rollup deltas the live writer
produces, in the configured stats mode.

#### Scenario: Legacy stat document
- **GIVEN** a legacy stat with `kind: "UPSTREAM"`, `time_stamp` as doubles and `streams[]` RTP totals
- **WHEN** it is replayed
- **THEN** a `track_stats` document exists with `ts` as a `Date`, `meta.kind: "up"`, normalized units and the participant's `bytes.up` includes its bytes

### Requirement: Post-replay steps
Edition: CE and PRO. After the stats phase the migration SHALL run the reconciler until a run is not partial and
closes nothing (at most 20 runs), drop `active_entities` and `last_alive`, record `legacyRetainedUntil` and mark
the migration `completed`; `legacy_events` and `stats` SHALL never be deleted by the migration.

#### Scenario: Open entities after the replay
- **GIVEN** a participant whose legacy `PARTICIPANT_LEFT` never existed and whose room is absent from LiveKit
- **WHEN** the post-replay reconciliation runs
- **THEN** the participant is `left` with `closedBy: "reconciler"` and a room still listed by LiveKit stays `active`

#### Scenario: Legacy collections afterwards
- **GIVEN** a completed migration
- **WHEN** the database is inspected
- **THEN** `active_entities` and `last_alive` do not exist, `legacy_events` and `stats` keep their documents and TTL indexes, and `legacyRetainedUntil` is set

### Requirement: Legacy data kept for rollback
Edition: CE and PRO. The migration SHALL only read `legacy_events` and `stats`, never changing their documents or
indexes, so that a legacy server (OpenVidu 3.9 or earlier) can be restored on the legacy data that has not expired
by its TTL.

#### Scenario: Rollback after the migration
- **GIVEN** a completed migration
- **WHEN** the operator stops the server, drops the analytics collections, renames `legacy_events` back to `events` and starts the legacy server
- **THEN** `events` and `stats` hold every legacy document whose `openvidu_expire_at` has not passed, with their original indexes

### Requirement: Observability
Edition: CE and PRO. The writer SHALL expose `openvidu_analytics_migration_state` (gauge: 0 none, 1 pending,
2 running, 3 completed, 4 failed), `openvidu_analytics_migration_processed_total{collection}` and
`openvidu_analytics_migration_batch_seconds` (batch duration histogram) and SHALL
log progress (processed, total, rate, estimated remaining time) at least every 30 s while running and
one line per state transition.

#### Scenario: Metrics during the run
- **GIVEN** a running migration
- **WHEN** the metrics endpoint is scraped
- **THEN** `openvidu_analytics_migration_state` is 2 and `openvidu_analytics_migration_processed_total` grows with the replay

### Requirement: Migration invariants
Edition: CE and PRO. After completion the analytics collections SHALL satisfy: one `rooms` document per distinct
legacy `room.sid`, one `participants` document per distinct legacy `participant_id`, one `egresses`
document per `egress_id`, one `ingress_sessions` document per `ingress.state.resource_id`, no secret
field copied, and durations of event-closed entities within 1 s of the legacy start/end difference.

#### Scenario: Invariants on a recorded snapshot
- **GIVEN** a legacy snapshot recorded from the local deployment
- **WHEN** the migration completes and the invariant checks run
- **THEN** every check passes and a second migration of the legacy events of the same snapshot leaves every document unchanged

### Requirement: Room-name search field on migrated egresses
Edition: CE and PRO. A migrated egress document SHALL carry `roomNameLower`, the lower-cased legacy room name, set by
the live egress projection that replays the legacy egress events; a legacy egress without a room name SHALL get
neither `roomName` nor `roomNameLower`. Node documents are not migrated.

#### Scenario: Legacy egress of a room
- **GIVEN** a legacy `EGRESS_STARTED` whose `egress.room_name` is `Demo-Room`
- **WHEN** it is replayed
- **THEN** the `egresses` document has `roomName: "Demo-Room"` and `roomNameLower: "demo-room"`

#### Scenario: Egress closed by a fixer event
- **GIVEN** a legacy egress of room `Demo-Room` whose only close event is a fake `EGRESS_ENDED` of the active-entities fixer
- **WHEN** the migration completes
- **THEN** the egress is closed by the reconciler and keeps `roomNameLower: "demo-room"` from its replayed `EGRESS_STARTED`

#### Scenario: Legacy web egress
- **GIVEN** a legacy web egress with empty `room_name`
- **WHEN** it is replayed
- **THEN** the `egresses` document has neither `roomName` nor `roomNameLower`
