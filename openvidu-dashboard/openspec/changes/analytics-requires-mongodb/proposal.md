# Proposal

## Why

The writer updates every entity with an aggregation pipeline, creates `track_stats` as a time-series collection when it
can, uses partial indexes with `$in` and validators with `validationAction: warn`. Amazon DocumentDB (5.0 and 8.0)
supports none of the first, third and fourth, so database initialization fails and the server refuses to start:
`failed to start analytics: ... Feature not supported: validationAction:warn`. Deployments that use DocumentDB as their
external database would lose the whole OpenVidu server on upgrade, not only analytics.

## What Changes

- Before initializing the database, the writer checks that it runs updates with an aggregation pipeline, without
  writing. A database that does not (Amazon DocumentDB) disables analytics: the server logs an error that names the
  reason and that analytics and the dashboard need MongoDB, then starts and runs without analytics. It writes nothing
  to that database.
- Every other analytics startup failure still stops the server.
- The dashboard's private CA variable is no longer described as a way to use Amazon DocumentDB.

Scope excludes the following:
- A write path for databases without pipeline updates.
- The dashboard against such a database, which reports an uninitialized writer schema as it already does.
- The public documentation of external databases, updated with the release documentation.

Edition: CE and PRO (writer). Repositories: openvidu-livekit (`openvidu/analytics`, `openvidu/openvidu.go`) and the
dashboard (specs, CHANGELOG).

CHANGELOG lines:
- `openvidu-dashboard/CHANGELOG.md`, Upgrade notes: analytics and the dashboard require MongoDB; on Amazon DocumentDB the
  server starts with analytics disabled. The `DATABASE_TLS_CA_FILE` line no longer names DocumentDB.
- openvidu-livekit `CHANGELOG-openvidu.md`, Changed: the same behaviour of the server.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: a database without pipeline updates disables analytics instead of stopping the server.
- `deployment-compatibility`: the private CA requirement names no DocumentDB.

## Impact

- Writer: `InitializeAnalytics` probes the database after the connection check; `openvidu.Start` treats the
  unsupported database as analytics disabled. Unit tests of the probe classification and an integration test against
  MongoDB.
- Dashboard: specs and CHANGELOG only.
