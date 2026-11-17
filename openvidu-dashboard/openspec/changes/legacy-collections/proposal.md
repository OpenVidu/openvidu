# Proposal

## Why

After an upgrade from OpenVidu 3.9 or earlier, OpenVidu Server keeps the legacy `legacy_events` and `stats` collections
for a rollback, and their documents expire by the legacy TTL (32 days with the installers up to 3.9). Emptied by the
TTL, both collections keep their disk space forever, because MongoDB reuses freed space only for the collection that
freed it and nothing writes to them again. The dashboard does not show them either: `GET /api/v1/info` reports the
analytics collections only, so an administrator cannot see that space nor until when it is kept.

## What Changes

Edition: CE and PRO for the server (openvidu-livekit; openvidu-pro-livekit takes it with its next merge of
`openvidu/main`); CE for the dashboard (the PRO edition takes it on its own side). Repositories: dashboard
(`openvidu/openvidu-dashboard`), openvidu-livekit (`openvidu/main`) and openvidu.io (`docs/openvidu-dashboard-3.10`,
draft PR #160); openvidu-deployment is not touched.

Track: full. The change spans three capabilities (`server-legacy-migration`, `editions-info`, `settings-about`), three
repositories (the writer, the dashboard and openvidu.io) and an additive API change, beyond what the lite track allows.

Observable behaviour:

- **Server**: once the migration is `completed` and its `legacyRetainedUntil` has passed, OpenVidu Server drops
  `legacy_events` and `stats`, which frees their disk space. Every node checks at startup and then every hour; before
  dropping it confirms that no legacy document expires later (one that does moves `legacyRetainedUntil` to its
  expiry), so a rollback keeps every legacy document its TTL has not deleted. A collection named `stats` is dropped
  only with a completed migration document. One log line at startup gives the date while the data is kept, and one
  line names the collections a node drops. No new option or metric.
- **API**: while `schema_meta` holds a migration document, `storage` of `GET /api/v1/info` also reports `legacy_events`
  and `stats` when they exist, dated by their legacy timestamp index; `migration` of `GET /api/v1/info` and of
  `GET /api/v1/status` gains `legacyRetainedUntil`. Additive, no breaking change.
- **Settings → Data**: while a legacy collection exists, the Storage table shows one more class row,
  **Legacy data (before 3.10)**, after Daily rollups and counted in the Total, with its collections in the breakdown
  and no retention tip or estimate. Its Retention reads "In use by the migration" while the migration runs, "Kept
  until the migration completes" while it is pending (also when the administrator disabled it) or failed, "Kept until
  2026-12-14 for rollback" (the date in the session zone) once it completed, and "Being removed by the server" once
  that date has passed or when no date was recorded.
- **Documentation**: the dashboard page explains that the legacy data is kept until that date for a rollback and then
  removed by the server, and how to remove it earlier with `mongosh` when no rollback is wanted, which frees the disk
  at once.
- **Generated data**: the data generator can write a small legacy history and a completed migration (`--legacy`), and
  `DASHBOARD_DEMO_LEGACY=true ./dashboard.sh demo ce` shows the new row.

CHANGELOG lines (dashboard `CHANGELOG.md`, 3.10.0, unreleased):

- Added, UI: "The Data tab of Settings shows the analytics data of versions before 3.10 while OpenVidu Server keeps it
  for the migration or a rollback: its size, its collections and how long it is kept."
- Added, Data: "`GET /api/v1/info` reports the storage of the legacy collections `legacy_events` and `stats` while they
  exist, and `GET /api/v1/info` and `GET /api/v1/status` the date until which the server keeps them
  (`migration.legacyRetainedUntil`)."

Writer `CHANGELOG-openvidu.md` ([Unreleased], Changed): the existing line on the renamed `legacy_events` collection
states that it and the legacy `stats` are kept for a rollback until their last document expires
(`legacyRetainedUntil`) and then dropped, which frees their disk space.

Not in scope:

- Any action in the dashboard that deletes analytics data, legacy or not (a pending team decision).
- The PRO edition of the dashboard, which takes this change on its own side.
- A configuration option to keep the legacy data longer or drop it earlier, and compacting other collections.
- How to roll back the analytics data to 3.9 in openvidu.io (only the writer README describes it) and the 3.10 release
  notes, not written yet.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-legacy-migration`: "Legacy data kept for rollback" holds until `legacyRetainedUntil`; a new requirement
  drops `legacy_events` and `stats` after that date.
- `editions-info`: "Info endpoint" lists `legacyRetainedUntil` among the keys of `migration`; a new requirement reports
  the legacy collections in `storage` and the date in `migration`.
- `settings-about`: a new requirement adds the Legacy data row to the Storage table of the Data tab.

## Impact

- openvidu-livekit (`openvidu/analytics/`, done by the implementer and committed there, pushed by the orchestrator
  before the dashboard): a retention task beside the migration, its integration tests, a test seed that no longer
  inserts already-expired legacy fixtures, `README-openvidu.md` and `CHANGELOG-openvidu.md`. Only fork-owned files,
  so no `OPENVIDU BLOCK`. The vendored contract does not change.
- `dashboard-ce/typings`: `LegacyCollection` and `InfoMigration.legacyRetainedUntil`; no contract artifact changes and
  `SCHEMA_VERSION` stays 1.
- `dashboard-ce/backend`: the info service and the shared migration shape of `/info` and `/status`, with unit,
  integration and query plan tests.
- `dashboard-ce/frontend`: `features/settings/` (storage classes, Data tab, styles) and their specs.
- `dashboard-ce/e2e`: the mocked info document and the settings and accessibility suites.
- `dashboard-ce/tools`: the data generator `legacy` option and `DASHBOARD_DEMO_LEGACY` in the demo; README and
  `AGENTS.md` lines.
- openvidu.io: `docs/docs/self-hosting/production-ready/observability/openvidu-dashboard.md`, by the orchestrator.
- No new dependency.
