# Spec Delta

## MODIFIED Requirements

### Requirement: Info re-read on server changes
Edition: CE. The shell SHALL read `GET /api/v1/info` at start and after sign-in, and read it again once when a status
reports a schema status or a migration state different from the last info document; it SHALL NOT poll the info endpoint.

#### Scenario: Migration ends
- **GIVEN** an info document with a running migration
- **WHEN** a status reports the migration `completed`
- **THEN** `GET /api/v1/info` is requested once and the Data tab shows the retention and the storage of the new document

#### Scenario: Steady server
- **GIVEN** an info document and status responses with the same schema status and migration state
- **WHEN** ten minutes pass
- **THEN** `GET /api/v1/info` is not requested again
