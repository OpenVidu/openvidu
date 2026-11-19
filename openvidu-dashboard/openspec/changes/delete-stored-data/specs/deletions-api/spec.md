# Spec Delta

## Purpose

Lets the administrator delete stored analytics data by class, or all of it, through one background job at a time,
keeping the data in progress, and records the outcome of each class for the UI and for extending editions.

## ADDED Requirements

### Requirement: Start a deletion
Edition: CE. With a valid bearer token `POST /api/v1/deletions` SHALL take `{ class, includeLegacy? }`, `class` one of
`events`, `stats`, `tracks`, `entities`, `rollups-5min`, `rollups-hourly`, `rollups-daily`, `all` and `legacy`, and
`includeLegacy` only with `all`; it SHALL answer `202` with the job it starts, whose cutoff is the moment it accepted
the request, and run the job in the background, independently of the client.

#### Scenario: Events deletion accepted
- **GIVEN** no deletion running
- **WHEN** the client sends `POST /api/v1/deletions` with `{ class: "events" }` and a valid token
- **THEN** the response is `202` with a job of class `events`, `state: "running"`, `cutoff` and `startedAt` equal to
  the acceptance time, `deleted: 0` and its collection counter, and the job keeps running after the client disconnects

#### Scenario: Legacy flag outside Total
- **WHEN** the client sends `{ class: "events", includeLegacy: true }`
- **THEN** the response is `400` `VALIDATION_ERROR` with an issue for `["includeLegacy"]` and no job starts

#### Scenario: Deletion without a token
- **WHEN** the client sends `POST /api/v1/deletions` without `Authorization`
- **THEN** the response is `401` `UNAUTHORIZED` and no job starts

### Requirement: One deletion at a time
Edition: CE. At most one deletion job SHALL run across every dashboard instance sharing the database; a request while
one runs SHALL answer `409` `CONFLICT` with the message "A deletion is already running" and the running job in
`details.job`, and start nothing.

#### Scenario: Second deletion refused
- **GIVEN** an Events deletion running
- **WHEN** the client asks for a Stats deletion
- **THEN** the response is `409` `CONFLICT` with "A deletion is already running" and `details.job.class: "events"`

#### Scenario: Refused on another instance
- **GIVEN** two dashboard instances on one database and an Entities deletion started on the first
- **WHEN** the client asks the second for a Total deletion
- **THEN** the second answers `409` `CONFLICT` and only the Entities job runs

### Requirement: Legacy deletion window
Edition: CE. A deletion of `legacy`, or of `all` with `includeLegacy`, SHALL be accepted only while the migration has
completed and its `legacyRetainedUntil` is later than the request, and SHALL drop `legacy_events` and `stats`; outside
that window it SHALL answer `409` `CONFLICT` with "The data before 3.10 is not kept for rollback" and start nothing.

#### Scenario: Legacy dropped during the rollback window
- **GIVEN** a completed migration with `legacyRetainedUntil` tomorrow, `legacy_events` and `stats`
- **WHEN** the client asks for a `legacy` deletion and the job ends
- **THEN** neither collection exists, the `storage` of the info document reports neither and no other collection lost
  a document

#### Scenario: Legacy refused while the migration runs
- **GIVEN** a running migration
- **WHEN** the client asks for a `legacy` deletion, or for `all` with `includeLegacy`
- **THEN** the response is `409` `CONFLICT` and nothing is dropped

#### Scenario: Legacy refused after its window
- **GIVEN** a completed migration whose `legacyRetainedUntil` passed an hour ago
- **WHEN** the client asks for a `legacy` deletion
- **THEN** the response is `409` `CONFLICT`

### Requirement: Data kept by every deletion
Edition: CE. A deletion SHALL keep rooms in progress with all their data (sessions, ended ones included, tracks,
subscriptions, events, stats, egresses, ingress sessions), open egresses and ingress sessions, ingress definitions not
deleted, every `nodes` document, every document recorded or ended in the 5 minutes before the cutoff, and every
document of what was in progress at the cutoff, even if it ends while the job runs.

#### Scenario: Room in progress kept whole
- **GIVEN** a room in progress with one active and one ended session, their tracks, subscriptions, events and stats,
  and an ended egress of that room
- **WHEN** an Entities deletion runs
- **THEN** every one of those documents still exists

#### Scenario: Recent data kept
- **GIVEN** a room that ended 3 minutes before the cutoff, an event of another ended room recorded 4 minutes before it
  and a room that ended 6 minutes before it
- **WHEN** an Entities deletion runs
- **THEN** the first room with its data and the event exist and the room ended 6 minutes before is gone

#### Scenario: Open entities without a room kept
- **GIVEN** an active web egress, a publishing ingress session and a reusable ingress not deleted whose last session
  ended 200 days ago
