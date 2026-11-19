# Spec Delta

## ADDED Requirements

### Requirement: Dashboard deletion records
Edition: CE and PRO. The `schema_meta` document `_id: "dashboard"` SHALL hold, written only by the dashboard, the
latest deletion job (`deletion`: class, cutoff, state, heartbeat, progress, error, the instance running it) and the
last outcome of each class (`deletions`); the writer never reads or writes them, and the validator, the schema version
and the generated contract stay unchanged.

#### Scenario: Records accepted by the validator
- **GIVEN** the test configuration, whose validators reject invalid documents
- **WHEN** the dashboard writes a running job and a completed Events record into `schema_meta` `_id: "dashboard"`
- **THEN** the writes succeed and the writer's `schema`, `retention`, `capabilities`, `config`, `migration` and
  `reconciler` documents are unchanged

#### Scenario: Contract unchanged
- **GIVEN** the contract sources of this change
- **WHEN** the generated `schema/` and the schema version are compared with those before it
- **THEN** both are identical
