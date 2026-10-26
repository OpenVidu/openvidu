# server-reconciler Specification

## Purpose
Closes rooms, participants, tracks, subscriptions, egress and ingress sessions that stay active in the
analytics store because their close events never arrived, using the store's own liveness signals and
LiveKit's live state, so the dashboard never shows entities that no longer exist.

## Requirements

### Requirement: Participant candidate detection
Edition: CE and PRO servers. The reconciler SHALL treat a participant session as a candidate when its
status is `active` and `lastStatsAt` is older than 3 × stats interval (90 s), or when it has no stats at
all and `activeAt` (or `joinedAt` when the session never became active) is older than the same period.

#### Scenario: Stats stopped
- **GIVEN** an `active` participant whose `lastStatsAt` is 100 s old
- **WHEN** a reconciler run starts
- **THEN** the participant is a candidate and `openvidu_analytics_reconciler_candidates{entity="participant"}` counts it

#### Scenario: Never received stats
- **GIVEN** an `active` participant with no `lastStatsAt` whose `activeAt` is 95 s old
- **WHEN** a reconciler run starts
- **THEN** the participant is a candidate

#### Scenario: Within the grace period
- **GIVEN** an `active` participant with no `lastStatsAt` whose `activeAt` is 40 s old
- **WHEN** a reconciler run starts
- **THEN** the participant is not a candidate

### Requirement: Room candidate detection
Edition: CE and PRO servers. The reconciler SHALL treat as a candidate an `active` room that received no stats for
3 × stats interval and either has no open participant session of a kind that keeps a room open (every kind but EGRESS
and AGENT, which LiveKit treats as dependent) and a `lastEventAt` older than its empty timeout plus 2 × reconciler
interval, or is hosted by a dead node and received no event for 3 × stats interval, whatever its open sessions.

#### Scenario: Empty room past its timeout
- **GIVEN** an `active` room with empty timeout 300 s, no active STANDARD participants and `lastEventAt` 7 minutes old
- **WHEN** a reconciler run starts
- **THEN** the room is a candidate

#### Scenario: Room kept open by a participant
- **GIVEN** an `active` room on an alive node with one `active` STANDARD participant and `lastEventAt` 20 minutes old
- **WHEN** a reconciler run starts
- **THEN** the room is not a candidate

#### Scenario: Room with only dependent participants
- **GIVEN** an `active` room whose only active participant has kind EGRESS and `lastEventAt` older than its empty timeout plus the grace
- **WHEN** a reconciler run starts
- **THEN** the room is a candidate

#### Scenario: Room of a dead node
- **GIVEN** an `active` room on a dead node, created 2 minutes ago with empty timeout 300 s, whose last stats flush and last event are 100 s old and whose only STANDARD participant is still `active`
- **WHEN** a reconciler run starts
- **THEN** the room is a candidate

#### Scenario: Room of an alive node within its timeout
- **GIVEN** an `active` room on an alive node with empty timeout 300 s and neither sessions, stats nor events for 2 minutes
- **WHEN** a reconciler run starts
- **THEN** the room is not a candidate

### Requirement: Egress and ingress session candidate detection
Edition: CE and PRO servers. The reconciler SHALL treat an egress or an ingress session as a candidate
only when it is still active, its room is `closed` in the store for longer than 2 × LiveKit cleanup
interval, and the room's node is dead; egress and ingress of active rooms or alive nodes are never
candidates.

#### Scenario: Egress of a closed room on a dead node
- **GIVEN** an `active` egress whose room is `closed` since 7 minutes with `nodeId` of a dead node
- **WHEN** a reconciler run starts
- **THEN** the egress is a candidate

#### Scenario: Egress of a closed room on an alive node
- **GIVEN** an `active` egress whose room is `closed` since 10 minutes on a node that wrote a batch 5 s ago
- **WHEN** a reconciler run starts
- **THEN** the egress is not a candidate and is left to the server-side reconciler

#### Scenario: Ingress session of an active room
- **GIVEN** an `active` ingress session whose room is `active`
- **WHEN** a reconciler run starts
- **THEN** the ingress session is not a candidate

### Requirement: Confirmation by node liveness
Edition: CE and PRO servers. A node SHALL be considered dead when `nodes.lastSeenAt` is older than 2 × writer batch
interval and LiveKit's node registry does not report it available. A participant session hosted by a dead node SHALL
be confirmed without the live listing. A room hosted by a dead node SHALL be confirmed when a trusted live listing does
not list it with its SID, or when its last signal is older than 2 × LiveKit cleanup interval.

