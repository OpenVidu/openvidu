# Verification Report: overview-live-tiles

- Date: 2026-11-16
- Mode: incremental, from `575ccc5ccacfa4d3824da475d1a530394b33fba4` (last verified commit)
- Verified commit: `ec7c05ea56e8d9f8935baa911de4a53dba52b32c` (`575ccc5cc..HEAD`: the reports commit, `3afd2c8b8`
  revision, `dedf6dae6` and `a5249589f` task group 5, `ec7c05ea5` operations record); no uncommitted work in the change
  (`openspec/changes/settings-data-tab/` is another change and was not looked at)
- Supersedes the previous `verification.md` and `code-review.md` (both on `575ccc5cc`).
- Guard: the guard hook could not be activated in this session; by decision of the owner the probe was skipped and
  its limits were kept by hand (reads, the checks below and this file).

## Summary

| Dimension    | Status                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Completeness | 22/23 tasks (6.1 pending, orchestrator, after this verification); 4/4 requirements found                    |
| Correctness  | 4/4 requirements implemented as specified; 13/13 scenarios covered by a passing test that asserts them      |
| Coherence    | 8/8 design decisions followed; code patterns consistent                                                     |

Issues: 0 CRITICAL, 0 WARNING, 1 SUGGESTION.

## Checks run

| Command                                        | Result                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `./dashboard.sh check`                         | Pass (exit 0): lint, format, typecheck, `openspec validate --all --strict` (the change valid), backend unit 240, dashboard-ui 548, frontend 1 |
| `./dashboard.sh scenarios overview-live-tiles` | Pass (exit 0): 13 scenarios, 0 without a test                                                           |
| `./dashboard.sh e2e`                           | Pass (exit 0): 125/125 mocked (122 + the three new layout tests), 6/6 real backend; axe and the light and dark baselines included; no baseline screenshot changed |
| `./dashboard.sh test-integration`              | Not applicable: no backend file in the diff                                                             |

Recorded, not checked: the owner's review of the tile rows on `./dashboard.sh demo ce` at 1280 and 1440 px and the
refactor review outcomes (`operations.md`). The CI run of the push is task 6.1, pending.

## Earlier findings

`verification.md` on `575ccc5cc` had no finding. `code-review.md` on `575ccc5cc`:

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| W1. Longer labels wrap on desktop widths and the values of the live row stop lining up | Accepted by the owner (labels may wrap, `design.md` Risks) and resolved for its consequence by the revision: values level in every tile row | New requirement "KPI tile values level in a row", decision 7; `components/tiles/kpi-tile.ts:105-134`, `components/tiles/tile-row.ts:84-86`; `e2e/tests/overview.spec.ts:71` passes at 1280 px with "Active participants" on two lines |
| S1. `.tiles ovd-skeleton` could not fail | Resolved | `features/overview/overview-page.spec.ts:265` asserts `.tiles .skeleton`, the class of the tile's own skeleton (`kpi-tile.ts:55`) |
| S2. "On no other tile, card or column" held only for named sections | Resolved | `features/overview/overview-page.spec.ts:400` asserts 7 info tips on the page (3 live, 2 Today, Data pipeline, Unique identities); the By node line is gone |
| S3. The comment of `egressQueryParams` called query parameters a URL | Resolved | `features/overview/overview-page.ts:73` names the `status` the Active option writes |

Paths: `components/` and `features/` are under `dashboard-ce/frontend/projects/dashboard-ui/src/lib/`; `e2e/` is
`dashboard-ce/e2e/`.

## Completeness

`openspec instructions apply`: 22 of 23 complete; only 6.1 (publish, orchestrator, after the verification) is open,
which is not a finding.

| Task | Evidence |
| ---- | -------- |
| 5.1  | `kpi-tile.ts:105-134` (subgrid of four tracks inside `ovd-tile-row` only, value and skeleton in track 2 at its end, 12 px tile margin), `tile-row.ts:84-86` (row gap 0, 4 px row margin); both doc comments updated and true (`kpi-tile.ts:29-30`, `tile-row.ts:73-74`); `kpi-tile.spec.ts` and `tile-row.spec.ts` unchanged and passing |
| 5.2  | `e2e/tests/overview.spec.ts:71` |
| 5.3  | `e2e/tests/egress.spec.ts:37` |
| 5.4  | `e2e/tests/analytics.spec.ts:46` |
| 5.5  | `overview-page.spec.ts:265` |
| 5.6  | `overview-page.spec.ts:400` |
| 5.7  | `overview-page.ts:73` |
| 5.8  | Reproduced: 13 scenarios with a test; `check` and `e2e` pass; no snapshot file in the diff |
| 5.9  | Recorded in `operations.md`: no refactor needed |

