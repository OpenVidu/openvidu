# Tasks

## 1. Typings (implementer)

- [x] 1.1 Add the deletion API types to `dashboard-ce/typings/src/api/`: `DeletionClass`, `DeletionClassKey`, `DeletionJob`, `DeletionRecord`, `StartDeletionRequest`; `deletion?` in the status response, `deletions` in `InfoResponse`, `freeBytes` in `InfoStorageEntry`; export them. Verify with `./dashboard.sh check` (typecheck and the typings contract tests).
- [x] 1.2 Add `deletion?` and `deletions?` to `SchemaMetaDashboard` (`src/data-model/system.ts`) without touching `contract/`; verify the generated `schema/` and the schema version are unchanged with a typings test titled "Contract unchanged".

## 2. Backend: records, lock and runner (implementer)

- [x] 2.1 Create `dashboard-ce/backend/src/deletions/` with the dashboard document repository: lock acquisition with `$$NOW` (free, finished or heartbeat older than 60 s), heartbeat, progress, completion and `deletions` records, the stale judgement, and the startup hook that marks the instance's own running job `interrupted`. Cover "Records accepted by the validator", "Instance gone mid-job" and "Instance restarted mid-job" in `backend/test/integration/deletions-jobs.test.ts`.
- [x] 2.2 Implement the kept-set snapshot (rooms in progress, and rooms ended in the 5-minute grace window found through `expiresAt_ttl` with the current entities retention) and the filter and index of every class and collection of the design table, with the 5-minute grace and the rollup bucket limits; cover "Room in progress kept whole", "Recent data kept", "Open entities without a room kept", "Nodes never deleted", "Room ending during the job", "Data after the cutoff untouched", "Events deletion leaves entities", "Per-track stats go with the tracks", "Entities with their data", "Entities deletion run again", "Rollup buckets kept at 10:07" and "Entities deletion keeps rollups" in `backend/test/integration/deletions-rules.test.ts`.
- [x] 2.3 Assert every batch query of 2.2 index-backed with `expectIndexBacked` on a scenario M dataset in `backend/test/integration/deletions-query-plan.test.ts` (project `integration-plans`).
- [x] 2.4 Implement the job runner: collections in order, batches of 5,000 by `_id`, 100 ms pause, heartbeat every 10 s, three retries, failure messages, legacy drop, Total order; cover "Batches of a large collection" in `backend/src/deletions/deletion-runner.test.ts` (fake clock), and "Database user without delete rights", "Total without legacy", "Total with legacy" and "Legacy dropped during the rollback window" in the integration suites.

## 3. Backend: API, status, info, caches and log (implementer)

- [x] 3.1 Register `POST /api/v1/deletions` (`startDeletion`, tag `Deletions`, bearer, strict body, `202`, `409` with `details.job` or the legacy message) and keep the OpenAPI checks green; cover "Events deletion accepted", "Legacy flag outside Total", "Deletion without a token", "Second deletion refused", "Refused on another instance", "Legacy refused while the migration runs" and "Legacy refused after its window" in `backend/test/integration/deletions-api.test.ts`.
- [x] 3.2 Add `deletion` to `GET /status` from the `schema_meta` read it already makes; cover "Status of a running job", "Status without any job" in `deletions-jobs.test.ts` and "Running deletion in the status", "Stale deletion in the status" in `status-api.test.ts`, with the command monitoring check.
- [x] 3.3 Add `deletions` and `storage.<collection>.freeBytes` to `GET /info`; cover "Completed Events deletion in info", "Interrupted Total in info" and "Entities records its details" in `deletions-jobs.test.ts`, and "Deletions before any deletion", "Free space after deleting documents", "Storage per collection", "CE with a running writer" and "Nested keys" in `api.test.ts`.
- [x] 3.4 Clear the storage cache and the `AnalyticsCache` when a read finds a newer completed class, with an exported hook for an extending edition's caches; cover "Storage refreshed on another instance" in `deletions-jobs.test.ts` (two in-process instances).
- [x] 3.5 Log the start and end lines; cover "Log lines of a deletion" in `deletions-jobs.test.ts`.
- [x] 3.6 Title, or add, tests for the unchanged scenarios the modified backend requirements carry and that no test names yet: "Oldest per collection" and "Storage per collection" in `api.test.ts` (also checking `freeBytes`), "Sub-resource path" and "Unknown API path" in `api.test.ts`; keep "Migration in progress" covered.
- [x] 3.7 Export the deletion types, the cache hook and the records reader from `src/index.ts`; update `dashboard-ce/backend/AGENTS.md` (the `deletions/` slice, the only writes to `schema_meta`). Verify with `./dashboard.sh check` and `./dashboard.sh test-integration`.