#### Scenario: Node stopped writing batches
- **GIVEN** a candidate participant whose node has `lastSeenAt` 45 s old and is absent from LiveKit's node registry
- **WHEN** the candidate is checked
- **THEN** it is confirmed with reason `node-dead` even if the live listing still contains it

#### Scenario: Node alive by registry
- **GIVEN** a candidate participant whose node has `lastSeenAt` 45 s old but LiveKit's node registry reports it available
- **WHEN** the candidate is checked
- **THEN** the node is treated as alive and the live listing decides

#### Scenario: Room still held by LiveKit
- **GIVEN** a candidate room of a dead node whose last signal is 2 minutes old and that a trusted live listing still lists with its SID, before LiveKit's dead node cleanup removed it
- **WHEN** the candidate is checked
- **THEN** it is not confirmed, it stays `active` and a debug log line names it

#### Scenario: Room removed by the dead node cleanup
- **GIVEN** the same room after LiveKit's dead node cleanup removed it, so that the trusted live listing no longer lists its SID
- **WHEN** the next run checks it
- **THEN** it is confirmed with reason `node-dead`

#### Scenario: Room recreated with another SID
- **GIVEN** a candidate room of a dead node and a trusted live listing that lists a room with the same name and another SID
- **WHEN** the candidate is checked
- **THEN** it is confirmed with reason `node-dead`

#### Scenario: Room never removed by the cleanup
- **GIVEN** a candidate room of a dead node with the default cleanup interval of 3 minutes, whose last signal is 7 minutes old and that the live listing still lists or cannot be read
- **WHEN** the candidate is checked
- **THEN** it is confirmed with reason `node-dead`

#### Scenario: Untrusted listing
- **GIVEN** a candidate room of a dead node whose last signal is 2 minutes old and a live listing that returns an error
- **WHEN** the run executes
- **THEN** the room stays `active` and the participant sessions of the dead node are still closed

### Requirement: Confirmation by live state when the node is alive
Edition: CE and PRO servers. When a candidate's node is alive, the reconciler SHALL confirm it only if the
entity is absent from LiveKit's live listing (rooms and participants read through the shared store) on
two consecutive runs; a candidate present in the listing SHALL be kept and logged.

#### Scenario: Absent twice
- **GIVEN** a candidate participant whose node is alive and which is absent from the live listing in two consecutive runs
- **WHEN** the second run checks it
- **THEN** it is confirmed with reason `absent-live`

#### Scenario: Absent once
- **GIVEN** a candidate participant whose node is alive and which was absent from the live listing for the first time in this run
- **WHEN** the run ends
- **THEN** the participant is still `active`

#### Scenario: Present in live state
- **GIVEN** a candidate participant whose node is alive and which is listed in the live state
- **WHEN** the candidate is checked
- **THEN** it is not closed and a warning names the participant and its stale `lastStatsAt`

### Requirement: Untrusted live listing
Edition: CE and PRO servers. A live listing SHALL be untrusted and confirm nothing when reading it fails,
or when it lists no room while the store has active rooms on alive nodes (the state right after a Redis
restart). Observations from an untrusted listing SHALL not count towards consecutive absences.

#### Scenario: Redis error
- **GIVEN** candidates whose nodes are alive and a live listing that returns an error
- **WHEN** the run executes
- **THEN** no entity is closed, `openvidu_analytics_reconciler_runs_total{result="live-state-error"}` increases and the next run starts the absence count from zero

#### Scenario: Empty listing after a Redis restart
- **GIVEN** a Redis restart that wiped the room state while the store has active rooms on alive nodes
- **WHEN** the next run executes
- **THEN** the listing is treated as untrusted and no entity is closed

### Requirement: Fresh stats veto
Edition: CE and PRO servers. The reconciler SHALL never close an entity whose `lastStatsAt` is within the
last stats interval at closure time, re-reading the document immediately before closing it.

#### Scenario: Stats arrive between detection and closure
- **GIVEN** a confirmed candidate participant
- **WHEN** a stats flush updates its `lastStatsAt` before the closure is written
- **THEN** the closure is skipped and the participant stays `active`

