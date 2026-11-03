## MODIFIED Requirements

### Requirement: Retention and storage
Edition: CE. About SHALL show the retention per data class (events, stats, tracks and subscriptions, entities, 5-minute
rollups, hourly rollups, daily rollups) as a table with one row per class in the shared retention length wording, and a
storage table with collection, document count, size and oldest document as the info endpoint reports them, closed by a
Total row; sizes use the shared byte formatter.

#### Scenario: Retention line
- **GIVEN** the defaults
- **WHEN** About renders
- **THEN** the retention table has the rows Events 7 days, Stats 7 days, Tracks and subscriptions 7 days, Entities 90
  days, 5-minute rollups 7 days, Hourly rollups 400 days and Daily rollups "Kept forever"

#### Scenario: Retention that is not a whole number of days
- **GIVEN** `retention.tracksMs` of 36 hours and `retention.rollupsDailyMs` of 1 825 days
- **WHEN** About renders
- **THEN** the row Tracks and subscriptions reads "36 hours" and the row Daily rollups reads "1,825 days"

#### Scenario: Storage total
- **GIVEN** storage entries for `rooms` (4 documents, 381 kB with indexes) and `events` (285 documents, 356 kB with
  indexes)
- **WHEN** About renders
- **THEN** the last row of the storage table reads "Total", "289", "737 kB" and an empty Oldest cell

#### Scenario: Collection without an oldest date
- **GIVEN** the `tracks` entry without `oldest`
- **WHEN** About renders
- **THEN** its Oldest cell reads "—" with the tooltip "Not shown: no index starts with this collection's time field"
