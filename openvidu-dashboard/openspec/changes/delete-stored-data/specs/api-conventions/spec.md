# Spec Delta

## MODIFIED Requirements

### Requirement: Base path and resource naming

Edition: CE. Every dashboard API route SHALL live under `/api/v1`, use lower-case plural nouns for resources
(`rooms`, `participants`, `agents`, `tracks`, `egresses`, `ingresses`, `analytics`, `overview`, `status`, `auth`,
`info`, `deletions`), nest
sub-resources at most one level under the parent identifier, and answer every unknown `/api` path with a JSON
`404` instead of the SPA fallback.

#### Scenario: Sub-resource path

- **GIVEN** a room with SID `RM_abc`
- **WHEN** the client requests its participants
- **THEN** the path is `GET /api/v1/rooms/RM_abc/participants`

#### Scenario: Unknown API path

- **WHEN** the client requests `GET /api/v1/does-not-exist` or `GET /api/anything`
- **THEN** the response is `404` with body `{ error: { code: 'NOT_FOUND', message } }` and
  `Content-Type: application/json`, never the SPA `index.html`, and the message names the full path, such as
  `No API route for GET /api/v1/does-not-exist`