#### Scenario: Healthy entities during a Redis restart
- **GIVEN** connected participants that keep sending stats every 30 s while Redis is restarted
- **WHEN** reconciler runs execute during the following 4 minutes
- **THEN** none of them is closed

### Requirement: Participant closure cascade
Edition: CE and PRO servers. Closing a participant session SHALL set its tracks still `published` to
`unpublished` and the open subscriptions to those tracks, and the participant's own open subscriptions, to
`unsubscribed`, all with the participant's end time and `closedBy: "reconciler"`.

#### Scenario: Publisher with subscribers
- **GIVEN** a confirmed participant with two published tracks subscribed by three other participants
- **WHEN** it is closed
- **THEN** the participant is `left`, its two tracks are `unpublished` with `unpublishedAt = leftAt`, the six subscriptions are `unsubscribed` with `unsubscribedAt = leftAt`, and all carry `closedBy: "reconciler"`

#### Scenario: Session that never became active
- **GIVEN** a confirmed candidate with status `joining`
- **WHEN** it is closed
- **THEN** its status is `aborted` with `disconnectReason: "RECONCILED"`

### Requirement: Room closure cascade
Edition: CE and PRO servers. Closing a room SHALL close its participant sessions still open (`active` or
`joining`) with the room's end time, applying the participant cascade to each of them.

#### Scenario: Room with a stale dependent participant
- **GIVEN** a confirmed room with one `active` EGRESS participant
- **WHEN** it is closed
- **THEN** the room is `closed` with `endReason: "RECONCILED"` and the participant is `left` with `leftAt = endedAt` and `disconnectReason: "RECONCILED"`

### Requirement: Rooms of a dead node close with their last session
Edition: CE and PRO servers. A confirmed room of a dead node SHALL be closed in the same run as the closures that leave
it without an open session of a kind that keeps a room open, after them, with reason `node-dead` and its last signal
as end time, so that it never ends before its sessions; a session the run does not close SHALL keep the room open until
a later run.

#### Scenario: Closed with its last session
- **GIVEN** a node killed while hosting a room created 2 minutes earlier with two STANDARD participants, and LiveKit's dead node cleanup already removed the room
- **WHEN** the run that closes both participants executes
- **THEN** in the same run the room is `closed` with `endReason: "RECONCILED"`, `closedBy: "reconciler"`, reason `node-dead` in its closure log and synthetic event, and `endedAt` equal to the later `leftAt` of the two participants

#### Scenario: Closure limit reached before the last session
- **GIVEN** a confirmed room of a dead node with three open STANDARD sessions and `reconciler.max_closures_per_run: 2`
- **WHEN** runs execute
- **THEN** the first run closes two sessions, leaves the room `active` and is recorded as partial, and the follow-up run closes the third session and the room

#### Scenario: Closed after the dead node cleanup
- **GIVEN** a room of a dead node whose sessions a previous run closed while LiveKit still listed the room
- **WHEN** the first run after the dead node cleanup removed it executes
- **THEN** the room is `closed` with `endedAt` equal to the `leftAt` of its last session, not the time of the run

### Requirement: Closure fields
Edition: CE and PRO servers. A closure SHALL set the terminal status, `closedBy: "reconciler"`, `endReason`
or `disconnectReason` `RECONCILED`, the end time `max(lastStatsAt, lastEventAt)` of the closed entity
(cascaded entities inherit it), `durationMs`, and `expiresAt` from the retention of its class (`retention.tracks`
for tracks and subscriptions, `retention.entities` otherwise).

#### Scenario: End time from the last signal
- **GIVEN** a confirmed participant with `lastStatsAt` 10:00:30 and `lastEventAt` 10:00:05
- **WHEN** it is closed
- **THEN** `leftAt` is 10:00:30, `durationMs = leftAt - joinedAt` and `expiresAt = leftAt + retention.entities`

#### Scenario: Bounded timestamp error
- **GIVEN** a node killed at T while its participants had stats flushed at most 30 s earlier
- **WHEN** the reconciler closes them
- **THEN** every `leftAt` is within 30 s of T

#### Scenario: Cascaded tracks expire with the tracks retention
- **GIVEN** a confirmed participant with one published track and `retention.tracks: 168h`
- **WHEN** it is closed
- **THEN** the track has `expiresAt = unpublishedAt + 168h` and the participant `expiresAt = leftAt + retention.entities`

