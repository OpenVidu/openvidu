# Spec Delta

## MODIFIED Requirements

### Requirement: Server info unavailable
Edition: CE. When the info endpoint fails, Data SHALL show the error notice "Server info unavailable" with a Retry
action and the Preferences tab stays usable.

#### Scenario: Backend down
- **GIVEN** the info request fails
- **WHEN** the user opens Data
- **THEN** the message and retry render, and switching to Preferences works

### Requirement: Data loading state
Edition: CE. While the info document has not arrived and its request has not failed, Data SHALL render a loading
skeleton; the migration, the Storage table and the retention message replace it when the document arrives.

#### Scenario: Info in flight
- **GIVEN** the info request has not answered yet
- **WHEN** the user opens Data
- **THEN** the tab shows its loading state, with no retention or storage values and no "Server info unavailable" notice

#### Scenario: Info arrives
- **GIVEN** Data showing its loading state
- **WHEN** the info document arrives
- **THEN** the loading state gives way to the Storage table and the retention message, with no version line and no
  edition badge in the tab

## RENAMED Requirements

- FROM: `### Requirement: About loading state`
- TO: `### Requirement: Data loading state`

## ADDED Requirements

### Requirement: Preferences and Data tabs
Edition: CE. `/settings` SHALL show two tabs, Preferences and Data, selected by the `tab` query parameter
(`preferences` by default, `data` for Data); switching tabs writes `tab` to the URL. Any other value, the former
`about` included, shows Preferences.

#### Scenario: Deep link to Data
- **GIVEN** `/settings?tab=data`
- **WHEN** the page opens
- **THEN** the Data tab is active and focused, and no tab is named About

#### Scenario: Former About value
- **GIVEN** `/settings?tab=about`
- **WHEN** the page opens
- **THEN** the Preferences tab is active

### Requirement: Legacy migration on the Data tab
Edition: CE. Data SHALL show the legacy migration only while it runs (progress bar with processed/total records,
following the server status poll every 10 s) and, when it ends while the page is open, its outcome (completed with its
time, or failed with its message); once the page is reloaded after the migration ended, Data shows nothing about it.

#### Scenario: Migration running on the Data tab
- **GIVEN** the status reports 300000 of 1200000 records processed
- **WHEN** Data renders
- **THEN** a progress bar at 25 % shows "300,000 / 1,200,000 records" and updates with the next status response

#### Scenario: Completed before the page opened
- **GIVEN** the status reports a migration completed yesterday
- **WHEN** Data renders
- **THEN** no migration section is shown

#### Scenario: Completed while watching
- **GIVEN** Data showing a running migration
- **WHEN** the next status reports it completed
- **THEN** the section reads "Migration completed at hh:mm:ss" until the page is left

### Requirement: Storage per data class
Edition: CE. Data SHALL show one "Storage" table from `GET /api/v1/info` with the columns Data, Retention, Documents
and Size: one row per data class in a fixed order, without sorting or paging, closed by a Total row. A row sums the
documents and the size (storage plus indexes, in the shared byte formatter) of its collections; Retention uses the
shared retention length wording. `schema_meta` belongs to no class and is neither shown nor counted.

#### Scenario: Class rows
- **GIVEN** the default retention
- **WHEN** Data renders
- **THEN** the Storage table has, in this order, the rows Events 7 days, Stats 7 days, Tracks and subscriptions 7 days,
  Entities 90 days, 5-minute rollups 7 days, Hourly rollups 400 days and Daily rollups "Kept forever", and no column
  is titled "Kept for"

#### Scenario: Collections of each class
- **GIVEN** storage entries for every analytics collection, each with 1 document
- **WHEN** Data renders
- **THEN** the Documents cells read Events 1 (`events`), Stats 1 (`track_stats`), Tracks and subscriptions 2 (`tracks`,
  `track_subscriptions`), Entities 6 (`rooms`, `participants`, `egresses`, `ingresses`, `ingress_sessions`, `nodes`)
  and 1 for each of 5-minute rollups (`analytics_5min`), Hourly rollups (`analytics_hourly`) and Daily rollups
  (`analytics_daily`)

#### Scenario: Class that sums several collections
- **GIVEN** storage entries for `rooms` (4 documents, 381 kB with indexes), `participants` (10 documents, 200 kB) and
  `nodes` (1 document, 41 kB)
- **WHEN** Data renders
- **THEN** the Entities row reads "15" documents and "622 kB"

