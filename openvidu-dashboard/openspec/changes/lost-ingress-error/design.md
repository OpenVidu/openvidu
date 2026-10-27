# Design

## Context

- `reconcileIngresses` (server) clones the publishing state of an ingress whose room or participant is gone, sets
  `ENDPOINT_INACTIVE` and the end time, stores it and emits `INGRESS_ENDED`.
- The writer maps the state status to the session status (`inactive`, `error`, `complete`…) and copies `state.error` to
  the session's `error`.

## Goals / Non-Goals

**Goals:**
- A lost session is told apart from a normal end in the store, with the error the server gave it.

**Non-Goals:**
- Changing the ingress state customers read through the API, beyond the error text.

## Decisions

### Error text on an inactive state

`ENDPOINT_ERROR` would mark the ingress itself as failed and could keep a reusable ingress from its next session. The
reset stays `ENDPOINT_INACTIVE`, and `Error: "ingress lost"` is the mark. The writer reads an `INGRESS_ENDED` with an
inactive state and an error as a session in `error`.

Alternative rejected: accepting `inactive` for lost sessions. It hides the loss in the store and the dashboard.

### Data model

- No collection, field, index or schema-version change: `ingress_sessions.status` takes its existing value `error`.
- Migration from legacy events: legacy ingress events never carry this reset, so nothing changes.
