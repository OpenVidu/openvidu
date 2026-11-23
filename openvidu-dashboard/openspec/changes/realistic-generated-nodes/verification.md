# Verification: realistic-generated-nodes

- Date: 2026-11-23
- Mode: full (lite track: the only verification, covering scenarios, specs and code)
- Verified commit: `58d24a6712eca74766b53505a470e9e2a7920bed` (plan 6178d9723, implementation fd907de65, design update
  58d24a671; built on the unpushed direct fixes 7e00c2cde, 9a767882f, 4b1fa33ce and 58f4af5bb)
- Working tree: clean

## Commands run

| Command | Result |
| --- | --- |
| `./dashboard.sh check` | Pass: lint, format, typecheck, `openspec validate --all --strict` (32/32, change included), tooling 137/137, typings 112/112, backend unit 274/274, frontend 704 + 1 |
| `./dashboard.sh scenarios realistic-generated-nodes` | 11 scenarios, 0 without a test |
| `./dashboard.sh test-integration` | Pass: 26 files, 372 tests (Docker available, nothing skipped). This includes every data generator test, the scenario tests of the four direct-fix commits ("generated scenarios" and "generated stats" groups) and the query-plan tests with `mediaNodes: true` |
| `./dashboard.sh e2e` | Not applicable: no frontend or e2e file changed, and the e2e suites do not use the data generator |

## Summary

| Dimension | Status |
| --- | --- |
| Completeness | 8/8 tasks; 7 requirements (3 MODIFIED, 4 ADDED) implemented; 1 removal confirmed |
| Correctness | 7/7 requirements covered; 11/11 scenarios have tests that assert what the scenario states, and those tests pass |
| Coherence | Design followed, with one divergence from a stated goal (W1) |

## Completeness

- Tasks: 8/8 checked. The "Workflow follow-up" section (moving PRO `ce.ref`) belongs to another workspace and comes
  after this verification, so it is pending, not a finding.
- MODIFIED "Generated data follows the writer's shape": the 30 s interval of `-6` is set at
  `dashboard-ce/tools/data-generator/src/generator.ts:216,245`.
- MODIFIED "Media statistics marks of the rollups": `withoutMediaStats` comes from the server table
  (`generator.ts:422`), with `noStats` only on `-2` a or single server 1 (`generator.ts:205,224`).
- ADDED "Generated single node", "Generated multi-node deployment" and "Generated server versions": `serverTimeline`
  (`generator.ts:170-248`), node documents (`generator.ts:510-524`), `newestVersion` for `schema.writerVersion`, and the
  0-or-1 bound (`generator.ts:368-370`).
- ADDED "Rooms of generated servers": `takesRooms` and `hostRooms` (`generator.ts:250-288`), and the room end at the
  server's end (`dashboard-ce/tools/data-generator/src/model.ts:627-636`), with `node-dead` reaching the synthetic
  events through `derive.ts:120,157`.
- REMOVED "Generated media nodes": checked against the baseline in `openspec/specs/data-model/spec.md:524-555` (five
  labels, six documents, `-3` the pion node without statistics, `-4` hosting only rooms that ended before its silence
  through `rehost()`). None of it is left: `NODE_COUNT`, `MEDIASOUP_MEDIA_NODE`, `rehost`, `restart` and `departed`
  appear nowhere outside `openspec/`, and `-3` always reports statistics.

## Correctness: scenarios and their tests

All in `dashboard-ce/backend/test/integration/data-generator.test.ts` unless noted. Each test was read against its
scenario.

- Generated event payload (:231), Lower-cased search fields (:216): retitled carried tests. They check every document
  (no camelCase key, `$toLower` equality) instead of the literal `Studio-A` / `Demo-Room` examples, which covers them.
- Generated node heartbeats (:533, :681): every document before and after two keep-alive ticks, `-6` 30 000, the rest
  10 000, in both modes.
- Validator (`dashboard-ce/typings/test/contract.test.ts:161`): retitled, unchanged assertions.
- Generated rollups of nodes without media statistics (:1599): mixed global buckets have both marks, no `missing`
  from `stoppedAt` on, and the `node:…-2` buckets have only `missing` before the stop and only `reported` after the
  second server's `firstSeenAt`.
- Generated rollups of servers reporting media statistics (:1018): retitled, unchanged.
- Generated single node (:588, :628): three documents without `mediaNode` or `ip`, pion, `mediaStats: true`, the exact
  instants, only the `global` scope, and no room in either restart gap.
- Generated server versions (:1550, :698, :728): versions follow `firstSeenAt` against M, `writerVersion: "3.10.1"`,
  `-2` a mediasoup without statistics with its rooms, sessions and `track_stats`, `-1` pion then mediasoup twice, the
  single-node mediasoup case, and rejection of 2 in both modes.