#### Scenario: Storage total without schema_meta
- **GIVEN** storage entries for `rooms` (4 documents, 381 kB with indexes), `events` (285 documents, 356 kB with
  indexes) and `schema_meta` (4 documents, 41 kB)
- **WHEN** Data renders
- **THEN** the last row reads "Total", an empty Retention cell, "289" and "737 kB", and nothing in the tab names
  `schema_meta`

#### Scenario: Retention that is not a whole number of days
- **GIVEN** `retention.tracksMs` of 36 hours and `retention.rollupsDailyMs` of 1 825 days
- **WHEN** Data renders
- **THEN** the row Tracks and subscriptions reads "36 hours" and the row Daily rollups reads "1,825 days"

#### Scenario: Retention not reported
- **GIVEN** an info document without `retention` and without storage entries
- **WHEN** Data renders
- **THEN** the seven class rows read "—" as their retention, "0" documents and "0 B", no row carries an info tip, and
  "Retention not reported by the server yet" shows under the table

### Requirement: Retention progress
Edition: CE. A class with documents whose data spans less than its retention SHALL carry an info tip after its
retention value, named "About <class> retention", that reads "<n> of <retention> so far", n in the unit of the
retention rounded down, or "Less than 1 <unit> of <retention> so far". The span runs from the clock of the class to the
moment the dashboard read the info document. A class within one day or 10 % of its retention, whichever is longer, is
full and carries no tip.

#### Scenario: Class still filling
- **GIVEN** an entities retention of 90 days, an Entities row of 560 MB and the oldest room created 12 days before the
  info document was read
- **WHEN** Data renders
- **THEN** the Entities row carries an info tip named "About Entities retention" that reads "12 of 90 days so far ·
  ≈ 4.2 GB at full retention (estimate)"

#### Scenario: Span rounded down
- **GIVEN** an events retention of 7 days and the oldest event 5 days and 23 hours old
- **WHEN** Data renders
- **THEN** the tip of the Events row starts with "5 of 7 days so far"

#### Scenario: Span ends at the read
- **GIVEN** an entities retention of 90 days and the oldest room created 12 days before the info document was read
- **WHEN** Data first renders two days after that read, with no new info document
- **THEN** the tip of the Entities row starts with "12 of 90 days so far"

#### Scenario: Class at full retention
- **GIVEN** an events retention of 7 days and the oldest event 6 days and 2 hours old
- **WHEN** Data renders
- **THEN** the Events row carries no info tip

#### Scenario: Full within a tenth of the retention
- **GIVEN** an hourly rollup retention of 400 days and the oldest hourly bucket 365 days old
- **WHEN** Data renders
- **THEN** the Hourly rollups row carries no info tip

#### Scenario: Less than one unit of data
- **GIVEN** an events retention of 7 days and the oldest event 5 hours old
- **WHEN** Data renders
- **THEN** the tip of the Events row reads "Less than 1 day of 7 days so far"

#### Scenario: Idle period reads as filling
- **GIVEN** a deployment that has written data for 200 days, an events retention of 7 days, an Events row of 70 MB and
  no event older than 5 days because the deployment was idle before
- **WHEN** Data renders
- **THEN** the tip of the Events row reads "5 of 7 days so far · ≈ 98 MB at full retention (estimate)"

#### Scenario: Class without documents
- **GIVEN** the default retention, no `track_stats` entry, as on a deployment without media statistics, and the
  earliest `oldest` of the deployment 3 days old
- **WHEN** Data renders
- **THEN** the Stats row reads "0" documents and "0 B" and carries no info tip

### Requirement: Clock of each data class
Edition: CE. The clock of Events and of each rollup class SHALL be the `oldest` of its collection; that of Entities the
earliest `oldest` of `rooms`, `participants`, `egresses` and `ingress_sessions`, never `nodes` or `ingresses`. Stats
and Tracks and subscriptions SHALL use the deployment clock: the earliest `oldest` of those four, `events`,
`analytics_5min` and `analytics_hourly` (not `analytics_daily`, dated by its UTC day). A class without a clock has no
tip, except unlimited Daily rollups.

#### Scenario: Entities clock ignores nodes and ingresses
- **GIVEN** an entities retention of 90 days, `nodes` with `oldest` 200 days ago, `ingresses` 300 days ago, and
  `rooms`, `participants`, `egresses` and `ingress_sessions` with `oldest` 12 to 10 days ago
