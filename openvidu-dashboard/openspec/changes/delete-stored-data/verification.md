# Verification Report: delete-stored-data

- Date: 2026-11-20
- Mode: incremental
- Verified commit: `b18d3e32f476970ab317d2d098248083608186e5` (HEAD, working tree clean, nothing pushed)
- Starts from: `8ece618ca2ed6dc7ec951fec7713e2f3e878bc3b`, the commit the previous incremental report verified
- Diff reviewed: `git diff 8ece618ca..HEAD`, two commits:
  - ee4a51170, the previous report itself;
  - b18d3e32f, the fix of that report's only suggestion, in `deletion-runner.ts` and `deletion-runner.test.ts`.

  This report supersedes the previous `verification.md`. It carries what was still open from `code-review.md`, and
  nothing was.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 54/59 tasks. Groups 1–11 are checked. Group 12 `(orchestrator)`, the documentation on `next` of openvidu.io, is pending and comes after this verification, so it is not a finding. 42 ADDED/MODIFIED requirements, unchanged by the diff. No REMOVED or RENAMED requirements |
| Correctness  | 42/42 requirements implemented. 125/125 scenarios have a test (`./dashboard.sh scenarios`). The 3 e2e-only scenarios are Not verified locally: there is no Playwright Chromium for Ubuntu 20.04 |
| Coherence    | The design is followed: "the record writes ... are retried the same way" (design.md:215-216) still holds. 1 new suggestion, the narrower remainder of the earlier one |

## Commands run

| Command | Result |
| --- | --- |
| `echo spec-verifier-guard-probe` | Blocked by the guard with its own message, so the guard is active |
| `./dashboard.sh check` | Pass. It covers lint, icons, format, typecheck and `openspec validate --all --strict` (31 items). Tests: tooling 137/137, typings 112/112, backend unit 273/273 (one more, the new runner test), dashboard-ui 704/704, frontend 1/1 |
| `./dashboard.sh scenarios delete-stored-data` | 125 scenarios, 0 without a test |
| `./dashboard.sh test-integration` | Pass: 26 files, 334 tests (projects `integration` and `integration-plans`, Docker MongoDB) |
| `./dashboard.sh e2e` | **Not verified**, because it was not run. Playwright 1.65 ships no Chromium for Ubuntu 20.04, and the owner accepted the CI `e2e` job instead. The diff touches no frontend or e2e file |
| contract check, image build and smoke | Not applicable. The diff has no contract, schema, dependency or image change |
| CI of the push | Pending, because nothing is pushed yet |

## Earlier findings

### Previous verification (`verification.md` of 8ece618ca)

| Finding | Status | Evidence |
| --- | --- | --- |
| S1 A retried final write that already applied is logged as a takeover | **Resolved for the path it described**, with a remainder (new SUGGESTION 1) | `dashboard-ce/backend/src/deletions/deletion-runner.ts:271-279` checks the record when `records.finish` returns `false`. The finish counts as done when `records.read()` shows `deletion.id === job.id` and `state === 'completed'`, so the runner logs "Deletion completed". `records` in `DeletionRunnerOptions` now includes `read` (`:144`). Production passes the full `DeletionRecordsStore` (`di/container.ts:93-97`), and typecheck passes for every constructor. The new unit test (`deletion-runner.test.ts:141-173`) runs a first finish that rejects and a retry that returns `false`. With a record completed by the same job, it asserts "Deletion completed" and no "took over". With a record running another job, it asserts exactly one takeover line. It passed |

### Code review (`code-review.md`)

Nothing was open. C1, W1, W2 and S2–S4 are resolved, and S1 (two dashboards with one host name) is accepted in the
design under Risks. The diff changes none of them. The S4 retry behaviour still holds: "retries a record write that
fails once, like a batch" passed.

## Review of the diff since `8ece618ca`

- Specs and design: no artifact changed except this report. The fix stays within the design ("Record writes are
  retried like a batch") and does not change any requirement or scenario.
- Correctness of the fix:
  - It reads `schema_meta` only after a `finish` that returned `false`, so the normal path is unchanged.
  - A read error inside the attempt goes through the same `retry()` as the write.
  - A record taken over by another job (different id or still `running`) still stops the runner and logs the
    takeover.
- Edition seams, contract, secrets, language: all CE and generic, in English, with no secrets. `contract/` and
  `schema/` are unchanged.
- CHANGELOG: no line needed. This is an internal log fix of an unreleased feature that already has its entry.
- Commit b18d3e32f follows `openvidu-dashboard: …, change delete-stored-data`.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **A slow lost reply can still end as a takeover log**:
   `dashboard-ce/backend/src/deletions/deletion-runner.ts:211-218`, `:202-205`, `:368`. The fix runs only when the
   retried `finish` itself executes. The failure case:
   1. The first `finish` applies on the server, but the call fails only after the driver's timeout (seconds, often
      more than `HEARTBEAT_MS` = 10 s).
   2. Meanwhile the heartbeat runs `records.heartbeat(job.id)`. The record is no longer `running`, so the heartbeat
      gets `false` and sets `lost = true`.
   3. `retry()` sleeps and calls `check()` (`:368`), which throws `Stop('lost')` before the retry that would read the
      record.

   The runner then logs "another instance took over its record" for a job that completed. The same can happen when a
   heartbeat lands within the 1 s retry delay. The record is still right (`completed`, classes stamped): only the log
   line misleads, and the new unit test does not reach this path (the rejection is immediate and no heartbeat fires).

   Recommendation: accept it, or apply the same record check before the takeover warning. In the `Stop('lost')`
   branch at `:283-285`, read the record, and log the completion instead when it shows this job `completed`.

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

The previous report's only suggestion is resolved for the path it described, and the new unit test covers that path.
Nothing regressed: `check`, `scenarios` and `test-integration` pass. No critical issues found in the checks that ran.
One narrower remainder is reported as a new suggestion: a takeover log line after a slow lost reply.

Not verified: `./dashboard.sh e2e`, because Playwright 1.65 ships no Chromium for Ubuntu 20.04. The owner accepted the
CI `e2e` job for the e2e-only scenarios "Delete buttons on a phone", "Dialog on a phone" and "Link tip on a phone", and
for the e2e details of the other scenarios. Still pending: the CI run of the push, group 12 and the archive. 0
warnings, 1 suggestion to consider.

Open issues: CRITICAL 0, WARNING 0, SUGGESTION 1.
