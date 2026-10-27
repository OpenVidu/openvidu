## MODIFIED Requirements

### Requirement: Lost egress and ingress representation
Edition: CE and PRO servers. Egress and ingress lost with their node SHALL be closed by the real
`EGRESS_ENDED (FAILED)` and `INGRESS_ENDED` events of the server-side reconciler, projected as `failed`
and `error`; the store reconciler SHALL close only candidate egress and ingress sessions, always as
`failed` or `error`, never `complete`.

#### Scenario: Egress lost after the room is gone
- **GIVEN** an egress whose handler died and whose room was deleted
- **WHEN** the server-side reconciler emits `EGRESS_ENDED` with status FAILED and error "egress lost"
- **THEN** the egress document has `status: "failed"`, `error` from the event and `closedBy: "event"`

#### Scenario: Ingress lost after the room is gone
- **GIVEN** a publishing ingress session whose ingress service died and whose room was deleted
- **WHEN** the server-side reconciler resets its state to `ENDPOINT_INACTIVE` with error "ingress lost" and emits `INGRESS_ENDED`
- **THEN** the ingress session has `status: "error"`, `error: "ingress lost"` and `closedBy: "event"`, and the ingress is `inactive`, ready for another session

#### Scenario: Store fallback for an egress
- **GIVEN** a candidate egress (room closed for more than 2 × cleanup interval, node dead)
- **WHEN** the reconciler closes it
- **THEN** it has `status: "failed"`, `error: "egress lost (reconciled)"`, `closedBy: "reconciler"`, `endedAt = max(room.endedAt, egress.updatedAt)` and a synthetic `EGRESS_ENDED` event exists

#### Scenario: Store fallback for an ingress session
- **GIVEN** a candidate ingress session
- **WHEN** the reconciler closes it
- **THEN** it has `status: "error"`, `error: "ingress lost (reconciled)"`, `closedBy: "reconciler"`, `endedAt = max(room.endedAt, session.startedAt)` and its ingress document reflects the ended session