- **WHEN** Data renders
- **THEN** the tip of the Entities row starts with "12 of 90 days so far"

#### Scenario: Stats and tracks on the deployment clock
- **GIVEN** the default retention, `track_stats`, `tracks` and `track_subscriptions` without `oldest`, a Stats row of
  30 MB, a Tracks and subscriptions row of 6 MB, and the earliest `oldest` of the deployment, an hourly bucket, 3
  days old
- **WHEN** Data renders
- **THEN** the tip of Stats reads "3 of 7 days so far · ≈ 70 MB at full retention (estimate)" and that of Tracks and
  subscriptions "3 of 7 days so far · ≈ 14 MB at full retention (estimate)"

#### Scenario: Daily bucket outside the deployment clock
- **GIVEN** the default retention, a Stats row with documents, the oldest daily bucket 1 day old and the oldest event,
  the earliest of the other collections of the deployment clock, 5 hours old
- **WHEN** Data renders
- **THEN** the tip of Stats reads "Less than 1 day of 7 days so far", with no estimate

#### Scenario: Deployment older than the stats retention
- **GIVEN** a stats retention of 30 days and the earliest `oldest` of the deployment 200 days ago
- **WHEN** Data renders
- **THEN** the Stats row carries no info tip

#### Scenario: Class without a clock
- **GIVEN** an `events` entry with 0 documents and no `oldest`
- **WHEN** Data renders
- **THEN** the Events row carries no info tip

#### Scenario: Unlimited daily rollups without data
- **GIVEN** `retention.rollupsDailyMs` `null` and no `analytics_daily` entry
- **WHEN** Data renders
- **THEN** the Daily rollups row reads "0" documents and carries an info tip that reads "Grows without limit"

### Requirement: Size estimate at full retention
Edition: CE. The tip of a class that is still filling SHALL end with " · ≈ <size> at full retention (estimate)", its
size multiplied by its retention and divided by its data span, when the span reaches one day and the class has
documents. Daily rollups without a limit SHALL always carry the tip "Grows without limit", followed under the same
conditions by " · ≈ <size> per year (estimate)", their size over 365 days at the rate so far. The Total row carries no
tip.

#### Scenario: Linear estimate
- **GIVEN** an hourly rollup retention of 400 days, an Hourly rollups row of 3 MB and the oldest hourly bucket 30 days
  old
- **WHEN** Data renders
- **THEN** the tip of Hourly rollups reads "30 of 400 days so far · ≈ 40 MB at full retention (estimate)"

#### Scenario: No estimate under one day of data
- **GIVEN** a tracks retention of 36 hours, a Tracks and subscriptions row with documents and the earliest `oldest` of
  the deployment 5 hours ago
- **WHEN** Data renders
- **THEN** the tip of Tracks and subscriptions reads "5 of 36 hours so far", with no estimate

#### Scenario: Unlimited daily rollups
- **GIVEN** `retention.rollupsDailyMs` `null`, a Daily rollups row of 260 kB and the oldest daily bucket 73 days old
- **WHEN** Data renders
- **THEN** the Daily rollups row reads "Kept forever" with an info tip named "About Daily rollups retention" that reads
  "Grows without limit · ≈ 1.3 MB per year (estimate)"

#### Scenario: Unlimited daily rollups without a day of data
- **GIVEN** `retention.rollupsDailyMs` `null` and the oldest daily bucket 5 hours old
- **WHEN** Data renders
- **THEN** the tip of Daily rollups reads "Grows without limit"

#### Scenario: Daily rollups with a limit
- **GIVEN** `retention.rollupsDailyMs` of 1 825 days, a Daily rollups row of 260 kB and the oldest daily bucket 73 days
  old
- **WHEN** Data renders
- **THEN** the tip of Daily rollups reads "73 of 1,825 days so far · ≈ 6.5 MB at full retention (estimate)"

#### Scenario: Total without an estimate
- **GIVEN** class rows that carry info tips
- **WHEN** Data renders
- **THEN** the Total row carries none

### Requirement: Retention tip access
Edition: CE. The retention tips SHALL be the shared info tip, an icon button that shows its text on hover, keyboard
focus or tap; the progress and the estimate never render as text of the row, and a class without a tip shows no icon.
On a 375 px viewport the page SHALL NOT scroll sideways and every tip SHALL open inside the viewport.

