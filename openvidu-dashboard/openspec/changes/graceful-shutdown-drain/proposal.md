# Proposal

## Why

The "Graceful shutdown" requirement says that on `SIGTERM` a node with active rooms closes them with `SERVER_SHUTDOWN`
and flushes their end. The server does not do that: the first `SIGTERM` drains it (no new participants, wait for the
present ones to leave) and only a second signal closes the rooms. A forced stop of a node (`docker-compose down`, which
kills it after its grace period) therefore ends while it drains, writes nothing more, and the reconciler closes its
sessions as for a crashed node. The integration test of that case expects leave events and fails.

## What Changes

- The requirement describes the drain: during it the participants that leave are written as usual; a second signal
  closes the rooms with `SERVER_SHUTDOWN`; once the rooms are closed, the flush works as before.
- A node killed while it drains is left to the reconciler, as a crashed one.
- No server or writer behaviour changes.

Scope excludes the following:
- The drain itself and the stop of media nodes in the deployments.

Edition: CE and PRO (server). Repositories: the specs of the dashboard, and the end-to-end reconciler tests of the
deployments (forced media node stop).

CHANGELOG: none.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: "Graceful shutdown" describes the drain and the forced stop.

## Impact

- Specs only, and the forced media node stop case of the end-to-end reconciler tests, which now expects the
  reconciler to close the sessions of a node stopped by force.