- **WHEN** an Entities deletion runs
- **THEN** all three exist with their events

#### Scenario: Nodes never deleted
- **GIVEN** a stopped server node and a node not seen for 30 days
- **WHEN** a Total deletion runs
- **THEN** both `nodes` documents exist

#### Scenario: Room ending during the job
- **GIVEN** a room in progress at the cutoff with an ended session
- **WHEN** the room ends while a long Entities deletion runs
- **THEN** the room and its session still exist when the job ends

#### Scenario: Data after the cutoff untouched
- **GIVEN** an Events deletion running
- **WHEN** a room starts and ends while it runs
- **THEN** that room's events still exist when the job ends

### Requirement: Detail class deletions
Edition: CE. Deleting `events` SHALL remove the `events` documents, `stats` the `track_stats` documents, and `tracks`
the `tracks` and `track_subscriptions` documents and the `track_stats` documents written per track (those with a track
id), whatever the server's stats detail; none of them SHALL touch the entity documents, and `tracks` SHALL leave the
stats written per participant.

#### Scenario: Events deletion leaves entities
- **GIVEN** an ended room with 40 events, 120 stats documents and 6 tracks
- **WHEN** an Events deletion runs
- **THEN** the room, its sessions, stats and tracks exist and none of its events does

#### Scenario: Per-track stats go with the tracks
- **GIVEN** an ended room with 4 tracks, 80 stats documents with a track id and 30 without one
- **WHEN** a Tracks and subscriptions deletion runs
- **THEN** its tracks, subscriptions and the 80 stats documents are gone, and the 30 stats documents and the room exist

### Requirement: Entities deletion cascade
Edition: CE. Deleting `entities` SHALL remove the `rooms`, `participants`, `egresses`, `ingress_sessions` documents
that ended and the deleted ingress definitions, together with every `events`, `track_stats`, `tracks` and
`track_subscriptions` document that does not belong to what is kept, so that running it again after an interruption
deletes what remains.

#### Scenario: Entities with their data
- **GIVEN** an ended room with 3 sessions, 5 tracks, 9 subscriptions, 60 events, 200 stats documents and an ended
  egress, and an ingress deleted 10 days ago with an ended session
- **WHEN** an Entities deletion runs
- **THEN** none of those documents remains

#### Scenario: Entities deletion run again
- **GIVEN** an Entities deletion interrupted after it deleted the events and the stats of ended rooms
- **WHEN** a new Entities deletion runs
- **THEN** the tracks, subscriptions, sessions and rooms of the ended rooms are gone and the kept data exists

### Requirement: Rollup class deletions
Edition: CE. Deleting a rollup class SHALL remove the documents of its collection, every scope, whose bucket starts
before the previous bucket of the cutoff: before the 5 minutes preceding the current 5-minute bucket, the hour
preceding the current hour, or the UTC day preceding the current day; no other class deletion SHALL touch the
rollups.

#### Scenario: Rollup buckets kept at 10:07
- **GIVEN** a cutoff at 10:07 UTC on 2026-11-19 and rollups of every bucket of the last three days in the global and
  a node scope
- **WHEN** the three rollup classes are deleted
- **THEN** only the 5-minute buckets of 10:00 and 10:05, the hourly buckets of 09:00 and 10:00 and the daily buckets
  of 2026-11-18 and 2026-11-19 remain, in both scopes

#### Scenario: Entities deletion keeps rollups
- **GIVEN** hourly rollups of the last 30 days
- **WHEN** an Entities deletion runs
- **THEN** every rollup document exists

### Requirement: Total deletion
Edition: CE. Deleting `all` SHALL run the deletions of every class in one job, each with its own rules, detail classes
before entities and rollups after them, and, with `includeLegacy`, drop the legacy collections last.

#### Scenario: Total without legacy
- **GIVEN** a completed migration kept for rollback and data in every class
- **WHEN** a Total deletion without `includeLegacy` runs
- **THEN** every class is deleted by its rules and `legacy_events` and `stats` keep their documents

#### Scenario: Total with legacy
- **GIVEN** a completed migration kept for rollback
- **WHEN** a Total deletion with `includeLegacy: true` runs
- **THEN** every class is deleted by its rules and `legacy_events` and `stats` no longer exist

