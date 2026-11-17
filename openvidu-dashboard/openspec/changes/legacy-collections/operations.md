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
