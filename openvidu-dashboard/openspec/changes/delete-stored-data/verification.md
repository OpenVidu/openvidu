# Verification Report: delete-stored-data

- Date: 2026-11-20
- Mode: full
- Verified commit: `f0e2158846825bf7bb6673c8e900754f7db72882` (44 commits on `origin/master` = `b99385028`, working tree
  clean, nothing pushed)

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 43/48 tasks: the 5 open ones are group 11, `(orchestrator)`, done at publish time after this verification (pending, not findings). 41 ADDED/MODIFIED requirements in 8 delta specs, all found in the code; no REMOVED or RENAMED requirements |
| Correctness  | 41/41 requirements implemented; 122/122 scenarios have a test (`./dashboard.sh scenarios`). 119 are covered by unit or integration tests that ran and passed. 3 are covered only by e2e tests that never ran: Not verified (no Playwright Chromium on Ubuntu 20.04) |
| Coherence    | Design followed (records, lock, filters, runner, caches, UI decisions as built); 5 suggestions |

## Commands run

| Command | Result |
| --- | --- |
| `echo spec-verifier-guard-probe` | Blocked by the guard with its own message: guard active |
| `./dashboard.sh check` | Pass: lint, icons, format, typecheck, `openspec validate --all --strict` (31 items, `change/delete-stored-data` included), tooling 137/137, typings 112/112, backend unit 270/270, dashboard-ui 702/702, frontend 1/1 |
| `./dashboard.sh scenarios delete-stored-data` | 122 scenarios, 0 without a test |
| `./dashboard.sh test-integration` | Pass: 26 files, 330 tests (projects `integration` and `integration-plans`, Docker MongoDB, none skipped) |
| `./dashboard.sh e2e` | **Not verified**: not run. Playwright 1.65 ships no Chromium for Ubuntu 20.04, and the owner accepted the CI `e2e` job as the validation (`operations.md`, Owner decisions). The new e2e tests were judged by reading them only |
| contract check, image build and smoke | Not applicable. `contract/` and `schema/` are unchanged and the "Contract unchanged" test passed. No dependency or image change (no `package.json`, lockfile or `docker/` in the diff) |
| CI of the push | Pending (nothing pushed yet) |

## Completeness

### Tasks

- Groups 1–10 checked, including the owner's demo review (10.1, approved on 2026-11-20, recorded in `operations.md`).
- Group 11 (11.1–11.5, the documentation on `next` of OpenVidu/openvidu.io) is unchecked. It is an `(orchestrator)` group that
  comes after this verification, so it is pending and not a finding. The dialog and free space tip link
  (`#freeing-disk-space`) only resolves once 11.3 is published. The design already asks for the anchor to be checked
  there.

### Spec coverage (ADDED / MODIFIED requirements)

| Capability | Requirements | Implementation |
| --- | --- | --- |
| deletions-api (15 ADDED) | Start, one at a time, legacy window, data kept, detail classes, Entities cascade, rollups, Total, pace, job in status, interrupted, failed, last deletion, figures refreshed, log | `backend/src/deletions/` (plan, records, runner, service, routes, schemas, figure caches), `lifecycle/startup.ts` (restart hook), `di/container.ts` |
| settings-about (1 MODIFIED, 14 ADDED) | Estimate from the space in use; free line, tip, pending notice, re-reads, buttons, disabled states, ten dialogs, confirm, progress, outcome, last deletion line | `features/settings/data-tab.{ts,html,scss}`, `storage-classes.ts`, `deletion-texts.ts`, `format/deletions.ts` |
| ui-building-blocks (2 ADDED) | Confirmation dialog; info tip with a link | `components/confirm-dialog/confirm-dialog.ts`, `components/info-tip/info-tip.ts` |
| ui-shell (3 MODIFIED, 1 ADDED) | Banner slot, status poll (2 s while a deletion runs), info re-read on a job change, deletion banner | `core/refresh/server-status.ts`, `core/refresh/refresh.ts` (`delay()`), `shell/banner-slot.ts` |
| editions-info (2 MODIFIED) | `deletions` and `freeBytes` (data plus index reusable bytes) in info, the two storage cache boundaries | `info/info-service.ts`, `info/info-routes.ts` |
| status-api (1 ADDED) | `deletion` in the status, judged stale after 60 s by the MongoDB clock, within the existing reads | `status/status-service.ts`, `status/status-routes.ts` |
| api-conventions (1 MODIFIED) | `deletions` resource | `deletions/deletion-routes.ts` |
| data-model (1 ADDED) | Records in `schema_meta` `_id: "dashboard"`, contract unchanged | `typings/src/data-model/system.ts`, `deletions/deletion-records.ts`; no change in `typings/contract/` or `schema/` |

