# Spec Delta

## MODIFIED Requirements

### Requirement: Personal data flags
Edition: CE and PRO. `anonymize_ip` SHALL remove the client IP addresses (`client_info.address` and
`client_meta.client_addr`) from every document, and `store_metadata` SHALL gate room metadata, participant metadata
and attributes and ingress participant metadata, the attributes of "Agent naming attributes" aside; IP addresses and
metadata are dropped by default, also from the documents of the legacy migration.

#### Scenario: Anonymized IP
- **GIVEN** the default configuration
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** neither the participant document nor the raw payload contains the address

#### Scenario: IP addresses kept
- **GIVEN** `anonymize_ip: false`
- **WHEN** a `PARTICIPANT_JOINED` with `client_info.address` is projected
- **THEN** the participant document has `client.address` and the raw payload contains it

#### Scenario: Migrated legacy session
- **GIVEN** the default configuration and a legacy `PARTICIPANT_JOINED` with a client address
- **WHEN** the legacy migration replays it
- **THEN** the migrated participant document has no `client.address`

#### Scenario: Metadata enabled
- **GIVEN** `store_metadata: true`
- **WHEN** a room with metadata and a STANDARD participant with metadata and attributes are projected
- **THEN** `config.metadata`, `metadata` and `attributes` are stored, and they are absent with the default configuration

## ADDED Requirements

### Requirement: Agent naming attributes
Edition: CE and PRO. Whatever `store_metadata` says, the projector SHALL keep in the `attributes` of a participant of
kind `AGENT` the keys `lk.agent_name`, `openvidu.agent` and those that start with `openvidu.agent.`, so that the
dashboard can name an agent and tell OpenVidu agents apart. Its other attributes, the attributes of every other kind
and the attributes in raw event payloads SHALL still need `store_metadata`.

#### Scenario: agents keep the attributes that name them without store_metadata
- **GIVEN** the default configuration, an AGENT participant with the attributes `lk.agent_name`, `openvidu.agent`, `openvidu.agent.version`, `lk.agent.name`, `lk.agent.state`, `openvidu.agents` and `customer`, an AGENT participant with `lk.agent_name` and `lk.agent.state`, an AGENT participant with only `lk.agent.state`, and a STANDARD participant with `lk.agent_name` and `openvidu.agent`
- **WHEN** their `PARTICIPANT_JOINED` events are projected
- **THEN** the first document has exactly `lk.agent_name`, `openvidu.agent` and `openvidu.agent.version` in `attributes` and no `metadata`, the second only `lk.agent_name`, the third and the STANDARD one have no `attributes`, and no raw event payload holds attributes

#### Scenario: agents keep every attribute with store_metadata
- **GIVEN** `store_metadata: true` and an AGENT participant with the attributes `lk.agent_name`, `lk.agent.state` and `customer`
- **WHEN** its `PARTICIPANT_JOINED` is projected
- **THEN** the document's `attributes` hold the three of them
