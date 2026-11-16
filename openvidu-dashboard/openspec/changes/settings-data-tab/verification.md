# Verification: settings-data-tab

- Date: 2026-11-16
- Mode: full
- Verified commit: `d12444b89a858718102354ab4357ea93337beaa7` (`git diff origin/master`, `origin/master` =
  `fced8ec7d`: the proposal commit, six implementation commits and the owner review record); working tree clean
- Guard probe (step 1) skipped by the owner's decision: this session cannot activate the guard. Held to its rules: only
  reads, the checks below and this file.

## Checks run

| Command | Result |
| --- | --- |
| `./dashboard.sh check` | Pass (exit 0): lint, format, typecheck, `openspec validate --all --strict` (31 items), tooling tests 115, typings 109, backend unit 240, `dashboard-ui` 586 in 51 files, `frontend` 1 |
| `./dashboard.sh scenarios settings-data-tab` | 49 scenarios, 0 without a test |
| `./dashboard.sh e2e` | Pass (exit 0): mocked suite 126 passed, real-backend suite 6 passed (Docker available); axe on `tab=data` with Entities expanded in the light and the dark theme |
| `./dashboard.sh test-integration` | Not applicable: no backend file changed |
| Contract check, image build and smoke | Not applicable: no contract, image or runtime dependency change |
| CI run of the push (task 9.1) | Pending (orchestrator, after this verification) |

## Summary

| Dimension | Status |
| --- | --- |
| Completeness | 29/32 tasks; the 3 open (9.1, 10.1, 10.2) belong to the orchestrator after this verification: pending, not findings. 10 ADDED/MODIFIED requirements in `settings-about`, 1 in `overview-ui`, 1 in `ui-shell`, all implemented |
| Correctness | 12/12 requirements covered; 49/49 scenarios with a passing test that asserts what the scenario states. 4 removals confirmed, 1 rename (About loading state → Data loading state) verified through its MODIFIED text |
| Coherence | Design decisions 1–13 followed; performance budget met; 2 suggestions |

## Requirements and scenarios

`features/` is `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/`.

- **Preferences and Data tabs**: `features/settings/settings-page.ts:8` (`SETTINGS_TABS = ['preferences', 'data']`),
  tab label "Data". Deep link to Data (`settings-page.spec.ts:181`: Data selected and focused, tabs exactly
  Preferences and Data), Former About value (`:194`).
- **Legacy migration on the Data tab**: `data-tab.ts:59-78`, `data-tab.html:4-14`, unchanged behaviour. Migration
  running on the Data tab (`:202`, 25 % then 50 % with the next status), Completed before the page opened (`:219`),
  Completed while watching (`:232`).
- **Storage per data class**: `storage-classes.ts:32-72` (the seven classes of design decision 2, `schema_meta` in
  none), `:166-201` (sums and total), `data-tab.html:16-77`. Class rows (`settings-page.spec.ts:322`, also no
  "Kept for"), Collections of each class (`storage-classes.spec.ts:56`), Class that sums several collections (`:73`),
  Storage total without schema_meta (`settings-page.spec.ts:361`, Total row `Total`, empty, `289`, `737 kB`, no
  `schema_meta` in the tab), Retention that is not a whole number of days (`:343`), Retention not reported (`:353`).
  The design's classification test (`storage-classes.spec.ts:47`) fails when a contract collection is left
  unclassified.
- **Retention progress**: `storage-classes.ts:126-157` (rounding down, "Less than 1 <unit>", tolerance
  `max(1 day, retention / 10)`). Class still filling (`settings-page.spec.ts:379`: accessible name and text of the
  tip), Span rounded down, Class at full retention, Full within a tenth of the retention, Less than one unit of data,
  Idle period reads as filling (`storage-classes.spec.ts:103-127`).
- **Clock of each data class**: `storage-classes.ts:24-29`, `:75-81`, `:180`. Entities clock ignores nodes and
  ingresses, Stats and tracks on the deployment clock, Deployment older than the stats retention, Class without a
  clock (`storage-classes.spec.ts:129-165`).
- **Size estimate at full retention**: `storage-classes.ts:139-157`. Linear estimate, No estimate under one day of
  data, Unlimited daily rollups without a day of data, Daily rollups with a limit (`storage-classes.spec.ts:167-193`),
  Unlimited daily rollups (`settings-page.spec.ts:391`), Total without an estimate (`:404`).
- **Retention tip access**: the shared `ovd-info-tip` after the retention value, rendered only when the row has a tip
  (`data-tab.html:52-54`). Progress only in the tip (`settings-page.spec.ts:417`). Retention tip by keyboard
  (`e2e/tests/settings.spec.ts:62`: focus by Tab from the row's expand button, tooltip text, accessible description,
  Escape hides it). Retention tip on a phone (`:80`), see the next section.
