## MODIFIED Requirements

### Requirement: Participant list item shape

Edition: CE. Each item of the participants and agents lists SHALL carry `sid`, `identity`, `kind`, `status`, `roomSid`,
`roomName`, `joinedAt`, `isPublisher`, `publishedSources`, the optional `name`, `leftAt`, `durationMs`,
`connectionType`, `nodeId`, `mediaNode`, the `stale` flag that `api-conventions` defines and a `client` summary, with unknown values
omitted as `api-conventions` requires.

#### Scenario: Complete row
- **GIVEN** a left session of `alice` from the JS SDK 2.6.1 on Chrome 130 / macOS 14 over UDP
- **WHEN** it is listed
- **THEN** the item has `status: "left"`, `leftAt`, `durationMs`, `connectionType: "UDP"` and `client: { sdk: "JS", version: "2.6.1", browser: "Chrome", browserVersion: "130", os: "macOS", osVersion: "14" }`

#### Scenario: No client information
- **GIVEN** a session whose `PARTICIPANT_JOINED` carried no `client_info`
- **WHEN** it is listed
- **THEN** the item has no `client` and no `connectionType` property

#### Scenario: Published sources
- **GIVEN** a session whose `tracks.bySource` is `{ CAMERA: 2, MICROPHONE: 1 }`, and a session that never published
- **WHEN** both are listed
- **THEN** the first item has `publishedSources` with `CAMERA` and `MICROPHONE` and no other source, and the second has `publishedSources: []`

#### Scenario: Stale active session
- **GIVEN** the default writer batch interval of 10 s and an active session whose `lastStatsAt` is 100 s old at the server's clock
- **WHEN** it is listed
- **THEN** the item has `stale: true`, and a left session with the same `lastStatsAt` has no `stale` property

#### Scenario: Session of a labelled node
- **GIVEN** a session document with `nodeId: "ND_x"` and `mediaNode: "mn-a"`, and one without `mediaNode`
- **WHEN** both are listed
- **THEN** the first item has `nodeId: "ND_x"` and `mediaNode: "mn-a"`, and the second has no `mediaNode` property

#### Scenario: Sources and client summary
- **WHEN** an item of the participants or agents list is returned
- **THEN** `publishedSources` holds the track sources with at least one publication in `tracks.bySource` (empty when
  none) and `client` carries `sdk`, `version`, `os`, `browser`, `browserVersion` and `osVersion` when known

