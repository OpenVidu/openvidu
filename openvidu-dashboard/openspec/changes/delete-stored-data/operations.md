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
