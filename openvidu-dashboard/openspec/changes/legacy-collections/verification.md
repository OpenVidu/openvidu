# Verification Report: legacy-collections

- Date: 2026-11-17
- Mode: incremental
- Verified commit (dashboard, `master`, not pushed): `94a5ec0d4246beb3dabc7a8f1ac31d733381f9a2`, clean tree
- Starts from: `409e0a10a` (full verification; reports committed in ba4e62280). Range reviewed: `ba4e62280..94a5ec0d4`
  (87dc508cf, ae3c533f2, 94a5ec0d4)
- Writer (openvidu-livekit `openvidu/main`, not pushed): `e6a397a489645171f1e7bb02eb262b40b80757ab` (HEAD), clean
  tree; reviewed `329d5c83..e6a397a4`
- This report supersedes `code-review.md` (409e0a10a / 329d5c83); its open findings are carried below.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 27/31 tasks; the 4 open ones (8.1 owner, 9.1, 9.2, 10.1 orchestrator) follow the verification by design. 4 ADDED and 2 MODIFIED requirements, all implemented |
| Correctness  | 6/6 requirements mapped; 24/24 scenarios list a test. Dashboard unit and integration tests pass; e2e had 1 failure in a test the change does not touch (W1). The writer tests, including the new lifecycle subtest, were read but not run (Not verified, see Commands) |
| Coherence    | Design D7 and D9 updated to match the fixes and followed; no new deviation |

## Commands run

| Command | Result |
| ------- | ------ |
| `./dashboard.sh check` | Pass: lint, format, typecheck, `openspec validate --all --strict` (32 items), unit tests (tooling 136, typings 110, backend 250, frontend 630 + 1) |
| `./dashboard.sh scenarios legacy-collections <openvidu-livekit>` | 24 scenarios, 0 without a test; `Rollback window ended` now also lists `lifecycle_integration_test.go:242`, `Legacy collections in storage` also lists `api.test.ts:487` |
| `./dashboard.sh test-integration` | Pass: 22 files, 268 tests (Docker); one more than at 409e0a10a, the new `api.test.ts:487` |
| `./dashboard.sh e2e` | Failed (exit 1): 1 of 139 mocked tests, `settings.spec.ts:81` `Retention tip by keyboard` (no `.mat-mdc-tooltip` within 5 s after the tip button was focused). Every legacy test passed (`settings.spec.ts:99`, `:151`). `scripts/e2e.mjs` runs the real-backend suite after the mocked one anyway, and `test-results/backend/.last-run.json` reads `passed`, but the captured output was cut before that suite, so its run is Not verified. Run once, as the verifier definition requires (W1) |
| Writer `go test -tags integration ./openvidu/analytics/...` and lint | Not verified: the verifier guard does not allow `go test`. The commit message of e6a397a4 makes no test claim, and `operations.md` records no run. The `Test` workflow run of task 9.2 will record it |
| `contract-check`, CI run, image | Not checked here (orchestrator, tasks 9.1 and 9.2). No contract artifact changed in the range |

## Earlier findings

### verification.md (409e0a10a)

| # | Finding | Status | Evidence |
| - | ------- | ------ | -------- |
| S1 | Reworded THEN of "Legacy row follows the status" without a recorded owner decision | Open | `operations.md` is unchanged in the range: it records the reworded CHANGELOG line and the documentation condition, but not the reworded scenario |
| S2 | Data tab detects the Legacy row by its label | Resolved | ae3c533f2: `StorageClassRow.legacy` (`storage-classes.ts:111-112`), `legacy: true` in `legacyRow()` (`:219`), `legacy: false` for the class rows (`:258`); `data-tab.ts` no longer imports `LEGACY_LABEL`; `data-tab.html:50` binds `[class.wrap]="row.legacy"`; `storage-classes.spec.ts:321` asserts the flag on all 8 rows |

### code-review.md (409e0a10a / 329d5c83)

