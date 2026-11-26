# Verification Report: live-demo-writer

- Date: 2026-11-26
- Mode: incremental
- Verified commit: `8f4998c7d5409a7b513c73010b214af261fe0445` (`master` of `OpenVidu/openvidu`, local commits not
  pushed); working tree clean.
- Starts from: `930d11d824e40bd2167b7f359d191c379c89b84c` (the report committed at `64a94d019`). This report supersedes
  that `verification.md`. No `code-review.md` exists for this round; the open findings of the earlier code review were
  all resolved at `930d11d82`.
- Session: started from the PRO workspace, change verified in the standalone CE checkout listed in its
  `agent-roots.json`.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 15/15 implementer tasks checked (groups 1 to 4, the new 1.4 included); 5.1 (owner), 6.1, 7.1 and 7.2 (orchestrator) come after the verification and are pending. 9/9 ADDED requirements implemented. |
| Correctness  | 26/26 scenarios have a test that `./dashboard.sh scenarios` finds. The new scenario's test was read and asserts its THEN. The 2 scenarios of `test/demo-data-mode.test.mjs` pass in `check` (run by the orchestrator at `b7acfd554`, not rerun here). The 24 of `integration-live`: read and judged, **not verified as passing by this report** (`test-live` blocked by the guard; the implementer's run is recorded in `operations.md`). |
| Coherence    | Design decision 1 (as revised by the owner) followed in the code. 1 warning: the README and a doc comment say the rooms go on 10 to 30 minutes, which the second owner decision contradicts. |

## Commands run

| Command | Result |
| --- | --- |
| `./dashboard.sh scenarios live-demo-writer` | 26 scenarios, 0 without a test. |
| `./dashboard.sh test-integration` | Passed: 26 files, 372 tests, 394 s. The changed generation (`generateRoom`, `cutRoom`) runs in every query-plan suite. |
| `./dashboard.sh check` | Not rerun here (memory, one suite at a time). Run by the orchestrator at `b7acfd554`, passed; the only later commit, `8f4998c7d`, changes `operations.md` alone. Recorded, not checked. |
| `./dashboard.sh test-live` | **Not verified.** The verifier guard of this PRO-started session comes from the PRO `ce.ref`, which predates `test-live`. |
| `./dashboard.sh e2e` | Not applicable: no frontend or e2e change. |

Recorded in `operations.md`, not checked here: the implementer ran `test-live` at `b7acfd554`, 30 tests passed in 16 min.
The only later commit (`8f4998c7d`) changes `operations.md`, so that run covers the code at the verified commit. The
owner's decision on the stretch is recorded there. The CE push and its CI (task 6.1) are not recorded yet.

## Earlier findings

### Verification report at `930d11d82`

| Finding | Status | Evidence |
| --- | --- | --- |
| W1. The generator README describes the old restart rules | Resolved | `18f617b89` rewrites the restart bullet (`dashboard-ce/tools/data-generator/README.md:253-262`): the heartbeat over any server, running or not; the restart at the later of the requested instant and the minute after it; a buffering ingress session counted as ended, not started; a machine lost in the 6 hours before the heartbeat back at `max(loss + 6 h, restart)`; a stopped single node with a new server at the restart. It also documents `KeyedRng` (`:236-237`, `:311`) and the failing live writer stopping the demo (`:266-267`). Matches the `restartLive()` docblock and design decision 7. |
| S1. No direct test of `KeyedRng` | Resolved | `dd33c0f62` adds `dashboard-ce/backend/test/unit/data-generator-random.test.ts`: ids equal `hashId(prefix, key|n)` (`:7-15`), no id repeats over 2 000 rooms × 6 streams × 5 ids (`:17-33`), and every non-id draw equals the FNV-seeded `hashRng(key)` stream with ids interleaved (`:35-51`). This is the test the recommendation described. |

### W3 of the earlier code review, after `b7acfd554`

The test "Live restart after a stop: a restart in the minute of the last heartbeat starts after it, and a session closed
while buffering is not counted as started" (`data-generator-live.test.ts:1133`) now reads the hourly ingress counters
right after `restartLive()` (`:1175-1177`), before the new world ticks. It still covers W3, and more tightly:

- `restartLive()` writes the closures and their rollup increments before it returns: `closeOpen()` is awaited at
  `src/restart.ts:64` and ends with `writeIncrements()` at `:322`, applying `counted()` to both closure paths
  (`:279`, `:306`).
- The ticks then run from T + 31 min, inside the same 10:00 bucket. Before the change, a new room's ingress session in
  those 10 minutes could raise `sessionsStarted` or `byInputType` and break the `toEqual` for a reason unrelated to W3.
  Now `after` holds only the closures' increments.
- The W3 assertions are unchanged: no `INGRESS_STARTED` for `IS_buffering01` (`:1198-1202`), and
  `after` equals `before` with only `ended` raised by the open sessions ended in the bucket (`:1203-1211`), guarded by
  `endedInBucket > 0`. `endedInBucket` is read after the ticks, but it counts only the sessions open before the
  restart, whose `endedAt` the new writer never touches, so the value is the same as right after the restart.

