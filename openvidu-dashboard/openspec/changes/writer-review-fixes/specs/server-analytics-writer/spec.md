## MODIFIED Requirements

### Requirement: Lifted keys and room resolution
Edition: CE and PRO. Every document SHALL carry lifted references resolved from the event: `ROOM_CREATED`
from `room.sid`, egress events from `egress.room_id` and `egress.room_name`, ingress events from
`ingress.state.room_id`, which the server fills from the active room of `ingress.room_name` when the ingress reports
none, and `ingress.room_name`, track events from the minimal `room {sid, name}`; a missing room leaves the reference
absent.

#### Scenario: ROOM_CREATED without room_id
- **GIVEN** a `ROOM_CREATED` event with empty `room_id`, `room.sid = "RM_x"` and `room.creation_time_ms`
- **WHEN** it is projected
- **THEN** the `rooms` document has `_id: "RM_x"` and `createdAt` from `creation_time_ms`, and the raw event has `roomSid: "RM_x"`

#### Scenario: Egress before any room event
- **GIVEN** an `EGRESS_STARTED` with `egress.room_id` and `egress.room_name` and no prior room event
- **WHEN** it is projected
- **THEN** the `egresses` document and the raw event carry `roomSid` and `roomName`, and the `rooms` document is upserted with `features.egress: true` and its egress counter

#### Scenario: Web egress without room
- **GIVEN** a web egress with empty `room_id`
- **WHEN** it is projected
- **THEN** `roomSid` is absent from the egress document and the raw event, and no `rooms` write model is produced

#### Scenario: Ingress session key
- **GIVEN** an `INGRESS_STARTED` with `ingress.state.resource_id`
- **WHEN** it is projected
- **THEN** the `ingress_sessions` document has `_id` equal to `resource_id`, `ingressId` and `roomSid` from `state.room_id`, and the raw event has `ingressSessionId`

#### Scenario: Ingress publishing before its state names the room
- **GIVEN** an ingress of room `qa-ingress`, active as `RM_x`, whose service sends the publishing state without
  `room_id`
- **WHEN** the server handles the state update and the writer projects its `INGRESS_STARTED`
- **THEN** the event carries `state.room_id: "RM_x"`, the `ingress_sessions` document has `roomSid: "RM_x"` while it
  publishes, and the room counts the session as active

#### Scenario: Ingress of a room that is not active
- **GIVEN** an ingress whose state has no `room_id` and whose room name has no active room
- **WHEN** the server handles the state update
- **THEN** the state keeps no `room_id` and the session document has no `roomSid` until an event names the room

#### Scenario: Subscriber identity resolved
- **GIVEN** a participant session `PA_1` already projected with identity `alice`
- **WHEN** a `TRACK_SUBSCRIBED` with `participant {sid: "PA_1"}` and `publisher {sid, identity}` is processed
- **THEN** the subscription has `subscriberIdentity: "alice"`, `publisherSid` and `publisherIdentity` from `publisher`

### Requirement: Rollup counters from events
Edition: CE and PRO. Each projected event SHALL increment the hourly and daily counters of its UTC bucket
in both scopes, and its 5-minute lifecycle counters, once: an event stored raw counts only when its raw insert
succeeds, so an event already stored by a previous process never counts again; an event not stored raw counts when
it is projected; an in-process retry never reapplies a rollup step that succeeded. Map keys SHALL be enum names or a
fixed vocabulary, never user input.

#### Scenario: Batch retried after a transient error
- **GIVEN** a batch whose raw inserts succeeded and whose rollup step failed with a network error
- **WHEN** the batch is retried
- **THEN** raw inserts are skipped as duplicates, the rollup step is applied once and the counters equal the event counts

#### Scenario: Replayed events from another process
- **GIVEN** events already stored by a previous process
- **WHEN** they are processed again
- **THEN** the rollup counters are unchanged

#### Scenario: Vocabulary keys
- **GIVEN** a `PARTICIPANT_JOINED` with `client_info.sdk: JS`, `os: "Windows 11"` and `browser: "Chrome 130"`
- **WHEN** it is projected
- **THEN** the hourly rollup increments `participants.bySdk.JS`, `participants.byOs.windows` and `participants.byBrowser.chrome`, and a value outside the vocabulary increments `other`

#### Scenario: Session without a browser
- **GIVEN** a `PARTICIPANT_JOINED` with `client_info.sdk: GO` and an empty `browser`
- **WHEN** it is projected
- **THEN** the hourly rollup increments `participants.byBrowser.none`, not `participants.byBrowser.other`