- **Collection breakdown**: `collection-breakdown.ts`, `data-tab.html:35-47` and `:59-65`, `data-tab.ts:53`,
  `:107-117`; state in a signal, not in the URL. Breakdown collapsed by default (`settings-page.spec.ts:475`), Expand a
  class (`:492`), Collapse a class (`:530`), Collection without an oldest date (`:547`). Kept by the owner on the demo
  (`operations.md`).
- **Retention configuration message**: `data-tab.html:82-91`. Where the retention is set (`settings-page.spec.ts:429`,
  text, `href` and `target="_blank"`), What the estimates assume (`:445`).
- **Server info unavailable**, **Data loading state** (MODIFIED; RENAMED from About loading state): Backend down
  (`:254`), Info in flight (`:293`), Info arrives (`:303`: only the Storage heading, the table and the message, no
  version line, no `ovd-edition-badge`).
- **Server status card** (`overview-ui`): `overview-page.html:120` targets `tab: 'data'`. The eight scenarios are titled
  tests in `overview-page.spec.ts` (237, 276, 292, 322, 478, 496, 505, 517).
- **Info re-read on server changes** (`ui-shell`): Migration ends (`settings-page.spec.ts:155`: one info request, the
  Entities row then reads `90 days`, `4`, `381 kB`), Steady server (`core/refresh/server-status.spec.ts:187`: 20 polls
  of 30 s, no info request).

Removed requirements, checked against the baseline in `openspec/specs/settings-about/spec.md`: Settings tabs (no
About tab, unit and e2e), OpenVidu version (no version line or edition badge in the tab: `Info arrives` and the e2e
`Data shows the storage per data class…`), Retention and storage (the retention table and the per-collection table
are gone; no "Kept for" column), Migration status (replaced with the same behaviour). No code path still delivers them.

## Points the orchestrator asked about

- **Tip on touch.** `Retention tip on a phone` (`e2e/tests/settings.spec.ts:77-97`) runs at 375 × 740 with
  `hasTouch: true` and opens the tip with `tap()`, which in Chromium dispatches touch input (pointer type `touch`).
  The tooltip appearing proves the tap path: the tip sets `matTooltipTouchGestures="off"` and MatTooltip shows on focus
  only for keyboard focus, so nothing but `InfoTip.activate` (`components/info-tip/info-tip.ts:98-109`, `toggle()` for
  touch) shows it. The second tap hiding it proves the touch toggle specifically: a mouse or keyboard activation calls
  `show(0)` and would leave it open. The test also asserts the tooltip box inside 0–375 px and
  `document.documentElement.scrollWidth <= 375`. Hover and keyboard focus are the shared tip's behaviour; keyboard is
  asserted by `Retention tip by keyboard`.
- **Accessible name of the breakdown table.** `collection-breakdown.ts:238` names the nested table with
  `aria-label="Collections of <class>"`; the specs and the design say nothing about it, so it is no divergence (see
  the suggestion on consistency).
