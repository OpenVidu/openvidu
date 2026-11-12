# Spec Delta

## ADDED Requirements

### Requirement: Egresses CSV export

Edition: CE. `GET /api/v1/egresses/export.csv` SHALL export the egresses list as `api-conventions` defines, with the
columns `egressId`, `roomSid`, `roomName`, `type`, `sourceType`, `status`, `closedBy`, `startedAt`, `endedAt`,
`durationMs`, `outputs.kinds`, `outputs.count`, `hasError` and `errorCode`.

#### Scenario: Failed recordings of a room

- **WHEN** the client requests `GET /api/v1/egresses/export.csv?status=failed&room=RM_abc&from=now-7d&to=now`
- **THEN** the rows are the failed egresses of `RM_abc` started in the range, by `startedAt` descending, each with
  `hasError` `true` and its `errorCode` when the egress has one

#### Scenario: Web egress without room

- **GIVEN** a web egress with no room
- **WHEN** the export holds it
- **THEN** its `roomSid` and `roomName` cells are empty

#### Scenario: Outputs

- **GIVEN** a room composite egress with a file output and a stream output
- **WHEN** the export holds it
- **THEN** its `outputs.kinds` cell reads `file;stream` and `outputs.count` reads `2`, and no column holds an output
  location, URL or the egress request
