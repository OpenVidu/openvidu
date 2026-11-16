# Design

## Context

See `proposal.md` for the motivation.

- The live tiles are six `ovd-kpi-tile` elements in `features/overview/overview-page.html`, each with a literal
  `label`, a `link` and literal `queryParams`. The label is also the subject of the tile's info tip ("About <label>").
- The Egress page reads `status` as comma-separated values (`QueryStateService.csv`) and writes it the same way
  (`navigate()` joins arrays with `,`). Its Active option is selected only when the URL holds every status of
  `EGRESS_IN_FLIGHT_STATUSES` (`starting`, `active`, `ending`, exported by the typings), the set `live.egresses`
  counts.
- No data model, API, index or query changes: there is no schema-version impact, no OpenAPI change and no
  performance budget to verify.

## Goals / Non-Goals

**Goals:**

- The six labels of the specs, and the egress link in the form the Egress page writes.
- A test titled after each scenario of the three modified requirements.

**Non-Goals:**

- Any change to the Egress page, to `ovd-kpi-tile` or to the lists' range rule.
- Shared constants for the tile labels.

## Decisions

1. **The egress link is built from `EGRESS_IN_FLIGHT_STATUSES`.** `OverviewPage` exposes the query parameters of the
   tile as a constant, `{ status: EGRESS_IN_FLIGHT_STATUSES.join(',') }`, and the template binds it. The link, the
   counter of the API and the Active option of the filter then share one definition.
   - Rejected: the literal `'starting,active,ending'` in the template, which drifts if a status joins the set.
   - Rejected: an array in `queryParams`. The router writes it as a repeated parameter (`status=starting&status=…`)
     and the Egress page reads only the first value.
   - Rejected: making the Egress page treat `status=active` as the in-flight set. `active` is also one status of the
     API filter, and the URL would stop meaning what the request carries.
2. **Labels stay literals in the template**, as they are today. The info tip names follow from the `label` input, so
   no other code changes.
3. **`ui-info-tips` and `participants-ui` change in wording only.** Their deltas keep every scenario of the modified
   requirement, and the coverage check counts each one, so the tests that already cover them take the scenario names
   as titles; "Clearing the kind filter" has no test yet and gets one.
4. **The two tiles followed to their lists are tested end to end.** Both scenarios cross two pages; the unit tests
   cover the `href` on one side and the filter state on the other, and the e2e test covers the navigation.
5. **The four egresses of "Active egress tile" are defined in its test** (`apiOptions.egresses`), not added to the
   shared `EGRESSES` fixture, whose row counts other suites assert and extending applications import.
6. **No CHANGELOG line** (see `proposal.md`), and no `README.md` or `AGENTS.md` change: no command, path or
   convention changes.

## Test strategy

| Scenario                       | Test file                                         | Level |
| ------------------------------ | ------------------------------------------------- | ----- |
| Tile values and links          | `features/overview/overview-page.spec.ts`         | unit  |
| Refresh keeps values           | `features/overview/overview-page.spec.ts`         | unit  |
| Publishers tile                | `e2e/tests/overview.spec.ts`                      | e2e   |
| Active egress tile             | `e2e/tests/overview.spec.ts`                      | e2e   |
| Live tiles                     | `features/overview/overview-page.spec.ts`         | unit  |
| Today tiles                    | `features/overview/overview-page.spec.ts`         | unit  |
| Data pipeline and recent rooms | `features/overview/overview-page.spec.ts`         | unit  |
| Arriving from a room           | `features/participants/participants-page.spec.ts` | unit  |
| Clearing the kind filter       | `features/participants/participants-page.spec.ts` | unit  |
| Publishers chip                | `features/participants/participants-page.spec.ts` | unit  |

`features/` is `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/` and `e2e/` is `dashboard-ce/e2e/`. The
existing e2e tests that name the tiles (`overview.spec.ts`, `info-tips.spec.ts`) follow the new labels; they keep
their titles.

## Risks / Trade-offs

- [Longer labels wrap on a phone, where tiles render two per row] → The label is inline text, so it wraps with its info
  icon after the last word, and the tile row balances its rows; the touch test of `info-tips.spec.ts` opens the tip of
  "Active participants" at 375 px, and the e2e suite runs axe on the page.
- [A live entity older than the global range is counted by its tile and absent from the list] → Known behaviour of the
  lists, recorded in `proposal.md`; this change does not alter it.
- [Other changes in flight edit `overview-page.html`, its unit test, `e2e/tests/overview.spec.ts` and the `overview-ui`
  spec] → This change touches only the live tile row and the three requirements of its deltas. A later change that
  modifies "Overview info tips" or "Participants filters and room chip" starts from the text this one archives.
- [An extending edition has tests or texts with the old labels or `/egress?status=active`] → They fail when it adopts
  this commit, which is where it adapts them.
