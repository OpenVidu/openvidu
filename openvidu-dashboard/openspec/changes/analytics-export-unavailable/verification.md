# Verification Report: analytics-export-unavailable

- Date: 2026-11-16
- Mode: full
- Verified commit: `4d6aa85f8e539deb1c7a1d1bd97b22da53d59e0d`
- Diff verified: `36d6f3c29e..HEAD` (commits `2caf889844`, artifacts, and `4d6aa85f8e`, code), clean working tree apart
  from the untracked folders of other changes and the reports of this one.

## Summary

| Dimension    | Status                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| Completeness | 12/12 tasks; 1/1 ADDED requirement implemented; no MODIFIED, REMOVED or RENAMED     |
| Correctness  | 1/1 requirement mapped; 3/3 scenarios covered by passing tests that assert them     |
| Coherence    | 5/5 design decisions followed; code, tests and docs follow the package conventions  |

Issues: 0 CRITICAL, 0 WARNING, 1 SUGGESTION.

## Checks run

| Command                                               | Result                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `./dashboard.sh check`                                | Passed (exit 0): lint, format check, typecheck, strict spec validation, unit tests              |
| `./dashboard.sh scenarios analytics-export-unavailable` | Passed (exit 0): 3 scenarios, 0 without a test                                                  |
| `./dashboard.sh e2e`                                  | Passed (exit 0): 120 tests against the mocked API, 6 against the real backend (Docker available) |
| `./dashboard.sh test-integration`                     | Not applicable: the change touches no backend                                                   |
| `openspec validate analytics-export-unavailable --strict` | Valid                                                                                           |

Unit tests of `check`: workspace tooling 115, typings 109, backend 240, `dashboard-ui` 545 (50 files), frontend 1; no
failure and no skipped test. Node 26.13.0, pnpm 12.11.2.

Not checked here, pending after this verification: the push and its CI run (no `operations.md` yet).

## Completeness

- Task completion: 12 of 12 checked (`openspec instructions apply`: `all_done`). No `(orchestrator)` or `(owner)` group.
- Spec coverage: the only delta is the ADDED requirement "Workbook export without media statistics" of `analytics-ui`.
  Implemented by one binding, `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-page.html:253`
  (`[exportDisabled]="mediaStats() === 'none'"`), read by the disabled condition of
  `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-card.ts:50`.

## Correctness

Requirement "Workbook export without media statistics":

- `"none"`: `[empty]` stays `bandwidth.empty && mediaStats() !== 'none'` (`analytics-page.html:251`), so the card keeps
  its tiles and chart unavailable (`analytics-page.html:264`, `:270`, `:283`) and the export is disabled by
  `exportDisabled` alone.
- `"partial"` or no `mediaStats`: `exportDisabled` is false and the export follows `empty()` as in every other card.
- The Rooms card binds no `exportDisabled` (`analytics-page.html:81`), so its export is unaffected.

Scenario coverage (tests listed by `./dashboard.sh scenarios`, each read against its scenario):

| Scenario                               | Test                                                                                              | Asserts the scenario |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| Export without media statistics        | `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts:852` | Yes                  |
| Export without media statistics        | `dashboard-ce/e2e/tests/analytics.spec.ts:375`                                                    | Yes, with axe        |
| Export with partial media statistics   | `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts:866` | Yes                  |
| Partial media statistics without bytes | `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts:890` | Yes                  |

- `analytics-page.spec.ts:852`: summary `none` with zero bytes and zero buckets; no empty state, two unavailable tiles,
  the unavailable chart, the Data transferred export disabled and the Rooms export enabled. Without the binding of
  `analytics-page.html:253` the disabled assertion fails, since `empty()` is false in this state.
- `analytics.spec.ts:375`: built application, `analyticsSummary` `none` and zero `bytesUp` / `bytesDown` series (the
  mock applies series overrides by name, `dashboard-ce/e2e/fixtures/analytics.ts:117`); unavailable chart, no empty
  state, export disabled, Rooms export enabled, no axe violation. It does not count the unavailable tiles; the unit
  test does.
- `analytics-page.spec.ts:866`: summary `partial` with the default series; one file saved, named
  `analytics-bandwidth-<from>-<to>.xlsx`, whose series sheet has the columns "Data up / down · Up (bytes)" and "Data up
  / down · Down (bytes)" and the bytes of the series in its rows.
