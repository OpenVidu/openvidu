# Data generator

Fills a MongoDB database with analytics data that follows the data model contract of `@openvidu-dashboard/typings`: a
deterministic scenario S, M or L over a number of days ending now. The backend integration tests use it for their query
plan and latency checks, and `./dashboard.sh demo` uses it for the local demo database.

Before inserting, `src/schema.ts` creates every collection, index and TTL of the contract and gives the plain
collections the contract validator with `validationAction: error`, so a document that drifts from the contract fails
the run (`track_stats` takes no validator as a time-series collection). `src/contract.ts` turns each model document
into its stored shape: the model's bookkeeping removed, absent fields omitted and every number in the BSON type its
schema declares.

The package is also a library for the backend integration tests (`dashboard-ce/backend/test/`): `./generator`
(`generate(db, options)`), `./context` (`queryContext(db)`: the data range and sample identifiers), `./plan` (explain
summaries used by the `expectIndexBacked` harness) and `./schema` (`createCollections()`).

Requirements: the workspace installed (`./dashboard.sh install`), a reachable MongoDB (8.x; time-series
collections are used when the server accepts them) and a user allowed to create and drop the target
database. Run the commands from this directory.

## Usage

```sh
pnpm generate --uri "$MONGO_URI" --db ov_data_s --scenario S --days 30 --drop
pnpm generate --uri "$MONGO_URI" --db ov_data_m --scenario M --days 7 --drop
pnpm generate --uri "$MONGO_URI" --db ov_data_l --scenario L --days 1 --drop --stats-mode track
```

