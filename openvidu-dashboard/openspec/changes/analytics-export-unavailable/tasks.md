# Tasks

Paths are relative to `dashboard-ce/`; `analytics/` is
`frontend/projects/dashboard-ui/src/lib/features/analytics/`. A test covers a scenario when its title is the scenario
name, alone or followed by `: <detail>`.

## 1. Frontend: export of the Data transferred card (implementer)

- [ ] 1.1 In `analytics/analytics-page.spec.ts`, add `Export without media statistics`: a summary with
      `mediaStats: 'none'`, `bytesUp: 0` and `bytesDown: 0`, and the `points` answer giving `bytesUp` and `bytesDown`
      buckets of 0; the Data transferred card has no empty state, two unavailable tiles and the unavailable chart, its
      "Export XLSX" is disabled and that of Rooms is enabled. Covers: Export without media statistics. Verify: the test
      fails on the disabled assertion before 1.2 and passes after it.
- [ ] 1.2 In `analytics/analytics-page.html`, bind `[exportDisabled]="mediaStats() === 'none'"` on the Data transferred
      card, leaving its `[empty]` and the `unavailable` bindings as they are (design, decision 1). Verify: the test of
      1.1 passes.
- [ ] 1.3 In `analytics/analytics-card.ts`, reword the doc comment of `exportDisabled`: it keeps "Export XLSX" disabled
      while the card shows its content as unavailable (design, decision 4). Verify: `pnpm run lint` of the frontend
      passes.
- [ ] 1.4 In `analytics/analytics-page.spec.ts`, add `Export with partial media statistics`: a summary with
      `mediaStats: 'partial'`, the default series and `workbookRecorder()`; exporting Data transferred saves one file
      named `analytics-bandwidth-…xlsx` whose series sheet has the columns "Data up / down · Up (bytes)" and "Data up /
      down · Down (bytes)" with the bytes of the series in its rows. Covers: Export with partial media statistics.
      Verify: the unit test passes.
- [ ] 1.5 In the same file, add `Partial media statistics without bytes`: a summary with `mediaStats: 'partial'` and
      `bytesUp` and `bytesDown` buckets of 0; the Data transferred card reads "No data in this range", keeps the
      range `partial` warning on its heading and has "Export XLSX" disabled. Covers: Partial media statistics without
      bytes. Verify: the unit test passes.

## 2. Tests: end to end (implementer)

- [ ] 2.1 In `e2e/tests/analytics.spec.ts`, add `Export without media statistics: …` in a describe of its own with
      `analyticsSummary: { mediaStats: 'none', bytesUp: 0, bytesDown: 0 }` and
      `analytics: { series: { bytesUp: () => 0, bytesDown: () => 0 } }`: the Data transferred card shows its unavailable
      chart, its "Export XLSX" is disabled, that of Rooms is enabled, and axe finds no violation. Covers: Export without
      media statistics. Verify: the test passes in `./dashboard.sh e2e`.

## 3. Docs (implementer)

- [ ] 3.1 In `frontend/AGENTS.md`, "Missing data" bullet, add that an Analytics card whose whole content is unavailable
      sets `exportDisabled`. Verify: `./dashboard.sh check` passes its format check.
- [ ] 3.2 In `frontend/projects/dashboard-ui/README.md`, "Missing media statistics" entry, name `mediaStats()` beside
      `mediaStatsWarning()` of the Analytics page context, and the `exportDisabled` input of `ovd-analytics-card` for a
      card whose content is unavailable (design, decision 3). Verify: `./dashboard.sh check` passes its format check.
- [ ] 3.3 Confirm `CHANGELOG.md` needs no line (design, decision 5) and leave it untouched. Verify: `git diff
      CHANGELOG.md` is empty.

## 4. Checks and refactor review (implementer)

- [ ] 4.1 Run `./dashboard.sh scenarios analytics-export-unavailable`. Verify: each of the three scenarios lists a
      test and none reads "NO TEST".
- [ ] 4.2 Run `./dashboard.sh check` and `./dashboard.sh e2e`. Verify: both pass, the e2e with axe and both themes;
      report the real-backend suite as skipped if Docker is not available.
- [ ] 4.3 Refactor review: assess whether the three Analytics cards that pair `[empty]="… && !unavailable"` with
      `exportDisabled` call for a shared form; apply a small refactor here or record that none is needed. Verify: the
      outcome is written in the implementation report.