## Correctness

### Requirement mapping (highlights checked against the spec text)

- Filters (`deletion-plan.ts:159-205`) match the design table: grace T = cutoff − 5 min, the kept sets read once through
  `expiresAt_ttl` (`deletion-runner.ts:69-111`), rollup bounds `floor(cutoff) − 1 bucket` (at 10:07 this keeps 10:00 and 10:05,
  09:00 and 10:00, yesterday and today), and Tracks keeps only stats without `meta.trackSid`. Nodes are never planned.
- Lock (`deletion-records.ts:143-221`): the stale job is marked first under `$$NOW`, then a conditional upsert runs. A
  duplicate key reads as "already running". The restart hook (`markRestarted`) keys on the host name.
- Runner (`deletion-runner.ts`): batches of 5,000 by `_id` with a hint, time-bounded batches on a time-series
  `track_stats`, a 100 ms pause, a 10 s heartbeat, 3 retries 1 s apart, code 13 failing at once, a takeover stop through
  every record write, a class completion recorded after its last collection, start and end log lines carrying the request id.
- Caches (`figure-caches.ts`, `info-service.ts:226-249`): storage and Analytics caches are cleared at the first read that
  finds a newer completion. The second boundary (`finishedAt + 60 s`) is enforced, and an extending edition can register
  more clears through `TOKENS.FigureCaches`, which is exported.
- UI: the Data tab baseline is set by the first status after an opening (`data-tab.ts:229-275`), a 65 s second read is
  cancelled on leaving, a free line shows only with `completed` and ≥ 1 MB, the Total sums the shown rows, the Legacy row never
  shows one, and the estimate uses `bytes − freeBytes`. The poll runs every 2 s while a deletion runs and the shortest
  cadence wins.

### Scenario coverage

Each scenario's test was read against its THEN clause. All assert what the scenario states. A few notes:

- "Keyboard confirmation" (`confirm-dialog.spec.ts:81`) checks the focus trap anchors and the tab order, then clicks
  instead of pressing Enter (a jsdom limit). The e2e "Events dialog: flow" checks Cancel focused and focus returned on a
  real browser, but it has not run.