| Option                              | Default       | Meaning                                                                                                                |
| ----------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--uri`, `--db`                     | required      | Connection string and target database                                                                                  |
| `--scenario S\|M\|L`                | required      | Rooms per day, sessions per day and average room size (table below)                                                    |
| `--days <n>`                        | required      | Days of history ending now                                                                                             |
| `--stats-mode participant\|track`   | `participant` | One `track_stats` document per participant and direction, or per track                                                 |
| `--seed <n>`                        | `1`           | Seed of the pseudo-random generator (mulberry32); same seed, same data                                                 |
| `--retention-events-days <n>`       | `7`           | Only raw events inside this window are written (TTL index on `ts`)                                                     |
| `--retention-stats-days <n>`        | `7`           | Only stats inside this window are written (`expireAfterSeconds`)                                                       |
| `--retention-tracks-days <n>`       | `7`           | `expiresAt` of tracks and subscriptions; expired ones are not written                                                  |
| `--retention-entities-days <n>`     | `90`          | `expiresAt = closedAt + retention` on closed entities, `deletedAt + retention` on deleted ingresses                    |
| `--retention-rollups-5min-days <n>` | `7`           | Only 5-minute rollups inside this window are written (TTL index on `bucket`)                                           |
| `--drop`                            | off           | Drop the database first                                                                                                |
| `--plain-stats`                     | off           | Force the plain-collection fallback for `track_stats`                                                                  |
| `--five-minute-rollups`             | off           | Write `analytics_5min` inside the 5-minute rollup window                                                               |
| `--node-rollups`                    | off           | With `--media-nodes` (rejected without it): write the `node:<label>` scope beside `global` in every rollup             |
| `--room-sums`                       | off           | At room end, write the room sums and the topology, recording and size range counters                                   |
| `--active-window <minutes>`         | off           | Rooms created in the last minutes stay active (two of three); without it, the most recent 10 % of the rooms are active |
| `--min-active-rooms <n>`            | 0             | With `--active-window`: rooms added to the window when the hour of day leaves fewer than `n` active rooms              |
| `--nodes-without-media-stats <n>`   | 0             | 0 or 1. With 1, the mediasoup machine runs an earlier version without media statistics until the upgrade (see Output)  |
| `--media-nodes`                     | off           | A multi-node deployment (Elastic or HA): seven media nodes and ten servers; without it, a single node (see Output)     |
| `--legacy`                          | off           | The legacy collections of the writer before 3.10 and a completed migration (see Output)                                |

| Scenario | Rooms per day | Sessions per day | Average room size |
| -------- | ------------- | ---------------- | ----------------- |
| S        | 200           | 1 000            | 4                 |
| M        | 2 000         | 20 000           | 6                 |
| L        | 5 000         | 50 000           | 8                 |

What it writes (`analytics_5min` stays empty without `--five-minute-rollups`):

- `rooms`: created over the days with a diurnal curve (office-hours peak); the most recent 10 % are
  `active`, the rest `closed` with `endReason` and `closedBy`; 3 % of the closed ones were never joined. Id arrays
  and counters (`participantSids`, `activeParticipantSids`, `identities`, `participants.*`, `trackSids`, `egressIds`,
  `ingressSessionIds`, `features`) are derived from the generated entities; participant counters count STANDARD
  sessions and `byKind` every kind, as the writer does (also in the rollups). `participants.peakPublishers`,
  `topology` and `features.recording` follow the writer's rules: a separate seeded stream picks, by the size of the
  room, which participants send media (an unmuted track) and which publish nothing or tracks muted for good, as
  OpenVidu Meet does; scenario S over 7 days gives about 61 % N:M, 14 % 1:1, 9 % single participant, 8 % 1:N, 5 % no
  publishers and 3 % empty rooms. The 3 % of rooms closed by the reconciler (`absent-live`) stopped reporting while
  sessions were still in them: those sessions, and their tracks, subscriptions, egresses and ingress sessions, are
  closed by the reconciler at that instant, with its synthetic events (`AE_SYN_<id>`) and no closing event of their
  own. Each room is hosted on a server taking rooms at its creation (see `nodes`), an active room only on a server
  alive at the end, and ends with its server when still open then: at a graceful stop with `SERVER_SHUTDOWN`, beside
  the 2 % of rooms that keep that reason anyway, and at a lost server's last heartbeat closed by the reconciler
  (`node-dead`). Each server lost inside the range also hosts one room created 10 minutes before it stops taking
  rooms and held open until its silence. Nobody joins a room once it has ended: when a room ends before its participants leave, as an API deletion
  does, they leave at its end, those still connecting abort, and those that would have joined later never do.
  `lastStatsAt` is the latest of its sessions'. Most rooms keep the server's empty and departure timeouts, the
  others set their own, and 30 % cap their participants above the most they hold.
- `participants`: unique identities per room follow a Poisson distribution around the scenario average;
  the difference between sessions/day and rooms/day × average size is produced as reconnects
  (`DUPLICATE_IDENTITY` leave plus a new session of the same identity). Sessions last ~20 min, 3 % are
  aborted, 95 % are `STANDARD`; rooms with egress/ingress/agent/SIP get the matching participant kinds, and 15 % of
  the active rooms hold a session that joined seconds ago and is still `joining` (not counted as active).
  Client (sdk/os/browser/device/network; the fields a client leaves empty, the region and the kind details are absent,
  as the writer leaves them), connection type, connect time, disconnect reason and resumes
  follow fixed distributions; each resume has its `PARTICIPANT_RESUMED`. A session with stats has `lastStatsAt`, its
  last flush. Agent sessions carry the `attributes` the writer keeps without `store_metadata`, derived
  from their identity: `agent-transcriber` is an OpenVidu agent (`lk.agent_name` and `openvidu.agent`
  `speech-processing`), `agent-recorder` one in automatic dispatch (empty `lk.agent_name`) and `agent-assistant` a
  third-party agent (`lk.agent_name` `assistant` only); no other session has `attributes`.
- `tracks` (CAMERA video + MICROPHONE audio per publishing participant, with simulcast layers and final
  publish stats; 6 % of the senders share their screen for a while, a third of them with its audio; every track of 3 %
  of the rooms is end-to-end encrypted, `GCM`; a third of the microphones and a tenth of the cameras of senders are
  muted and unmuted a few times, with their `TRACK_MUTED` and `TRACK_UNMUTED`) and `track_subscriptions` (every
  participant subscribes to the tracks of the other identities present at the same time; 1 % failed). A closed track
  or subscription has `closedBy`: `event`, or `reconciler` when the reconciler's close of its participant closed it.
- `egresses` (30 % of rooms, 15 % of them with a second one; mostly `room_composite`; 70 % file, 20 % stream and
  10 % segments outputs, a tenth of the file recordings also streamed and 3 % with thumbnails, so about a quarter of
  the rooms are recorded). Closed rooms: `complete` (5 % of them `limit_reached`), `failed` (a third retried once) and
  `aborted`, and `failed` by the reconciler (`egress lost (reconciled)`) when still recording as the reconciler closed
  the room. Active rooms: mostly `active`, some just `starting` (no output, no participant yet), `ending` or
  `complete` after a stop. The request summary and the outputs have the fields the writer stores; a `web` egress has no
  room, no room counter and no participant.
- `ingresses` and `ingress_sessions` (2 % of rooms). A reusable ingress publishes one to three sessions in a row, each
  with its INGRESS participant; a session ends as the room ends it, `inactive` when an RTMP or WHIP publisher stops,
  `complete` when a URL input ends, `error` when it fails or the reconciler closes it (`ingress lost (reconciled)`),
  and the ingress takes the status of its latest session. Session IDs take the server's prefixes, `RT_` for RTMP and
  `UR_` for URL inputs (WHIP keeps `IR_`). Some rooms also have an ingress created and never used
  (`sessions: 0`, enabled or not) and, in active rooms, one still `buffering`, whose session names no room yet.
  An ingress definition keeps `expiresAt: null` while it exists, whatever its sessions; one in ten whose session ended
  is deleted, most within half an hour of the session and the rest up to three days later, with `status: deleted`,
  `deletedAt`, an `INGRESS_DELETED` event carrying the state of its last session and
  `expiresAt = deletedAt + retention.entities`.
- Entities whose `expiresAt` has passed are not written, as the TTL monitor would have removed them.
- The ingress, egress, media (screen shares, encryption, mutes, resumes, joining sessions) and API call draws, and the
  event and stats values, use random streams of their own, so the rooms of a seed do not depend on them.
- `events`: lifecycle events of rooms, participants, tracks (`TRACK_PUBLISH_REQUESTED` before each publication, and as
  each track and subscription closes its final stats, `TRACK_PUBLISH_STATS` per simulcast layer and
  `TRACK_SUBSCRIBE_STATS`, unless the reconciler closed it),
  subscriptions, egresses and ingresses (the buffering `INGRESS_UPDATED` of each session; no room on
  `INGRESS_CREATED`, the buffering update and `INGRESS_STARTED`, and no participant identity, as the writer stores
  them) with the payloads of the writer, only inside the events retention window, and never the types the writer
  leaves out by default.
- `track_stats`: one document per 30 s per participant and direction (`participant` mode) or per track and
  direction (`track` mode), only inside the stats retention window. Each stat a server flushes, one per track and
  period, is a deterministic function of the session, the track and the instant, so the same samples give the
  documents, the bytes and quality of participants and rooms (`scoreCount`, `poor`, `lost` and `minScore` count every
  document, as the writer does; participants also count the signal channel's bytes), the final publish and subscribe
  stats and the rollups. Most sessions are on a good network, a tenth on a fair one, 5 % on a bad one, and 3 % of the
  rooms on a bad network, so some samples fall in the poor and lost bands. A muted track, or one a subscriber does not
  receive, flushes nothing. Pion servers add padding to the video sent to subscribers and keep the period's highest
  jitter and RTT; mediasoup servers count no padding and reports those of the reading.
  Time-series collection (`timeField: ts`, `metaField: meta`, `granularity: seconds`) with
  `expireAfterSeconds`; plain collection with a TTL index on `ts` when the server rejects time-series.
- `analytics_hourly` and `analytics_daily` (global scope, plus one scope per media node label with
  `--media-nodes --node-rollups`) aggregated from the generated entities; bytes and quality are those of the stats
  each session flushed in each hour. `--room-sums` adds the room size and duration sums and, at each room's end,
  `rooms.byTopology`, `rooms.recorded` and `rooms.bySize`; `--five-minute-rollups`
  adds `analytics_5min` (lifecycle counters, the `participants.connected` gauge, bytes and quality per five minutes)
  inside the 5-minute rollup window. `analytics_daily` gets no TTL index: daily rollups are kept forever.
  The hourly and daily documents of the room's scopes also count the server API calls of its application
  (`apiCalls`, `apiErrors`, total and by `<Service>_<Method>`): room creations and deletions, egress starts and stops,
  ingress creations and deletions, participant removals, track mutes and participant listings, 1 % of them failed.
  `generate()` takes the same switches as `rollups: { fiveMinute, nodes, roomSums }` and `mediaNodes`.
  Every rollup gets `rooms.peakActive` and `participants.peakActive`, the most rooms and active STANDARD sessions
  at any minute of its bucket, as the server's aggregator samples them: every bucket of the range has a global
  document, with peaks of 0 and nothing else when no room was active, and a media node scope is sampled while one of
  its servers is alive or it holds an active room or session. The global documents also get `egress.peakActive` and,
  in the hourly and daily ones, `ingress.peakActive`, from the generated egresses and ingress sessions. Egress and
  ingress counters and peaks are written in the global scope only, never in a media node scope, and egresses and
  ingress sessions carry no `mediaNode`, as the writer does.
- `nodes`: one document per server process, with `serverVersion`, `rtcEngine`, `mediaStats`, `batchIntervalMs`,
  `drainingAt` and `stoppedAt` when the server drained or stopped, and the room counters `rooms.hosted` and
  `rooms.reconciled`. Each server is a new node id, drawn from a stream of its own. A server takes rooms from its
  `firstSeenAt` until its `drainingAt` or its end; a stopped server's `lastSeenAt` is its `stoppedAt`, a lost one's
  its last heartbeat without `stoppedAt`. The cluster is upgraded halfway through the range (M): servers started
  before it run `3.10.0`, later ones `3.10.1`, and `schema_meta.schema.writerVersion` is the newest. Instants, floored
  to the minute, are relative to M, three quarters of the range (Q) and the end (E); "before" is a day before the
  range, or before the server's end when that is earlier.

  | Machine | Server | `firstSeenAt` | `drainingAt` | End                   | Engine    |
  | ------- | ------ | ------------- | ------------ | --------------------- | --------- |
  | single  | 1      | before        | M − 2 min    | stopped at M          | pion      |
  | single  | 2      | M + 1 min     |              | lost at Q             | pion      |
  | single  | 3      | Q + 2 min     |              | alive                 | pion      |
  | `-1`    | a      | before        | M − 10 min   | stopped at M          | pion      |
  | `-1`    | b      | M + 1 min     |              | lost at E − 5 h 2 min | mediasoup |
  | `-1`    | c      | E − 5 h       |              | alive                 | mediasoup |
  | `-2`    | a      | before        | M + 20 min   | stopped at M + 30 min | mediasoup |
  | `-2`    | b      | M + 31 min    |              | alive                 | mediasoup |
  | `-3`    |        | before        | E − 20 min   | alive                 | pion      |
  | `-4`    |        | before        | E − 3 h 10 m | lost at E − 3 h       | pion      |
  | `-5`    |        | before        | E − 40 min   | stopped at E − 30 min | pion      |
  | `-6`    |        | Q             |              | alive, 30 s heartbeat | pion      |
  | `-7`    |        | before        |              | lost at E − 3 days    | pion      |

  Without `--media-nodes`, a single node: one machine without `mediaNode` or `ip` and the three servers of the first
  rows, with no node scope; no room is created in the minutes when none of them takes rooms. With `--media-nodes`,
  the seven media nodes `media-node-10-0-0-1` to `-7` (`ip` `10.0.0.1` to `.7`) and their ten servers; every
  heartbeat interval is 10 s but that of `-6`. With `--nodes-without-media-stats 1`, the servers of the mediasoup
  machine started before the upgrade (server a of `-2`, or server 1 of the single node, whose three servers then run
  mediasoup) report no media statistics: `mediaStats: false` on them, their rooms and sessions, no bytes, quality or
  `track_stats`, and rollups marked `missing`. That stands for an earlier version; every released 3.10 server reports
  them. The keep-alive refreshes only the servers alive at generation: the unstopped ones whose `lastSeenAt` is
  within a minute of the freshest one. It moves their `lastSeenAt` alone, so each keeps its interval and its drain.

- `schema_meta` (`schema`, `retention`, `capabilities`, `config`, and `migration` with `--legacy`).
- With `--legacy` (`legacy: true` in `generate()`), what an upgrade from 3.9 leaves behind: `legacy_events` and `stats`
  with the legacy indexes (`timestamp.seconds`, `time_stamp.seconds`, TTL on `openvidu_expire_at`), 50 events and
  150 stats per hour over the 48 hours before the range (one room of five participants per hour, timestamps in seconds
  as doubles), each expiring 32 days after it was written, and a `completed` `migration` document finished one hour
  into the range whose `legacyRetainedUntil` is the latest expiry. It uses a random stream of its own, so every other
  document of a seed stays the same. The legacy documents expire 30 to 32 days after the start of the range: with
  `--days 30`, within two days of the generation, when the TTL monitor deletes them.

Documents are inserted in batches of 5 000 with `insertMany(ordered: false)`. The output shows progress
and a final summary with documents per collection, elapsed time and inserts per second. The generator
keeps only one room in memory at a time, so scenario L fits in a few hundred MB of heap.

## Files

| File               | Role                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `src/schema.ts`    | Collections, indexes and validators of the contract, `createCollections()` with the fallback |
| `src/contract.ts`  | Stored shape of a model document: bookkeeping removed, nulls omitted, BSON numeric types     |
| `src/model.ts`     | Scenarios, document types and the per-room entity generator                                  |
| `src/derive.ts`    | Raw events, `track_stats` documents and rollups derived from a generated room                |
| `src/samples.ts`   | The stats each session flushes, and their sums on participants, rooms, tracks and rollups    |
| `src/generator.ts` | `generate(db, options)` and the batched writer                                               |
| `src/legacy.ts`    | Legacy collections of the writer before 3.10 (`--legacy`)                                    |
| `src/generate.ts`  | Generator CLI                                                                                |
| `src/context.ts`   | `queryContext(db)`: data range and sample identifiers for query plan tests                   |
| `src/plan.ts`      | Explain summaries: plan stages, indexes, documents examined                                  |
| `src/random.ts`    | mulberry32 generator and sampling helpers                                                    |
| `src/args.ts`      | CLI argument parsing                                                                         |
