# Verification Report: legacy-collections

- Date: 2026-11-17
- Mode: full
- Verified commit (dashboard, `master`, not pushed): `409e0a10a9860ab17164af27e219008da670131f`
- Writer (openvidu-livekit `openvidu/main`, not pushed): `bf6496cb`, `329d5c839bf5a073598b15ea4d7bda4d345c10f1`
  (HEAD), clean tree, two commits ahead of `origin/openvidu/main`
- Range reviewed: `git diff origin/master` (76477924f..409e0a10a). Commit 55e056265 (status-api flake fix) is a direct
  fix outside the change, approved by the owner; ee547c6b7 (proposal of `list-query-plans`, superseding
  `agents-identity-search-plan`) is another change in the same unpushed range, not reviewed here.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 27/31 tasks; the 4 open ones (8.1 owner, 9.1, 9.2, 10.1 orchestrator) follow the verification by design. 4 ADDED and 2 MODIFIED requirements, all implemented |
| Correctness  | 6/6 requirements mapped; 24/24 scenarios list a test that asserts what the scenario states. Dashboard tests run and pass; the 9 writer scenario tests read but Not verified as run (see Commands) |
| Coherence    | Design D1 to D12 followed; 2 suggestions |

## Commands run

| Command | Result |
| ------- | ------ |
| `./dashboard.sh check` | Pass: lint, format, typecheck, `openspec validate --all --strict` (32 items), unit tests (typings 110, backend 250, frontend 630 + 1, tooling 136) |
| `./dashboard.sh scenarios legacy-collections <openvidu-livekit>` | 24 scenarios, 0 without a test |
| `./dashboard.sh test-integration` | Pass: 22 files, 267 tests (Docker) |
| `./dashboard.sh e2e` | Pass: 139 mocked tests (axe in light and dark, phone) and 6 real-backend tests |
| Writer `go test -tags integration ./openvidu/analytics/...` and lint | Not verified: the verifier guard does not allow `go test`; `operations.md` records the writer commits but no test run. The commit message of 329d5c83 states lint and tests pass (implementer claim). The `Test` workflow run of task 9.2 will record it |
| `contract-check`, CI run, image | Not checked here (orchestrator). No contract artifact changed (`typings/schema`, `typings/fixtures`, `typings/contract` untouched, `SCHEMA_VERSION` 1), so the DoD does not require `contract-check`; task 9.1 runs it anyway. No image or runtime dependency change |

## Completeness

### Tasks

- 27 of 31 checked. Unchecked: 8.1 (owner demo review), 9.1 (contract check), 9.2 (writer push and CI), 10.1
  (openvidu.io documentation): groups marked `(owner)` / `(orchestrator)` that come after the verification, so pending,
  not findings.

### Spec coverage

| Requirement | Delta | Implementation |
| ----------- | ----- | -------------- |
| Legacy data kept for rollback (`server-legacy-migration`) | MODIFIED | Writer `migration.go` (`cleanup` records `legacyRetainedUntil` through `latestLegacyExpiry`), nothing drops before the date (`migration_retention.go:122-129`) |
| Legacy data dropped after its rollback window | ADDED | Writer `migration_retention.go:58-172`, wiring `analytics.go` (`retentions`, started after the migration in `Start`, stopped first in `Stop`) |
| Info endpoint (`editions-info`) | MODIFIED | `backend/src/info/info-service.ts:254-260`, `info-routes.ts:27-31` |
| Legacy data in info | ADDED | `info-service.ts:56-60,156,182-198,220-226` (legacy collections only with a migration document, dated by `fromSeconds` through `timestamp.seconds_1` / `time_stamp.seconds_1`) |
| Legacy data row (`settings-about`) | ADDED | `features/settings/storage-classes.ts:87-260`, `data-tab.ts:87-95`, `data-tab.html:50`, `data-tab.scss:50-53` |

No REMOVED or RENAMED requirements.

## Correctness

### Scenario coverage (tests read)

- Writer, `openvidu/analytics/migration_integration_test.go`: `Rollback after the migration` (:549, every seeded `_id`
  back in `events` and `stats`, both legacy indexes and the TTL index), and `TestLegacyRetention` (:1016): window
  ended (built through `newLegacyRetentionTask`, migration document unchanged, one info line with both names), ends
  while running (the clock passes the date between checks of a running loop), still open (documents, indexes, one
  info line with the RFC 3339 date after 5 checks), unfinished (pending with the migration disabled), stats without a
  migration (no task, a check that returns done and keeps `stats`), newer documents (`$max` to the later expiry,
  nothing dropped, logged once), completed without a date, two nodes together (no error, both gone). Each asserts its
  scenario. Not run by this verification (see Commands).