## 4. UI: confirmation dialog (implementer)

- [x] 4.1 Add the `ConfirmDialog` building block and its service to `dashboard-ui` (title, body, optional checkbox, Cancel focused first, confirm in the error colour, focus return) and export it; cover "Keyboard confirmation" and "Escape cancels" in `components/confirm-dialog/confirm-dialog.spec.ts`; document it in the library README.

## 5. UI: status cadence and banner (implementer)

- [x] 5.1 Poll the status every 10 s while a deletion runs and at once after an accepted request; re-read the info when the deletion job or state changes; cover "Deletion cadence", "Status right after starting a deletion" and "Deletion ends" in `core/refresh/server-status.spec.ts`.
- [x] 5.2 Add the deletion banner to the banner slot; cover "Banner of a running deletion", "Banner of a Total deletion", "No banner on the Data tab", "Banner ends with the job" and "Dismissed banner and a new job" in `shell/banner-slot.spec.ts`.
- [x] 5.3 Title, or add, tests for the unchanged scenarios of the modified shell requirements that no test names yet: "Schema mismatch" and "Schema initialized while the page is open" in `shell/banner-slot.spec.ts`, "Migration cadence", "Hidden tab" and "Signed out" in `core/refresh/server-status.spec.ts`; keep "Migration running", "Auto-refresh off", "Migration ends" and "Steady server" covered.

## 6. UI: Data tab (implementer)

- [x] 6.1 Add the free space lines and compute the estimate from the space in use in `storage-classes.ts`; cover "Estimate after a deletion", "Free space after a deletion", "Little free space" and the unchanged estimate scenarios ("Linear estimate", "No estimate under one day of data", "Unlimited daily rollups", "Unlimited daily rollups without a day of data", "Daily rollups with a limit", "Total without an estimate") in `storage-classes.spec.ts` and `settings-page.spec.ts`.
- [x] 6.2 Add the delete buttons column and their disabled states; cover "Buttons of the table", "Legacy row without a button", "Buttons while a deletion runs", "Buttons while the migration runs" and "Empty class deletable" in `settings-page.spec.ts`.
- [x] 6.3 Add the ten dialogs with the approved texts and `EXTERNAL_LINKS.freeingDiskSpace`; cover "Events dialog", "Stats dialog", "Tracks dialog", "Entities dialog", "5-minute rollups dialog", "Hourly rollups dialog", "Daily rollups dialog", "Total dialog", "Total with the legacy checkbox", "Total with the checkbox left unchecked" and "Legacy dialog" in `settings-page.spec.ts`.
- [x] 6.4 Send the request on Delete and handle `202` and `409`; cover "Deletion confirmed", "Deletion refused" and "Deletion cancelled in the dialog" in `settings-page.spec.ts`.
- [x] 6.5 Add the progress section, the end toast, the interrupted and failed notice and the last deletion lines; cover "Progress of an Entities deletion", "Progress follows the status", "Deletion completed while watching", "Interrupted deletion notice", "Failed deletion notice", "Class deleted" and "Class left incomplete" in `settings-page.spec.ts`.
- [x] 6.6 Update `dashboard-ce/frontend/projects/dashboard-ui/AGENTS.md` if a convention changed. Verify with `./dashboard.sh check`.

## 7. End-to-end tests (implementer)

