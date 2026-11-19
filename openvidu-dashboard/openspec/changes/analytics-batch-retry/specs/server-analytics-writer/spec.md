## ADDED Requirements

### Requirement: Rollup and stats delta writes per collection
Edition: CE and PRO. The rollup increments of events and stats, and the participant and room deltas of stats, SHALL be
written one collection at a time, and each queued event or stats flush SHALL record the collections already written,
so that an in-process retry after a transient error writes only the collections whose write failed or was not
attempted; the step is done once every collection is written.

#### Scenario: Rollup step interrupted between collections
- **GIVEN** a batch of counted events whose `analytics_5min` write succeeded and whose `analytics_hourly` write fails with a network error
- **WHEN** the batch is retried
- **THEN** `analytics_5min` is not written again, `analytics_hourly` and `analytics_daily` are written once, and every counter equals the event counts

#### Scenario: Stats deltas interrupted between collections
- **GIVEN** a stats flush whose `track_stats` insert and participant deltas succeeded and whose room deltas fail with a network error
- **WHEN** the batch is retried
- **THEN** the participant's bytes and quality grow once, the room's grow once, and the stats rollups are written once
