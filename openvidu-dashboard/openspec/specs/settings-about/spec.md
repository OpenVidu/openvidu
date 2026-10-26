# settings-about Specification

## Purpose
The Settings page: viewer preferences that shape how every page renders, and an About tab that shows versions,
schema compatibility, migration, retention and storage as reported by the server.

## Requirements

### Requirement: Settings tabs
Edition: CE. `/settings` SHALL show two tabs, Preferences and About, selected by the `tab` query parameter
(`preferences` by default); switching tabs writes `tab` to the URL.

#### Scenario: Deep link to About
- **GIVEN** `/settings?tab=about`
- **WHEN** the page opens
- **THEN** the About tab is active and focused

### Requirement: Viewer preferences

Edition: CE. Preferences SHALL offer theme (system/light/dark), default time zone (browser zone shown by name, or any
IANA zone), default range preset, rows per page (10/25/50/100) and one auto-refresh interval for live views
(off/10 s/30 s/1 min/5 min), none for Analytics; other stored intervals are ignored. Changes save at once with a
"Saved" toast; a new default zone also becomes the session zone. "Reset to defaults" restores system theme,
browser zone, last 24 h, 25 rows and 10 s.

#### Scenario: Change rows per page
- **GIVEN** rows per page set to 50
- **WHEN** the user opens `/egress` without `limit`
- **THEN** the list shows 50 rows

#### Scenario: Reset
- **GIVEN** customised preferences
- **WHEN** the user presses "Reset to defaults"
- **THEN** every control shows its default and the stored preferences are cleared

#### Scenario: One auto-refresh setting
- **WHEN** the Preferences tab renders
- **THEN** it shows one auto-refresh control, "Auto-refresh of live views", and none for Analytics

#### Scenario: Stored interval of another kind
- **GIVEN** stored preferences with a 50-row page size and `refreshMs.history` of 30 s
- **WHEN** the dashboard loads them
- **THEN** lists show 50 rows, the `history` interval is ignored and Analytics does not refresh by itself

#### Scenario: Any default zone
- **GIVEN** the Preferences tab of a session in Europe/Madrid
- **WHEN** the user picks America/New_York as the default zone
- **THEN** "Saved" shows, the next timed page opens with `tz=America/New_York`, and a new browser session starts in
  America/New_York

#### Scenario: Stored lowercase utc
- **GIVEN** stored preferences whose time zone reads `utc`
- **WHEN** the dashboard loads them
- **THEN** the default zone is UTC and the Preferences tab shows "Another zone" selected with UTC

### Requirement: OpenVidu version

Edition: CE. About SHALL show one version line, the OpenVidu version (the dashboard version) with the edition badge, as
reported by `GET /api/v1/info`; a schema incompatibility is reported by the shell's warning banner, not by About.

#### Scenario: Incompatible schema
- **GIVEN** the writer reports schema 3
- **WHEN** About renders
- **THEN** About shows only the version and badge, and the shell banner names both schema versions

#### Scenario: Version and edition

- **GIVEN** the info endpoint reports dashboard 3.10.0, edition CE and schema 1 for dashboard and writer
- **WHEN** About renders
- **THEN** it reads "OpenVidu 3.10.0" with the COMMUNITY badge and no schema line

### Requirement: Migration status
Edition: CE. About SHALL show the legacy migration only while it runs (progress bar with processed/total records,
following the server status poll every 10 s) and, when it ends while the page is open, its outcome (completed with its
time, or failed with its message); once the page is reloaded after the migration ended, About shows nothing about it.

#### Scenario: Migration running
- **GIVEN** the status reports 300000 of 1200000 records processed
- **WHEN** About renders
- **THEN** a progress bar at 25 % shows "300,000 / 1,200,000 records" and updates with the next status response

#### Scenario: Completed before the page opened
- **GIVEN** the status reports a migration completed yesterday
- **WHEN** About renders
- **THEN** no migration section is shown

#### Scenario: Completed while watching
- **GIVEN** About showing a running migration
- **WHEN** the next status reports it completed
- **THEN** the section reads "Migration completed at hh:mm:ss" until the page is left

### Requirement: Retention and storage
Edition: CE. About SHALL show the retention per data class (events, stats, tracks and subscriptions, entities, 5-minute
rollups, hourly rollups, daily rollups) as a table with one row per class, each value in the shared retention length
wording, and a storage table with collection, document count, size and oldest document, as reported by the info
endpoint; sizes use the shared byte formatter.

#### Scenario: Retention line
- **GIVEN** the defaults
- **WHEN** About renders
- **THEN** the retention table has the rows Events 7 days, Stats 7 days, Tracks and subscriptions 7 days, Entities 90
  days, 5-minute rollups 7 days, Hourly rollups 400 days and Daily rollups "Kept forever"

#### Scenario: Retention that is not a whole number of days
- **GIVEN** `retention.tracksMs` of 36 hours and `retention.rollupsDailyMs` of 1 825 days
- **WHEN** About renders
- **THEN** the row Tracks and subscriptions reads "36 hours" and the row Daily rollups reads "1,825 days"

### Requirement: Server info unavailable
Edition: CE. When the info endpoint fails, About SHALL show the error notice "Server info unavailable" with a Retry
action and the Preferences tab stays usable.

#### Scenario: Backend down
- **GIVEN** the info request fails
- **WHEN** the user opens About
- **THEN** the message and retry render, and switching to Preferences works

### Requirement: About loading state
Edition: CE. While the info document has not arrived and its request has not failed, About SHALL render a loading
skeleton; the version, migration, retention and storage replace it when the document arrives.

#### Scenario: Info in flight
- **GIVEN** the info request has not answered yet
- **WHEN** the user opens About
- **THEN** the tab shows its loading state, with no version, retention or storage values and no "Server info unavailable" notice

#### Scenario: Info arrives
- **GIVEN** About showing its loading state
- **WHEN** the info document arrives
- **THEN** the loading state gives way to the version with the edition badge, the retention table and the storage table
