# Operations

## Owner decisions

- Track: lite, kept after the proposer recommended full.
- Participant and room stats deltas get the per-collection tracking in this change.
- Migration retry budget kept at five rounds of five attempts (about 90 s); a run that ends with a held batch is part
  of the accepted replay window.
- `README-openvidu.md` "Legacy data migration" updated to the current behaviour (documentation rule).

## Publish

- 4.1 openvidu-livekit `openvidu/main` pushed at `53afcb00`: `Test` run 44591943528 success, `CodeQL` run
  44591941035 success.
- 4.2 openvidu-pro-livekit `openvidu/main` merge `4829efb9` pushed (identical diff to openvidu-livekit;
  `go vet -tags integration ./openvidu/analytics/...` passes locally). `Test` run 44593937647 failed in three
  attempts, all on runner `basement-gh-runner-3`, at the `actions-setup-redis` step before any test ran: port 6379 of
  the runner already in use. `Trigger E2E tests` run 44593937863 success.
- 4.3 CE `master` pushed at `ec228d373`: `openvidu-dashboard-ci.yml` run 44594672113 success (lint and specs, unit,
  integration, contract with the writer, e2e).
