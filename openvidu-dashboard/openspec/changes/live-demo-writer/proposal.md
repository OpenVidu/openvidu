# Proposal

## Why

The owner wants the local demo (`./dashboard.sh demo ce|pro|both`, Single Node, Elastic and HA) to be realistic enough to
test with. Today it is a snapshot: after generation the keep-alive only moves `lastSeenAt` of the alive servers and
`lastStatsAt` of the active rooms and sessions. No room ever ends or starts, no session, track, event, egress, ingress,
stat or rollup is written, the charts stop at the generation instant while the rooms look fresh, a stale room can never
appear, and the node states drift: `-5` leaves the PRO Overview half an hour in, `-4` leaves the current media nodes
after about 21 hours and `-3` drains forever. Scenarios such as the PRO series ETag on a new flush, a deletion racing the
writer or a room going stale cannot be tried.

## What Changes

- **Demo data mode**: `DASHBOARD_DEMO_DATA=frozen|live` for `demo ce`, `demo pro` and `demo both`, default `frozen`. Any
  other value stops the demo before it starts anything.
  - `frozen` is today's demo: the generated data and the keep-alive of the heartbeats and stats times, nothing else.
  - `live` runs a live writer over the generated data, with the generation options (stats mode, media nodes, node
    rollups), writing what the OpenVidu writer, aggregator and reconciler would write, every 10 s.
- **One world per seed**: the data generator draws each room's whole life once and writes its state at an instant. The
  generated 30 days are that world at the generation instant; the live writer keeps writing it as time passes.
- **Live rooms and sessions** (`live`): rooms keep arriving and end, the rooms in progress at generation end on their
  own within 10 to 30 minutes, sessions join, publish, mute, resume and leave, egresses and ingress sessions run their
  course, each with its events. At least 10 rooms are in progress at any minute, more around 14:00 UTC following the daily curve. Half of the
  live rooms have an egress and one in ten an ingress (the generation keeps 30 % and 2 %), so live egress and ingress
  figures sit above the history.
- **Live stats and rollups** (`live`): `track_stats` every 30 s per track (track mode) or per participant (participant
  mode), the bytes, quality and `lastStatsAt` of sessions and rooms, the 5-minute, hourly, daily and media node rollups,
  the active peaks every minute and the daily unique identities after the day closes, all as increments, so a deletion
  from Settings behaves against the demo as it does against a deployment: what it keeps (rooms in progress, the last 5
  minutes, the current and previous rollup buckets) goes on growing, and what it removes never comes back.
- **Short-lived states made common** (`live`): half of the participants take 1 to 3 minutes to connect, a third of
  them giving up, so about one room in eleven in progress holds a participant still connecting and someone is
  connecting somewhere in about two minutes of three; egresses spend 20 to 60 s starting and ending; ingress sessions
  buffer for 1 to 2 minutes; at least once an hour a room stops reporting, shows as stale for about 2 minutes and is
  closed by the reconciler.
- **Rolling server operations** (`live`): with media nodes, every 2 hours a media node drains for 20 minutes, stops and
  returns 10 minutes later as a new server, and once a day one is lost, its rooms closed by the reconciler, and returns
  6 hours later; a single node restarts once a day.
- **Restart on kept data** (`DASHBOARD_DEMO_KEEP_DATA=true`): a `live` run treats the time it was stopped as an outage:
  the rooms and sessions open at the last heartbeat are closed by the reconciler at it, every server alive then is lost
  and its machine comes back as a new server, and the gap stays empty. A `frozen` run keeps today's behaviour on whatever
  data it finds.
- **Frozen data almost unchanged**: the rooms open at the end of the range are now drawn from complete lives, keeping
  today's shares of joining sessions, starting, ending and stopped egresses and buffering ingresses at the generation
  instant; their random values, and every event `_id`, differ from today's for the same seed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-model`: adds the requirements of the demo data modes and of the live writer (rooms and sessions, egress and
  ingress shares, stats, rollups, short-lived states, server operations, restart on kept data, deletions,
  determinism). The existing generator requirements, the keep-alive scenarios included, are unchanged: they still
  describe the generation and the `frozen` mode.

## Impact

- Edition: CE tooling, used by the CE and PRO demos. No product code, API, data contract, schema version, image or
  product configuration changes.
- Repository: dashboard (`OpenVidu/openvidu`, `openvidu-dashboard/`) only: `dashboard-ce/tools/data-generator`,
  `dashboard-ce/tools/demo-lib.sh` and `demo.sh`, `dashboard.sh` (help text and the new `test-live` command), the CE
  backend tests of the generator, `test/` (demo mode tooling test), `README.md`, `AGENTS.md`, the generator README.
- The live scenarios run in their own suite, `./dashboard.sh test-live` (vitest project `integration-live`), outside
  `test-integration` and outside CI, with no workflow or `ci` spec change. The root `AGENTS.md` Definition of Done
  requires it for data generator changes, and the implementer and verifier agent definitions and the verifier guard
  run and allow it.
- PRO follow-up (another workspace, after the CE push): move `ce.ref`. `dashboard-pro/tools/demo.sh` needs no change,
  since `GENERATOR_ARGS` and `STATS_MODE` reach the live writer through `demo-lib.sh`. The PRO README and `AGENTS.md`
  gain the `DASHBOARD_DEMO_DATA` line next to `DASHBOARD_DEMO_DEPLOYMENT`. The PRO `test-integration` runs besides
  `check` and `e2e`, because the generated data of rooms open at the end changes.
- Track: full. One capability, but a new architecture in the generator (complete room lives cut at an instant), a long-
  running writer and about 26 scenarios.
- CHANGELOG: none. The demo and the data generator are tooling, which has never had CHANGELOG lines.