Spec coverage: the three MODIFIED requirements of the previous verification are unchanged since `575ccc5cc` (their
delta files are not in the diff) and one ADDED requirement, `ui-building-blocks`: "KPI tile values level in a row",
implemented in `kpi-tile.ts` and `tile-row.ts`. No REMOVED or RENAMED requirement.

## Correctness

### KPI tile values level in a row

- Labels at the top (`kpi-tile.ts:117-120`, track 1, `align-self: start`); values and the first-load skeleton end at
  the bottom of track 2 (`:122-126`); delta and hint in tracks 3 and 4, under the value (`:128-134`). The four tracks
  are the row's (`grid-template-rows: subgrid`, `grid-row: span 4`), so each is as tall as its tallest part on the
  line, and empty tracks leave the values at the bottom of the tiles. Labels are inline text in a block and wrap.
- The rule selects on `:host-context(ovd-tile-row)`; a tile elsewhere keeps `display: block`. Every CE KPI tile is a
  direct child of an `ovd-tile-row` (Overview live and Today, Rooms, Participants, Agents, Egress, Ingress, the
  Analytics summary and the four Analytics card rows).
- The screen reader texts of the tile (`ovd-visually-hidden`, absolutely positioned) and the measuring copy of
  `oneLineTileWidth` (absolutely positioned, `tile-row.ts:56`) are out of flow and take no track.

### Spacing of every tile row of the CE pages

The row gap became 0 and each tile carries a 12 px bottom margin inside the grid; the row's own margin went from
16 px to 4 px. Effect, read from the styles:

- Between the lines of a wrapped row: 12 px, as before (tile margin instead of row gap).
- Below a row: 12 + 4 = 16 px, as before, for every row that keeps the default margin: the summaries of Overview
  (live), Rooms, Participants, Agents, Egress, Ingress and Analytics, and the four `.card-tiles` rows of Analytics
  (no stylesheet overrides `.tiles` or `.card-tiles`).
- Overview Today (`features/overview/overview-page.scss:35-38`), the reported deviation: the row had
  `margin-bottom: 0`; it now has `-12px`, which cancels the margin of the tiles of its last line, so the tiles still
  end at the card's content edge. With "No rooms today yet" shown, the paragraph's 12 px top margin collapses with the
  row's −12 px to 0 and the tiles' 12 px margin keeps the 12 px gap the paragraph had. The adjustment is needed and
  correct; see the SUGGESTION for the coupling it shows.
- Tile height of a row whose labels fit: the tracks hold the same parts the block stacked (label, value with its
  4 px margin, delta and hint with theirs), so the height is the same; the owner's review on the demo recorded the
  rows as accepted (`operations.md`).
- Analytics summary: a one-line value now ends level with the second line of "Data up / down", as the proposal and
  the scenario state.

### Scenario coverage (new requirement)

Tests read against their scenarios; all three pass in `./dashboard.sh e2e` at the 1280 × 720 viewport of the suite
(`Desktop Chrome`, set explicitly in two of them).

| Scenario             | Test                               | Asserts                                                                                                         |
| -------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Label on two lines   | `e2e/tests/overview.spec.ts:71`    | The six tiles share one line (same top); "Active participants" label taller than "Active rooms" (the GIVEN, so it cannot pass on a row where nothing wraps); six label tops equal; six value bottoms equal and each equal to the tile's content bottom (border box minus padding and border), i.e. at the bottom of the tile |
| Hint under one value | `e2e/tests/egress.spec.ts:37`      | The hint text of "Started in range"; no hint on "Active now"; four value bottoms equal; the hint's top at or below the bottom of its value |
| Value on two lines   | `e2e/tests/analytics.spec.ts:46`   | "Data up / down" renders two `.line`s; both tiles share a line (same top); the bottom of the value of "Rooms created" equals the bottom of the second line |

