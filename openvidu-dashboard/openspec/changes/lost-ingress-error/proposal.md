# Proposal

## Why

When the ingress service that owns a publishing session dies and the session's room or participant is gone, the
server-side reconciler resets the ingress state to `ENDPOINT_INACTIVE`, so that a reusable ingress can be used again,
and emits `INGRESS_ENDED`. The state carries no error, so the writer stores the lost session as `inactive`, the status
of a session that ended normally. The spec requires lost ingress sessions to be projected as `error`.

## What Changes

- The server-side reset keeps `ENDPOINT_INACTIVE` and sets the state's error to `ingress lost`.
- The writer projects an `INGRESS_ENDED` whose state is `ENDPOINT_INACTIVE` with an error as a session in `error`, with
  that error. The ingress itself stays `inactive`, ready for its next session.

Scope excludes the following:
- The store reconciler's fallback for ingress sessions, which already closes them as `error`.
- Egress, whose server-side reconciler already ends lost egress as `FAILED`.

Edition: CE and PRO (server and writer). Repositories: openvidu-livekit (`pkg/service/openvidu_reconciler.go`,
`openvidu/analytics/projection`) and the specs of the dashboard.

CHANGELOG: none. The reconciler and the data model have not shipped in a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-reconciler`: the server-side end of a lost ingress session carries `ingress lost` and is projected as `error`.

## Impact

- Server: the reset of `reconcileIngresses` sets `IngressState.Error`.
- Writer: the ingress session status of `INGRESS_ENDED`. Unit or integration test of both.
- The end-to-end reconciler tests of the deployments, whose lost ingress case already expects `error`.
