# Spec Delta

## ADDED Requirements

### Requirement: Participants and agents CSV export

Edition: CE. `GET /api/v1/participants/export.csv` and `GET /api/v1/agents/export.csv` SHALL export their lists as
`api-conventions` defines, with the columns `sid`, `identity`, `name`, `kind`, `status`, `roomSid`, `roomName`,
`joinedAt`, `leftAt`, `durationMs`, `connectionType`, `isPublisher`, `publishedSources`, `client.sdk`,
`client.version`, `client.os`, `client.osVersion`, `client.browser` and `client.browserVersion`, then `mediaNode` with
the `per-node-breakdown` feature.

#### Scenario: Header row

- **GIVEN** an edition without the `per-node-breakdown` feature
- **WHEN** the client requests the participants export
- **THEN** the header row holds exactly those 19 columns, in that order, and the agents export has the same header

#### Scenario: Sessions of a room by duration

- **WHEN** the client requests
  `GET /api/v1/participants/export.csv?room=RM_abc&kind=STANDARD&sort=duration&from=now-90d&to=now`
- **THEN** the rows are the STANDARD sessions of `RM_abc` joined in the range, ranked by duration, since a room lifts
  the participants' ranked sort limit

#### Scenario: Agents

- **WHEN** the client requests `GET /api/v1/agents/export.csv?status=active`
- **THEN** every row has `kind` `AGENT` and `status` `active`

#### Scenario: Session without client information

- **GIVEN** a participant session with no client fields
- **WHEN** the export holds it
- **THEN** its six `client.*` cells are empty

#### Scenario: No client address

- **WHEN** the client reads the participants export
- **THEN** no column holds the client address, the device or the session metadata, which only the detail shows
