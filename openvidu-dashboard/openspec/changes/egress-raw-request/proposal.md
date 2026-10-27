# Proposal

## Why

The `request` of an egress document is a summary: source, encoding and the kinds of output. The configuration of each
output (file type and path, stream protocol and URLs, segment and image settings), the audio routes of the unified API
and the replay offsets are lost. The full request, through the secrets allow-list, exists only in the raw `EGRESS_*`
event payloads, which expire with the events retention while the egress document keeps the entities retention.

## What Changes

- The `egresses` document gains an optional `rawRequest`: the request of the egress encoded as raw event payloads
  encode `egress.request`, with the protocol field names, the set member of each oneof under the oneof name and only
  the allow-listed fields. Credentials, storage uploads and webhooks are never stored, and URLs are redacted.
- `request` keeps its summary, unchanged.

Scope excludes the following:
- Egress documents already stored, which have no `rawRequest` until their egress receives another event.
- Any change to the allow-list or to the request summary.
- How an edition shows the field.

Edition: CE and PRO (data model). Repositories: dashboard (contract, typings, data generator, specs) and
openvidu-livekit (projection and document types).

CHANGELOG: none. The analytics data model has not shipped in a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-model`: the egress document stores the request in raw payload encoding.

## Impact

- Contract (`dashboard-ce/typings`): `EgressDocument.rawRequest`, the `egresses` validator and the egress fixtures; the
  contract version stays 1.
- Writer: the egress projection, the `EgressDocument` struct, the vendored contract and the integration tests.
- Data generator: generated egress documents carry `rawRequest`.
- Dashboard backend: none; the egress list projection does not read the field.