### Requirement: Synthetic raw event per closure
Edition: CE and PRO servers. Every closure, including cascaded ones, SHALL insert exactly one raw event of
the matching close type with `synthetic: true`, `_id` prefixed `AE_SYN_` and derived from the entity id,
the entity's lifted references and the closure reason in its payload.

#### Scenario: Participant closure event
- **GIVEN** a participant closed by the reconciler
- **WHEN** `events` is queried by its `participantSid`
- **THEN** one `PARTICIPANT_LEFT` document exists with `synthetic: true`, `_id: "AE_SYN_PA_…"`, `ts = leftAt`, `payload.participant.disconnect_reason: "RECONCILED"` and the closure reason in `payload.reconciler.reason`

#### Scenario: Closure repeated
- **GIVEN** a closure already recorded
- **WHEN** the same closure is applied again
- **THEN** no second synthetic event exists

### Requirement: Counters and rollups once per closure
Edition: CE and PRO servers. Closures SHALL update room and participant counters and the rollups through
the writer's idempotent projections, exactly once per entity; a real close event that arrives after a
synthetic closure SHALL replace the reconciler's end time, reason and `closedBy` without counting the
closure twice.

#### Scenario: Room counters after a cascade
- **GIVEN** a room with three active participants of which two are closed by the reconciler
- **WHEN** the room document is read
- **THEN** `participants.active` is 1 and `analytics_hourly` counts two `left` participants with reason `RECONCILED`

#### Scenario: Late real close event
- **GIVEN** a participant closed by the reconciler
- **WHEN** its real `PARTICIPANT_LEFT` is processed later
- **THEN** `leftAt`, `disconnectReason` and `closedBy: "event"` come from the real event, the status stays `left` and the rollup `left` counter is unchanged

### Requirement: Lost egress and ingress representation
Edition: CE and PRO servers. Egress and ingress lost with their node SHALL be closed by the real
`EGRESS_ENDED (FAILED)` and `INGRESS_ENDED` events of the server-side reconciler, projected as `failed`
and `error`; the store reconciler SHALL close only candidate egress and ingress sessions, always as
`failed` or `error`, never `complete`.

#### Scenario: Egress lost after the room is gone
- **GIVEN** an egress whose handler died and whose room was deleted
- **WHEN** the server-side reconciler emits `EGRESS_ENDED` with status FAILED and error "egress lost"
- **THEN** the egress document has `status: "failed"`, `error` from the event and `closedBy: "event"`

#### Scenario: Store fallback for an egress
- **GIVEN** a candidate egress (room closed for more than 2 × cleanup interval, node dead)
- **WHEN** the reconciler closes it
- **THEN** it has `status: "failed"`, `error: "egress lost (reconciled)"`, `closedBy: "reconciler"`, `endedAt = max(room.endedAt, egress.updatedAt)` and a synthetic `EGRESS_ENDED` event exists

#### Scenario: Store fallback for an ingress session
- **GIVEN** a candidate ingress session
- **WHEN** the reconciler closes it
- **THEN** it has `status: "error"`, `closedBy: "reconciler"` and its ingress document reflects the ended session

### Requirement: Leader-only periodic runs
Edition: CE and PRO servers. Runs SHALL execute on one node at a time, chosen by a Redis lock
(`analytics-reconciler-lock`, or the local mutex without Redis), every `reconciler.interval` (default 60 s); a lock lost
in a Redis restart SHALL be re-acquired without manual intervention.

#### Scenario: Two nodes
- **GIVEN** two server nodes with analytics enabled
- **WHEN** 5 minutes pass
- **THEN** `schema_meta` (`_id: "reconciler"`) shows about five runs and every `lastRunAt` comes from a single node at a time

#### Scenario: Redis restart
- **GIVEN** a leader holding the lock
- **WHEN** Redis restarts
- **THEN** within 2 × `reconciler.interval` a node holds the lock again and runs resume

### Requirement: Reconciler switch
Edition: CE and PRO servers. With `openvidu.analytics.reconciler.enabled: false` (default `true`) a node SHALL skip
the periodic and startup runs and SHALL log at startup that entities whose end event is lost stay open; the legacy
migration still runs its own post-replay reconciliation.

