# Spec Delta

## MODIFIED Requirements

### Requirement: Banner slot
Edition: CE. A non-blocking banner slot under the header SHALL show, on every page, migration progress, a running
deletion, schema-version warnings and the silent writer warning reported by `GET /api/v1/status`, and connectivity
errors reported by failed requests; each banner is dismissible except the schema warnings (mismatch and uninitialized
database). The banners follow every response of the server status poll.

#### Scenario: Migration running
- **GIVEN** the status reports a migration in progress
- **WHEN** any page renders
- **THEN** the banner shows "Migration in progress" with processed/total records (events and stats) and refreshes until it completes

#### Scenario: Schema mismatch
- **GIVEN** the writer schema version differs from the dashboard's
- **WHEN** any page renders
- **THEN** a warning banner names both versions and cannot be dismissed

#### Scenario: Schema initialized while the page is open
- **GIVEN** the banner "The OpenVidu server has not initialized the analytics database yet" is shown
- **WHEN** the server initializes the database
- **THEN** the banner disappears within 10 s without a reload

### Requirement: Server status poll
Edition: CE. While signed in, the shell SHALL request `GET /api/v1/status` at once and then every 30 s, or every 10 s
while the migration runs, a deletion runs or the schema is uninitialized, on every page and whatever the auto-refresh
preference. The poll pauses while the tab is hidden and fetches at once on return, backs off on failures like the page
refresh, and does not appear in the refresh control.

#### Scenario: Auto-refresh off
- **GIVEN** the auto-refresh set to Off on the Rooms page
- **WHEN** two minutes pass with the tab visible
- **THEN** the Rooms list sends no request and `GET /api/v1/status` requests keep going out 30 s apart

#### Scenario: Migration cadence
- **GIVEN** a status reporting a running migration
- **WHEN** the next polls run
- **THEN** they are 10 s apart until a status reports the migration ended, and 30 s apart after it

#### Scenario: Hidden tab
- **GIVEN** the tab hidden for two minutes
- **WHEN** it is shown again
- **THEN** no status request was sent while hidden and one is sent at once

#### Scenario: Signed out
- **WHEN** the user signs out
- **THEN** no further status request is sent

#### Scenario: Deletion cadence
- **GIVEN** a status reporting a running deletion
- **WHEN** the next polls run
- **THEN** they are 10 s apart until a status reports the deletion ended, and 30 s apart after it

#### Scenario: Status right after starting a deletion
- **GIVEN** a session polling every 30 s
- **WHEN** the user's deletion request is accepted
- **THEN** a status request is sent at once and the next ones 10 s apart

### Requirement: Info re-read on server changes
Edition: CE. The shell SHALL read `GET /api/v1/info` at start and after sign-in, and read it again once when a status
reports a schema status, a migration state or a deletion job or state different from the last info document; besides
the reads of the Data tab of Settings, it SHALL NOT poll the info endpoint.

#### Scenario: Migration ends
- **GIVEN** an info document with a running migration
- **WHEN** a status reports the migration `completed`
- **THEN** `GET /api/v1/info` is requested once and the Data tab shows the retention and the storage of the new document

#### Scenario: Steady server
- **GIVEN** an info document and status responses with the same schema status and migration state
- **WHEN** ten minutes pass
- **THEN** `GET /api/v1/info` is not requested again

#### Scenario: Deletion ends
- **GIVEN** an info document read while an Events deletion ran
- **WHEN** a status reports that deletion completed
- **THEN** `GET /api/v1/info` is requested once and the Data tab shows its storage and `deletions`

## ADDED Requirements

### Requirement: Deletion banner
Edition: CE. While the status reports a running deletion, every page except the Data tab of Settings SHALL show the
dismissible banner "Deleting analytics data (<class>)… Lists and figures may change." with a "View progress" link to
`/settings?tab=data`, `<class>` being the class of the job ("all classes" for Total, "data before 3.10" for Legacy); it
disappears with the first status that reports the job ended, and a dismissal lasts until another job starts.

#### Scenario: Banner of a running deletion
- **GIVEN** a status reporting a running Entities deletion
- **WHEN** the Rooms page renders
- **THEN** the banner reads "Deleting analytics data (Entities)… Lists and figures may change." and its "View
  progress" link opens `/settings?tab=data`

#### Scenario: Banner of a Total deletion
- **GIVEN** a status reporting a running Total deletion
- **WHEN** the Overview renders
- **THEN** the banner reads "Deleting analytics data (all classes)… Lists and figures may change."

#### Scenario: No banner on the Data tab
- **GIVEN** a status reporting a running Events deletion
- **WHEN** the user opens `/settings?tab=data`
- **THEN** no deletion banner shows and the Data tab shows the progress

#### Scenario: Banner ends with the job
- **GIVEN** the deletion banner shown on the Rooms page
- **WHEN** a status reports the job completed, interrupted or failed
- **THEN** the banner disappears without a reload

#### Scenario: Dismissed banner and a new job
- **GIVEN** the deletion banner of an Events job dismissed
- **WHEN** that job ends and a status reports a new Stats job running
- **THEN** the banner shows again for the Stats job
