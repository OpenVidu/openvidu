# Tasks

Paths are relative to `dashboard-ce/`; `ui/` is `frontend/projects/dashboard-ui/src/lib/` and `features/` is
`ui/features/`. A test covers a scenario when its title is the scenario name, alone or followed by `: <detail>`.

## 1. Frontend: classes, clocks and estimates (implementer)

- [x] 1.1 Create `features/settings/storage-classes.ts` with the seven class definitions of design decision 2 (label,
      retention key, collections, clock collections) and a function that turns the `storage` and `retention` of an
      info document and its read time into the class rows (retention text, documents, bytes, tip text or none, the
      entries of its collections) and the total. Move `formatRetention` there. Verify: the tests of 1.2 to 1.5 pass.
- [x] 1.2 In `features/settings/storage-classes.spec.ts`, add a test that every `Collection` except `schema_meta`
      belongs to exactly one class, and the tests `Collections of each class` and `Class that sums several
      collections`. Covers: Collections of each class, Class that sums several collections. Verify: the unit tests
      pass.
- [x] 1.3 In the same file, add `Span rounded down`, `Class at full retention`, `Full within a tenth of the
      retention`, `Less than one unit of data` and `Idle period reads as filling`, each with the figures of its
      scenario and a fixed read time. Covers: those five scenarios. Verify: the unit tests pass.
- [x] 1.4 In the same file, add `Entities clock ignores nodes and ingresses`, `Stats and tracks on the deployment
      clock`, `Deployment older than the stats retention` and `Class without a clock`. Covers: those four scenarios.
      Verify: the unit tests pass.
- [x] 1.5 In the same file, add `Linear estimate`, `No estimate under one day of data`, `Unlimited daily rollups
      without a day of data` and `Daily rollups with a limit`. Covers: those four scenarios. Verify: the unit tests
      pass.

## 2. Frontend: the Data tab (implementer)

- [x] 2.1 In `ui/core/info.ts`, record the time at which the full info document arrives and expose it as a read-only
      signal (design decision 8). Verify: the tests of 2.6 read spans computed from it.
- [x] 2.2 Rename `features/settings/about-tab.{ts,html,scss}` to `data-tab.{ts,html,scss}` (class `DataTab`, selector
      `ovd-data-tab`); in `settings-page.ts` set `SETTINGS_TABS` to `['preferences', 'data']` and label the tab "Data".
      Verify: the tests of 2.5 pass and `grep -ri "about-tab\|AboutTab" frontend e2e` finds nothing.
- [x] 2.3 In the Data tab, remove the version line and the edition badge, and replace the two tables with the
      "Storage" table of the specs (columns Data, Retention, Documents, Size; seven class rows from
      `storage-classes.ts`; Total row; "—" and "Retention not reported by the server yet" without `retention`), with
      `ovd-info-tip` after the retention value of the rows that have a tip text (`subject` "<class> retention"). Keep
      the migration section, the unavailable notice and the skeleton as they are. Verify: the tests of 2.6 and 2.7
      pass.
- [x] 2.4 Under the table, add the two paragraphs of "Retention configuration message" with `ovd-external-link` to
      `EXTERNAL_LINKS.documentation + '#retention'`; let the first column wrap so the table fits design decision 11.
      Verify: the tests of 2.8 pass.
- [x] 2.5 In `features/settings/settings-page.spec.ts`, add `Deep link to Data` and `Former About value`, and retitle or
      split the existing tests into `Migration running on the Data tab`, `Completed before the page opened`,
      `Completed while watching`, `Backend down`, `Info in flight` and `Info arrives` (the last asserting that the tab
      holds no version line and no `ovd-edition-badge`). Covers: those eight scenarios. Verify: the unit tests pass.
- [x] 2.6 In the same file, add `Class rows`, `Retention that is not a whole number of days`, `Retention not
      reported` and `Storage total without schema_meta` (the last asserting that the tab text does not contain
      `schema_meta`), replacing the tests of the two former tables and of the `About helpers`. Covers: those four
      scenarios. Verify: the unit tests pass.
- [x] 2.7 In the same file, add `Class still filling`, `Unlimited daily rollups`, `Total without an estimate` and
      `Progress only in the tip`, reading the accessible name of the info tip and its text, with `oldest` dates built
      from the read time. Covers: those four scenarios. Verify: the unit tests pass.
- [x] 2.8 In the same file, add `Where the retention is set` (text, link target and new tab) and `What the estimates
      assume`. Covers: those two scenarios. Verify: the unit tests pass.

## 3. Frontend: collection breakdown (implementer)

- [x] 3.1 Create `features/settings/collection-breakdown.ts` (inline template): the table of the collections of one
      class with Collection, Documents, Size and Oldest, the oldest in the session zone and the undated tooltip moved
      from the former storage table. Verify: the tests of 3.3 pass.
- [x] 3.2 In the Data tab, add to each class row a native button named "Show collections of <class>" / "Hide
      collections of <class>" with `aria-expanded` and `aria-controls`, and render the breakdown in a row under an
      expanded class; keep the expanded classes in a signal, not in the URL (design decision 10). Verify: the tests of
      3.3 pass.
