# Code review

- Date: 2026-11-16
- Reviewed commit: `4d6aa85f8e539deb1c7a1d1bd97b22da53d59e0d` (`git diff 36d6f3c29e..HEAD`)
- Method: reading only; no suite was run (left to `spec-verifier`).
- Result: 0 CRITICAL, 1 WARNING, 1 SUGGESTION.

Paths are relative to `dashboard-ce/`; `analytics/` is `frontend/projects/dashboard-ui/src/lib/features/analytics/`.

## CRITICAL

None.

## WARNING

### 1. `"none"` over series that hold bytes is not exercised by any test

- Where: `analytics/analytics-page.html:253`; tests `analytics/analytics-page.spec.ts:852` and
  `e2e/tests/analytics.spec.ts:375`.
- Stated behaviour: the requirement disables the export with `mediaStats: "none"` unconditionally, and the design
  repeats it (Non-Goals: "with `"none"` the export follows what the card draws, whatever the series hold"; Risks, first
  entry: rollups written before the marks next to marked ones).
- Triggering case: both tests of "Export without media statistics" use series whose every bucket is 0. The two older
  tests of the `"none"` state that keep the default series with bytes (`analytics/analytics-page.spec.ts:581`,
  `e2e/tests/analytics.spec.ts:341`) assert nothing about the export.
- Consequence: `[exportDisabled]="mediaStats() === 'none' && bandwidth.empty"` passes every test. With it, a range
  whose summary is `"none"` and whose series still hold bytes renders the card unavailable with "Export XLSX" enabled,
  and the workbook holds the figures the card declines to show: the defect of the proposal, in the case the design
  names as a risk.
- Fix: one assertion that "Export XLSX" of Data transferred is disabled in the test at
  `analytics/analytics-page.spec.ts:581`, or in the one at `e2e/tests/analytics.spec.ts:341`.

## SUGGESTION

### 1. The condition of the Data transferred card is written five times

- Where: `analytics/analytics-page.html:251`, `253`, `264`, `270`, `283`.
- Case: `[empty]` (negated), `[exportDisabled]` and three `[unavailable]` bindings each spell
  `mediaStats() === 'none'`; the change adds the fifth. The Egress and Ingress cards name the same state once
  (`@let byNode`, line 288) and bind it everywhere.
- Consequence: none today. `[empty]` and `[exportDisabled]` must stay opposite for the card to behave, and nothing but
  the tests ties them. A `@let` beside `@let bandwidth` gives the three cards one form (task 4.3).

## Checked without findings

- Logic: `mediaStats` is read from the same result object as the series, so the button never shows a state of a
  previous range. Summary loading or failed gives `undefined`, and the card follows `empty` as before.
- Error path: with `"none"` and a failed series request the card keeps its unavailable content under the error notice
  and the export is disabled; before the change it saved a workbook with the Info sheet alone.
- No other way to export the section: `exportSection('bandwidth')` is only bound to the card button, and a native
  disabled button emits no click.
- Unit tests: each asserts its scenario and fails when the button is missing (`?.disabled` compared with a boolean).
  "Export without media statistics" fails without the binding; the two `partial` tests pin `=== 'none'` against a
  wider condition.
- e2e test: the chart assertion waits for the content before the disabled assertion, so the loading state cannot
  satisfy it; axe runs on the page.
- Security, queries, API, data contract, dependencies: untouched.
- `frontend/AGENTS.md`, the library README and the `exportDisabled` doc comment describe the binding as implemented.
  No CHANGELOG line: the workbook export and the media statistics states are both entries of 3.10.0 (unreleased).