- "Database user without delete rights" uses a `Db` proxy that throws code 13 (the author's decision, `operations.md`).
- "Storage read again after the release" (`api.test.ts:830`) uses the dashboard's injected clock against a MongoDB
  `finishedAt`, as the design states.
- Covered only by e2e, so Not verified locally: "Delete buttons on a phone", "Dialog on a phone" and "Link tip on a phone"
  (`e2e/tests/settings.spec.ts:182`, `:203`, `:316`). Also only e2e: the details "Events dialog: flow with axe in both themes",
  "Total with the legacy checkbox: the dialog content does not scroll on …" and "Events deletion accepted: against the real
  backend". Their base scenarios also have unit or integration tests that passed.

## Coherence

- Design decisions (owner table, details table, records, API, the class table, runner, caches, UI as built) match the code.
  Where the design records an "as built" choice, the code follows it: `CHECKPOINT_MS`, `newestCompletion`, the
  `active` input, checkbox margins, the table layout and `delay()`.
- Edition seams: everything new is CE. The backend exports the records store, the judge and serializers, the schemas and
  `FigureCaches` (`backend/src/index.ts`). `ConfirmDialogService` is exported from the library.
- Data contract: no change to `contract/`, `schema/` or the schema version. Only `SchemaMetaDashboard` gains typed fields. No
  secret is stored: the job record has the host name, process start and request id.
- Language, comments and CHANGELOG: English throughout. The CHANGELOG has lines under `Added › UI` (the banner, the
  deletions, the legacy drop, free space), `Added › Data` (deletions API) and `Improved › UI` (the estimate), written in the
  commits of their changes as the owner decided. Commit messages follow
  `openvidu-dashboard: …, change delete-stored-data`.
- AGENTS.md: backend (the `deletions/` slice, the only writes to the analytics database, `DELETIONS_PLAN_`), e2e (mock
  `POST deletions`, `finishDeletion()`), frontend (confirmation dialog convention) and the library README (info tip with a
  link, confirmation dialog) are updated. Root `AGENTS.md` and `README.md` need no change: no new command, path, variable or
  image change.

## Issues by priority

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **Stale example in a comment**: `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/settings/deletion-texts.ts:139`
   still gives "Deleting Entities: … · collection 2 of 5", but Entities has 9 collection steps (the author's decision,
   `operations.md` 2026-11-19 19:55). Recommendation: change the example to "collection 2 of 9".
2. **The backend e2e deletion leaves later suites and its own retry without events**:
   `dashboard-ce/e2e/tests-backend/deletions.spec.ts:19-31` deletes the seeded events of the one shared database. It is the
   first file alphabetically with `workers: 1`, so every later backend suite runs without those events (none asserts on
   events today). With `retries: ci ? 1 : 0` (`dashboard-ce/e2e/playwright.backend.config.ts:11`), a retry after a first
   attempt that got as far as deleting cannot pass: `count()` no longer drops below `before`, because only kept events remain.
   Recommendation: make the test independent of earlier runs, for example by inserting its own deletable events before it
   starts, or run it last and mark it as not retried.
3. **The completion toast fires while another Settings tab is selected**:
   `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/settings/data-tab.ts:282-300`. The Material tab group keeps
   the Data tab component alive, so a job the Data tab showed running announces its end even after the user switched to
   Preferences. The design's outcome row says "Toast at the end in sessions with Data open". Recommendation: guard the toast
   with `this.active()`, or record in the design that "Data open" includes the other Settings tabs.
4. **A pinned digest outlives the change**: `dashboard-ce/typings/test/contract.test.ts:72-73` pins the SHA-256 of
   `schema/` and schema version 2 under the scenario title "Contract unchanged". The next legitimate contract change will
   fail this test until someone updates it, which the comment states. Recommendation: accept it as is, or retire the test
   when the change is archived. The existing generated-file checks already guard `schema/` against hand edits.
5. **The task text differs from what was built**: in `openspec/changes/delete-stored-data/tasks.md:12`, task 2.3 says
   "on a scenario M dataset", but `deletions-query-plan.test.ts:18` defaults to S with M through
   `DELETIONS_PLAN_SCENARIO=M`, which matches the design (Performance budget). Task 2.4 names
   `backend/src/deletions/deletion-runner.test.ts`, but the test is in `backend/test/unit/deletion-runner.test.ts`, as in
   the design's test strategy. Recommendation: none needed before archive. Optionally align the task wording.

## Definition of Done (`AGENTS.md`)

| Item | Status |
| --- | --- |
| All tasks checked | Not met yet. Only group 11 `(orchestrator)` is open, and it comes after this verification (pending) |
| `scenarios` finds a passing test for every delta scenario | Partly met. Every scenario has a test. Those that ran passed, but 3 scenarios are covered only by e2e tests that did not run here (CI `e2e` job pending) |
| `./dashboard.sh check` passes locally | Met |
| CI run of the push is green | Pending (not pushed) |
| Backend changes: `test-integration` passes | Met (330/330) |
| UI changes: `e2e` passes, with axe and both themes | Not verified locally (no Chromium for Ubuntu 20.04). The owner accepted the CI `e2e` job (`operations.md`). The suites include axe in both themes and 375 px checks |
| Data contract changes: `contract-check` | Not applicable (no contract change) |
| Image or runtime dependency changes: `build-image`, `smoke-image` | Not applicable (no dependency or image change) |
| Latest verification reports have no CRITICAL; refactor review applied or recorded | Met. This report has no CRITICAL. The refactor reviews are recorded in tasks 8.2 and 9.6. No `code-review.md` was in the change folder at the time of this verification |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` files reflect the change | Met (README unaffected) |
| Change archived | Pending |

## Final assessment

No critical issues found in the checks that ran. Not verified: `./dashboard.sh e2e`, so the e2e-only scenarios
"Delete buttons on a phone", "Dialog on a phone" and "Link tip on a phone", plus the e2e details of "Events dialog",
"Total with the legacy checkbox" and "Events deletion accepted". Reason: Playwright 1.65 ships no Chromium for Ubuntu
20.04. The owner accepted the CI `e2e` job as their validation. Still pending: the CI run of the push, group 11 (documentation
on `next` of openvidu.io) and the archive. 0 warnings, 5 suggestions to consider.

Open issues: CRITICAL 0, WARNING 0, SUGGESTION 5.
