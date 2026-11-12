# Spec Delta

## ADDED Requirements

### Requirement: Ingresses CSV export

Edition: CE. `GET /api/v1/ingresses/export.csv` SHALL export the ingresses list as `api-conventions` defines, with the
columns `ingressId`, `name`, `inputType`, `roomName`, `participantIdentity`, `status`, `enabled`, `reusable`,
`createdAt`, `deletedAt`, `sessions`, `totalDurationMs`, `lastSessionAt` and `hasError`.

#### Scenario: Ingresses by total duration

- **WHEN** the client requests `GET /api/v1/ingresses/export.csv?inputType=rtmp&sort=totalDuration&from=now-7d&to=now`
- **THEN** the rows are the RTMP ingresses of the activity range, ranked by total duration descending

#### Scenario: Deleted ingress

- **GIVEN** an ingress deleted in the range
- **WHEN** the export holds it
- **THEN** its `status` reads `deleted` and its `deletedAt` cell holds the deletion instant

#### Scenario: No secrets

- **WHEN** the client reads the ingresses export
- **THEN** no column holds the ingress URL, the stream key or the participant name
