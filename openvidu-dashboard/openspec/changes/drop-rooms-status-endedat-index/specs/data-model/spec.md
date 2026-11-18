## ADDED Requirements

### Requirement: Rooms end time not indexed
Edition: CE and PRO. The shared contract SHALL define no `rooms` index whose key contains `endedAt`. Room lists and
counts read the creation range on `createdAt` and rank by the end time in memory, so such an index serves no query and
only competes in the planner's trials with the indexes the range bounds.

#### Scenario: No rooms index on endedAt
- **GIVEN** the index list of the contract (`schema/indexes.json`)
- **WHEN** its `rooms` entries are read
- **THEN** none has `endedAt` in its key and none is named `status_endedAt_id`
