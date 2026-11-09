## MODIFIED Requirements

### Requirement: Writer collections and Redis keys
Edition: CE and PRO. The writer SHALL write only the collections of the `data-model` contract, never the legacy
`stats`, `active_entities` or `last_alive` collections, and its only analytics keys in Redis SHALL be the locks of
the reconciler (`analytics-reconciler-lock`), of the aggregator (`analytics-aggregator-lock`) and of the legacy
migration (`analytics-migration-lock`); events and stats SHALL NOT be published to Redis.

#### Scenario: Collections after a run
- **GIVEN** a server started against an empty database
- **WHEN** it has processed traffic for several minutes
- **THEN** no `stats`, `active_entities` or `last_alive` collection exists and `analytics-reconciler-lock` and `analytics-aggregator-lock` are the only analytics keys in Redis

### Requirement: Standard participant counters
Edition: CE and PRO servers. The writer SHALL count only STANDARD sessions in the room participant counters
(`sessions`, `unique`, `active`, `peakActive`, `aborted`), in every rollup participant counter (joined, active, left,
aborted, minutes, connect time, SDK, OS, browser, connection type, disconnect reasons), in `rooms.participantsSum` and
in the daily `uniqueIdentities`; `participants.byKind` SHALL count the sessions of every kind. Room liveness SHALL
NOT depend on these counters.

#### Scenario: Egress participant joins
- **GIVEN** an active room with one active STANDARD participant
- **WHEN** a `PARTICIPANT_JOINED` and `PARTICIPANT_ACTIVE` of kind EGRESS are projected
- **THEN** the room keeps `participants.sessions: 1` and `active: 1`, `participants.byKind.EGRESS` becomes 1, the hourly rollup increments `participants.byKind.EGRESS` and leaves `participants.joined`, `participants.active` and `participants.bySdk` unchanged

#### Scenario: Ingress participant leaves
- **GIVEN** an INGRESS participant active for 30 minutes
- **WHEN** its `PARTICIPANT_LEFT` is projected
- **THEN** neither `participants.left`, `participants.disconnectReasons` nor `participants.minutes` of the rollups change

#### Scenario: Room size at room end
- **GIVEN** a room that held four STANDARD, one INGRESS and one AGENT session
- **WHEN** its `ROOM_ENDED` is projected
- **THEN** the hourly rollup adds 4 to `rooms.participantsSum`

#### Scenario: Daily unique identities
- **GIVEN** a closed UTC day with the STANDARD identities `alice` and `bob` and the INGRESS identity `cam-1`
- **WHEN** the aggregator writes the day's `uniqueIdentities`
- **THEN** the daily rollup has `uniqueIdentities: 2`

#### Scenario: Service keeps the room open
- **GIVEN** an active room whose only open session is of kind INGRESS
- **WHEN** the reconciler evaluates it
- **THEN** the room is not a closure candidate, although its `participants.active` is 0
