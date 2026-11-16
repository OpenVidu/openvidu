# Verification Report: overview-live-tiles

- Date: 2026-11-16
- Mode: full
- Verified commit: `575ccc5ccacfa4d3824da475d1a530394b33fba4` (`29ba28dac..HEAD`, four commits, clean working tree)
- Guard: the guard hook could not be activated in this session; by decision of the owner the probe was skipped and
  its limits were kept by hand (reads, the checks below and this file only).

## Summary

| Dimension    | Status                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- |
| Completeness | 13/14 tasks (5.1 pending, orchestrator, after this verification); 3/3 requirements found   |
| Correctness  | 3/3 requirements implemented as specified; 10/10 scenarios covered by a passing test       |
| Coherence    | 6/6 design decisions followed; code patterns consistent                                    |

Issues: 0 CRITICAL, 0 WARNING, 0 SUGGESTION.

## Checks run

| Command                                    | Result                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `./dashboard.sh check`                     | Pass (exit 0): lint, format, typecheck, `openspec validate --all --strict` 32/32, tooling 115, typings 109, backend unit 240, dashboard-ui 548, frontend 1 |
| `./dashboard.sh scenarios overview-live-tiles` | Pass (exit 0): 10 scenarios, 0 without a test                                                   |
| `./dashboard.sh e2e`                       | Pass (exit 0): 122/122 mocked, 6/6 real backend (Docker available); axe in light and dark on the Overview, light and dark baselines |
| `./dashboard.sh test-integration`          | Not applicable: no backend file in the diff                                                         |

Not checked here: the CI run of the push (task 5.1, pending; no `operations.md` yet).

## Completeness

### Tasks

`openspec instructions apply`: 13 of 14 complete.

| Task | Evidence                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| 1.1  | `features/overview/overview-page.html:14,21,29,37,44,51`: the six labels; Today tiles, notice and card untouched  |
| 1.2  | `features/overview/overview-page.ts:74`, bound at `overview-page.html:39`                                         |
| 1.3  | `features/overview/overview-page.spec.ts:207`                                                                     |
| 1.4  | `features/overview/overview-page.spec.ts:245`                                                                     |
| 1.5  | `features/overview/overview-page.spec.ts:359,378,388`                                                             |
| 2.1  | `features/participants/participants-page.spec.ts:295,353`                                                         |
| 2.2  | `features/participants/participants-page.spec.ts:191`                                                             |
| 3.1  | `e2e/tests/overview.spec.ts:18`, `e2e/tests/info-tips.spec.ts:17,24,38,40,126-128`                                |
| 3.2  | `e2e/tests/overview.spec.ts:71`                                                                                   |
| 3.3  | `e2e/tests/overview.spec.ts:90-128`                                                                               |
| 4.1  | Reproduced: 10 scenarios, none "NO TEST"                                                                          |
| 4.2  | Reproduced: `check` and `e2e` pass, real-backend suite included                                                   |
| 4.3  | Checked in `tasks.md`; its outcome lives in the implementation report, which is not in the repository. The diff shows the small refactor: the shared `tips()` helper of the three split tests (`overview-page.spec.ts:188-196`) |
| 5.1  | Pending (orchestrator, after the verification): not a finding                                                     |

### Spec coverage

Three MODIFIED requirements, no ADDED, REMOVED or RENAMED. Each delta keeps every scenario of its baseline requirement.

| Requirement                                          | Implementation                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `overview-ui`: Live KPI tiles                        | `features/overview/overview-page.html:12-58`, `features/overview/overview-page.ts:74` |
| `ui-info-tips`: Overview info tips                   | `features/overview/overview-page.html:24,32,54` (the tip name follows the label)    |
| `participants-ui`: Participants filters and room chip | Wording only; behaviour unchanged, no source change in `features/participants/`     |

## Correctness

### Requirement implementation

- Live KPI tiles: labels, values and links match the requirement. The egress link is
  `/egress?status=starting,active,ending`, the value `EgressPage` reads with `QueryStateService.csv` and selects as
  Active when every status of `EGRESS_IN_FLIGHT_STATUSES` is present (`features/egress/egress-page.ts:53,112-119`).
- Overview info tips: tips on Active participants, Active publishers and Active agents, the Today tiles Participants
  and Minutes, the Data pipeline card and the Unique identities header, and nowhere else.
- No reference to the old tile names or to `/egress?status=active` as a tile link remains in the sources, the tests,
  `README.md`, `CHANGELOG.md` or the `AGENTS.md` files. `openspec/specs` still holds the old wording, as expected
  until the archive syncs the deltas.

### Scenario coverage

Tests taken from `./dashboard.sh scenarios` and read against their scenarios.

