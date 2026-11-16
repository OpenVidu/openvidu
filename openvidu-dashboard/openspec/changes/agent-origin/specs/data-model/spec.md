# Spec Delta

## REMOVED Requirements

### Requirement: Secrets and personal data
**Reason**: Restated as "Stored secrets and personal data", which adds the agent attributes kept without
`store_metadata` and names its scenarios apart from those of `server-analytics-writer` "Personal data flags"; a
modified requirement cannot rename its scenarios.
**Migration**: None. The stored data does not change: every rule of the removed requirement is in its replacement.

## ADDED Requirements

### Requirement: Stored secrets and personal data
Edition: CE and PRO. No document SHALL contain `turn_password`, storage credentials, stream keys, signing
keys, tokens or SIP credentials. Client IP addresses SHALL be stored only when `anonymize_ip` is `false`, and
participant metadata, attributes, room metadata and ingress participant metadata SHALL be stored only when
`store_metadata` is enabled, except the attributes `lk.agent_name`, `openvidu.agent` and `openvidu.agent.*` of a
participant of kind `AGENT`, which are always stored.

#### Scenario: Client address absent by default
- **GIVEN** the default configuration
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** `client.address` is absent from the participant document and from the raw event payload

#### Scenario: IP addresses stored on request
- **GIVEN** `anonymize_ip: false`
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** the participant document has `client.address`

#### Scenario: Metadata disabled by default
- **GIVEN** default configuration
- **WHEN** a room with metadata and a STANDARD participant with metadata and attributes are projected
- **THEN** neither `config.metadata` nor `metadata`/`attributes` are stored

#### Scenario: Agent attributes in the contract fixtures
- **GIVEN** the contract fixtures, written as the default `store_metadata: false` writes them
- **WHEN** the participant fixtures are validated and read
- **THEN** the agent session passes the `participants` validator with `attributes` equal to `{ "lk.agent_name": "speech-processing", "openvidu.agent": "speech-processing" }`, and no other participant fixture has `attributes` or `metadata`

### Requirement: Generated agent attributes
Edition: CE. The data generator SHALL give every agent session the `attributes` the writer keeps by default:
`lk.agent_name` always, empty for agents without a registered name, and `openvidu.agent` on the agents it generates
as OpenVidu agents, with no other key; sessions of other kinds get no `attributes`. A generated dataset with agents
SHALL hold agents with the mark and agents without it.

#### Scenario: Generated agents of both origins
- **GIVEN** a dataset generated at scenario S over 2 days
- **WHEN** its participant sessions are read
- **THEN** every `AGENT` session has `attributes` with `lk.agent_name` and no key other than it and `openvidu.agent`, at least one has a non-empty `openvidu.agent` and at least one has none, no session of another kind has `attributes`, and every session passes the `participants` validator