Each test asserts what its scenario states. On the layout before group 5, "Label on two lines" and "Value on two
lines" fail (the block put the values right under the labels and started both values level). "Hint under one value"
would also pass on that layout, where the four labels fit one line; what it guards is the rejected alternative of
decision 7 (a value block pushed to the bottom would put the value of "Started in range" one hint above that of
"Active now"). Not a finding.

The ten scenarios of the three modified requirements keep their tests (`scenarios` lists them at their current line
numbers); the two changed unit assertions (S1, S2) only strengthen them.

## Coherence

### Design adherence

| Decision | Status |
| -------- | ------ |
| 1-6      | Unchanged since `575ccc5cc` and still followed; decision 6 holds for the layout too (the tiles are new in the unreleased 3.10.0, `proposal.md`) |
| 7. Tiles share the row tracks (subgrid) | Followed: four tracks, label at the top, value at the end of its track, skeleton in the value's track, row gap 0 with the tiles carrying the space between lines, rule scoped to `ovd-tile-row` by host context, measuring copy absolutely positioned |
| 8. The three review suggestions applied with the layout | Followed: tasks 5.5 to 5.7 |

The test strategy table matches the files and levels `scenarios` reports for the three new scenarios.

### Project rules

- Edition seams: the change stays in the `dashboard-ui` library; the public API is unchanged. An extending edition
  takes the layout with the library, as `proposal.md` and the Risks of `design.md` state.
- Data contract, API, typings, secrets, dependencies: untouched.
- Comments: the two new CSS comments and the two doc comment sentences explain non-obvious points (the subgrid and
  why the row gap is 0); no history narrated.
- Commits: four since the reports commit, prefixed `openvidu-dashboard:` and naming the change, one logical step
  each, no attribution lines; `git diff --check` clean.
- Artifacts: the revision adds the requirement with its edition, the decision with its rejected alternatives, the
  risks and a task group ending in the refactor review, with the publish group last.

## Definition of Done (items the diff affects)

| Item | Status |
| ---- | ------ |
| All tasks checked; `scenarios` finds a passing test for every delta scenario | Pending: 6.1 only (orchestrator); 13/13 scenarios met |
| `./dashboard.sh check` passes locally; CI run of the push green | Met locally; CI pending (task 6.1) |
| UI changes: `e2e` passes, with axe and both themes | Met |
| Backend, data contract, image changes | Not applicable |
| Latest verification reports have no CRITICAL; refactor review applied or recorded | Met: this report has none and carries the code review's findings; refactor reviews recorded in `operations.md` |
| `CHANGELOG.md`, `README.md` and the `AGENTS.md` files reflect the change | Met: none needs a change (no command, path or convention changes; the tiles are new in the unreleased 3.10.0) |
| Change archived | Pending (after the push) |

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

#### S1. The 12 px under the last line of tiles is part of the row now, and only a comment says so

- Where: `dashboard-ce/frontend/projects/dashboard-ui/src/lib/components/tiles/kpi-tile.ts:114`
  (`margin-bottom: 12px`), `dashboard-ce/frontend/projects/dashboard-ui/src/lib/components/tiles/tile-row.ts:86`
  (`margin-bottom: 4px`, which assumes the 12), `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/overview/overview-page.scss:37`
  (`-12px`).
- Case: a row's bottom spacing is now 12 px of tile margin plus the row's margin. A page that wants a row flush with
  what follows must know the tile's internal margin, as Overview Today does with a literal −12 px; a page of an
  extending edition that set `margin-bottom: 0` on an `ovd-tile-row`, as Overview Today did before, now gets 12 px
  more under its tiles without any failing test in CE.
- Recommendation: state it where an extending edition reads the API, in the doc comment of `TileRow`
  (`tile-row.ts:70-75`): "the last line of tiles carries 12 px of margin under it; a row flush with what follows
  sets `margin-bottom: -12px`", or expose the space as a custom property the row and the page share. No behaviour
  change in CE is needed.

## Notes (not findings)

- A non-KPI element projected into an `ovd-tile-row` would take one row track while the tiles span four, and the
  auto-placement could put a tile of the next line beside it. `TileRow` is documented and specified as a row of KPI
  tiles and CE projects nothing else; an extending edition that does would see it.
- During `./dashboard.sh check`, its output was saved to a log in the session scratchpad, outside the checkout; no
  file of the repository other than this report was written.

## Final assessment

No critical issues or warnings. 1 suggestion to consider. Ready for archive (with noted improvements) once task 6.1
(the push and its green CI run) is done.
