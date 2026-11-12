# Spec Delta

## MODIFIED Requirements

### Requirement: PRO-only routes on CE

Edition: CE. Every route that the PRO edition adds SHALL be known to the CE route registry with its feature
identifier, and CE SHALL answer requests to such a route with `403` `PRO_FEATURE` and `details.feature` set to that
identifier, after authentication, so that a direct API call never falls through to a `404` or to the SPA fallback.

#### Scenario: Room detail on CE

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `GET /api/v1/rooms/RM_abc`
- **THEN** the response is `403` with `{ error: { code: 'PRO_FEATURE', message, details: { feature: 'room-detail' } } }`

#### Scenario: Unauthenticated call to a PRO route

- **WHEN** the client requests `GET /api/v1/rooms/RM_abc` without a token on CE
- **THEN** the response is `401`, not `403`

#### Scenario: Locked routes of each feature

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client sends `GET` to one of these routes under `/api/v1`
- **THEN** the response is `403` `PRO_FEATURE` with `details.feature`:
  - `room-detail`: `/rooms/{sid}`, `/rooms/{sid}/participants`, `/rooms/{sid}/participants/export.csv`,
    `/rooms/{sid}/egresses`, `/rooms/{sid}/ingress-sessions`, `/rooms/{sid}/events` and `/rooms/{sid}/series`
  - `participant-detail`: `/participants/{sid}`, `/participants/{sid}/sessions`, `/participants/{sid}/tracks`,
    `/participants/{sid}/subscriptions`, `/participants/{sid}/events` and `/participants/{sid}/series`
  - `track-detail`: `/tracks/{sid}`, `/tracks/{sid}/subscriptions` and `/tracks/{sid}/series`
  - `egress-detail`: `/egresses/{id}` and `/egresses/{id}/events`
  - `ingress-detail`: `/ingresses/{id}`, `/ingresses/{id}/sessions` and `/ingresses/{id}/events`
  - `analytics-top-rooms`: `/analytics/top`
  - `per-node-breakdown`: `/analytics/scopes`

#### Scenario: Literal routes keep precedence

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `GET /api/v1/rooms/summary`
- **THEN** the rooms summary answers `200`, not the locked `/rooms/{sid}` route

#### Scenario: List exports keep precedence

- **GIVEN** a valid token on the CE dashboard
- **WHEN** the client requests `GET /api/v1/rooms/export.csv`, `/participants/export.csv`, `/egresses/export.csv` and
  `/ingresses/export.csv`
- **THEN** each answers `200` with its CSV, not the locked detail route of its resource
