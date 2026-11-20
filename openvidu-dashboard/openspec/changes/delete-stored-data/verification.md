# Verification Report: delete-stored-data

- Date: 2026-11-20
- Mode: incremental
- Verified commit: `8ece618ca2ed6dc7ec951fec7713e2f3e878bc3b` (HEAD, working tree clean, nothing pushed)
- Starts from: `f0e2158846825bf7bb6673c8e900754f7db72882` (full verification and code review of that commit)
- Diff reviewed: `git diff f0e2158..HEAD`, 14 commits from 13d9207d2 to 8ece618ca, with the artifact updates of
  ebc0b26ab and 8ece618ca. This report supersedes the previous `verification.md` and carries what is still open from
  `code-review.md`.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 54/59 tasks. Groups 1–11 are checked, including the verification fixes 11.1–11.10. Group 12 `(orchestrator)`, the documentation on `next` of openvidu.io at publish time, is pending and not a finding. 42 ADDED/MODIFIED requirements (one new: "No deletion during the migration"), all found in the code. No REMOVED or RENAMED requirements |
| Correctness  | 42/42 requirements implemented. 125/125 scenarios have a test (`./dashboard.sh scenarios`). The 3 new scenarios ("Deletion during the migration refused", "Room ended under a longer retention", "No completion toast on Preferences") have tests that ran and passed. The 3 e2e-only scenarios remain Not verified locally (no Playwright Chromium on Ubuntu 20.04) |
| Coherence    | Design followed. The design was updated to what the fixes built. 1 new suggestion |

## Commands run

| Command | Result |
| --- | --- |
| `echo spec-verifier-guard-probe` | Blocked by the guard with its own message: guard active |
| `./dashboard.sh check` | Pass: lint, icons, format, typecheck, `openspec validate --all --strict` (31 items, `change/delete-stored-data` included), tooling 137/137, typings 112/112, backend unit 272/272 (+2), dashboard-ui 704/704 (+2), frontend 1/1 |
| `./dashboard.sh scenarios delete-stored-data` | 125 scenarios, 0 without a test |
| `./dashboard.sh test-integration` | Pass: 26 files, 334 tests (+4; projects `integration` and `integration-plans`, Docker MongoDB, none skipped) |
| `./dashboard.sh e2e` | **Not verified**: not run. Playwright 1.65 ships no Chromium for Ubuntu 20.04, and the owner accepted the CI `e2e` job (`operations.md`). The changed backend e2e test was judged by reading it |
| contract check, image build and smoke | Not applicable: `contract/` and `schema/` are unchanged, and the diff has no dependency or image change |
| CI of the push | Pending (nothing pushed yet) |

## Earlier findings

### Code review (`code-review.md`)

| Finding | Status | Evidence |
| --- | --- | --- |
| C1 The kept sets, read by `expiresAt` alone, keep entities that ended long ago after a retention cut | **Resolved** | `dashboard-ce/backend/src/deletions/deletion-runner.ts:82-105` reads rooms with `{ expiresAt ≥ T + R, endedAt ≥ T }` and egresses with `{ expiresAt ≥ T + R, $or: [endedAt ≥ T, (no endedAt, updatedAt ≥ T)] }`, still hinted on `expiresAt_ttl` (`:107-113`), as the updated design states ("What each class deletes", Risks). The new scenario "Room ended under a longer retention" is tested at `deletions-rules.test.ts:102`. Its room and egress, with sessions, tracks, subscriptions, events and stats, ended 40 days ago with a 90-day `expiresAt`, and the current retention is 30 days. The test asserts that nothing remains, which the old filter would fail. The query-plan test `deletions-query-plan.test.ts:165-178` asserts that the reads use only `expiresAt_ttl` and examine no more than the `expiresAt` candidates. Both passed |
| W1 Completion toast on the Preferences tab | **Resolved** | `data-tab.ts:241` drops the watched job when the tab becomes inactive, and `:294` watches a job only while `active()`. The spec "Deletion outcome on the Data tab" is amended. Its scenario "No completion toast on Preferences" is covered by `settings-page.spec.ts:1279` (Settings opened on Preferences) and `:1294` (Data left for Preferences), and both assert that no toast shows. "Deletion completed while watching" still passes |
| W2 The time-series batch plan bound is too loose | **Resolved** | `deletions-query-plan.test.ts:105-147` bounds `maxDocsExamined` by twice the buckets that start before the batch's 5,000th measurement plus one bucket span, and asserts that bound is below the collection's bucket count. The `deleteMany` is explained once, with no collection scan and at most that many buckets examined. The design records it (Performance budget). Passed at scenario S |
| S1 Two dashboards with one host name interrupt each other | **Accepted** | The design records it under Risks (code review S1, 2026-11-20): containers and pods have unique host names. Not counted as open |
| S2 The API accepts a deletion while the migration runs | **Resolved** | `deletion-service.ts:40-47` answers `409` "Available once the migration ends" for every class, before the legacy window and the lock. The OpenAPI description is updated (`deletion-routes.ts:22`). The new requirement "No deletion during the migration" has one scenario, covered by `deletions-api.test.ts:279` (events and all: no job starts, events kept) and `:297` (checked before the lock of a running job). "Legacy refused while the migration runs" has the new message (`:329`). The design records it as an owner decision of 2026-11-20 |
| S3 An in-flight storage read puts stale figures back in the cache | **Resolved** | `info-service.ts:157,167,238,254` adds a generation counter that every clear increments, and a read whose generation no longer matches does not store its figures. The unit test `info-storage-cache.test.ts` holds a `$collStats` read and clears the cache through `FigureCaches.observe`. It then asserts that the next read goes to the database and that its figures are cached |
| S4 A failed record write fails the job without retries | **Resolved** | `deletion-runner.ts:196-201` sends the progress, completion and finish writes through `retry()`, and the record of a failed job goes the same way (`:291-294`). The unit test "retries a record write that fails once, like a batch" (`deletion-runner.test.ts:103`) asserts that every event is deleted and the job finishes `completed`. New SUGGESTION 1 describes a side effect |