#### Scenario: Reconciler disabled
- **GIVEN** `reconciler.enabled: false` and a participant of a crashed node still `active` in the store
- **WHEN** 5 minutes pass
- **THEN** the participant is still `active`, `schema_meta` has no new `reconciler` run, no daily `uniqueIdentities` is set and the startup log says that lost entities stay open

### Requirement: Daily unique identities
Edition: CE and PRO servers. After its closures, within its time budget, each run SHALL set `uniqueIdentities` on
the daily rollups (global and per node: distinct identities of the STANDARD sessions that joined that UTC day) of up
to 7 days whose global document lacks it, from 5 minutes after the day closes and only for days inside the entities
retention; a node scope without sessions that day gets 0.

#### Scenario: Day closed
- **GIVEN** a global daily document of yesterday without `uniqueIdentities`, STANDARD sessions of `alice` twice and `bob` on node `n1`, and `carol` on node `n2`
- **WHEN** a run executes after 00:05 UTC today
- **THEN** the global document has `uniqueIdentities: 3`, `node:n1` 2 and `node:n2` 1

#### Scenario: Day just closed
- **GIVEN** a run at 00:03 UTC
- **WHEN** it evaluates the previous day
- **THEN** that day's `uniqueIdentities` is not set yet

### Requirement: Startup run
Edition: CE and PRO servers. A node SHALL execute one run right after the writer finishes initializing
the database (collections and indexes present), subject to the same lock, so a restarted single node
closes the sessions of its previous incarnation without waiting a full interval.

#### Scenario: Single node restarted after a long outage
- **GIVEN** a single node that was down for 10 minutes with 5 active participants in the store
- **WHEN** it starts
- **THEN** the 5 participants are closed within `reconciler.interval` of the start

### Requirement: Idempotent and bounded runs
Edition: CE and PRO servers. A run SHALL be idempotent, SHALL close at most
`openvidu.analytics.reconciler.max_closures_per_run` entities (default 500) within the lock's time budget, and when
the limit or the budget is reached SHALL record the run as partial and continue after 5 s instead of waiting a full
interval.

#### Scenario: Run repeated
- **GIVEN** a run that closed 10 entities
- **WHEN** the same run executes again on the same data
- **THEN** no document changes and `openvidu_analytics_reconciler_closed_total` is unchanged

#### Scenario: Mass crash
- **GIVEN** 1 200 confirmed candidates
- **WHEN** runs execute
- **THEN** the first run closes 500, records `partial: true`, and the remainder is closed by follow-up runs within 2 minutes

### Requirement: Metrics
Edition: CE and PRO servers. The node SHALL expose `openvidu_analytics_reconciler_runs_total{result}`,
`openvidu_analytics_reconciler_closed_total{entity}`, `openvidu_analytics_reconciler_candidates{entity}` and
`openvidu_analytics_reconciler_run_duration_seconds` on its Prometheus endpoint, with `entity` in room,
participant, track, subscription, egress, ingress_session.

#### Scenario: After a closure
- **GIVEN** a run that closed one participant with one track and two subscriptions
- **WHEN** the metrics endpoint is scraped
- **THEN** `openvidu_analytics_reconciler_closed_total{entity="participant"}` is 1, `{entity="track"}` 1, `{entity="subscription"}` 2 and `openvidu_analytics_reconciler_runs_total{result="ok"}` increased by 1

### Requirement: Last run record
Edition: CE and PRO servers. Every run SHALL upsert `schema_meta` (`_id: "reconciler"`) with
`lastRunAt`, `lastRunDurationMs`, `nodeId`, `candidates` and `closed` counts per entity, `partial`, and
`lastError` when the run failed.

#### Scenario: Record of a run
- **GIVEN** a completed run
- **WHEN** `schema_meta` is read
- **THEN** the `reconciler` document has the counts of that run and `lastRunAt` within the last `reconciler.interval`

### Requirement: Structured closure logs
Edition: CE and PRO servers. Every closure SHALL emit one structured log line with the entity type and
id, room, node, reason (`node-dead`, `absent-live`, `cascade`, `room-closed-node-dead`), `lastStatsAt`,
`lastEventAt` and the end time written; kept candidates SHALL be logged at debug level.

#### Scenario: Closure log
- **GIVEN** a participant closed with reason `node-dead`
- **WHEN** the server log is read
- **THEN** one line contains the participant sid, its room sid, its node id, `reason=node-dead` and the `leftAt` written
