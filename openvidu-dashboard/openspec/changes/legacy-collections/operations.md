# Operations

- Owner decisions: the proposal is approved, on the full track, with the Retention text "Kept until the migration
  completes" while the migration is pending (also when disabled) or failed and "In use by the migration" only while it
  runs. The reworded UI CHANGELOG line and the documentation condition for dropping the legacy collections by hand
  (only once the Data tab reads "Kept until <date> for rollback" or "Being removed by the server") are accepted.
- Writer (openvidu-livekit, `openvidu/main`, on b762d7f0): `bf6496cb` (test seed with live expiries), `329d5c83`
  (legacy data dropped after its rollback window) and `e6a397a4` (retention through the server lifecycle, fix of the
  code review), committed and not pushed; task 9.2 pushes all three.
- Owner decisions: the demo's legacy documents keep the designed expiries (the row reads "Being removed by the server"
  on a demo reused past them); the `status-api.test.ts` timing flake gets a direct fix of its own, outside this
  change, before the push.
- Owner review on the demo (8.1, `DASHBOARD_DEMO_LEGACY=true ./dashboard.sh demo ce`): approved, no change asked. The
  first start served a stale Vite prebundle of the typings from `frontend/.angular/cache` (Settings and Agents failed
  to load); clearing that local cache fixed it, nothing in the change.
- Owner decisions: the reworded outcome of `Legacy row follows the status` (the row reads the new text from the status
  before the info document is read again) is accepted; the e2e retention tip race (keyboard and phone tests, present
  before this change) gets a direct fix of its own before the push.
- `./dashboard.sh e2e` rerun after the incremental verification: mocked 139/139, real backend 6/6. The verifier's one
  failure (`Retention tip by keyboard`) reproduces at the same rate on the frontend from before the change.
- Contract check (9.1): `./dashboard.sh contract-check <writer checkout>` at writer e6a397a4: "contract check passed",
  writer and dashboard at schema version 1.
- Writer push (9.2): `openvidu/main` b762d7f0..e6a397a4; `Test` run 44262129580 success (job `test`), CodeQL run
  44262129352 success.
- Dashboard push: `master` a0bc5599b..b13e44a2e (with the direct fixes 55e056265 and 129894f52 and the
  `list-query-plans` proposal); `openvidu-dashboard-ci.yml` run 44263750148 success (lint, format, type check and spec
  validation; unit; integration; data model contract; end-to-end).
- Documentation (10.1): openvidu.io `docs/openvidu-dashboard-3.10` (draft PR #160) 97486126e, "Analytics data" and the
  Settings Data bullet; the drop command was run on `openvidu/mongodb:8.0-compat` (container `mongo`, port 20000,
  replica set `rs0`) and the credentials match the installer templates; `ovweb lint` no errors, PR `validate` run
  44264449127 success.
