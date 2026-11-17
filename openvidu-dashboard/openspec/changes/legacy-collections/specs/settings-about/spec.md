## ADDED Requirements

### Requirement: Legacy data row
Edition: CE. While the info endpoint reports `legacy_events` or `stats`, the Storage table SHALL show a row "Legacy
data (before 3.10)" after Daily rollups, in the Total, with no info tip. Per the latest migration state, its Retention
SHALL read "In use by the migration" while it runs, "Kept until the migration completes" while pending or failed,
"Kept until <date> for rollback" (`legacyRetainedUntil`, session zone) once completed, and "Being removed by the
server" past that date or without one.

#### Scenario: Legacy row kept for rollback
- **GIVEN** a completed migration with `legacyRetainedUntil` `2026-12-15T03:00:00Z`, a session in America/New_York, and
  storage entries for `legacy_events` (120,000 documents, 40 MB with indexes), `stats` (300,000 documents, 90 MB) and
  `rooms` (4 documents, 381 kB)
- **WHEN** Data renders
- **THEN** the row after Daily rollups reads "Legacy data (before 3.10)", "Kept until 2026-12-14 for rollback",
  "420,000" and "130 MB" with no info icon, and the Total reads "420,004" and "130 MB"

#### Scenario: Legacy row while the migration runs
- **GIVEN** a running migration and a `stats` entry of 300,000 documents
- **WHEN** Data renders
- **THEN** the Legacy data row reads "In use by the migration" as its retention and "300,000" documents

#### Scenario: Legacy row of a pending migration
- **GIVEN** a pending migration, as when the administrator disabled it, with no `legacyRetainedUntil`, and a
  `legacy_events` entry of 120,000 documents
- **WHEN** Data renders
- **THEN** the Legacy data row reads "Kept until the migration completes" as its retention and "120,000" documents

#### Scenario: Legacy row of a failed migration
- **GIVEN** a failed migration with no `legacyRetainedUntil` and a `stats` entry of 300,000 documents
- **WHEN** Data renders
- **THEN** the Legacy data row reads "Kept until the migration completes" as its retention and "300,000" documents

#### Scenario: Legacy row after its date
- **GIVEN** a completed migration whose `legacyRetainedUntil` is one hour before the info document was read, and a
  `legacy_events` entry with 0 documents and 2.1 GB with indexes
- **WHEN** Data renders
- **THEN** the Legacy data row reads "Being removed by the server", "0" and "2.1 GB"

#### Scenario: Deployment without legacy data
- **GIVEN** a completed migration and storage entries for every analytics collection, none for `legacy_events` or
  `stats`
- **WHEN** Data renders
- **THEN** the Storage table holds the seven class rows and the Total, and no row named "Legacy data (before 3.10)"

#### Scenario: Collections of Legacy data
- **GIVEN** a session in UTC and storage entries for `legacy_events`, with `oldest` `2026-10-13T09:25:55Z`, and `stats`
- **WHEN** the user activates "Show collections of Legacy data (before 3.10)"
- **THEN** a table named "Collections of Legacy data (before 3.10)" lists `legacy_events` and `stats`, and the Oldest
  cell of `legacy_events` reads "2026-10-13 09:25:55 UTC"

#### Scenario: Legacy row follows the status
- **GIVEN** a session in UTC and Data showing the Legacy data row with "In use by the migration" while the migration runs
- **WHEN** the next status reports the migration completed with `legacyRetainedUntil` `2026-12-15T08:00:00Z`
- **THEN** the row reads "Kept until 2026-12-15 for rollback" from that status, before the info document is read
  again

#### Scenario: Legacy row on a phone
- **GIVEN** a 375 px viewport and a Legacy data row kept for rollback
- **WHEN** Data renders
- **THEN** the whole retention text of the row lies inside the viewport, wrapping when it needs to, and the page does
  not scroll sideways
