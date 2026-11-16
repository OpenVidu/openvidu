# Design

## Context

See `proposal.md` for the motivation.

- The live tiles are six `ovd-kpi-tile` elements in `features/overview/overview-page.html`, each with a literal
  `label`, a `link` and literal `queryParams`. The label is also the subject of the tile's info tip ("About <label>").
- The Egress page reads `status` as comma-separated values (`QueryStateService.csv`) and writes it the same way
  (`navigate()` joins arrays with `,`). Its Active option is selected only when the URL holds every status of
  `EGRESS_IN_FLIGHT_STATUSES` (`starting`, `active`, `ending`, exported by the typings), the set `live.egresses`
  counts.
- `ovd-kpi-tile` is a block: label, value and, when set, delta and hint, one under the other from the top.
  `ovd-tile-row` is a grid of equal columns with a 12 px gap that stretches the tiles of a line to one height and
  sizes them for their values (150 px at least), never for their labels.
- With the new labels, measured on the demo: at a 1280 px viewport the six live tiles are 155 px wide and "Active
  participants" takes two lines; between 1280 and 1440 px (182 px tiles) the info icon of "Active participants" and
  "Active publishers" drops to a second line; at 1920 px everything fits on one. The value of a tile whose label
  takes two lines sat one line (20 px) lower than its neighbours'.
- Rows that mix tiles with and without a hint: the summaries of Participants, Egress, Ingress and Analytics. The
  Analytics summary also holds the only value on two lines ("Data up / down").
- No data model, API, index or query changes: there is no schema-version impact, no OpenAPI change and no
  performance budget to verify.

## Goals / Non-Goals

**Goals:**

- The six labels of the specs, and the egress link in the form the Egress page writes.
- A test titled after each scenario of the three modified requirements and of the new one.
- Values level in every tile row, with a layout rule and no measuring code.

**Non-Goals:**

- Any change to the Egress page or to the lists' range rule.
- Keeping labels on one line: tiles are not widened for their labels and labels are not shortened or clipped.
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
7. **The tiles of a row share its row tracks (CSS subgrid).** Inside `ovd-tile-row`, a tile spans four rows of the
   row's grid and lays its parts on them: label (aligned to the top), value (aligned to the bottom of its track),
   delta and hint. The tracks take the height of the tallest part of the line, so the values end level whatever the
   labels, values, deltas and hints of the neighbours are; tracks nobody fills are empty, which leaves the values at
   the bottom of the tiles. The skeleton takes the value's track.
   - The row's 12 px gap stays between columns and between the lines of a wrapped row, but must not open between the
     parts of one tile: the row gap of the grid becomes 0 and the tiles carry the space between lines. A row whose
     labels fit keeps today's tile height.
   - The rule applies only inside `ovd-tile-row` (the tile selects on its host context); a tile anywhere else stays a
     block, so nothing changes for a grid of another page or edition.
   - The copy `ovd-tile-row` inserts to measure a value is absolutely positioned and takes no track.
   - Subgrid is in every browser the Angular version of the workspace supports.
   - Rejected: the value, delta and hint pushed to the bottom of each tile as one block. It levels the Overview, whose
     tiles have no hints, and breaks the rows that mix tiles with and without a hint: the value of a tile without
     hint would sit one hint lower than its neighbours'.
   - Rejected: a tile row that counts the labels in its minimum width. Six tiles of about 190 px do not fit one line
     at 1280 px, so the live row would take two lines of three.
   - Rejected: room for two label lines in every tile, which makes every row 20 px taller for the few that wrap.
   - Rejected: measuring the labels in `ovd-tile-row` to set a common height, code for what the layout can do.
   - Accepting the wrap as it was is what the owner declined.
8. **The three suggestions of the code review are applied with the layout**, in the same task group: an assertion that
   could not fail, the total of info tips of the page and the wording of a comment.

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
| Label on two lines             | `e2e/tests/overview.spec.ts`                      | e2e   |
| Hint under one value           | `e2e/tests/egress.spec.ts`                        | e2e   |
| Value on two lines             | `e2e/tests/analytics.spec.ts`                     | e2e   |

`features/` is `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/` and `e2e/` is `dashboard-ce/e2e/`. The
existing e2e tests that name the tiles (`overview.spec.ts`, `info-tips.spec.ts`) follow the new labels; they keep
their titles.

The three layout scenarios need a browser: the unit tests render without layout. Each test compares the boxes of the
labels and values of one row at the 1280 px viewport of the suite, and "Label on two lines" first asserts that the
label of "Active participants" is taller than that of "Active rooms", so it cannot pass on a row where nothing wraps.

## Risks / Trade-offs

- [Longer labels wrap on a phone and on desktop widths up to about 1440 px, and an info icon may stand alone on the
  second line] → Accepted by the owner: labels may wrap. Decision 7 keeps the values of the row level; the touch test
  of `info-tips.spec.ts` opens the tip of "Active participants" at 375 px, and the e2e suite runs axe on the page.
- [The layout of the shared tile changes on every page with a tile row, and in the pages of an extending edition] →
  The scenarios cover the three cases that differ (wrapped label, hint under one value, value on two lines), the
  existing e2e suites of every page run against it, and decision 7 keeps the tile height of a row without wrapped
  labels. The baseline screenshots show Settings, which has no tiles; if one changes, it is regenerated and reported.
- [One-line values of the Analytics summary move down to the last line of "Data up / down"] → Intended: values end
  level in every row.
- [A live entity older than the global range is counted by its tile and absent from the list] → Known behaviour of the
  lists, recorded in `proposal.md`; this change does not alter it.
- [Other changes in flight edit `overview-page.html`, its unit test, `e2e/tests/overview.spec.ts` and the `overview-ui`
  spec] → This change touches only the live tile row and the three requirements of its deltas. A later change that
  modifies "Overview info tips" or "Participants filters and room chip" starts from the text this one archives.
- [An extending edition has tests or texts with the old labels or `/egress?status=active`] → They fail when it adopts
  this commit, which is where it adapts them.
