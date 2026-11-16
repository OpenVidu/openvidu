# Proposal

## Why

On the Analytics page, when no server of the range reports media statistics (`mediaStats: "none"` in the summary), the
"Data transferred" card keeps its tiles and chart in place as unavailable, but its "Export XLSX" stays enabled and saves
a workbook whose only series sheet holds no values. "Workbook export per section" already disables the action while a
card has no data; this case escapes it because the card is deliberately not shown as empty.

## What Changes

Edition: CE. Repository: dashboard only (`OpenVidu/openvidu`, `openvidu-dashboard/`); nothing in openvidu-livekit or
openvidu-deployment.

- "Export XLSX" of the Data transferred card is disabled while the summary has `mediaStats: "none"`. Its heading
  warning and its unavailable tiles and chart stay as they are.
- With `mediaStats: "partial"` nothing changes: the card keeps its values and its export, and a range without any byte
  still reads "No data in this range" with the export disabled, as any empty card.
- `analytics-ui` states both cases with scenarios.

Observable behaviour that changes: one button, enabled before and disabled now, in one state of one card.

CHANGELOG: no line. The changelog lists the changes of 3.10.0 against 3.9, and neither the workbook export nor the
media statistics states exist in 3.9; the `Improved` line about the workbook export stays true.

Out of scope:

- The other CE cards. Rooms, Participants and Client breakdowns never render unavailable; Egress and Ingress render
  unavailable only in a node scope, where their export is already disabled.
- The Data up / down KPI tile, the warning texts and the look of the unavailable state.
- The API: `mediaStats` of `GET /api/v1/analytics/summary` is read as it is.
- The cards an extending edition renders in the PRO strip. They decide their own export from what the page context
  already shares (`mediaStats`) and the `exportDisabled` input of `ovd-analytics-card`; no seam is added.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `analytics-ui`: new requirement "Workbook export without media statistics": Export XLSX of the Data transferred
  section is disabled with `mediaStats: "none"` and follows the card's data with `"partial"`. No existing requirement
  changes its text.

## Impact

- `dashboard-ce/frontend/projects/dashboard-ui`: the Data transferred card of
  `src/lib/features/analytics/analytics-page.html`, the doc comment of `exportDisabled` in `analytics-card.ts`, and
  `analytics-page.spec.ts`.
- `dashboard-ce/e2e`: `tests/analytics.spec.ts`.
- Docs: the "Missing data" convention of `dashboard-ce/frontend/AGENTS.md` and the "Missing media statistics" entry of
  the library README, which names `mediaStatsWarning()` but not `mediaStats()`.
- No API, data contract, dependency, configuration or image change.
