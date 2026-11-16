# Spec Delta

## ADDED Requirements

### Requirement: Agent facts of a list item
Edition: CE. Each item of kind `AGENT` of the participants and agents lists SHALL carry `agent` with `name`, the value
of the session's `lk.agent_name` attribute, and `openvidu`, the value of its `openvidu.agent` attribute (the OpenVidu
agent type); an absent or empty value is omitted, and `agent` itself when both are. Items of any other kind SHALL have
no `agent`, and no other attribute SHALL appear in a list item.

#### Scenario: Marked agent item
- **GIVEN** an agent session whose `attributes` are `{ "lk.agent_name": "speech-processing-dev", "openvidu.agent": "speech-processing", "openvidu.agent.version": "3.10.0" }`
- **WHEN** it is listed by `GET /api/v1/agents` and by `GET /api/v1/participants?kind=AGENT`
- **THEN** both items have `agent: { name: "speech-processing-dev", openvidu: "speech-processing" }`

#### Scenario: Unmarked agent item
- **GIVEN** an agent session whose `attributes` are `{ "lk.agent_name": "dummy-agent" }`
- **WHEN** it is listed
- **THEN** the item has `agent: { name: "dummy-agent" }` with no `openvidu` property

#### Scenario: Agent item without a name
- **GIVEN** an agent session whose `attributes` are `{ "lk.agent_name": "", "openvidu.agent": "speech-processing" }`
- **WHEN** it is listed
- **THEN** the item has `agent: { openvidu: "speech-processing" }` with no `name` property

#### Scenario: Agent item without attributes
- **GIVEN** an agent session with no `attributes`, and one whose `attributes` are `{ "lk.agent_name": "" }`
- **WHEN** both are listed
- **THEN** neither item has an `agent` property

#### Scenario: Marked session of another kind
- **GIVEN** a STANDARD session stored with `store_metadata: true` whose `attributes` are `{ "lk.agent_name": "fake", "openvidu.agent": "speech-processing" }`
- **WHEN** it is listed by `GET /api/v1/participants`
- **THEN** the item has no `agent` property

#### Scenario: Other attributes stay out
- **GIVEN** an agent session stored with `store_metadata: true` whose `attributes` are `{ "lk.agent_name": "support", "lk.agent.state": "listening", "customer": "acme" }`
- **WHEN** it is listed
- **THEN** the item has `agent: { name: "support" }` and the response body contains neither "listening" nor "acme"

### Requirement: Origin filter of the agents list
Edition: CE. `GET /api/v1/agents` and `GET /api/v1/agents/export.csv` SHALL accept `origin`: `openvidu` keeps the
agent sessions whose `openvidu.agent` attribute is not empty and `third-party` the others; absent means both. It
combines with every other filter and sort as a residual filter on the range scan they select; any other value SHALL
answer `400` `VALIDATION_ERROR`. The participants list has no `origin` parameter.

#### Scenario: OpenVidu agents only
- **GIVEN** in range: an agent session with `openvidu.agent: "speech-processing"`, one with only `lk.agent_name: "dummy-agent"`, one without `attributes`, and a STANDARD session
- **WHEN** the client sends `GET /api/v1/agents?origin=openvidu`
- **THEN** exactly the first session is returned and `total` is 1

#### Scenario: Third-party agents only
- **GIVEN** the same sessions, and an agent session whose `openvidu.agent` is the empty string
- **WHEN** the client sends `GET /api/v1/agents?origin=third-party`
- **THEN** the agent sessions with only `lk.agent_name`, without `attributes` and with the empty mark are returned, `total` is 3, and neither the marked nor the STANDARD session is

#### Scenario: Origin with other filters
- **GIVEN** in range and in room `RM_a`: an active and a left OpenVidu agent session and an active third-party one, and an active OpenVidu agent session in room `RM_b`
- **WHEN** the client sends `GET /api/v1/agents?origin=openvidu&status=active&room=RM_a&sort=duration`
- **THEN** exactly the active OpenVidu agent session of `RM_a` is returned

#### Scenario: Unknown origin
- **WHEN** the client sends `GET /api/v1/agents?origin=livekit`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["origin"]`

#### Scenario: Exact SID ignores the origin
- **GIVEN** the third-party agent session `PA_ag1` joined 3 days ago
- **WHEN** the client sends `GET /api/v1/agents?q=PA_ag1&origin=openvidu`
- **THEN** the response has exactly one item with `sid: "PA_ag1"` and `total: 1`

#### Scenario: Origin explain plans
- **GIVEN** a database generated at scenario M, whose agents are of both origins
- **WHEN** the agents list is explained without `origin`, with `origin=openvidu` and with `origin=third-party`, alone and with `status`, `q`, `q` and `room`, `room`, and the ranked sorts over 24 hours
- **THEN** in each combination the plans with `origin` use the same index as the plan without it, one of `kind_status_joinedAt_id`, `identityLower_joinedAt`, `roomSid_identityLower_joinedAt` and `roomSid_joinedAt_id`, with no `COLLSCAN`, and examine the same documents as it when the page does not cut the scan short, so a page with `origin` never examines more than that scan holds; no plan sorts in memory but the ranked sorts and the identity searches (`q`, `q` and `room`); and the p95 of a page with `origin` is within 300 ms

## MODIFIED Requirements

### Requirement: Participants and agents CSV export

Edition: CE. `GET /api/v1/participants/export.csv` and `GET /api/v1/agents/export.csv` SHALL export their lists as
`api-conventions` defines, with columns `sid`, `identity`, `name`, `kind`, `status`, `roomSid`, `roomName`,
`joinedAt`, `leftAt`, `durationMs`, `connectionType`, `isPublisher`, `publishedSources`, `client.sdk`,
`client.version`, `client.os`, `client.osVersion`, `client.browser`, `client.browserVersion`, `agent.name` and
`agent.openvidu`, then `mediaNode` with `per-node-breakdown`.

#### Scenario: Header row

- **GIVEN** an edition without the `per-node-breakdown` feature
- **WHEN** the client requests the participants export
- **THEN** the header row holds exactly those 21 columns, in that order, and the agents export has the same header

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
- **THEN** no column holds the client address, the device or the session metadata, which only the detail shows, nor
  any attribute beyond the two `agent.*` columns

#### Scenario: Agent columns

- **GIVEN** an agent session with `lk.agent_name: "speech-processing-dev"` and `openvidu.agent: "speech-processing"`,
  an agent session with only `lk.agent_name: "dummy-agent"`, and a STANDARD session
- **WHEN** the participants export holds them
- **THEN** their `agent.name` and `agent.openvidu` cells read `speech-processing-dev` and `speech-processing`,
  `dummy-agent` and empty, and both empty

#### Scenario: OpenVidu agents export

- **GIVEN** an OpenVidu and a third-party agent session in range
- **WHEN** the client requests `GET /api/v1/agents/export.csv?origin=openvidu`
- **THEN** the only row is the OpenVidu agent session
