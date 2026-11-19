# Spec Delta

## ADDED Requirements

### Requirement: Deletion in the status
Edition: CE. `GET /api/v1/status` SHALL also carry `deletion`, the latest deletion job with the shape of
`deletions-api`, read from `schema_meta` within the reads the status already makes, and judge a running job without a
heartbeat for 60 s at `generatedAt` as `interrupted`.

#### Scenario: Running deletion in the status
- **GIVEN** a Stats deletion whose last heartbeat was 8 s before `generatedAt`
- **WHEN** the client requests the status
- **THEN** `deletion.class` is `stats` and `deletion.state` is `running`, and the only `find` commands target
  `schema_meta` and `nodes`

#### Scenario: Stale deletion in the status
- **GIVEN** a deletion recorded as running whose last heartbeat was 75 s before `generatedAt`
- **WHEN** the client requests the status
- **THEN** `deletion.state` is `interrupted`
