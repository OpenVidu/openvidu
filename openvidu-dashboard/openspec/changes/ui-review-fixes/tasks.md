# Tasks

## 1. Backend

- [x] 1.1 Replace the index discovery of `InfoService.storageEntry()` with the time field map of design D6 (the
      `global` scope for `analytics_daily`, `firstSeenAt` for `nodes`, no entry for `tracks`,
      `track_subscriptions` and `track_stats`). Verify with the info unit tests and an integration test of "Oldest per collection" that
      runs `explain()` on every query: one document examined, `COLLSCAN` only on `nodes`.

## 2. UI library

- [x] 2.1 Set the x-axis `minInterval` from the label unit, the y-axis `minInterval: 1` for all-integer data and the
      closing point of step series in `timeSeriesOption()`. Verify with chart-options unit tests of the three scenarios
      of "Time-series chart fixed to the range".
- [x] 2.2 Make `ovd-skeleton` invisible for its first 300 ms while keeping its height, and drop the fade under
      `prefers-reduced-motion`. Verify with a component test of the delay and an e2e check that a fast mocked response
      paints no skeleton bar.
- [x] 2.3 Round `formatDuration()` to the smallest unit shown, add the `floor` mode and use it in `ovd-duration` while
      running. Verify with formatter unit tests of "Rounded durations" and a duration component test of "Running and
      then ended".
- [x] 2.4 Add `BROWSER_LABELS` and `clientOsLabel()` to `format/labels.ts`, export them, and label the browser donut
      and its table with them. Verify with label unit tests of "Browser keys" and "Reported OS" and an Analytics
      component test of "Sessions without a browser".
- [x] 2.5 Render the footer version as plain text. Verify with the sidenav footer test.
- [x] 2.6 Hint "No room ended in this range" on both room averages when `roomsEnded` is 0. Verify with Analytics
      component tests of "No room ended yet" and "Missing average".
- [x] 2.7 Rename the Egress page tile "Total duration" with `INFO_TEXTS.egressTotalDuration`. Verify with the Egress
      page test of the tiles and the info tip.
- [x] 2.8 Add the Total row and the "—" tooltip to the About storage table. Verify with About tab tests of "Storage
      total" and "Collection without an oldest date".
- [x] 2.9 Add the locked `tracks/:trackSid` route, and map `track` in `exactIdTarget()` to it. Verify with a global
      search test of "Exact track ID" and an e2e test of "Track route in CE".

## 3. End-to-end and docs

- [x] 3.1 Update the e2e fixtures and screenshots whose durations or labels change, and run `./dashboard.sh e2e`.
      Verify that it passes.
- [x] 3.2 Update the library README and `AGENTS.md` notes that list the exported labels or the routes, if any. Verify by
      reading them against the change.

## 4. Integration check

- [x] 4.1 Run `./dashboard.sh check` and `./dashboard.sh test-integration`. Verify that both pass.
- [x] 4.2 On a local deployment with `./dashboard.sh dev`, check an Analytics chart of a 15-minute custom range, the
      About table and a fast page load against the scenarios. Verify by screenshots.
