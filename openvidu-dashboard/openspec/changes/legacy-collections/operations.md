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
