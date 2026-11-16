# Design

## Context

See `proposal.md` for the defect. What shapes the fix, all in
`dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/analytics/`:

- `ovd-analytics-card` (`analytics-card.ts`) disables "Export XLSX" with
  `locked() || exporting() || exportDisabled() || loading() || empty()`.
- The Data transferred card of `analytics-page.html` binds `[empty]="bandwidth.empty && mediaStats() !== 'none'"`: with
  `"none"` it is never empty, so that its tiles and chart render unavailable instead of "No data in this range"
  ("Media statistics coverage warnings"). Nothing else disables its export, and it binds no `exportDisabled`.
- The Egress and Ingress cards have the same shape for a node scope (`[empty]="egress.empty && !byNode"`) and already
  bind `[exportDisabled]="byNode"`.
- `mediaStats` is a signal of the page, read from the summary, and part of `AnalyticsPageContext`
  (`analytics-seams.ts`); `AnalyticsCard` and its `exportDisabled` input are exported by `public-api.ts`.

Cards checked for the same gap (content unavailable, export enabled):

| Card                                   | Renders unavailable       | Export in that state        |
| -------------------------------------- | ------------------------- | --------------------------- |
| Rooms, Participants, Client breakdowns | never                     | not applicable              |
| Data transferred                       | `mediaStats() === 'none'` | enabled: the defect         |
| Egress, Ingress                        | node scope                | disabled (`exportDisabled`) |
| Locked PRO slots                       | never (compact lock)      | disabled (`locked()`)       |

`"partial"` needs no change: the card binds `[empty]="bandwidth.empty"` in effect, so a range with bytes exports them and
a range without any reads "No data in this range" with the export disabled by `empty()`.

## Goals / Non-Goals

**Goals:**

- The Data transferred export is disabled exactly when the card renders its content unavailable.
- The three states of the card's export under missing media statistics are pinned by tests.

**Non-Goals:**

- A generic "unavailable" state in `ovd-analytics-card`.
- Changing when the card is empty or unavailable, or what the workbook holds.
- Deciding the export from the series values: with `"none"` the export follows what the card draws, whatever the
  series hold.

## Decisions

1. **Bind `[exportDisabled]="mediaStats() === 'none'"` on the Data transferred card.** One binding, the same input and
   the same condition its tiles and chart already use for `unavailable`, as Egress and Ingress do with `byNode`.
   Rejected:
   - Dropping `&& mediaStats() !== 'none'` from `[empty]`: the export would be disabled, but the card would read "No
     data in this range", against "Media statistics coverage warnings".
   - An `unavailable` input on `ovd-analytics-card`, or the card inferring it from its projected charts: a new
     abstraction for two call sites that one existing input already serves.
   - Returning early in `exportSection()`: the button would stay enabled and do nothing.
2. **New requirement instead of modifying "Workbook export per section" or "Media statistics coverage warnings".** The
   behaviour is one more case of the first ("disabled while the card has no data") in the state the second defines;
   neither text becomes false. An added requirement keeps both blocks whole and under the description length the
   strict validation enforces on main specs.
3. **No new seam.** A card of the PRO strip already gets `mediaStats` from `AnalyticsPageContext` and sets
   `exportDisabled` on its own `ovd-analytics-card`. The library README names only `mediaStatsWarning()` in "Missing
   media statistics"; it gains `mediaStats()` and the `exportDisabled` input.
4. **The `exportDisabled` doc comment states the rule**, since it now has two reasons: disabled while the card shows
   its content as unavailable. `dashboard-ce/frontend/AGENTS.md` ("Missing data") gains the same convention: an
   Analytics card whose whole content is unavailable sets `exportDisabled`.
5. **No CHANGELOG line** (see `proposal.md`).

No data model, API, index or dependency change; no request is added or removed, so there is no performance budget to
verify.

## Test strategy

| Scenario                               | Test file                                                                  | Level |
| -------------------------------------- | -------------------------------------------------------------------------- | ----- |
| Export without media statistics        | `dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts`           | unit  |
| Export without media statistics        | `dashboard-ce/e2e/tests/analytics.spec.ts`                                 | e2e   |
| Export with partial media statistics   | `dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts`           | unit  |
| Partial media statistics without bytes | `dashboard-ui/src/lib/features/analytics/analytics-page.spec.ts`           | unit  |

- Unit tests open the page with `openAnalytics()` and the `summary` and `points` answers of
  `src/testing/analytics.ts` (`points: { bytesUp: [[bucket, 0]], bytesDown: [[bucket, 0]] }` for the series of zeros);
  the partial export reads the sheets from `workbookRecorder()`, as the Rooms workbook test does.
- The e2e test runs against the built application with `analyticsSummary: { mediaStats: 'none', bytesUp: 0,
  bytesDown: 0 }` and `analytics: { series: { bytesUp: () => 0, bytesDown: () => 0 } }` of `MockApi`, and checks axe.
- The existing tests of the `"none"` and `"partial"` states keep their titles and assertions.

## Risks / Trade-offs

- [A summary `"none"` over a range whose series still hold bytes, such as rollups written before the marks next to
  marked ones] → The card already shows that range as unavailable; the export follows the card. Changing what `"none"`
  means belongs to `analytics-api`.
- [A disabled button gives no reason by itself] → The warning icon beside the card heading explains the missing data,
  as in the Egress and Ingress cards of a node scope.