- **Unlimited daily rollups without an oldest date.** `storage-classes.ts:142-146` returns "Grows without limit" for
  unlimited daily rollups even without a clock. That follows "Size estimate at full retention" ("SHALL always carry the
  tip") but contradicts the general sentence of "Clock of each data class" ("A class without a clock carries no
  tip"). See the suggestion.
- **Extra tests.** `storage-classes.spec.ts:47` (classification, required by design decision 2), `:89` (total over the
  rows), `core/info.spec.ts:47` (`readAt` set only by the full document, decision 8), `server-status.spec.ts:168` (the
  re-read half of the former test, kept beside `Steady server` as task 4.3 asks). None contradicts a spec.
- **Overview test adjustments.** `Server silent without a stop` now uses a 10-minute-old batch as the scenario states
  (was 3 minutes); `Server stopped` and `Healthy card` pin the reference to today at 12:10:04 / 12:31:09 UTC to assert
  the scenario times exactly (the page is in UTC, `overview-page.spec.ts:146`); `Auto-refresh off` adds that the tiles
  keep their values and no overview request is made; `Migration running` adds the update with the next status;
  `Before the first status` adds "no Loading text"; `Slow writer batches` and `Storage and retention link` are new. Each
  matches its scenario; the titled tests of `overview-live-tiles` are untouched.
- **Initial bundle warning.** Not raised by this change. The e2e build of this commit reports "bundle initial exceeded
  maximum budget. Budget 1.20 MB was not met by 39.69 kB with a total of 1.24 MB"; the CI run of `origin/master`
  `fced8ec7d` (run 43950788545, read with `gh run view --log`) reports the same warning at 39.58 kB over. The change
  adds 0.11 kB raw to the initial bundle (transfer size unchanged within rounding: 251.30 → 251.22 kB), from the `readAt` signal of
  `core/info.ts`; the Data tab, `storage-classes.ts` and the breakdown are in the lazy Settings chunk (strings such as
  "Grows without limit" appear only there). The Settings chunk grew from 78.41 kB raw / 18.2 kB gzip to 83.46 kB /
  19.9 kB gzip, under its 150 kB gzip budget; the initial total is 310.0 kB gzip against 400 kB.

## Design adherence

- Decisions 1–2: no backend, API or contract change; one pure module with the class map, `formatRetention` moved into
  it.
- Decisions 3–7: each class by its own clock, Stats and Tracks on the deployment clock, Entities without `nodes` and
  `ingresses`, the 1 day / 10 % tolerance, estimate `size × retention ÷ span` from one day of data, unlimited daily
  rollups over 365 days, no estimate in the Total row.
- Decision 8: `InfoService.readAt` (`core/info.ts:31`, `:50`), passed to the module (`data-tab.ts:86`).
- Decisions 9–12: shared info tip with `subject` "<class> retention"; native expand button with `aria-expanded`,
  `aria-controls` and the listed icons; plain table in its `overflow-x: auto` wrapper with a wrapping first column
  (`data-tab.scss:40-43`); `DataTab`, `ovd-data-tab`, `data-tab.{ts,html,scss}`.
- Performance budget: no request added; Settings lazy chunk within budget (above).

## Conventions

- Edition seams: the tab is not exported by `public-api.ts`; the PRO adaptation is out of scope as the proposal states.
- Language, comments, commit messages (`openvidu-dashboard: …, change settings-data-tab`): conform.
- CHANGELOG: `CHANGELOG.md:54-56`, the Settings line rewritten under 3.10.0 `Added` → `UI` as the proposal gives it, in
  the commit that renames the tab (`de5f89d48`).
- `README.md`, the `AGENTS.md` files and the library README name neither the About tab nor its files. Remaining
  `tab=about` references are intended: `core/auth/auth.spec.ts:134` (arbitrary protected URL, task 4.4),
  `settings-page.spec.ts:195` (`Former About value`), and the main specs, which change at sync.

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **Spec wording on unlimited daily rollups without a clock.** "Clock of each data class" ends with "A class without
   a clock carries no tip", while "Size estimate at full retention" says unlimited daily rollups "SHALL always carry
   the tip 'Grows without limit'". `storage-classes.ts:142-146` follows the latter, so a deployment with no daily bucket
   yet shows the tip; no test pins that case (`storage-classes.spec.ts:185` has a 5-hour bucket). Recommendation: have
   the owner confirm the behaviour, then qualify the clock sentence in
   `specs/settings-about/spec.md` ("…carries no tip, except Daily rollups without a limit") before syncing and add a
   test with an empty `analytics_daily`.
2. **Code pattern deviation: table naming.** The breakdown table is named by `aria-label`
   (`collection-breakdown.ts:238`), while the Storage table and the former tables use a visually hidden `<caption>`
   (`data-tab.html:19-21`). Recommendation: use `<caption class="ovd-visually-hidden">Collections of {{ label() }}
   </caption>` for consistency, or keep it; both give the same accessible name.

## Definition of Done

| Item | Status |
| --- | --- |
| All tasks checked | Not yet: 9.1, 10.1, 10.2 (orchestrator, after this verification) pending |
| `scenarios` finds a passing test for every delta scenario | Met (49/49; all pass in `check` and `e2e`) |
| `check` passes locally | Met |
| CI run of the push green | Pending (task 9.1) |
| Backend changes: `test-integration` | Not applicable |
| UI changes: `e2e` with axe and both themes | Met |
| Data contract changes: `contract-check` | Not applicable |
| Image or runtime dependency changes: `build-image`, `smoke-image` | Not applicable |
| Latest verification report without CRITICAL | Met (this report) |
| Refactor review applied or recorded | Task 7.3 checked; its outcome is in the implementation report, not in the repository, so not checked here. Recommendation: the orchestrator records it in `operations.md` |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met |
| Change archived | Pending; at sync, update the Purpose of `openspec/specs/settings-about/spec.md` (design decision 12) |

## Final assessment

No critical issues or warnings. 2 suggestions to consider. Ready for archive (with noted improvements) once the
orchestrator's groups 9 and 10 are done.