- Backend, `api.test.ts`: `CE with a running writer` (:215), `Migration in progress: info reports its progress`
  (:347), `Nested keys` (:413, exact key sets including `legacyRetainedUntil`), `Legacy collections in storage`
  (:447, 3 documents, `oldest` `2026-10-13T09:25:55.000Z`, `stats` 2 documents, the retention date),
  `Stats without a migration in info` (:487). `status-api.test.ts:101` `Legacy retention date in the status`.
  `info-query-plan.test.ts` checks both legacy oldest queries are IXSCAN on the legacy index, one document examined,
  no COLLSCAN, and that `fullInfo()` reports the converted date.
- Frontend, `storage-classes.spec.ts:294-366` (kept for rollback in America/New_York reads 2026-12-14, totals 420,004
  and 130 MB, running, pending, failed, after its date and without a date, no legacy data) and
  `settings-page.spec.ts:601-689` (no info icon and the rendered total, collections breakdown with the UTC oldest
  date, the row follows the status while the triggered info request is still unanswered).
- E2E, `settings.spec.ts:99` (row after Daily rollups with its cells, no info tip, both collections) and `:151`
  (retention cell inside 375 px, no horizontal scroll); `accessibility.spec.ts:24` (axe with the breakdown open, light
  and dark).

### Implementation notes

- Legacy timestamps of the recorded writer fixtures are doubles (`testdata/legacy/*.json`), which the `$type: 'number'`
  filter of `fromSeconds` matches; the generator writes `Double` too.
- The demo legacy documents expire between the generation and two days later with `--days 30`, so the row turns to
  "Being removed by the server" on a reused demo; accepted by the owner (`operations.md`).

## Coherence

- D1 to D5 (writer): lock-free hourly loop on every node, completed-migration gate, `latestLegacyExpiry` re-read with
  `$max` on a `completed` document, drop without a date, the three log lines through `jobLog`. Followed.
- D6: only fork-owned files under `openvidu/analytics/` plus `README-openvidu.md` and `CHANGELOG-openvidu.md` (one-line
  diff); commit subjects `Analytics tests: …` and `Analytics: …`. Followed.
- D7, D8: `LegacyCollection` outside `Collection`, converters per `OLDEST` entry with `read`, exported `fieldValue`,
  `legacyRetainedUntil` in the shared migration shape. Followed.
- D9: label, position, `tip: null`, retention per state compared with `readAt`, session-zone date, wrap class, row kept
  apart from `STORAGE_CLASSES` (refactor review 7.3 recorded in D7 and D9). Followed.
- D10, D11: mock option, generator option with its own random stream, live writer seed expiries. Followed.
- AGENTS.md conventions: English, scenario-titled tests, CHANGELOG lines (UI after the Settings line, Data under
  Added) in the commits of the row and of the API change, root `AGENTS.md` and generator README updated, no PRO
  reference in CE, no secret, no new dependency, commit subjects `openvidu-dashboard: …, change legacy-collections`.

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. `openspec/changes/legacy-collections/specs/settings-about/spec.md:55`: the THEN of "Legacy row follows the status"
   was reworded during implementation (40f7a753a), from "without another info request" to "before the info document is
   read again", because the existing shell poll reads the info document on every migration state change. The new text
   matches what was built, but `operations.md` records no owner decision on changing an approved scenario.
   Recommendation: record the owner's acceptance of the reworded scenario in `operations.md` before the archive.
2. `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/settings/data-tab.ts:95`: the Data tab detects the
   Legacy data row by its display label (`row.label === LEGACY_LABEL`) to set the wrap class
   (`data-tab.html:50`), which ties styling to a user-facing string. Recommendation: have `legacyRow()` in
   `storage-classes.ts` set a field of `StorageClassRow` (for example `wrapRetention: true`) and bind the class to it.

## Definition of Done

| Item | Status |
| ---- | ------ |
| All tasks checked | Not met yet: 8.1, 9.1, 9.2, 10.1 pending by design (after the verification) |
| `scenarios` finds a passing test for every delta scenario | Met for the 15 dashboard scenarios (run and passing); the 9 writer scenarios have tests, not run here (Not verified; the 9.2 CI run records them) |
| `./dashboard.sh check` passes locally | Met |
| CI run of the push green | Pending (workflow follow-up, after group 9) |
| Backend: `test-integration` passes | Met |
| UI: `e2e` passes with axe and both themes | Met |
| Data contract: `contract-check` | Not applicable (no contract artifact changed); task 9.1 runs it, recorded by the orchestrator |
| Image or runtime dependency: `build-image` / `smoke-image` | Not applicable |
| Latest verification reports have no CRITICAL; refactor review applied or recorded | Met for this report (`code-review.md` not written yet); refactor review recorded in design D7 and D9 |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met (README needs no change: no new image variable or command) |
| Change archived | Pending |

## Final Assessment

No critical issues found in the checks that ran. Not verified: the run of the writer tests (`TestLegacyRetention`,
`TestMigrationReplay`) and its lint, which the verifier guard cannot run and `operations.md` does not record yet; the
`Test` workflow run of task 9.2 will. 0 warnings, 2 suggestions to consider.
