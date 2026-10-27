## ADDED Requirements

### Requirement: Values stored as received
Edition: CE and PRO. Every value the projectors write into a document SHALL be stored as received, after the
allow-list and its redactions, including strings that start with `$` and map keys that start with `$` or hold a dot.

#### Scenario: Values starting with a dollar sign
- **GIVEN** `store_metadata: true`, a room `$room` with metadata `$$ROOT`, a participant `$$ROOT` named `$name` with metadata `$metadata` and attributes `{ "$role": "$host", "team.name": "$blue" }`, and an egress of the room that fails with error `$error`
- **WHEN** their events are projected
- **THEN** the room has `name: "$room"`, `config.metadata: "$$ROOT"` and one unique identity, the participant has `identity: "$$ROOT"`, `name: "$name"`, `metadata: "$metadata"` and those attributes, and the egress has `error: "$error"`
