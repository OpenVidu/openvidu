# Spec Delta

## ADDED Requirements

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

#### Scenario: Generated rooms in progress end within 30 minutes
- **GIVEN** a database generated at T with ten or more rooms in progress
- **WHEN** ticks run until T + 35 minutes
- **THEN** each of those rooms is closed with an `endedAt` at or before T + 30 minutes plus its departure timeout, and
  no STANDARD session of them that joined before T left after that instant

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