## New review of the diff since `930d11d82`

- Spec: the new scenario "Generated rooms in progress stretched 30 minutes at most" (`specs/data-model/spec.md:55-61`)
  is testable and matches design decision 1 as revised.
- Code (`2991aa8ba`, `323967aa1`): `openUntil` is now `now + rng.int(10 * MINUTE, 30 * MINUTE)`
  (`src/model.ts:537`), same draw count, so no other draw moves, as the design states. The stretch still applies only
  to the last identity's last session (`:567-568`); every other session keeps its drawn length. `drawnLengths` is
  model only: set at `:588` and `:599`, returned at `:815`, carried by `cutRoom` (`src/cut.ts:113-114`), never written
  (no other use in the repository). `slowJoiner()` returns its length without changing its draws (`:2292-2301`).
- Test of the new scenario (`data-generator-live.test.ts:1042-1083`): it asserts what the scenario states. It requires
  10 or more rooms in progress, requires a drawn length for every STANDARD session joined before T, and bounds each
  leave by `max(T + 30 min, joinedAt + drawn)`. A session still open at T + 100 min has a `NaN` leave and fails, so the
  old 5-hour stretch would have been caught. It also checks that each room is closed with `endedAt` within its
  departure timeout of `max(T, last non-EGRESS leave)`. The bound is reachable under the new rules: `sessionDuration`
  is capped at 90 min (`src/model.ts:1159-1161`), and a slow joiner joins less than 59 s before T and connects in at
  most 179 s.
- "Rooms in progress at generation end" (`:243`) still holds with the shorter stretch.
- Artifacts: proposal, design decision 1, task 1.4 and `operations.md` agree with the code. Edition seams: CE tooling
  only, nothing PRO. Data contract: unchanged. No secrets. Language: English. Commits:
  `openvidu-dashboard: <present tense>, change live-demo-writer`, no attribution lines. CHANGELOG: no line, still
  justified (tooling).
- Documentation: the README and the `generateRoom` doc comment contradict the second owner decision (W1 below).

## Issues by priority

### CRITICAL

None.

### WARNING

- **W1. The README and the `generateRoom` doc comment say a room in progress goes on 10 to 30 minutes.**
  - `dashboard-ce/tools/data-generator/README.md:218-219` says "A room planned active goes on 10 to 30 minutes after
    the generation instant, or less when its server stops or is lost first". `src/model.ts:508-509` says it "goes on
    for 10 to 30 minutes after it, unless its server ends it earlier".
  - The second owner decision (`design.md:74-75`, `operations.md`, `proposal.md`) says something different: only the
    last session is stretched to 10–30 min, and a room whose other session drew a longer life (up to 90 min) stays
    open until that session leaves. The scenario's THEN at `spec.md:59-61` allows exactly that. So such rooms can last
    well past T + 30 min, which the two texts deny.
  - The Definition of Done item "README reflects the change" is therefore not fully met.
  - Recommendation: in both places, say that the participant who keeps the room open stays 10 to 30 minutes after the
    instant and the room closes after its sessions' last leave, as `proposal.md:22-23` puts it. The comment at
    `src/model.ts:535-536` ("Until when what is open … goes on") can stay, since it describes `openUntil`.

### SUGGESTION

None.

## Definition of Done (CE `AGENTS.md`), items affected by the diff

| Item | Status |
| --- | --- |
| All tasks checked | Met for groups 1 to 4 (1.4 included). 5.1, 6.1, 7.1 and 7.2 are pending (owner and orchestrator, after verification). |
| `scenarios` finds a passing test for every delta scenario | Partly verified: 26/26 have a test. The 2 of `demo-data-mode.test.mjs` passed in the orchestrator's `check`; the other 24 passed in the implementer's recorded `test-live` run at `b7acfd554`. Neither run is checked here. |
| `./dashboard.sh check` passes locally | Recorded (orchestrator, `b7acfd554`), not rerun here. |
| CI run of the push is green | Pending (task 6.1). |
| Backend changes: `test-integration` passes | Met (372 tests at the verified commit). |
| Data generator changes: `test-live` passes | Recorded in `operations.md` (30 tests at `b7acfd554`), not verified here. |
| Latest verification report has no CRITICAL; refactor review applied or recorded | Met. |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` files reflect the change | Not met: generator README on the length of the rooms in progress (W1). |
| Change archived | Pending. |

## Final assessment

No critical issues found in the checks that ran. 1 warning, 0 suggestions. Both findings of the previous report are
resolved, and the reworked W3 test still covers W3.

Not verified: `./dashboard.sh test-live`, and with it 24 of the 26 scenarios as passing, because the guard of this
PRO-started session blocks the command. The implementer's run of 30 passing tests at `b7acfd554`, which matches the code
at the verified commit, is recorded in `operations.md`. `./dashboard.sh check` was not rerun here; the orchestrator's
passing run at `b7acfd554` is recorded.
