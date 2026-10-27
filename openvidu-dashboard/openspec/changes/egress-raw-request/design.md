# Design

## Context

- The codec encodes a protocol message through the allow-list: protocol field names, enum values as names, the set
  member of a oneof as a document named after the oneof, URLs redacted by rule. Raw events store `EgressInfo` this
  way, so `payload.egress.request` holds the full request without secrets.
- The egress projection writes `request` from `egressRequest()`, a summary built field by field.
- Validators are applied at every start with `validationLevel: strict` and the configured action (`warn` by
  default).

## Goals / Non-Goals

**Goals:**
- The egress document keeps the full request, without secrets, for the entities retention.

**Non-Goals:**
- Replacing the summary, which the list and the detail facts read.
- Backfilling stored documents.

## Decisions

### Same encoding as the raw payloads

`rawRequest` is the `request` member of `EgressInfo` as the codec encodes it: one key, the oneof member that is set
(`room_composite`, `web`, `participant`, `track_composite`, `track`, `egress` or `replay`), holding the request. It is
the value `payload.egress.request` of the raw events of the same egress. The allow-list stays the only place that
decides what is stored.

Alternative rejected: unwrapping the oneof member. The member tells the legacy room composite API apart from the
unified `StartEgress` and `ExportReplay` APIs, which `type` does not.

Alternative rejected: protojson with camelCase names. Raw payloads and this field would show the same request in two
namings.

### Written on every event

Every `EGRESS_*` event carries the request, so the field is set on each upsert, like `request`. It is absent when the
event has no request.

### Data model

- Collection `egresses`: new optional field `rawRequest` (object). No index; the field is never queried.
- Retention: the entities retention of the document.
- Schema version: unchanged (1). The field is optional, and the contract has not shipped in a release. A dashboard
  that does not know the field ignores it.
- Migration from legacy events: the legacy migration decodes the legacy `EgressInfo` and projects it like a live
  event, so a migrated egress gets `rawRequest` when its legacy events carry a request.
- Performance: one encode of a message the codec already encodes for the raw event. The document grows by the size of
  the request, usually under 1 KB.

## Risks / Trade-offs

- [A future allow-list entry stores a secret in the document too] → The codec tests keep checking every allow-listed
  field against the secret patterns, and an edition that shows the field can filter it again on read.
