# Code review: overview-live-tiles

- Date: 2026-11-16
- Reviewed commit: `575ccc5ccacfa4d3824da475d1a530394b33fba4` (`git diff origin/master`, four commits)
- Method: reading only. No suite and no browser were run; the `spec-verifier` runs the workspace checks.
- Result: 0 CRITICAL, 1 WARNING, 3 SUGGESTION.

Paths are relative to `dashboard-ce/`; `ui/` is `frontend/projects/dashboard-ui/src/lib/`.

## CRITICAL

None.

## WARNING

### W1. The longer labels wrap on common desktop widths and the values of the live row stop lining up

- Where: `ui/features/overview/overview-page.html:21` and `:29` (the labels), `ui/components/tiles/kpi-tile.ts:94-116`
  (block tile, 16 px padding, inline label followed by the 24 px info icon with a 4 px margin),
  `ui/components/tiles/tile-row.ts:14` and `:39` (150 px minimum; the row widens tiles for their values only, never
  for their labels).
- Triggering case: a viewport where the six live tiles share one row at less than about 190 px each, that is a
  content width of 960 to about 1200 px. At 1280 px (the viewport of the e2e suite): 1280 − 241 (sidenav) − 48
  (padding of `main`) = 991 px, so each tile is (991 − 5 × 12) / 6 ≈ 155 px wide and its label has ≈ 121 px.
  "Active participants" in `label-large` (Inter, 14 px, weight 500) needs about 130 px plus 28 px of info icon, and
  "Active publishers" about 117 px plus 28 px; "Participants" and "Publishers" with their icons needed about 108 px
  and fitted at the 150 px minimum.
- Consequence: those two labels take two lines while "Active rooms", "Active egress" and "Active ingress" take one.
  The tile is a block with its content at the top, so the values 85 and 54 sit one line (20 px) lower than 12, 3 and
  1 in the same row; "Active publishers" may leave its info icon alone on the second line. Before this change every
  label of the row fitted on one line at any tile width.
- Limits of this finding: the widths are computed from the styles, not measured in a browser. `design.md` records
  the wrap only for the phone (two tiles per row), and no test looks at the row at a desktop width; the axe checks
  and the touch test at 375 px do not detect it.
- To settle it: open `./dashboard.sh demo ce` at 1280 to 1440 px. If it shows, the options are an owner decision
  (accept it and record it in the risks of `design.md`; pin the value to the bottom of the tile; let the tile row
  count the label in its minimum width).

## SUGGESTION

### S1. An assertion of "Refresh keeps values" that cannot fail

- Where: `ui/features/overview/overview-page.spec.ts:265`, `expect(element.querySelector('.tiles ovd-skeleton')).toBeNull()`.
- Case: a KPI tile never renders `ovd-skeleton`; its skeleton is `<div class="skeleton ovd-skeleton-reveal">`
  (`ui/components/tiles/kpi-tile.ts:53`). The selector matches nothing whether or not a skeleton shows.
- Consequence: none for the scenario today, because the `innerHTML` comparison two lines above already fails if a
  skeleton replaces a value; the line reads as coverage it does not give. Use `.tiles .skeleton` or drop it.

### S2. "On no other tile, card or column" is asserted only for the sections the tests name

- Where: `ui/features/overview/overview-page.spec.ts:388-401` (and the two tests before it).
- Case: `tips(harness, section(element, 'By node'))` at `:400` is `[]` because CE renders no By node card with the
  default `open()` (`section()` returns `undefined`), so it passes whatever the page carries. An info tip added
  outside `.tiles`, Today, Data pipeline and Recent rooms (the page header, the stale notice, a new card) passes the
  three tests, although the title reads "the only other info tips".
- Consequence: the "and on no other" half of the requirement is not fully held by a test. It was the same before
  the split. One assertion on the total (`ovd-info-tip` count of the page is 7) closes it, and the By node line can
  go or open the page with a nodes card.

### S3. The comment of `egressQueryParams` calls query parameters a URL

- Where: `ui/features/overview/overview-page.ts:73`.
- Case: "The URL the Active option of the Egress status filter writes" documents an object of query parameters.
- Consequence: wording only. "The `status` the Active option of the Egress status filter writes: …" says what it is.

## Checked and found correct

- Egress link: `EGRESS_IN_FLIGHT_STATUSES.join(',')` gives `starting,active,ending`, the order `setStatusOptions()`
  writes (`ui/features/egress/egress-page.ts:52-58`, `:254-260`); the Angular serializer leaves the commas
  unencoded, and the unit test asserts the literal `href`. `QueryStateService.csv` reads the three values, the
  Active option is selected and the request carries the three statuses. The list query in flight already has its
  plan test (`backend/test/integration/egress-query-plan.test.ts:186`); nothing on the request path changes.
- No old label or `/egress?status=active` is left in the library, the e2e suites (mocked and real backend), the
  READMEs or the CHANGELOG. The remaining "About Participants" and "About Agents" are the Today tile and fixtures
  of `data-table.spec.ts` and `kpi-tile.spec.ts`, unrelated to the Overview live row.
- The deltas keep every scenario of the three modified requirements, so archiving loses none.
- New tests assert behaviour: the e2e "Active egress tile" fails if the link sends one status (the mock filters by
  `status`, so the table would list one row and the select would read "All"); "Publishers chip" now proves that
  `cursor` leaves the URL and the reload; "Clearing the kind filter" drives the real select; "Refresh keeps values"
  reads `lastUpdated` of the registered scheduler, which only advances when the `304` load resolves.
- No security surface: no API, header, cookie, log or analytics database change.
- Known and recorded in `proposal.md`, not a finding: an in-flight egress started before the global range is
  counted by the tile and absent from the list it opens.
