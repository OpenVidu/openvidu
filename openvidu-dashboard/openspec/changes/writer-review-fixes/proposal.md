# Proposal

## Why

A review against a real deployment found three places where the analytics data does not match what happened:
- **Ingress session room:** the ingress service reports no `room_id` while an ingress session publishes, only when
  it ends, so a live session has no room. The room's ingress section, the session's Room column and the room's ingress
  counters miss it until the stream stops.
- **Egress status history:** an egress with several outputs sends one update per output that starts, and the status
  history keeps both, so the dashboard shows "Active → Active".
- **Sessions without a browser:** sessions of SDKs that report no browser, such as the Go SDK, are counted with unknown
  browsers under `other`, so the browser breakdown cannot say "No browser".

## What Changes

- The server fills the room id of an ingress state update that reports none from the active room of the ingress's
  room name, before its telemetry and webhooks. The writer then links the session to its room, and counts it there,
  as soon as it publishes.
- The writer keeps one status history entry per egress status, at the first time it was reported.
- The rollup browser vocabulary gains `none`, counted for a session that reports no browser; `other` keeps the
  browsers outside the vocabulary.

Scope excludes the following:
- Backfilling sessions, histories or rollups written before the change.
- The dashboard labels of `none` (change `ui-review-fixes`).

Edition: CE and PRO (the writer and the server code every edition runs). Repositories: openvidu-livekit
(`pkg/service/ioservice_ingress.go`, `openvidu/analytics/projection`) and the dashboard (typings contract, specs).

CHANGELOG lines: none. The v2 data model and its writer have not shipped in a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: ingress sessions get their room while publishing, and empty browsers count as `none`.
- `data-model`: one status history entry per egress status.

## Impact

- Server: an OPENVIDU block in `IOInfoService.UpdateIngressState` that loads the room by name when the state has no
  room id.
- Writer: the egress status history update and the browser vocabulary in `projection/`, with unit and integration
  tests.
- Typings: `BrowserFamily.NONE` in `src/data-model/enums.ts`, the regenerated `schema/`, the vendored contract and
  `./dashboard.sh contract-check`.
- No schema version bump: the v2 schema has not shipped.
