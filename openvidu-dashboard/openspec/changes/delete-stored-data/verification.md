# Verification Report: delete-stored-data

- Date: 2026-11-20
- Mode: incremental
- Verified commit: `9f4637e8bf7e6aaec3ca24b684145abdd2d10610` (HEAD, working tree clean, nothing pushed)
- Starts from: `b18d3e32f476970ab317d2d098248083608186e5`, the commit the previous incremental report verified
- Diff reviewed: `git diff b18d3e32f..HEAD`, two commits:
  - 35ed892e0, the previous report itself (only `verification.md`);
  - 9f4637e8b, the fix of that report's only suggestion, in `deletion-runner.ts` and `deletion-runner.test.ts`.

  This report supersedes the previous `verification.md`. It carries what was still open from `code-review.md`, and
  nothing was.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 54/59 tasks. Groups 1–11 are checked. Group 12 `(orchestrator)`, the documentation on `next` of openvidu.io (committed locally there, awaiting review, not pushed), is pending and comes after this verification, so it is not a finding. 42 ADDED/MODIFIED requirements, unchanged by the diff. No REMOVED or RENAMED requirements |
| Correctness  | 42/42 requirements implemented. 125/125 scenarios have a test (`./dashboard.sh scenarios`). The 3 e2e-only scenarios are Not verified locally: there is no Playwright Chromium for Ubuntu 20.04 |
| Coherence    | The design is followed ("the record writes ... are retried the same way", design.md:215-216). No new issue |

## Commands run

| Command | Result |
| --- | --- |
| `echo spec-verifier-guard-probe` | Blocked by the guard with its own message, so the guard is active |
| `./dashboard.sh check` | Pass. It covers lint, icons, format, typecheck and `openspec validate --all --strict` (31 items). Tests: tooling 137/137, typings 112/112, backend unit 274/274 (one more, the new runner test), dashboard-ui 704/704, frontend 1/1 |
| `./dashboard.sh scenarios delete-stored-data` | 125 scenarios, 0 without a test |
| `./dashboard.sh test-integration` | Pass: 26 files, 334 tests (projects `integration` and `integration-plans`, Docker MongoDB) |
| `./dashboard.sh e2e` | **Not verified**, because it was not run. Playwright 1.65 ships no Chromium for Ubuntu 20.04, and the owner accepted the CI `e2e` job instead. The diff touches no frontend or e2e file |
| contract check, image build and smoke | Not applicable. The diff has no contract, schema, dependency or image change |
| CI of the push | Pending, because nothing is pushed yet |

## Earlier findings

### Previous verification (`verification.md` of b18d3e32f)

| Finding | Status | Evidence |
| --- | --- | --- |
| S1 A slow lost reply can still end as a takeover log | **Resolved** | `dashboard-ce/backend/src/deletions/deletion-runner.ts:211-216` adds `completedHere()`, which reads the record and is true only when `deletion.id === job.id` and `state === 'completed'`. The retried finish uses it (`:277`), and so does the `Stop('lost')` branch (`:282-286`). When the record shows this job completed, the branch logs "Deletion completed" instead of the takeover warning. A read error there counts as not completed (`.catch(() => false)`), so the branch falls back to the takeover warning and never throws out of `run()`. The new unit test (`dashboard-ce/backend/test/unit/deletion-runner.test.ts:175-212`) reproduces the reported path with fake timers. The first `finish` rejects after `HEARTBEAT_MS + 1 s`, and the heartbeat returns `false` at `HEARTBEAT_MS`. `retry()` then calls `check()` (`deletion-runner.ts:368-369`), which throws `Stop('lost')` before a second finish. The test asserts `finishes === 1`, so the retry never ran and the path is the new branch. It also asserts a "Deletion completed" info line and no "took over" line. Without the fix the branch would log the warning, so the test would fail. It passed |

### Code review (`code-review.md`)

Nothing was open. C1, W1, W2 and S2–S4 are resolved, and S1 (two dashboards with one host name) is accepted in the
design under Risks. The diff changes none of them.

## Review of the diff since `b18d3e32f`

- Specs and design: no artifact changed except the previous report. The fix only changes a log line on one recovery
  path and does not change any requirement, scenario or record write.
- Correctness of the fix:
  - The record check runs only after `Stop('lost')`, so the normal path and the shutdown path (`Stop('shutdown')`,
    which leaves the job running so it reads interrupted) are unchanged.
  - A real takeover still logs the warning. The record then holds another job's id, or this job still `running`, so
    `completedHere()` is false. The existing takeover tests pass: "stops when its record is no longer its running
    job" (`deletion-runner.test.ts:214`) and the other-job case of the earlier retried-finish test.
  - No double log. The success path logs and returns without throwing, and the new branch runs only from the catch.
  - The refactor of the retried finish (`:277`) keeps the old semantics: `finish` first, then the record read only
    when `finish` returns `false`.
- Tests: `HEARTBEAT_MS` was already exported (`deletion-runner.ts:25`). The test restores real timers in `finally`.
- Edition seams, contract, secrets, language: all CE and generic, in English, with no secrets. `contract/` and
  `schema/` are unchanged.
- CHANGELOG: no line needed. This is an internal log fix of an unreleased feature that already has its entry.
- Commit 9f4637e8b follows `openvidu-dashboard: …, change delete-stored-data`.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

None.

## Definition of Done (`AGENTS.md`), items affected by the diff

| Item | Status |
| --- | --- |
| All tasks checked | Not met yet. Only group 12 `(orchestrator)` is open, and it comes after this verification (pending) |
| `scenarios` finds a passing test for every delta scenario | Partly met. 125/125 scenarios have a test. 3 scenarios are covered only by e2e tests that did not run here (CI `e2e` job pending) |
| `./dashboard.sh check` passes locally | Met |
| CI run of the push is green | Pending (not pushed) |
| Backend changes: `test-integration` passes | Met (334/334) |
| UI changes: `e2e` passes, with axe and both themes | Not verified locally (no Chromium for Ubuntu 20.04). The owner accepted the CI `e2e` job. The diff has no UI change |
| Latest verification reports have no CRITICAL | Met |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met. The diff needs no change to them |
| Change archived | Pending |

## Final assessment

The previous report's only suggestion is resolved. The new unit test reproduces its exact path, a heartbeat that finds
the job ended while a slow finish that applied is still failing, and it passed. Nothing regressed: `check`,
`scenarios` and `test-integration` pass. No critical issues found in the checks that ran.

Not verified: `./dashboard.sh e2e`, because Playwright 1.65 ships no Chromium for Ubuntu 20.04. The owner accepted the
CI `e2e` job for the e2e-only scenarios "Delete buttons on a phone", "Dialog on a phone" and "Link tip on a phone", and
for the e2e details of the other scenarios. Still pending: the CI run of the push, group 12 and the archive.

Open issues: CRITICAL 0, WARNING 0, SUGGESTION 0.