- [x] 7.1 Extend the mock API (`e2e/fixtures/api.ts`) with `POST /deletions`, `deletion` and `deletions`; cover "Delete buttons on a phone", "Dialog on a phone" and "Events dialog: flow with axe in both themes" in `e2e/tests/settings.spec.ts`, and update the baseline screenshots of the Data tab. No Data tab baseline existed, so none was added.
- [x] 7.2 Cover "Events deletion accepted: against the real backend" in `e2e/tests-backend/deletions.spec.ts` (seeded MongoDB; the Events row's documents drop after the job and its "Deleted …" line shows).
- [x] 7.3 Run `./dashboard.sh scenarios delete-stored-data` and verify every delta scenario has a test. The e2e suites cannot run on the owner's machine (Ubuntu 20.04, no Playwright Chromium): report them as validated by the CI `e2e` job, not as passed locally.

## 8. CHANGELOG and refactor review (implementer)

- [x] 8.1 Add the CHANGELOG lines of the proposal under the next release (`Added` › `UI` and `Improved` › `UI`). Verify with `./dashboard.sh check` (format). Owner's decision: each line was written in the commit of its observable change (the deletions API, the banner, the Data tab), not in this group.
- [x] 8.2 Refactor review of the new slice, the Data tab and the status service: apply small refactors, propose a separate change for larger ones, and record the outcome in the report. Applied: the deletion texts of the Data tab in `deletion-texts.ts`, one `deletionJob()` fixture for the UI specs, the request and wait helpers of the backend suites in `test/support/deletion-world.ts`; no larger refactor to propose.

## 9. Free space after the demo review (implementer)

- [x] 9.1 Give the storage cache its second boundary (a value read before the newest completion `finishedAt` + 60 s is not served after that moment); cover "Storage read again after the release" in `backend/test/integration/api.test.ts` with an injected clock. Verify with `./dashboard.sh test-integration`.
- [x] 9.2 Add the optional link to the shared info tip (a panel instead of a tooltip, `aria-expanded`, Escape, click outside and second activation close it, focus back to the icon); cover "Link tip by keyboard" in `components/info-tip/info-tip.spec.ts`, keep the existing info tip scenarios green, and document it in the library README.
- [x] 9.3 Put the free space tip after each free line with `EXTERNAL_LINKS.freeingDiskSpace`; cover "Free space tip of a class" and "Free space tip of the Total" in `settings-page.spec.ts`.
- [x] 9.4 Read the info document when the Data tab opens and 65 s after the reported end of a deletion while the tab stays open (timer cancelled when it closes); cover "Data tab opened", "Second read after a deletion" and "No further reads" in `settings-page.spec.ts`, and keep "Steady server" and "Deletion ends" green in `server-status.spec.ts`.
- [x] 9.5 Cover "Link tip on a phone" in `e2e/tests/settings.spec.ts` (375 px, axe in both themes).
- [ ] 9.6 Run `./dashboard.sh check` and `./dashboard.sh scenarios delete-stored-data`; refactor review of the info tip and the Data tab reads, recorded in the report.

Pending the dashboard's author: whether `freeBytes` adds the reusable bytes of every index (design, Open Questions);
its task is added here once answered.

## 10. Demo review (owner)

- [ ] 10.1 The owner reviews `./dashboard.sh demo ce`: delete buttons, the ten dialogs, progress and banner, end toast, "Deleted …" lines, free space lines with their tip and their refresh about 60 s after a deletion, both themes and a 375 px window. First review (2026-11-20) found the free space issues fixed by group 9; re-review after it.

## 11. Documentation in PR #160 of OpenVidu/openvidu.io (orchestrator)

- [ ] 11.1 In branch `docs/openvidu-dashboard-3.10`, write in `docs/docs/self-hosting/production-ready/observability/openvidu-dashboard.md` the "Settings" line about the delete buttons, the legacy paragraph line, `### Deleting analytics data` and `#### Freeing disk space` (why MongoDB keeps the space, `dryRun`, `compact` for every collection including `track_stats`, Single Node, Elastic, High Availability member by member, external MongoDB, MongoDB 7.0 as the minimum for deleting stats), after checking the `compact` form for a time-series collection on MongoDB 8.0; verify the anchor `#freeing-disk-space` matches the dialog link, `ovweb lint` and `mkdocs build --strict`.
- [ ] 11.2 Show the owner the section and wait for the go-ahead before pushing to the PR branch; then push. The PR stays a draft and is NOT merged. Record the commit in `operations.md`.

## Workflow follow-up

- After this change is archived, a PRO change in openvidu-pro moves `ce.ref` and adds the "deleted" notice to the
  detail pages from `deletions` of the info document (owner answers P1–P3), with its own demo review.