| # | Finding | Status | Evidence |
| - | ------- | ------ | -------- |
| W1 | No test of the retention task's startup wiring | Resolved in code, not run | e6a397a4 adds `lifecycle_integration_test.go:242` `Rollback window ended: the server drops the legacy data after Start`. It seeds empty `legacy_events` and `stats` and a completed migration dated a day back, then goes through `InitializeAnalytics`, `go Start()`, waits up to 30 s for both collections to disappear (the loop checks at once, `migration_retention.go:87-106`), and calls `Stop`. Its cleanup resets `instance` and `retentions`. Removing `retentions = retention` (`analytics.go:210`) or `retention.start()` (`:447`) would fail it. The stop order of D1 is still asserted only by reading `analytics.go:460-465`. Not run here (guard) |
| S1 | A legacy timestamp outside the range of a Date makes `GET /info` fail | Resolved | 87dc508cf: `read` returns `undefined` for an invalid date for any converter (`info-service.ts:90-99`); `api.test.ts:487` seeds `-1e13` and asserts 200, `legacy_events` with 2 documents and no `oldest`, `stats` still dated; it passes. Design D7 states it |
| S2 | Loose legacy context default and label coupling | Resolved | ae3c533f2: `legacy: LegacyContext` is required (`storage-classes.ts:236`); the older specs pass `NO_MIGRATION`; the flag on the row as above. Design D9 states both |
| S3 | `newLegacyRetentionTask` returning nil after a drop untested | Resolved in code, not run | e6a397a4: `migration_integration_test.go:1032` `require.Nil(t, env.startupTask(), ...)` after the drop in `Rollback window ended` |

## Review of the range

- Specs: no delta spec changed. The new `api.test.ts:487` hardens `Legacy collections in storage` without contradicting
  the scenario; the behaviour is recorded in design D7.
- Design: 94a5ec0d4 updates D7 (invalid oldest date leaves the collection undated), D9 (required `legacy` context, the
  `legacy` flag on the row) and the test table (lifecycle subtest, the restart assertion). They match the code.
- Conventions: commit subjects `openvidu-dashboard: …, change legacy-collections` and `Analytics tests: …`; tests titled
  `<scenario>: <detail>`; comments minimal; English; no PRO reference, secret or dependency. No CHANGELOG line needed:
  the fixes change no observable behaviour beyond the lines already written for the feature.
- No new bug found in the range.

## Issues

### CRITICAL

None.

### WARNING

1. `dashboard-ce/e2e/tests/settings.spec.ts:89`: the e2e run of this verification failed on `Retention tip by keyboard`
   (the Entities tooltip did not appear after keyboard focus), so the DoD item "e2e passes" is not met by this run. The
   test was added by `settings-data-tab` (5b1af5c38) and uses no legacy data. The only thing the range changes that it
   reaches is the `legacy` flag, now `false` on the Entities row; the template binding and the `track row.label` are
   unchanged, and the same test passed at 409e0a10a. It looks like a timing flake, but one run cannot show that.
   Recommendation: rerun `./dashboard.sh e2e`. If it passes, record the run in `operations.md` before the push. If it
   fails again, fix it before the push (a direct fix outside the change, like 55e056265, if the owner agrees).

### SUGGESTION

1. `openspec/changes/legacy-collections/specs/settings-about/spec.md:55` (carried from the previous verification, S1):
   the THEN of "Legacy row follows the status" was reworded during implementation (40f7a753a) from "without another
   info request" to "before the info document is read again", and `operations.md` records no owner decision on it.
   Recommendation: record the owner's acceptance in `operations.md` before the archive.
2. `openspec/changes/legacy-collections/operations.md:7-8` and `tasks.md:172` (task 9.2): the writer commits recorded
   for the push are `bf6496cb` and `329d5c83`; the new test commit `e6a397a4` is missing from both. Recommendation: add
   `e6a397a4` to `operations.md`, push it with task 9.2, and have its `Test` workflow run cover the new lifecycle
   subtest.

## Definition of Done (items the range or the runs affect)

| Item | Status |
| ---- | ------ |
| All tasks checked | Not met yet: 8.1, 9.1, 9.2, 10.1 pending by design (after the verification) |
| `scenarios` finds a passing test for every delta scenario | Met for the 15 dashboard scenarios (run and passing); the 9 writer scenarios have tests, including the new lifecycle subtest, not run here (Not verified; the 9.2 CI run records them) |
| `./dashboard.sh check` passes locally | Met |
| Backend: `test-integration` passes | Met (268 tests) |
| UI: `e2e` passes with axe and both themes | Not met by this run: 1 failure in an unrelated mocked test (W1); real-backend suite Not verified (output cut) |
| Latest verification reports have no CRITICAL; refactor review applied or recorded | Met (this report supersedes `code-review.md`) |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met, unchanged by the range |

Items not listed are unchanged from the previous report.

## Final Assessment

No critical issues found in the checks that ran. Not verified: the run of the writer tests (`TestLegacyRetention`,
`TestMigrationReplay` and the new `TestWriterLifecycle` subtest) and the writer lint, which the verifier guard cannot
run; the `Test` workflow run of task 9.2 will record them. Partially verified: `e2e`, which failed on one mocked test
outside the change, and whose real-backend suite result was not visible in the captured output. All findings of
`code-review.md` and S2 of the previous verification are resolved. 1 warning, 2 suggestions to consider.