- `analytics-page.spec.ts:890`: summary `partial` with zero buckets; "No data in this range", the range `partial`
  warning on the heading and the export disabled.

## Coherence

Design adherence:

| Decision                                                              | Status                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1. Bind `exportDisabled` on the card, `[empty]` and `unavailable` kept | Followed (`analytics-page.html:251-253`)                                                 |
| 2. New requirement, existing ones untouched                           | Followed (delta has only ADDED; `openspec/specs` unchanged)                              |
| 3. No new seam; README names `mediaStats()` and `exportDisabled`      | Followed (`dashboard-ce/frontend/projects/dashboard-ui/README.md:76-77`; `analytics-seams.ts:91`) |
| 4. Doc comment and "Missing data" convention state the rule           | Followed (`analytics-card.ts:105`; `dashboard-ce/frontend/AGENTS.md:50-51`)              |
| 5. No CHANGELOG line                                                  | Followed (`CHANGELOG.md` unchanged; its 3.10.0 entries are against 3.9)                  |

Test strategy: every row of the design table has its test at the stated file and level; the existing tests of the
`none` and `partial` states are unchanged (the diff only adds tests).

Conventions (`AGENTS.md` files):

- Edition seams: no logic in the shells, no new seam; nothing of an extending edition beyond the generic mention of its
  cards.
- Data contract, API, dependencies, image: untouched (`dashboard-ce/typings`, `dashboard-ce/backend`,
  `dashboard-ce/docker`, `pnpm-lock.yaml` unchanged).
- Secrets: none involved.
- Language and comments: English; the only comment changed is the doc comment of `exportDisabled`.
- Commits: two, prefixed `openvidu-dashboard:`, artifacts apart from code; the code commit names the change.
- Simplicity: one binding, no new abstraction, as the non-goals state.

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. `openspec/changes/analytics-export-unavailable/tasks.md:54` — Task 4.3 (refactor review) is checked and its outcome
   is "written in the implementation report", which is not in the repository, so this report cannot confirm it. The
   code shows no refactor, which matches the non-goal of the design (no generic unavailable state in
   `ovd-analytics-card`). Recommendation: the orchestrator confirms the outcome against the implementer's report before
   archiving.

## Definition of Done

| Item                                                                 | Status                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| All tasks checked                                                    | Met (12/12)                                                                                 |
| `scenarios` finds a passing test for every delta scenario            | Met (3 scenarios, 0 without a test; the tests pass in `check` and `e2e`)                    |
| `./dashboard.sh check` passes locally                                | Met                                                                                         |
| CI run of the push is green                                          | Pending: the push comes after this verification                                             |
| Backend changes: `test-integration`                                  | Not applicable                                                                              |
| UI changes: `e2e` passes, with axe and both themes                   | Met (126 tests; axe in the new test; the suite's light and dark axe and baselines pass)     |
| Data contract changes: `contract-check`                              | Not applicable                                                                              |
| Image or runtime dependency changes: `build-image`, `smoke-image`    | Not applicable                                                                              |
| Latest verification reports have no CRITICAL                         | Met for this report; `code-review.md` belongs to the code-reviewer and is not assessed here |
| Refactor review applied or recorded                                  | Not verified from the repository (suggestion 1)                                             |
| `CHANGELOG.md`, `README.md` and the `AGENTS.md` files reflect it     | Met (frontend `AGENTS.md` and library README updated; no CHANGELOG line by decision 5)      |
| Change archived                                                      | Pending: after the push and CI                                                              |

## Limits of this report

- The local `origin/master` (`e268038b5f`) is behind the base of this checkout and `HEAD` is detached, so
  `git diff origin/master` spans unrelated commits. The change was verified on `36d6f3c29e..HEAD`; `36d6f3c29e`
  (`.claude/skills/orchestrate-change/SKILL.md`) is not part of it.
- The untracked changes `overview-live-tiles` and `settings-data-tab` were ignored; `openspec validate --all --strict`
  of `check` passes with them present.

## Final assessment

No critical issues or warnings. 1 suggestion to consider. Ready for archive (with noted improvements), once the push
and its CI run, which are pending, are green.
