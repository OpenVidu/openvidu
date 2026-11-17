## MODIFIED Requirements

### Requirement: Legacy data kept for rollback
Edition: CE and PRO. The migration SHALL only read `legacy_events` and `stats`, never changing their documents or
indexes, and the server SHALL keep both collections until `legacyRetainedUntil` has passed, so that a legacy server
(OpenVidu 3.9 or earlier) can be restored on the legacy data that has not expired by its TTL.

#### Scenario: Rollback after the migration
- **GIVEN** a completed migration
- **WHEN** the operator stops the server, drops the analytics collections, renames `legacy_events` back to `events` and starts the legacy server
- **THEN** `events` and `stats` hold every legacy document whose `openvidu_expire_at` has not passed, with their original indexes

## ADDED Requirements

### Requirement: Legacy data dropped after its rollback window
Edition: CE and PRO. Every node SHALL check at startup and then every hour, and SHALL drop `legacy_events` and `stats`
once `schema_meta` `_id: "migration"` is `completed`, its `legacyRetainedUntil` has passed or is absent, and neither
collection holds a document whose `openvidu_expire_at` is later; the latest such date SHALL instead become
`legacyRetainedUntil`. Without a completed migration nothing SHALL be dropped. A node that drops SHALL log the
collections it dropped.

#### Scenario: Rollback window ended
- **GIVEN** a completed migration whose `legacyRetainedUntil` passed yesterday and `legacy_events` and `stats` emptied by their TTL
- **WHEN** the server starts
- **THEN** neither collection exists, the `migration` document is unchanged and one info line names `legacy_events` and `stats`

#### Scenario: Rollback window ends while running
- **GIVEN** a server started with a completed migration whose `legacyRetainedUntil` is 30 minutes ahead
- **WHEN** the next hourly check runs after that date
- **THEN** both collections are dropped without a restart

#### Scenario: Rollback window still open
- **GIVEN** a completed migration whose `legacyRetainedUntil` is tomorrow and legacy documents that expire until then
- **WHEN** the server starts and runs its checks
- **THEN** both collections keep their documents and indexes, and one info line at startup gives the date until which they are kept

#### Scenario: Unfinished migration keeps legacy data
- **GIVEN** a `pending` migration, with `openvidu.analytics.migration.enabled: false`, and `legacy_events` and `stats` with documents
- **WHEN** the checks run
- **THEN** both collections are kept

#### Scenario: Stats collection without a migration
- **GIVEN** a server started on a database without legacy collections, so without a `migration` document, and a `stats` collection created afterwards
- **WHEN** more than an hour passes
- **THEN** `stats` is kept

#### Scenario: Legacy documents newer than the date
- **GIVEN** a completed migration whose `legacyRetainedUntil` passed yesterday and a `stats` document whose `openvidu_expire_at` is in 3 days
- **WHEN** the check runs
- **THEN** nothing is dropped and `legacyRetainedUntil` becomes that document's `openvidu_expire_at`

#### Scenario: Completed without a retention date
- **GIVEN** a completed migration without `legacyRetainedUntil`, whose legacy collections hold no document
- **WHEN** the server starts
- **THEN** `legacy_events` and `stats` are dropped

#### Scenario: Nodes dropping together
- **GIVEN** a completed migration whose `legacyRetainedUntil` has passed
- **WHEN** two nodes run their check at the same time
- **THEN** both collections are dropped and neither node reports an error