- Rooms of generated servers (:421, :641): host taking rooms at creation, sessions on the same server and joined after
  its `firstSeenAt`, no active room or late end on a stopped or silent server, reasons of the rooms ended at a stop or
  silence, a `node-dead` room on `-1` b and `-4`, and `rooms.hosted` / `rooms.reconciled`.
- Generated media node servers (:294): ten documents, seven labels and IPs, every instant and engine of the table, and
  node scopes matching the labels that hosted rooms in the range.
- Keep-alive of generated servers (:549, :690): only the alive servers are refreshed, and everything else keeps its
  `lastSeenAt`, `batchIntervalMs`, `drainingAt` and `stoppedAt`.

## Coherence

The design decisions are implemented as written: the single server table feeds documents, hosts, engines (`generator.ts:435,460`)
and peak lifetimes; node ids come from their own stream (`seed + 11_000_027`); rooms keep one host draw; the pinned room
on each lost server is created 10 minutes before it stops taking rooms; `keepLive` uses a one-minute threshold and sets
only `lastSeenAt` (`dashboard-ce/tools/data-generator/src/schema.ts:165-184`); tests were retitled rather than
duplicated. The README (`dashboard-ce/tools/data-generator/README.md:44-49,68-76,152-185`) and the `GenerateOptions`
doc comments match the specs. Commit messages follow the `openvidu-dashboard: …, change <name>` convention.

## Issues

### CRITICAL

None.

### WARNING

- W1. Design goal not met: "the same content draws for each room of a seed, so that only its host, its end and the
  node documents change" (design.md, Goals), and "the number of servers does not shift any room" (Host choice).
  `hostRooms` inserts the pinned rooms of lost servers into the plan in creation order and drops the single-node rooms
  planned in the restart gaps (`dashboard-ce/tools/data-generator/src/generator.ts:264-287`). Every room is then
  generated from the shared streams `ctx.rng`, `shapeRng`, `mediaRng` and so on (`model.ts:476-486`). So each inserted
  or dropped room shifts the content draws, and the `room-NNNNNN` name, of every room created after it. A seed
  therefore gives different rooms in single-node and multi-node mode, and different rooms than before the change.
  Before the change, rooms were the same with and without labels. No test or spec scenario relies on this and the
  integration suite passes, so the effect is limited to reproducibility of demo data. Recommendation: either revise
  design.md's Goals and the "Host choice keeps the draws" paragraph to say that rooms keep their draws only up to the
  first added or skipped room, or generate the pinned rooms and skipped plans so they consume no draws from the shared
  streams. For example, generate the pinned rooms after the planned ones from a stream of their own, and draw (then
  discard) the skipped rooms.

### SUGGESTION

- S1. `dashboard-ce/backend/test/integration/data-generator.test.ts:549`: "Keep-alive of generated servers" runs after
  "Generated node heartbeats" (:533), which already ticked the same database. It still passes in isolation, because
  the alive servers stay within a minute of each other. Making it independent of that order, with its own database or
  a comment, would keep a future reorder from changing what it checks.
- S2. `dashboard-ce/backend/test/integration/data-generator.test.ts:460-471`: the reason check for rooms ended at a
  server's end passes vacuously when no room was open at a stop. Asserting that at least one `SERVER_SHUTDOWN` room
  exists on a stopped server (for example `-2` a or `-5`) would show that the stop rule is exercised.

## Definition of Done (CE `AGENTS.md`, CE workspace)

| Item | Status |
| --- | --- |
| All tasks checked; `scenarios` finds a passing test for every delta scenario | Met (8/8; 11/11, all passing) |
| `./dashboard.sh check` passes locally | Met |
| CI run of the push green | Not verified: not pushed yet (orchestrator) |
| Backend changes: `test-integration` passes | Met (372/372) |
| UI changes: `e2e` | Not applicable |
| Data contract changes: `contract-check` | Not applicable (no contract change) |
| Image or runtime dependency changes: `build-image`, `smoke-image` | Not applicable |
| Latest verification reports have no CRITICAL; refactor review applied or recorded | Met. Task 1.8 applied: no old node constants are left, and the timeline table is the single source |
| CHANGELOG, README and `AGENTS.md` reflect the change | Met: no CHANGELOG line, since this is tooling (allowed by AGENTS.md "CHANGELOG"); README updated; no AGENTS.md describes the node set |
| Change archived | Pending (after verification) |

## Final assessment

No critical issues. 1 warning and 2 suggestions to consider. Ready for archive once the push's CI is green, with the
noted improvements.