### Requirement: Deletion pace
Edition: CE. A job SHALL delete about 5,000 documents per batch (a statistics batch bounded by time can exceed it when
documents share the bound's timestamp) and wait 100 ms between batches, one collection at a time, so that the server's
writes keep their pace.

#### Scenario: Batches of a large collection
- **GIVEN** 12,000 events to delete
- **WHEN** an Events deletion runs
- **THEN** it deletes them in three batches of at most 5,000 documents with at least 100 ms between two batches

### Requirement: Deletion job in the status
Edition: CE. `GET /api/v1/status` SHALL report the latest job, when any exists, as `deletion` with its `id`, `class`,
`includeLegacy`, `state` (`running`, `completed`, `interrupted` or `failed`), `cutoff`, `startedAt`, `finishedAt?`,
`currentClass?`, `deleted` (documents deleted by the whole job), `collection { index, total }` and `error?`, read from
`schema_meta` only.

#### Scenario: Status of a running job
- **GIVEN** an Entities job that deleted 1,234,000 documents and works on its second of five collections
- **WHEN** the client requests the status
- **THEN** `deletion` has `class: "entities"`, `state: "running"`, `deleted: 1234000` and
  `collection: { index: 2, total: 5 }`

#### Scenario: Status without any job
- **GIVEN** no deletion ever ran
- **WHEN** the client requests the status
- **THEN** the response has no `deletion` property

### Requirement: Interrupted deletion
Edition: CE. A running job SHALL record a heartbeat every 10 s; a job whose heartbeat is older than 60 s SHALL read
`interrupted`, free the lock and keep what it deleted, and a dashboard instance that restarts SHALL mark the job it was
running `interrupted` at once. A new deletion then takes a new cutoff.

#### Scenario: Instance gone mid-job
- **GIVEN** an Events job whose instance stopped 61 s after its last heartbeat, having deleted 400,000 documents
- **WHEN** the client requests the status
- **THEN** `deletion.state` is `interrupted` with `deleted: 400000`, and a new deletion request answers `202`

#### Scenario: Instance restarted mid-job
- **GIVEN** an instance restarted while it ran a Stats job
- **WHEN** it has started again
- **THEN** the status reports the Stats job `interrupted` without waiting 60 s

### Requirement: Failed deletion
Edition: CE. A job that cannot go on SHALL read `failed` with `error` "The database user cannot delete data" when the
database refuses the delete for lack of rights, and "A database error stopped it" for any other failure that three
retries of the batch did not overcome, keeping what it deleted and logging the cause.

#### Scenario: Database user without delete rights
- **GIVEN** a database user that may read but not delete
- **WHEN** an Events deletion runs
- **THEN** the status reports it `failed` with `error: "The database user cannot delete data"` and `deleted: 0`

### Requirement: Last deletion of each class
Edition: CE. `GET /api/v1/info` SHALL carry `deletions`, keyed by class (`events` … `rollups-daily`), each with
`completed? { cutoff, endedBefore, finishedAt }` (`endedBefore` = cutoff − 5 min) and `incomplete? { state, at }` when
a later job of that class did not complete it. A class is completed when its last collection is done; a Total job
records every class; an Entities job also records `events`, `stats` and `tracks`.

#### Scenario: Completed Events deletion in info
- **GIVEN** an Events job with cutoff 10:07:00 UTC that completed at 10:31:12 UTC
- **WHEN** the client requests the info document
- **THEN** `deletions.events.completed` is `{ cutoff: "…T10:07:00.000Z", endedBefore: "…T10:02:00.000Z",
  finishedAt: "…T10:31:12.000Z" }` and no other class has an entry

#### Scenario: Interrupted Total in info
- **GIVEN** a Total job that completed Events and Stats and was interrupted during Tracks and subscriptions at 10:20
- **WHEN** the client requests the info document
- **THEN** `deletions.events` and `deletions.stats` have `completed`, and `deletions.tracks`, `deletions.entities`
  and the three rollup classes have `incomplete: { state: "interrupted", at }` with the time of its last heartbeat

#### Scenario: Entities records its details
- **GIVEN** an Entities job that completed
- **WHEN** the client requests the info document
- **THEN** `deletions.entities`, `deletions.events`, `deletions.stats` and `deletions.tracks` have the same
  `completed`

### Requirement: Figures refreshed after a deletion
Edition: CE. When a job completes a class, every dashboard instance SHALL drop its cached storage figures and its
cached Analytics folds at its next status or info read, so that no figure older than the completion is served after
that read.

#### Scenario: Storage refreshed on another instance
- **GIVEN** two instances whose storage figures were cached 10 s ago, and an Events job that completes on the first
- **WHEN** the second answers its next info request
- **THEN** `storage.events.documents` is the count after the deletion

### Requirement: Deletion log
Edition: CE. The instance running a job SHALL log one line when it starts and one when it ends, with the class,
`includeLegacy`, cutoff, final state, documents deleted per collection and the request id of the request that started
it.

#### Scenario: Log lines of a deletion
- **GIVEN** an Events deletion requested with `X-Request-Id: caddy-7f3a`
- **WHEN** it completes after deleting 1,250,312 events
- **THEN** the log has a start line and an end line, both with `caddy-7f3a`, the class `events`, and the end line has
  `state: "completed"` and `events: 1250312`
