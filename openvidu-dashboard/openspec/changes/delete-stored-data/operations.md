# Operations

## Owner decisions

- The e2e suites (`./dashboard.sh e2e`) cannot run on the owner's machine (Ubuntu 20.04: Playwright 1.65 ships no
  Chromium for it). They are validated by the `e2e` job of the CI run of the push.
- The owner approved the plan on 2026-11-19 after answering every question of the proposal; the answers are recorded
  in `design.md`.

## Decisions delegated to the dashboard's author

The owner delegated these to the dashboard's author, who answered in a Slack direct message:

- 2026-11-19 15:31 (ts `1795098686.150819`): rooms that ended in the 5-minute grace window are found through the
  current entities retention; the risk of a retention change within the same 5 minutes is accepted.
- 2026-11-19 16:27 (ts `1795102037.847649`), questions raised while implementing groups 1–3, each with the recommended
  option:
  - Statistics in a time-series `track_stats` are deleted in batches bounded by time, as the most efficient option.
  - Tracks are deleted by `unpublishedAt < cutoff`; subscriptions by `unsubscribedAt < cutoff`, or without it by
    `expiresAt < cutoff + tracks retention`.
  - An interrupted or failed Entities job marks entities, events, stats and tracks incomplete, at its last heartbeat.
  - The missing-delete-rights case is tested with a database wrapper that throws a `MongoServerError` with code 13.
  - Guiding principle given: weigh implementation complexity against the efficiency gained.
- 2026-11-19 19:55 (ts `1795114552.189919`): the example scenarios of a running Entities job show its 9 collection
  steps instead of 5.
- 2026-11-20 12:28 (ts `1795174089.449919`), raised by the owner's demo review: the free figure of a collection adds
  the bytes each of its indexes keeps for reuse, since MongoDB 8.0 reports no per-collection index free space.
- 2026-11-20 16:13 (ts `1795187616.965179`), agreeing with the owner: the free line shows only on classes with a
  completed deletion, since a fresh database already reports free space from WiredTiger fragmentation.

## Demo review

- The owner reviewed `./dashboard.sh demo ce` on 2026-11-20 from another machine over Tailscale (a `socat` forward of
  the laptop's tailnet address to the demo's port 4200), at 120 % zoom. The findings became tasks 9.1–9.14 and the
  layout fixes of the table and the Total dialog; the owner approved the re-review the same day.

## Documentation

- PR #160 of OpenVidu/openvidu.io was merged into `next` (merge commit `75e6aa101`) by the dashboard's author, who asked
  for the documentation of this change to be committed directly on `next`, without a branch or PR.
- Commit `39bc15b87` on `next` of OpenVidu/openvidu.io: the page sections and the two Settings → Data screenshots,
  retaken at 1920 × 1080 from `./dashboard.sh demo pro` with the PRO workspace's `ce/` temporarily at this change's
  local head (restored to `ce.ref` afterwards). The `compact` forms were checked on a throwaway MongoDB 8.0.29 replica
  set: a primary refuses `compact` without `force: true`, and `compact: "track_stats"` works on the time-series name.
  `ovweb lint` reported no errors (two warnings in other pages), and the build ran as `CI=false mkdocs build --strict`
  (exit 0, no WARNING), since `.cache/` of that checkout is owned by root and the privacy plugin cannot write there.
- The manager session reviewed `39bc15b87` with no blocking findings, and the owner approved pushing it as it was.
  `origin/next` was still at `75e6aa101`, so no rebase was needed. Pushed `75e6aa101..39bc15b87` to `next` of
  OpenVidu/openvidu.io on 2026-11-20.

## Publish

- Local master was rebased onto `origin/master` (11 commits, among them the archive of `analytics-batch-retry` and
  `b2df5b2ce`, the 3.10 CHANGELOG written against 3.9); the CHANGELOG lines of this change became one line in that
  style. `check`, `test-integration` (334) and `scenarios` (125, none without a test) passed on the rebased tree.
- Pushed `b2df5b2ce..91c617816` to `master` of OpenVidu/openvidu. CI run
  https://github.com/OpenVidu/openvidu/actions/runs/44813167029: success. Jobs: lint, format, type check and spec
  validation, success; unit tests, success; integration tests (MongoDB), success; data model contract with the writer,
  success; end-to-end tests (Playwright), success, the first run of this change's e2e tests, which cannot run on the
  owner's machine.
