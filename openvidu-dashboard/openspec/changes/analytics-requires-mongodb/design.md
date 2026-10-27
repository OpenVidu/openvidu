# Design

## Context

- `openvidu.Start` calls `analytics.InitializeAnalytics`, which connects, pings, renames the legacy events collection,
  initializes collections, validators and indexes, and prepares the writer, the reconciler and the migration. Any error
  stops the server ("An error means the server must not start").
- Measured against Amazon DocumentDB 5.0.0 and 8.0.0: updates with an aggregation pipeline fail with "Wrong type for
  parameter u", time-series collections, partial indexes with `$in`, `validationAction: warn`, `$facet`,
  `$setWindowFields`, `$percentile` and `$median` are not supported, and collections cannot be created inside
  transactions.

## Goals / Non-Goals

**Goals:**
- An OpenVidu server configured with a DocumentDB URI starts and serves media, with analytics off and a log that says
  why.

**Non-Goals:**
- Writing analytics to DocumentDB.
- Changing how other startup failures behave (unreachable MongoDB, a newer schema, a bad configuration).

## Decisions

### Probe the capability, not the vendor

The writer asks the database to explain an update with an aggregation pipeline on `schema_meta`. MongoDB plans it
without writing; a database without pipeline updates rejects it. Only the rejection of the pipeline form disables
analytics; any other error of the probe, such as a lost connection, is returned as before and stops the server.

Alternative rejected: recognising DocumentDB by host name or `buildInfo`. Host names can be aliased and the build
information is not a contract; the capability is what the writer needs.

Alternative rejected: probing with a real update. It writes a document that the contract validators do not expect.

### Disabled, not degraded

Without pipeline updates no entity can be projected, so there is nothing useful to keep: no collections, indexes,
reconciler or migration. The server keeps `analyticsEnabled` false, as when `openvidu.analytics.enabled` is false.

### Data model

- No collection, field, index or schema-version change; nothing is written to an unsupported database.
- Migration from legacy events: not run on an unsupported database; legacy collections stay as they are.
- Performance: one explain at startup.

## Risks / Trade-offs

- [A future MongoDB-compatible service accepts the explain but not the update] → Initialization would then fail as
  today and stop the server; the log names the failing step.
