# Tasks

Paths are relative to `dashboard-ce/`; `features/` is `frontend/projects/dashboard-ui/src/lib/features/`. A test covers
a scenario when its title is the scenario name, alone or followed by `: <detail>`.

## 1. Frontend: live tiles of the Overview (implementer)

- [x] 1.1 In `features/overview/overview-page.html`, label the live tiles "Active rooms", "Active participants",
      "Active publishers", "Active egress", "Active ingress" and "Active agents"; leave the Today tiles, the stale
      notice and the Data pipeline card as they are. Verify: the test of 1.3 reads the six labels.
- [x] 1.2 In `features/overview/overview-page.ts`, expose the query parameters of the egress tile built from
      `EGRESS_IN_FLIGHT_STATUSES` joined with `,` (design, decision 1) and bind them in the template. Verify: the test
      of 1.3 reads the `href` `/egress?status=starting,active,ending`.
- [x] 1.3 In `features/overview/overview-page.spec.ts`, retitle "shows the live tiles with their links and feeds the
      live counters" to `Tile values and links: …`, with `publishers: 54` in its overview and assertions on the six
      labels, the values 12, 85, 54, 3, 1 and 2 and the six links. Covers: Tile values and links. Verify: the unit test
      passes.
- [x] 1.4 In the same file, retitle "keeps every value on a 304 and sends the validator" to `Refresh keeps values: …`
      and assert that the update time of the refresh service advances with the `304`. Covers: Refresh keeps values.
      Verify: the unit test passes.