- [x] 3.3 In `features/settings/settings-page.spec.ts`, add `Breakdown collapsed by default`, `Expand a class`,
      `Collapse a class` and `Collection without an oldest date`. Covers: those four scenarios. Verify: the unit tests
      pass.

## 4. Frontend: Overview link and info re-read (implementer)

- [x] 4.1 In `features/overview/overview-page.html`, point the "Storage and retention" link to `tab: 'data'`. Verify:
      the test `Storage and retention link` of 4.2 reads the `href` `/settings?tab=data`.
- [x] 4.2 In `features/overview/overview-page.spec.ts`, retitle or split the untitled tests of the Data pipeline card
      ("reads the data pipeline without versions or retention", "reads a stopped server…", "turns the chip and the
      writer line to stale…", "shows the migration progress only while it runs", "reads paused while the auto-refresh
      is off…", "shows a skeleton in the data pipeline card…") into `Healthy card`, `Server stopped`, `Server silent
      without a stop`, `Migration running`, `Auto-refresh off` and `Before the first status`, add `Slow writer
      batches`, which has no test yet, and `Storage and retention link`; leave the tests already titled after a
      scenario as they are. Covers: those eight scenarios. Verify: the unit tests pass.
- [x] 4.3 Split "re-reads the info document once when the migration ends, never while the server is steady" of
      `ui/core/refresh/server-status.spec.ts` into `Steady server` and a re-read test, and add `Migration ends` to
      `features/settings/settings-page.spec.ts`: with the Data tab open on a running migration, a status reporting it
      completed triggers one info request and the table shows the retention and the storage of the new document.
      Covers: Migration ends, Steady server. Verify: the unit tests pass.
- [x] 4.4 Follow the rename in the unit tests that use `/settings?tab=about` as a sample URL
      (`ui/core/state/query-state.spec.ts`); `ui/core/auth/auth.spec.ts` keeps it as an arbitrary protected URL, like
      the `ui-shell` scenario of design decision 13. Verify: `pnpm exec ng test dashboard-ui --watch=false` passes.

## 5. Tests: end to end (implementer)

- [x] 5.1 In `e2e/fixtures/api.ts`, give the mocked info document storage entries for the collections of Entities,
      Events and the rollups, with `oldest` dates relative to the current time so that Entities is still filling and
      Events is full. Verify: the tests of 5.2 and 5.3 pass on any date.
- [x] 5.2 In `e2e/tests/settings.spec.ts`, replace the About tests with the Data tab ones (`tab=data`, `ovd-data-tab`,
      the Storage table, an expanded class, no version line), remove "PRO shows the PRO badge", and add `Retention tip
      by keyboard` and `Retention tip on a phone` (375 px, touch: the tooltip box lies inside the viewport and
      `document.documentElement.scrollWidth` does not exceed its width). Covers: Retention tip by keyboard, Retention
      tip on a phone. Verify: the file passes in `./dashboard.sh e2e`.
- [x] 5.3 Follow the rename in `e2e/tests/accessibility.spec.ts` (axe on `tab=data` with one class expanded, both
      themes), `e2e/tests/auth.spec.ts`, `e2e/tests/assets.spec.ts` (its "Events 7 days" row read on the Storage table)
      and `e2e/tests-backend/session.spec.ts` (`tab=data`, `ovd-data-tab`, no version line: assert the Storage table
      instead). Verify: `./dashboard.sh e2e` passes; report the real-backend suite as
      skipped if Docker is not available.

## 6. CHANGELOG and docs of the workspace (implementer)

- [x] 6.1 In `../CHANGELOG.md` (3.10.0, `Added` → `UI`), rewrite the Settings line as `proposal.md` gives it. Verify:
      the section has one Settings line and none names an About tab.
- [x] 6.2 Confirm that `../README.md`, the `AGENTS.md` files and `frontend/projects/dashboard-ui/README.md` name
      neither the About tab nor its files, and correct any that does. Verify: `grep -rni "about tab\|about-tab\|tab=about"`
      over those files finds nothing.

## 7. Checks and refactor review (implementer)

- [x] 7.1 Run `./dashboard.sh scenarios settings-data-tab`. Verify: each of the 49 scenarios lists a test and none
      reads "NO TEST".
- [x] 7.2 Run `./dashboard.sh check` and `./dashboard.sh e2e`, and build the frontend. Verify: all pass, the e2e with
      axe and both themes, and the bundle size check keeps the Settings chunk under its budget.
- [x] 7.3 Refactor review: assess whether the touched files need a refactor (the size of `settings-page.spec.ts`
      after the new tests, the split of the Overview and server status tests); apply a small one here or record that
      none is needed. Verify: the outcome is written in the implementation report.

## 8. Review on the demo (owner)

- [x] 8.1 On `./dashboard.sh demo ce`, open Settings → Data and decide whether the expandable collection breakdown
      stays. Verify: the decision is recorded by the orchestrator; if it goes, the change is revised (the "Collection
      breakdown" requirement and task group 3 are removed) and verified again before group 10.

## 9. Revision after the review (implementer)

- [x] 9.1 In `features/settings/storage-classes.ts`, take `analytics_daily` out of the deployment clock (design
      decision 4) and give no tip to a class without documents, except unlimited daily rollups, which always read
      "Grows without limit" (design decision 7). In `features/settings/storage-classes.spec.ts`, add `Class without
      documents`, `Daily bucket outside the deployment clock` and `Unlimited daily rollups without data` (no
      `analytics_daily` entry), and update `Stats and tracks on the deployment clock` (earliest date an hourly bucket)
      and `No estimate under one day of data` (tracks with documents) to their revised scenarios. Covers: those five
      scenarios. Verify: the unit tests pass.
- [x] 9.2 In the same file, pin the boundaries and the clock membership: `Span rounded down: exactly one day`
      ("1 of 7 days so far · …"), `Class at full retention: exactly 6 of 7 days` (no tip),
      `Entities clock ignores nodes and ingresses: <collection> earliest` for each of `rooms`, `participants`,
      `egresses` and `ingress_sessions`, and `Stats and tracks on the deployment clock: <collection> earliest` for each
      of the seven collections of the deployment clock (code review SUGGESTIONs 1 and 2). Covers: Span rounded down,
      Class at full retention, Entities clock ignores nodes and ingresses, Stats and tracks on the deployment clock.
      Verify: the unit tests pass, and each fails when its collection is dropped from its clock or when `<=` becomes
      `<` in the full tolerance (tried and reverted).
- [x] 9.3 In `features/settings/data-tab.ts`, remove the `?? Date.now()` fallback, reading `readAt` with a type that
      guarantees it beside the info document (code review SUGGESTION 5). In `features/settings/settings-page.spec.ts`,
      add `Span ends at the read` with fake timers: the info document read, the clock advanced two days, then
      `tab=data` opened (code review WARNING 2). Covers: Span ends at the read. Verify: the unit tests pass, and the
      new test fails when the tab passes `Date.now()` instead of `readAt` (tried and reverted).
- [x] 9.4 Replace the two paragraphs under the Storage table with one `ovd-notice` with `variant="info"` holding the
      text of "Retention configuration message" and its "Configuration reference" link, an `ovd-external-link` to a new
      `EXTERNAL_LINKS` entry for
      `https://openvidu.io/latest/docs/self-hosting/configuration/reference/#analytics-settings` (design decision 11).
      In `features/settings/settings-page.spec.ts`, update `Where the retention is set` (text, role `status`, `href`,
      new tab, no text under the table about the info icons or the estimates) and delete the `What the estimates
      assume` test; in `e2e/tests/settings.spec.ts`, follow the new text. Covers: Where the retention is set. Verify:
      the unit tests pass.
- [ ] 9.5 In `features/settings/collection-breakdown.ts`, name the table with a visually hidden `<caption>`
      "Collections of <class>", like the Storage table, instead of `aria-label` (verification SUGGESTION 2); if
      Prettier breaks an interpolated caption into a name with stray whitespace, use a form whose accessible name is
      exact. In `features/settings/settings-page.spec.ts`, make `Expand a class` assert the table name. Covers: Expand
      a class. Verify: the unit tests pass and axe passes in 9.6.
- [ ] 9.6 Run `./dashboard.sh scenarios settings-data-tab`, `./dashboard.sh check` and `./dashboard.sh e2e`; regenerate
      with `--update-snapshots=all` only the theme baselines that change, and check them by eye. Verify: each of the 52
      scenarios lists a test and none reads "NO TEST"; `check` and `e2e` pass, with axe in both themes.
- [ ] 9.7 Refactor review of the files touched by this group; apply a small one here or record that none is needed.
      Verify: the outcome is written in the implementation report.

## 10. Publish (orchestrator)

- [ ] 10.1 After the full verification and the owner's review, with the change pushed to `master` of
      `OpenVidu/openvidu`, confirm that the CI run of that commit is green (`checks`, `unit`, `integration`,
      `contract`, `e2e`). Verify: the run's conclusion is success.

## 11. Documentation (orchestrator)

- [ ] 11.1 In `openvidu.io`, on the branch of the 3.10 dashboard page
      (`docs/docs/self-hosting/production-ready/observability/openvidu-dashboard.md`), rewrite the Settings bullet
      "About" as "Data" (storage and retention per class of data and per collection, the estimate at full retention,
      the migration progress) and add to "Retention" that the Data tab estimates the size of each class and that a new
      `entities` or `tracks` retention applies to what closes after the restart. Confirm that the configuration
      reference of the same draft (pull request #160) keeps the "Analytics settings" section at `#analytics-settings`,
      the target of the Data tab's message. Verify: the page builds without broken links and the anchor resolves.
- [ ] 11.2 Replace `settings-about-light.png` and `settings-about-dark.png` with `settings-data-light.png` and
      `settings-data-dark.png`, taken on the demo with a class still filling, and update their references. Verify:
      the page shows both images and no file named `settings-about-*` remains.
