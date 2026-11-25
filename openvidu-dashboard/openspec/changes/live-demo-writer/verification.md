# Verification Report: live-demo-writer

- Date: 2026-11-25
- Mode: incremental
- Verified commit: `930d11d824e40bd2167b7f359d191c379c89b84c` (`master` of `OpenVidu/openvidu`, local commits not
  pushed); working tree clean.
- Starts from: `3a5bc0670e3915f6455e847d227fd440973d2108` (the full verification and code review committed at
  `5195ba348`). This report supersedes both `verification.md` and `code-review.md` of that commit.
- Session: started from the PRO workspace, change verified in the standalone CE checkout listed in its
  `agent-roots.json`.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 14/14 implementer tasks checked (groups 1 to 4); 5.1 (owner), 6.1, 7.1 and 7.2 (orchestrator) come after the verification and are pending. 9/9 ADDED requirements implemented. |
| Correctness  | 25/25 scenarios have a test that `./dashboard.sh scenarios` finds. The 2 scenarios of `test/demo-data-mode.test.mjs` run and pass in `check`. The 23 of `integration-live`: read and judged, **not verified as passing by this report** (`test-live` blocked by the guard; the implementer's run is recorded in `operations.md`). |
| Coherence    | Design followed, `design.md` updated with what was built. 1 warning (generator README), 1 suggestion. |

## Commands run

| Command | Result |
| --- | --- |
| `./dashboard.sh check` | Passed: lint, format check, typecheck, `openspec validate --all --strict` (32 items, `change/live-demo-writer` included), tooling tests (144, the five demo data mode tests included), unit tests (typings 112, backend 283, frontend 704 + 1). |
| `./dashboard.sh scenarios live-demo-writer` | 25 scenarios, 0 without a test. |
| `./dashboard.sh test-integration` | Passed: 26 files, 372 tests, 363 s. The generator's `ServerSchedule` change runs in the generation too. |
| `./dashboard.sh test-live` | **Not verified.** The verifier guard of this PRO-started session comes from the PRO `ce.ref`, which predates `test-live`. |
| `./dashboard.sh e2e` | Not applicable: no frontend or e2e change. |

Recorded in `operations.md`, not checked here: the implementer ran `test-live` at `b7efee9d5`, 29 tests passed in 15 min.
The commits after `b7efee9d5` (`bea892b1e`, `930d11d82`) change only `design.md` and `operations.md`, so that run
covers the code at the verified commit. The owner's decisions are also recorded there. The CE push and its CI (task 6.1)
are not recorded yet.

## Earlier findings

### Verification report at `3a5bc0670`

| Finding | Status | Evidence |
| --- | --- | --- |
| W1. "No live stats while muted or after leaving": the test does not assert the scenario | Resolved | `8ad3793df` rewords the THEN (`specs/data-model/spec.md:96-98`): nothing dated more than 30 s after M and before U, and a flush in between carries only what was sent before M. The test (`data-generator-live.test.ts:591-598`) checks the 30-s rule. `:600-646` bounds the first flush after M by the bytes of the previous full flush scaled to the time sent before M (×1.15/0.85), and `bounded > 0` (`:656`) keeps that check from passing vacuously. |
| S1. Live room streams seeded with a 32-bit hash | Resolved | See review S1. |
| S2. Lines over 120 columns in the edited Markdown | Resolved | `b90fba08e` re-wraps `AGENTS.md:50`, `:78-85`, `.claude/agents/spec-verifier.md:31-36` and `.claude/agents/change-implementer.md:23-26`. |

### Code review at `3a5bc0670`

| Finding | Status | Evidence |
| --- | --- | --- |
| C1. A media node lost before the stop never comes back after a live restart | Resolved | `ServerSchedule` takes `reportedUntil` (the heartbeat on a restart) and spawns at `max(loss + 6 h, start)` (`src/operations.ts:50`, `:70-75`). `restartLive()` passes the heartbeat and writes every server first seen by the restart, the returned ones included (`src/restart.ts:79-97`). Test: "Live restart after a stop: a media node lost before the stop returns at a restart over 6 hours after its loss" (`data-generator-live.test.ts:1062`): loss at 15:00, heartbeat at 18:00, restart next day at 08:00, the machine has a new server at the restart that is alive 10 minutes later. |
| W1. A failing live writer is silent and its error is deleted | Resolved | `run_live_writer` (`dashboard-ce/tools/demo-lib.sh:62-89`) runs both live paths. On an exit code from 1 to 127 it prints the last 20 lines of the log and sends `TERM` to the demo. `start_frontend` now waits on a background server in `PIDS` (`dev-lib.sh:83-86`), so the signal interrupts it and the cleanup runs. Tests: the three "Demo data mode selection: a live writer that fails …" cases (`test/demo-data-mode.test.mjs:117-151`), passing in `check`. `design.md` Risks updated. |
| W2. The restart instant can fall before the last heartbeat | Resolved | `at = max(restartAt, the minute after the heartbeat)` (`src/restart.ts:58`). Test (`data-generator-live.test.ts:1090`): heartbeat at T + 30 min 40 s, restart requested at T + 30 min, `world.start` is T + 31 min, every new server is first seen after the heartbeat, and no new room is created at or before it. |
| W3. The restart counts a buffering ingress session as started | Resolved | `counted()` keeps `buffering` for the rollups (`src/restart.ts:400-406`), applied to both closure paths (`:279`, `:306`). The index pairing at `:279` is sound because `closed.ingressSessions` is `roomSessions.map(...)` (`:218`). Same test (`:1148-1167`): no `INGRESS_STARTED`, `sessionsStarted` and `byInputType` unchanged, `sessionsEnded` up by the sessions ended in the bucket. |
| S1. Entity ids of live rooms come from 32-bit streams | Resolved | `KeyedRng` (`src/random.ts:149-162`) keeps the FNV-seeded draws but returns `hashId(prefix, key|ordinal)` for every `id()`. Live rooms use it (`src/live.ts:368-369`), and every entity id in `model.ts` comes from `rng.id()` (`:510`, `:1266`, `:1395`, `:1789`, `:2005`, `:2018`, `:2079`, `:2204`, `:2224-2225`, `:2355`). The decision and the rejected alternative (SHA-256 seeds moved the statistics out of their bands) are in `design.md`. |
| S2. Reads that skip the contract indexes | Resolved | Highest room via `nameLower` prefix regex and reverse sort (`src/restart.ts:101-106`). Open ingress sessions by `status` (`src/restart.ts:149`, `src/live.ts:429`). Subscriptions by `trackSid` (`src/restart.ts:181-183`). |
| S3. Every server ever seen is re-diffed on each tick | Resolved | `endedServers` (`src/live.ts:87`, `:108-113`, `:516-528`): the tick that writes a server's end drops it, and later ticks skip it. |
| S4. A single node stopped mid-restart blocks the live restart | Resolved | The heartbeat is taken over every server (`src/restart.ts:52`). When no server is alive the reconciler node is the freshest one (`:60-62`), and the stopped single node gets a new server at the restart (`src/operations.ts:64-69`). Test: "Live restart after a stop: a single node stopped in its daily restart has a new server at the restart" (`data-generator-live.test.ts:1170`). |
| S5. Harmless race in the readiness wait | Resolved | `grep -qs` (`dashboard-ce/tools/demo-lib.sh:98`). |

### Rolling restart test rework (`9c57aef38`)

"Live rolling restart" (`data-generator-live.test.ts:477-508`) still checks the 02:00 turn as the scenario states:
`drainingAt` 02:00, `stoppedAt` 02:20, a new server of the same label first seen at 02:30 and alive past 02:40. The room
rules (none created after the drain, none open after the stop, those open at the stop ended with `SERVER_SHUTDOWN`) now
run over every drain of the day whose stop falls inside the run. The 02:00 node is one of them, since T is 10:00 and the
turn is T + 16 h. The `openAtStops > 0` assertion keeps the `SERVER_SHUTDOWN` check from passing vacuously across the
day. Before the rework, at least one room had to be open at the 02:20 stop itself. Now that one instance of the rule can
be empty, but the rule is still exercised and every instance is checked. The test still covers its scenario.

## New review of the diff since `3a5bc0670`

- Specs: only the muted-stats THEN changed (see W1 above). It now matches the implementation and stays testable.
- Design: decisions 2, 5, 6, 7, 8, the performance budget, the test strategy and the risks match the code at the
  verified commit.
- Edition seams: CE tooling only, nothing PRO. Data contract: unchanged. No secrets. Language: English.
- Commits: `openvidu-dashboard: <present tense>, change live-demo-writer`, no attribution lines. CHANGELOG: no line,
  still justified (internal tooling).
- Documentation: the generator README was not updated with the restart changes (W1 below).

## Issues by priority

### CRITICAL

None.

### WARNING

- **W1. The generator README describes the old restart rules.**
  - `dashboard-ce/tools/data-generator/README.md:252-257` still defines the last heartbeat as "the freshest
    `lastSeenAt` of a running server".
  - `restartLive()` now takes it over every server (`src/restart.ts:52`). The README also says nothing about three
    other changes:
    - the restart instant moved after the heartbeat's minute (`:58`);
    - a machine lost in the 6 hours before the heartbeat returns at `max(loss + 6 h, restart)`;
    - a single node caught stopped gets a new server at the restart.
  - `design.md` decision 7 states all of this, so only the README is out of date. The Definition of Done item "README
    reflects the change" is therefore not fully met.
  - Recommendation: update the restart bullet at `README.md:252-257` to match the docblock of `restartLive()`
    (`src/restart.ts:34-47`).

### SUGGESTION

- **S1. No direct test of `KeyedRng`.**
  - The distinct-ids property of `KeyedRng` (`dashboard-ce/tools/data-generator/src/random.ts:149-162`) has no direct
    test. It is exercised only indirectly by the live suite, where a collision is unlikely to occur in the time a test
    runs.
  - Recommendation: add a unit test under `dashboard-ce/backend/test/unit/`. Two `KeyedRng` with different keys but the
    same seed state should draw the same non-id values and different ids. The ids should match `hashId(prefix,
    key|n)`.

## Definition of Done (CE `AGENTS.md`), items affected by the diff

| Item | Status |
| --- | --- |
| All tasks checked | Met for groups 1 to 4. 5.1, 6.1, 7.1 and 7.2 are pending (owner and orchestrator, after verification). |
| `scenarios` finds a passing test for every delta scenario | Partly verified: 25/25 have a test. 2 pass here; the other 23 passed in the implementer's recorded `test-live` run, not checked here. |
| `./dashboard.sh check` passes locally | Met. |
| CI run of the push is green | Pending (task 6.1). |
| Backend changes: `test-integration` passes | Met (372 tests). |
| Data generator changes: `test-live` passes | Recorded in `operations.md` (29 tests at `b7efee9d5`), not verified here. |
| Latest verification report has no CRITICAL; refactor review applied or recorded | Met. |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` files reflect the change | Not met: generator README restart bullet (W1). |
| Change archived | Pending. |

## Final assessment

No critical issues found in the checks that ran. 1 warning and 1 suggestion. Every finding of the previous
verification and code review is resolved.

Not verified: `./dashboard.sh test-live`, and with it 23 of the 25 scenarios as passing, because the guard of this
PRO-started session blocks the command. The implementer's run of 29 passing tests at `b7efee9d5`, which matches the code
at the verified commit, is recorded in `operations.md`.
