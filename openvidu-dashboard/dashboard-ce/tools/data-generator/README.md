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
| `--retention-entities-days <n>`     | `90`          | `expiresAt = closedAt + retention` on closed entities                                                                  |
| `--retention-rollups-5min-days <n>` | `7`           | Only 5-minute rollups inside this window are written (TTL index on `bucket`)                                           |
| `--drop`                            | off           | Drop the database first                                                                                                |
| `--plain-stats`                     | off           | Force the plain-collection fallback for `track_stats`                                                                  |
| `--five-minute-rollups`             | off           | Write `analytics_5min` inside the 5-minute rollup window                                                               |
| `--node-rollups`                    | off           | Write the `node:<nodeId>` scope beside `global` in every rollup                                                        |
| `--room-sums`                       | off           | Write `rooms.participantsSum` and `rooms.durationMsSum` at room end                                                    |
| `--active-window <minutes>`         | off           | Rooms created in the last minutes stay active (two of three); without it, the most recent 10 % of the rooms are active |
| `--min-active-rooms <n>`            | 0             | With `--active-window`: rooms added to the window when the hour of day leaves fewer than `n` active rooms              |

| Scenario | Rooms per day | Sessions per day | Average room size |
| -------- | ------------- | ---------------- | ----------------- |
| S        | 200           | 1 000            | 4                 |
| M        | 2 000         | 20 000           | 6                 |
| L        | 5 000         | 50 000           | 8                 |

What it writes (`analytics_5min` stays empty without `--five-minute-rollups`):

- `rooms`: created over the days with a diurnal curve (office-hours peak); the most recent 10 % are
  `active`, the rest `closed` with `endReason` and `closedBy`. Id arrays and counters (`participantSids`,
  `activeParticipantSids`, `identities`, `participants.*`, `trackSids`, `egressIds`, `ingressSessionIds`,
  `features`) are derived from the generated entities; participant counters count STANDARD sessions and `byKind`
  every kind, as the writer does (also in the rollups).
- `participants`: unique identities per room follow a Poisson distribution around the scenario average;
  the difference between sessions/day and rooms/day × average size is produced as reconnects
  (`DUPLICATE_IDENTITY` leave plus a new session of the same identity). Sessions last ~20 min, 3 % are
  aborted, 95 % are `STANDARD`; rooms with egress/ingress/agent/SIP get the matching participant kinds.
  Client (sdk/os/browser/device/network), connection type, connect time, disconnect reason and resumes
  follow fixed distributions.
- `tracks` (CAMERA video + MICROPHONE audio per publishing participant, with simulcast layers and final
  publish stats) and `track_subscriptions` (every participant subscribes to the tracks of the other
  identities present at the same time; 1 % failed).
- `egresses` (10 % of rooms; mostly `room_composite`; `complete`/`failed`/`aborted`, `active` in active
  rooms), `ingresses` and `ingress_sessions` (2 % of rooms).
- `events`: lifecycle events of rooms, participants, tracks, subscriptions, egresses and ingresses with
  small payloads, only inside the events retention window.
- `track_stats`: one document per 30 s per participant and direction (`participant` mode) or per track and
  direction (`track` mode), only inside the stats retention window, with plausible score/bytes/rtt/jitter.
  Time-series collection (`timeField: ts`, `metaField: meta`, `granularity: seconds`) with
  `expireAfterSeconds`; plain collection with a TTL index on `ts` when the server rejects time-series.
- `analytics_hourly` and `analytics_daily` (global scope, plus one scope per node with `--node-rollups`)
  aggregated from the generated entities; bytes and quality are spread over the hours each session was connected.
  `--room-sums` adds the room size and duration sums; `--five-minute-rollups` adds `analytics_5min` (lifecycle
  counters, the `participants.connected` gauge, bytes and quality per five minutes) inside the 5-minute rollup
  window. `analytics_daily` gets no TTL index: daily rollups are kept forever.
  `generate()` takes the same switches as `rollups: { fiveMinute, nodes, roomSums }`.
- `nodes` (3 nodes) and `schema_meta` (`schema`, `retention`, `capabilities`, `config`).

Documents are inserted in batches of 5 000 with `insertMany(ordered: false)`. The output shows progress
and a final summary with documents per collection, elapsed time and inserts per second. The generator
keeps only one room in memory at a time, so scenario L fits in a few hundred MB of heap.

## Files

| File               | Role                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `src/schema.ts`    | Collections, indexes and validators of the contract, `createCollections()` with the fallback |
| `src/contract.ts`  | Stored shape of a model document: bookkeeping removed, nulls omitted, BSON numeric types     |
| `src/model.ts`     | Scenarios, document types and the per-room entity generator                                  |
| `src/derive.ts`    | Raw events, stats samples and rollups derived from a generated room                          |
| `src/generator.ts` | `generate(db, options)` and the batched writer                                               |
| `src/generate.ts`  | Generator CLI                                                                                |
| `src/context.ts`   | `queryContext(db)`: data range and sample identifiers for query plan tests                   |
| `src/plan.ts`      | Explain summaries: plan stages, indexes, documents examined                                  |
| `src/random.ts`    | mulberry32 generator and sampling helpers                                                    |
| `src/args.ts`      | CLI argument parsing                                                                         |
