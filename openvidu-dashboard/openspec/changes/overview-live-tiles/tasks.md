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

- [ ] 3.1 In `e2e/tests/overview.spec.ts` and `e2e/tests/info-tips.spec.ts`, follow the new names: "Active agents 2",
      the "Active participants" link and the "About Active participants" info tip. Verify: both files pass in
      `./dashboard.sh e2e`.
- [ ] 3.2 In `e2e/tests/overview.spec.ts`, add `Publishers tile`: following the Active publishers tile opens
      `/participants?…status=active&publisher=true` and the Participants page shows the "Publishers" chip. Covers:
      Publishers tile. Verify: the test passes in `./dashboard.sh e2e`.
- [ ] 3.3 In `e2e/tests/overview.spec.ts`, add `Active egress tile`, with four egresses of its own (`starting`,
      `active`, `ending`, `complete`) through `apiOptions.egresses`: following the tile opens
      `/egress?…status=starting,active,ending`, the Status select reads "Active", the list request carries
      `status=starting,active,ending` and the table lists the three egresses that are not complete. Covers: Active
      egress tile. Verify: the test passes in `./dashboard.sh e2e`.

## 4. Checks and refactor review (implementer)

- [ ] 4.1 Run `./dashboard.sh scenarios overview-live-tiles`. Verify: each of the ten scenarios lists a test and none
      reads "NO TEST".
- [ ] 4.2 Run `./dashboard.sh check` and `./dashboard.sh e2e`. Verify: both pass, the e2e with axe and both themes;
      report the real-backend suite as skipped if Docker is not available.
- [ ] 4.3 Refactor review: assess whether the touched files need a refactor (the split info tip tests, the tile
      row); apply a small one here or record that none is needed. Verify: the outcome is written in the
      implementation report.

## 5. Publish (orchestrator)

- [ ] 5.1 After the full verification, with the change pushed to `master` of `OpenVidu/openvidu`, confirm that the CI
      run of that commit is green (`checks`, `unit`, `integration`, `contract`, `e2e`). Verify: the run's conclusion
      is success.
