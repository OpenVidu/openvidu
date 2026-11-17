# Code review: legacy-collections

- Date: 2026-11-17
- Dashboard (`openvidu/openvidu-dashboard`): `409e0a10a9860ab17164af27e219008da670131f`, diff against `origin/master`
  (commits 76477924f..409e0a10a; 55e056265, the status-api flake fix, and ee547c6b7, the `list-query-plans` proposal,
  are outside the change and were only skimmed)
- Writer (`openvidu-livekit`, `openvidu/main`): `329d5c839bf5a073598b15ea4d7bda4d345c10f1`, commits bf6496cb and
  329d5c83 against `origin/openvidu/main`

## Summary

- CRITICAL: 0
- WARNING: 1
- SUGGESTION: 3

Traced and found correct:

- The writer's retention loop: completed-only gate (D2), `$max` raise filtered on `state: "completed"` (D3), the
  absent-date drop (D4), announcing each date once, and the idempotent concurrent drop.
- `latestLegacyExpiry` goes through the TTL index, and the legacy writer at e2ede96c~1 always set `openvidu_expire_at`,
  so no legacy document escapes the expiry check.
- The legacy writer stored `timestamp.seconds` / `time_stamp.seconds` as doubles (`json.Marshal` then `json.Unmarshal`
  into `map[string]interface{}`), so the `$type: 'number'` filter and `fromSeconds` match real data. NaN sorts first
  and `Number.isFinite` rejects it.
- `storageInfo(withLegacy)` sits behind the existing 60 s cache. The `/info` and `/status` shapes are additive.
- The Data tab row tracks by label, so the per-poll recomputation keeps the DOM and the expanded state.

## CRITICAL

None.

## WARNING

### W1. The startup wiring of the retention task has no test

- Where: `openvidu-livekit/openvidu/analytics/analytics.go:201-210` (`retentions = retention`), `:447`
  (`retention.start()`) and `:461` (`retention.stop(ctx)`).
- Gap: every `TestLegacyRetention` subtest builds the task with `newLegacyRetentionTask` and calls `runner.start()` or
  `check()` itself. The only test that goes through `InitializeAnalytics` / `Start` / `Stop` (lifecycle
  `stop flushes the shutdown events and the final stats`) uses a database with no migration document, so `retentions`
  stays nil there.
- Trigger: delete `retention.start()` from `Start()`, or the `retentions = retention` assignment.
- Consequence: every suite still passes, yet a real server never drops `legacy_events` / `stats`. That breaks
  "Rollback window ended", "Rollback window ends while running" and "Completed without a retention date" as the server
  runs them. D1's stop order (retention stopped before the migration task) is untested for the same reason.
- Fix: one lifecycle subtest that seeds a completed migration with a past `legacyRetainedUntil` and empty legacy
  collections, calls `InitializeAnalytics` + `go Start()`, waits until both collections are gone, then calls `Stop`.
  Also have that test's cleanup reset `retentions` as well as `instance`.

## SUGGESTION

### S1. A legacy timestamp outside the range of a JS Date makes `GET /api/v1/info` fail

- Where: `dashboard-ce/backend/src/info/info-service.ts:41` (`fromSeconds.convert`) and `:225`
  (`entry.oldest = date.toISOString()`).
- Trigger: the smallest `timestamp.seconds` of `legacy_events` (or `time_stamp.seconds` of `stats`) is a finite number
  beyond about ±8.64e12 s, for example one corrupt document with `-1e13`. The ascending sort picks that document first.
- Consequence: `new Date(value * 1000)` is an Invalid Date and `toISOString()` throws `RangeError`. The whole
  authenticated `/info` answers 500, not just that collection's `oldest`, and the UI reads that document on every page.
  Real legacy data never holds such values, so this is hardening only.
- Fix: return `undefined` when `Number.isNaN(date.getTime())`, in `fromSeconds` (or in `read`).

### S2. The Legacy row's flag and context are passed loosely

- Where: `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/settings/storage-classes.ts:233` and `data-tab.ts:95`.
- The default `legacy = { migration: null, tz: 'UTC' }` is used only by the older specs. A future caller that omits
  the context compiles and shows "Kept until the migration completes" for a completed migration.
- `data-tab.ts:95` finds the row again by comparing its label with `LEGACY_LABEL`. A `legacy: boolean` on
  `StorageClassRow`, set by `legacyRow`, would carry that without coupling to the display text.
- Fix: make the parameter required (the specs can pass the context) and add the flag on the row.

### S3. `newLegacyRetentionTask` returning nil after a drop has no test

- Where: `openvidu-livekit/openvidu/analytics/migration_retention.go:58-77`.
- D1 builds the task only when the migration document exists and a legacy collection exists. "Stats collection without
  a migration" covers the missing document, but nothing covers the restart after a drop: completed migration, no
  legacy collections, task expected nil.
- Fix: one assertion, for example after `runUntilDone` in "Rollback window ended": `require.Nil(t, env.startupTask())`.