#### Scenario: Retention tip by keyboard
- **GIVEN** an Entities row that is still filling
- **WHEN** the user tabs to its info icon and then presses Escape
- **THEN** the icon is announced as "About Entities retention" with the progress and the estimate as its description,
  the tooltip shows on focus and hides on Escape

#### Scenario: Retention tip on a phone
- **GIVEN** a 375 px touch viewport and an Entities row that is still filling
- **WHEN** the user taps its info icon and then taps it again
- **THEN** the first tap shows the tooltip inside the viewport and the second hides it, and the page does not scroll
  sideways

#### Scenario: Progress only in the tip
- **GIVEN** an Entities row that is still filling
- **WHEN** Data renders and no tip is open
- **THEN** the row reads its retention, documents and size, and neither "so far" nor "estimate" shows in the table

### Requirement: Collection breakdown
Edition: CE. Each class row SHALL have a button that expands it, collapsed by default and independent of the other
rows, into a table named "Collections of <class>" of its collections with collection, documents, size and oldest
document as the info endpoint reports them, the oldest in the session zone; the state is not kept in the URL. A
collection the endpoint never dates reads "—" with the tooltip "Not shown: no index starts with this collection's time
field".

#### Scenario: Breakdown collapsed by default
- **GIVEN** storage entries for every analytics collection
- **WHEN** Data renders
- **THEN** every class row has a collapsed button named "Show collections of <class>" and no collection name shows

#### Scenario: Expand a class
- **GIVEN** storage entries for the six collections of Entities, `rooms` with 1,203 documents, 1.47 MB with indexes
  and `oldest` `2026-09-01T00:00:00Z`, in a session in UTC
- **WHEN** the user activates "Show collections of Entities"
- **THEN** a table named "Collections of Entities" under the Entities row lists `rooms`, `participants`, `egresses`,
  `ingresses`, `ingress_sessions` and `nodes`, the `rooms` row reads "1,203", "1.47 MB" and "2026-09-01 00:00:00 UTC",
  the button is expanded and named "Hide collections of Entities", the URL does not change and the other rows stay
  collapsed

#### Scenario: Collapse a class
- **GIVEN** the Entities row expanded
- **WHEN** the user activates "Hide collections of Entities"
- **THEN** its collections no longer show

#### Scenario: Collection without an oldest date
- **GIVEN** a `tracks` entry without `oldest`
- **WHEN** the user expands Tracks and subscriptions
- **THEN** the Oldest cell of `tracks` reads "—" with the tooltip "Not shown: no index starts with this collection's
  time field"

### Requirement: Retention configuration message
Edition: CE. Under the Storage table Data SHALL show an info notice telling that the retention is set in
`openvidu.analytics.retention` of the OpenVidu Server configuration (`livekit.yaml`) and applies when the server
restarts, with a "Configuration reference" link to the "Analytics settings" section of the configuration reference.
Nothing else under the table explains the info icons or the estimates.

#### Scenario: Where the retention is set
- **WHEN** Data renders with an info document
- **THEN** under the Storage table an info notice with the role `status` reads "Retention is set in
  `openvidu.analytics.retention` of the OpenVidu Server configuration (`livekit.yaml`) and applies when the server
  restarts.", followed by a "Configuration reference" link that opens
  `https://openvidu.io/latest/docs/self-hosting/configuration/reference/#analytics-settings` in a new tab, and no text
  under the table names the info icons or the estimates

## REMOVED Requirements

### Requirement: Settings tabs
**Reason**: The About tab becomes the Data tab, selected by `tab=data`; replaced by "Preferences and Data tabs".
**Migration**: Links to `/settings?tab=about` use `/settings?tab=data`; the former value shows Preferences.

### Requirement: Migration status
**Reason**: The migration shows on the Data tab; replaced by "Legacy migration on the Data tab", with the same
behaviour.
**Migration**: None.

### Requirement: OpenVidu version
**Reason**: The sidenav footer shows the OpenVidu version and the edition badge on every page (`ui-shell`, "Footer
version line"), and the shell banner keeps reporting a schema incompatibility.
**Migration**: None. The version and the edition are read in the sidenav footer.

### Requirement: Retention and storage
**Reason**: Replaced by one table per data class ("Storage per data class") with the per-collection figures behind each
row ("Collection breakdown").
**Migration**: None. The retention of a class is in the Retention column and the figures of a collection under its
class.
