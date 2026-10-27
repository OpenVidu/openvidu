# Proposal

## Why

The writer updates entity documents with aggregation pipelines, where a value is an expression. A string that starts
with `$` is read as a field path or a variable, and the keys of a map as operators or paths. A room named `$demo`
loses its name, an identity `$$ROOT` is replaced by the document being updated, and a participant attribute whose key
starts with `$` makes the update fail.

## What Changes

- Every value the projectors write is stored as received, after the allow-list and its redactions: strings starting
  with `$`, and map keys that start with `$` or hold a dot, included.

Scope excludes the following:
- Raw events, which are inserted, not updated, and keep their values already.
- Field names the writer derives from fixed vocabularies (kinds, sources, families, API methods).

Edition: CE and PRO (writer). Repositories: openvidu-livekit (`openvidu/analytics/projection/`) and the specs of the
dashboard.

CHANGELOG: none. The analytics data model has not shipped in a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: values are stored as received.

## Impact

- Writer: the expression helpers and the stage builder of `openvidu/analytics/projection/`, and the participant
  attributes. Integration tests of the writer.
- Dashboard: none.
