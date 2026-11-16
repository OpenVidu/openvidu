# Verification Report: analytics-export-unavailable

- Date: 2026-11-16
- Mode: incremental
- Verified commit: `988a180fb1db2f8695e3f1bf899333cd2816157e`
- Starts from: `6cfbf885c` (the same tree as `4d6aa85f8e`, named by the earlier reports; see `operations.md`)
- Diff verified: `git diff 6cfbf885c..HEAD`: `b86d365eb` (the reports and `operations.md`) and `988a180fb` (the fixes).
  No uncommitted work apart from the untracked folders of other changes (`overview-live-tiles`, `settings-data-tab`),
  ignored. `9629e8ab3` (agent workflow skill) in `git diff origin/master` is not part of this change.
- This report supersedes `code-review.md`.

## Summary

| Dimension    | Status                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------- |
| Completeness | 12/12 tasks; 1/1 ADDED requirement implemented (unchanged since the full verification)    |
| Correctness  | 1/1 requirement mapped; 3/3 scenarios covered; `"none"` over bytes now asserted           |
| Coherence    | Design decisions still followed; the card's condition is named once                      |

Issues: 0 CRITICAL, 0 WARNING, 0 SUGGESTION open.

## Checks run

| Command                                                 | Result                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `./dashboard.sh check`                                  | Passed (exit 0): lint, format check, typecheck, `openspec validate --all --strict`, unit tests   |
| `./dashboard.sh scenarios analytics-export-unavailable` | Passed (exit 0): 3 scenarios, 0 without a test                                                   |
| `./dashboard.sh e2e`                                    | Passed (exit 0): 120 tests against the mocked API, 6 against the real backend (Docker available) |
| `./dashboard.sh test-integration`                       | Not applicable: the change touches no backend                                                    |

Unit tests of `check`: workspace tooling 115 (0 skipped), typings 109, backend 240, `dashboard-ui` 545 (50 files),
frontend 1. Node 26.13.0, pnpm 12.11.2.

Recorded in `operations.md`, not checked here: owner approval, the owner's acceptance of code-review suggestion 1, the
refactor review outcome. Pending after this verification: the push and its CI run.

## Earlier findings

| Finding                                                                                     | Status   | Evidence |
| ------------------------------------------------------------------------------------------- | -------- | -------- |
| `verification.md` SUGGESTION 1: refactor review outcome (task 4.3) not in the repository    | Resolved | `openspec/changes/analytics-export-unavailable/operations.md:5-6` records it: no shared form for the three cards; an `unavailable` input on `ovd-analytics-card` is what design decision 1 rejects. Consistent with the code. |
| `code-review.md` WARNING 1: `"none"` over series that hold bytes not exercised by any test | Resolved | Unit: `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts:597` asserts the Data transferred export disabled in the `"none"` test of line 581, whose series are the helper defaults (3 and 5, `dashboard-ce/frontend/projects/dashboard-ui/src/testing/analytics.ts:72-75`). e2e: `dashboard-ce/e2e/tests/analytics.spec.ts:354` asserts it in the `"none"` test of line 341, whose series are the mock defaults (1–6 MB per bucket, `dashboard-ce/e2e/fixtures/analytics.ts:142-144`). The wider condition `mediaStats() === 'none' && bandwidth.empty` now fails both. Both pass. |
| `code-review.md` SUGGESTION 1: the card's condition written five times                     | Resolved (applied at the owner's request) | `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-page.html:245` declares `@let noMediaStats = mediaStats() === 'none'` beside `@let bandwidth`; `[empty]` (`:252`), `[exportDisabled]` (`:254`) and the three `[unavailable]` (`:265`, `:271`, `:284`) bind it. |

## Review of the diff since `6cfbf885c`

- Behaviour: the template refactor is equivalent (`!noMediaStats` for `mediaStats() !== 'none'`); `@let` is declared at
  the template's top level and read inside the card's `ng-template`, as `bandwidth` already is. `mediaStats()` is a
  signal, so the `@let` updates with each range.
- The summary tile at `analytics-page.html:45` keeps `mediaStats() === 'none'`: it is outside the Data transferred card
  and the suggestion did not cover it. Not a finding.
- Tests: only assertions added; scenario titles unchanged, so `scenarios` still maps the three scenarios (line numbers
  shifted by one: `analytics-page.spec.ts:853`, `:867`, `:891`; `analytics.spec.ts:376`).
- Specs, design, CHANGELOG, `AGENTS.md`, README: untouched by the diff and still accurate (the library README and the
  frontend `AGENTS.md` describe the binding, not its spelling).
- Commits: prefixed `openvidu-dashboard:`, reports apart from code, the code commit names the change.
- Security, data contract, backend, dependencies: untouched.

No new problem found.

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

None.

## Definition of Done (items the diff or the checks affect)

| Item                                                      | Status                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| `scenarios` finds a passing test for every delta scenario | Met (3 scenarios, 0 without a test; all pass)                |
| `./dashboard.sh check` passes locally                     | Met                                                          |
| CI run of the push is green                               | Pending: the push comes after this verification              |
| UI changes: `e2e` passes, with axe and both themes        | Met (126 tests)                                              |
| Latest verification reports have no CRITICAL              | Met (this report supersedes `code-review.md`)                |
| Refactor review applied or recorded                       | Met (applied: code-review suggestion 1; recorded: `operations.md`) |
| Change archived                                           | Pending: after the push and CI                               |

The other items are unchanged from the full verification: tasks 12/12, `test-integration`, `contract-check`,
`build-image` and `smoke-image` not applicable, docs and CHANGELOG as decided.

## Final assessment

All checks passed. Ready for archive, once the push and its CI run, which are pending, are green.