- [x] 1.5 In the same file, split "explains the live tiles, the today tiles, the data pipeline and unique identities
      with info tips only" into `Live tiles: …`, `Today tiles: …` and `Data pipeline and recent rooms: …`, each
      asserting the names of its info tips ("About Active participants", "About Active publishers", "About Active
      agents" for the live tiles) and their texts, and keeping the assertions that nothing else carries a tip. Covers:
      Live tiles, Today tiles, Data pipeline and recent rooms. Verify: the unit tests pass.

## 2. Tests: Participants filters (implementer)

- [x] 2.1 In `features/participants/participants-page.spec.ts`, retitle "shows a room chip whose removal drops the
      room" to `Arriving from a room: …` and "requests publishers and the sort of the URL, and removes the Publishers
      chip" to `Publishers chip: …`, the latter opened with a `cursor` and asserting that removing the chip drops
      `publisher` and `cursor`. Covers: Arriving from a room, Publishers chip. Verify: the unit tests pass.
- [x] 2.2 In the same file, add `Clearing the kind filter`: on `/participants`, deselecting Standard writes `kind=all`
      and the filter reads "All kinds". Covers: Clearing the kind filter. Verify: the unit test passes.

## 3. Tests: end to end (implementer)

- [x] 3.1 In `e2e/tests/overview.spec.ts` and `e2e/tests/info-tips.spec.ts`, follow the new names: "Active agents 2",
      the "Active participants" link and the "About Active participants" info tip. Verify: both files pass in
      `./dashboard.sh e2e`.
- [x] 3.2 In `e2e/tests/overview.spec.ts`, add `Publishers tile`: following the Active publishers tile opens
      `/participants?…status=active&publisher=true` and the Participants page shows the "Publishers" chip. Covers:
      Publishers tile. Verify: the test passes in `./dashboard.sh e2e`.
- [x] 3.3 In `e2e/tests/overview.spec.ts`, add `Active egress tile`, with four egresses of its own (`starting`,
      `active`, `ending`, `complete`) through `apiOptions.egresses`: following the tile opens
      `/egress?…status=starting,active,ending`, the Status select reads "Active", the list request carries
      `status=starting,active,ending` and the table lists the three egresses that are not complete. Covers: Active
      egress tile. Verify: the test passes in `./dashboard.sh e2e`.

## 4. Checks and refactor review (implementer)

- [x] 4.1 Run `./dashboard.sh scenarios overview-live-tiles`. Verify: each of the ten scenarios lists a test and none
      reads "NO TEST".
- [x] 4.2 Run `./dashboard.sh check` and `./dashboard.sh e2e`. Verify: both pass, the e2e with axe and both themes;
      report the real-backend suite as skipped if Docker is not available.
- [x] 4.3 Refactor review: assess whether the touched files need a refactor (the split info tip tests, the tile
      row); apply a small one here or record that none is needed. Verify: the outcome is written in the
      implementation report.

## 5. Frontend: values level in a tile row, and review suggestions (implementer)

`components/` is `frontend/projects/dashboard-ui/src/lib/components/`.

- [ ] 5.1 In `components/tiles/kpi-tile.ts` and `components/tiles/tile-row.ts`, lay the tiles of a row on its shared
      row tracks (design, decision 7): labels at the top, values ending level, delta and hint under the value, the
      skeleton in the value's track, 12 px between the lines of a wrapped row and none between the parts of a tile; a
      tile outside a tile row stays as it is. Keep the doc comments of both components true. Verify: the tests of 5.2
      to 5.4 pass, `kpi-tile.spec.ts` and `tile-row.spec.ts` pass unchanged, and a row without wrapped labels keeps
      its tile height (compare the Rooms summary before and after in the e2e trace or the demo).
- [ ] 5.2 In `e2e/tests/overview.spec.ts`, add `Label on two lines`: at 1280 px the label of "Active participants" is
      taller than that of "Active rooms", the six labels start at the same height and the six values end at the same
      height, at the bottom of their tiles. Covers: Label on two lines. Verify: the test passes in
      `./dashboard.sh e2e` and fails on the layout before 5.1.
- [ ] 5.3 In `e2e/tests/egress.spec.ts`, add `Hint under one value`: the four summary values end at the same height
      and the hint "Room composite 3 · Web 1 · Track 1" shows under the value of "Started in range". Covers: Hint
      under one value. Verify: the test passes in `./dashboard.sh e2e`.
- [ ] 5.4 In `e2e/tests/analytics.spec.ts`, add `Value on two lines`: in the summary at 1280 px, "Rooms created" and
      "Data up / down" share a line of the row and the value of the first ends where the second line of the other
      ends. Covers: Value on two lines. Verify: the test passes in `./dashboard.sh e2e` and fails on the layout
      before 5.1.
- [ ] 5.5 Code review S1: in the `Refresh keeps values` test of `features/overview/overview-page.spec.ts`, replace the
      assertion on `.tiles ovd-skeleton`, an element a tile never renders, with one on the tile's own skeleton
      (`.tiles .skeleton`). Verify: the unit test passes, and fails if a tile is forced to show its skeleton.
- [ ] 5.6 Code review S2: in the `Data pipeline and recent rooms` test of the same file, assert that the page carries
      7 info tips in all and drop the assertion on the By node section, which CE never renders. Verify: the unit test
      passes.
- [ ] 5.7 Code review S3: in `features/overview/overview-page.ts`, reword the comment of `egressQueryParams` so it
      names the `status` the Active option of the Egress status filter writes, not a URL. Verify: `./dashboard.sh
      check` passes (lint and format).
- [ ] 5.8 Run `./dashboard.sh scenarios overview-live-tiles`, `./dashboard.sh check` and `./dashboard.sh e2e`, one
      at a time. Verify: the thirteen scenarios list a test each, and both suites pass, the e2e with axe and both
      themes; if a baseline screenshot changes, regenerate it with `--update-snapshots=all` and report which one.
- [ ] 5.9 Refactor review of this group: assess whether the tile and the tile row need a refactor after sharing their
      tracks; apply a small one here or record that none is needed. Verify: the outcome is written in the
      implementation report.

## 6. Publish (orchestrator)

- [ ] 6.1 After the full verification, with the change pushed to `master` of `OpenVidu/openvidu`, confirm that the CI
      run of that commit is green (`checks`, `unit`, `integration`, `contract`, `e2e`). Verify: the run's conclusion
      is success.