| Scenario                       | Test                                              | Asserts                                                                                                   |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Tile values and links          | `overview-page.spec.ts:207` (unit)                | The six labels, the values 12, 85, 54, 3, 1, 2 and the six `href`s, on the `live` of the scenario          |
| Refresh keeps values           | `overview-page.spec.ts:245` (unit)                | `If-None-Match` sent, `304`: tile markup identical, no highlight, no skeleton, `lastUpdated` advances      |
| Publishers tile                | `e2e/tests/overview.spec.ts:71` (e2e)             | URL `status=active&publisher=true`, "Publishers" chip with its button, request with `publisher=true`       |
| Active egress tile             | `e2e/tests/overview.spec.ts:102` (e2e)            | URL `status=starting,active,ending`, Status reads "Active", request status, three rows, no `EG_complete`   |
| Live tiles                     | `overview-page.spec.ts:359` (unit)                | The three tip names with "Active" and their three texts, and no other tip in the row                       |
| Today tiles                    | `overview-page.spec.ts:378` (unit)                | The two tip names and texts, no hover text on the tiles                                                    |
| Data pipeline and recent rooms | `overview-page.spec.ts:388` (unit)                | The card's text, the header's shared text, no tip in By node                                               |
| Arriving from a room           | `participants-page.spec.ts:353` (unit)            | Chip text, link `/rooms/RM_abc`, removal drops `room` in the URL and the reload                            |
| Clearing the kind filter       | `participants-page.spec.ts:191` (unit)            | Deselecting Standard writes `kind=all`; the filter reads "All kinds"                                       |
| Publishers chip                | `participants-page.spec.ts:295` (unit)            | Chip with button, request `publisher=true`, removal drops `publisher` and `cursor` in the URL and reload   |

Note on "Refresh keeps values": the unit test asserts the update time of the refresh service, the source of the
"updated hh:mm:ss" text the shell renders, as task 1.4 states. Not a finding.

## Coherence

### Design adherence

| Decision                                                        | Status                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1. Egress link built from `EGRESS_IN_FLIGHT_STATUSES`           | Followed: `overview-page.ts:74`, no literal and no array in the template             |
| 2. Labels stay literals in the template                         | Followed                                                                            |
| 3. `ui-info-tips` and `participants-ui` change in wording only  | Followed: test titles and one new test, no source change                             |
| 4. The two followed tiles tested end to end                     | Followed: `e2e/tests/overview.spec.ts:71,102`                                        |
| 5. The four egresses defined in the test                        | Followed: `apiOptions.egresses` at `e2e/tests/overview.spec.ts:91-100`; `EGRESSES` untouched |
| 6. No CHANGELOG, README or AGENTS change                        | Followed; `CHANGELOG.md:28` (3.10.0, unreleased) stays true                          |

The test strategy table matches the files and levels the coverage check reports.

### Project rules (`AGENTS.md`, `openspec/config.yaml`)

- Edition seams: the change stays in the `dashboard-ui` library; no shell, route or seam changes.
- Data contract and secrets: typings, API and contract untouched; no secret in code, tests or fixtures.
- Language and comments: English; two doc comments, both on non-obvious points; no history narrated.
- Dependencies: none added or upgraded.
- Commits: four, prefixed `openvidu-dashboard:` and naming the change, one logical step each, no attribution lines;
  `git diff --check` clean.
- Artifacts: the proposal states scope, non-scope, edition, repository and the CHANGELOG decision; every requirement
  names its edition; the tasks name their verification and scenarios and end the implementer groups with the refactor
  review, with the publish group last.

## Definition of Done

| Item                                                                 | Status                                                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| All tasks checked                                                    | Pending: 5.1 only (orchestrator, after this verification)                               |
| `scenarios` finds a passing test for every delta scenario            | Met                                                                                     |
| `./dashboard.sh check` passes locally                                | Met                                                                                     |
| CI run of the push is green                                          | Pending (task 5.1)                                                                      |
| Backend changes: `test-integration`                                  | Not applicable                                                                          |
| UI changes: `e2e` passes, with axe and both themes                   | Met                                                                                     |
| Data contract changes: `contract-check`                              | Not applicable                                                                          |
| Image or runtime dependency changes: `build-image`, `smoke-image`    | Not applicable                                                                          |
| Latest verification reports have no CRITICAL                         | Met for this report; `code-review.md` is written alongside by the `code-reviewer` and was not read here |
| Refactor review applied or recorded                                  | Met by the diff (the `tips()` helper); the written outcome is in the implementation report, outside the repository |
| `CHANGELOG.md`, `README.md` and the `AGENTS.md` files reflect the change | Met: none needs a change                                                            |
| Change archived                                                      | Pending (after the push)                                                                |

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

None.

## Final assessment

All checks passed. Ready for archive once task 5.1 (the push and its green CI run) is done and `code-review.md` has
no CRITICAL.