### Previous verification (`verification.md`)

| Finding | Status | Evidence |
| --- | --- | --- |
| S1 Stale example "collection 2 of 5" | **Resolved** | `deletion-texts.ts:139` now reads "collection 2 of 9" |
| S2 The backend e2e deletion leaves later suites and its own retry without events | **Resolved** (by reading) | `e2e/tests-backend/deletions.spec.ts` inserts 12 events of its own on each attempt: ids unique per run, a day old, no room. It snapshots the seeded events, puts the missing ones back in `finally`, and asserts that its own events are gone. The test finds the database through `backendDatabaseFile()`, which `serve-dashboard.mjs` writes, as documented in `e2e/AGENTS.md`. The seeded collections have no validator, so the inserts are accepted. Not run here |
| S3 Completion toast on another Settings tab | **Resolved** (same as code review W1) | See W1 above |
| S4 Pinned digest in "Contract unchanged" | **Resolved** | `typings/test/contract.test.ts:68-88` compares `schema/` with what the contract sources generate and `contract_version.txt` with `SCHEMA_VERSION`. It also checks that the `schema_meta` dashboard variant stays open, with only `_id` required. It no longer blocks a later contract change, and the design records why. Passed |
| S5 The task text differs from what was built | **Resolved** | In `tasks.md`, task 2.3 now says scenario S by default, M with `DELETIONS_PLAN_SCENARIO=M`. Task 2.4 names `backend/test/unit/deletion-runner.test.ts` |

## Review of the diff since `f0e2158`

- Specs and design. The delta specs gain:
  - the requirement "No deletion during the migration", with 1 scenario;
  - the scenario "Room ended under a longer retention";
  - the scenario "No completion toast on Preferences";
  - new wording for the outcome requirement;
  - a new message in "Legacy refused while the migration runs".

  The design states each fix as built: the kept-set residual predicates, the migration `409`, the toast only while the
  tab is active, the record-write retries, the stats batch bound, the e2e and contract test changes, the S1 acceptance
  and the corrected C1 risk. The code matches every one of them.
- Edition seams and contract. Everything stays CE and generic. The runner module exports `keptSetQueries()` and
  `keptSetCursor()` for the plan test. `contract/`, `schema/` and the schema version are unchanged.
- Secrets, language and comments. Everything is in English, with no secrets. The e2e database file holds the MongoDB
  URI of the throwaway test container, in the OS temp folder.
- CHANGELOG. No new line, and none is needed: the deletions feature is unreleased and already has its lines. The
  migration `409` refines the same "Deletions API" entry.
- Commits follow `openvidu-dashboard: …, change delete-stored-data`.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **A retried final write that already applied is logged as a takeover**:
   `dashboard-ce/backend/src/deletions/deletion-runner.ts:196-201`, `:269`. Suppose
   `records.finish(job.id, { state: 'completed' })` reaches the server but its reply is lost, and the driver's own
   retryable write does not absorb it. The `retry()` added for S4 then runs the write again. The record is no longer
   `running`, so `update` returns `false`, and the runner logs "another instance took over its record" for a job that
   completed. The record itself is right (`completed`, classes stamped), so only the log line misleads, and the case is
   narrow. Recommendation: accept it, or treat a `false` from a retried `finish` as success when the record already reads
   `completed` with this job id.

## Definition of Done (`AGENTS.md`), items affected by the diff

| Item | Status |
| --- | --- |
| All tasks checked | Not met yet. Only group 12 `(orchestrator)` is open, and it comes after this verification (pending) |
| `scenarios` finds a passing test for every delta scenario | Partly met. 125/125 scenarios have a test, and the 3 new ones passed. 3 scenarios are covered only by e2e tests that did not run here (CI `e2e` job pending) |
| `./dashboard.sh check` passes locally | Met |
| CI run of the push is green | Pending (not pushed) |
| Backend changes: `test-integration` passes | Met (334/334) |
| UI changes: `e2e` passes, with axe and both themes | Not verified locally (no Chromium for Ubuntu 20.04). The owner accepted the CI `e2e` job |
| Data contract changes: `contract-check` | Not applicable |
| Image or runtime dependency changes | Not applicable |
| Latest verification reports have no CRITICAL | Met. Code review C1 is resolved, and this report has no CRITICAL |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met (`e2e/AGENTS.md` documents `backendDatabaseFile()`) |
| Change archived | Pending |

## Final assessment

Every finding of both earlier reports is resolved, except code review S1, which the design records as accepted. Nothing
regressed: `check`, `scenarios` and `test-integration` pass. No critical issues found in the checks that ran.

Not verified: `./dashboard.sh e2e`, because Playwright 1.65 ships no Chromium for Ubuntu 20.04. The owner accepted the
CI `e2e` job for what it covers:

- the e2e-only scenarios "Delete buttons on a phone", "Dialog on a phone" and "Link tip on a phone";
- the e2e details of "Events dialog", "Total with the legacy checkbox" and "Events deletion accepted";
- the rewritten backend e2e deletion test.

Still pending: the CI run of the push, group 12 and the archive. 0 warnings, 1 suggestion to consider.

Open issues: CRITICAL 0, WARNING 0, SUGGESTION 1.
