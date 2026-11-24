# settings-about Specification

## Purpose
The Settings page: viewer preferences that shape how every page renders, and a Data tab that shows the storage and
retention of each class of analytics data, with its progress and size estimate, and the legacy migration while it runs.

## Requirements

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
Edition: CE. The tip of a class still filling SHALL end with " · ≈ <size> at full retention (estimate)", its size in
use (size less the space free for new data) times its retention over its data span, when the span reaches
one day and the class has documents. Daily rollups without a limit SHALL always carry the tip "Grows without limit",
followed under the same conditions by " · ≈ <size> per year (estimate)", their size in use over 365 days at the rate so
far. The Total row carries no tip.

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

#### Scenario: Estimate after a deletion
- **GIVEN** an events retention of 7 days, an Events row of 2 GB of which 1.9 GB is free for new data, and the oldest
  event 2 days old
- **WHEN** Data renders
- **THEN** the tip of Events reads "2 of 7 days so far · ≈ 350 MB at full retention (estimate)"

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

### Requirement: Free space of a class
Edition: CE. Under the Size of a class row with a completed deletion, Data SHALL show a muted line "<size> free for new
data", the space MongoDB keeps free for new documents in its collections and their indexes (`freeBytes`), in the shared
byte formatter, when it reaches 1 MB; the Total sums the free figures of the rows that show one, under the same rule.
Other rows, the Legacy data row included, show none; Size keeps reading storage plus indexes.

#### Scenario: Free space after a deletion
- **GIVEN** a completed Events deletion and an `events` entry of 1,200 documents, 2 GB with indexes and 1.8 GB free
- **WHEN** Data renders
- **THEN** the Events row reads "1,200" and "2 GB" with "1.8 GB free for new data" under the size, and the Total adds
  1.8 GB to its own free line

#### Scenario: Little free space
- **GIVEN** class rows with completed deletions whose collections have 300 kB free in all
- **WHEN** Data renders
- **THEN** no row and not the Total shows a free line

#### Scenario: No free line before any deletion
- **GIVEN** a freshly generated database with no deletion record and an `events` entry with 14.1 MB free
- **WHEN** Data renders
- **THEN** no class row and not the Total shows a free line

#### Scenario: Total sums the rows with a free line
- **GIVEN** a completed Events deletion with 1.8 GB free, and no deletion of Stats, whose `track_stats` has 40 MB free
- **WHEN** Data renders
- **THEN** the Stats row shows no free line and the Total reads "1.8 GB free for new data"

#### Scenario: Free line after an incomplete deletion
- **GIVEN** Events with a completed deletion followed by an interrupted one, Stats with only an interrupted deletion,
  and both with 50 MB free
- **WHEN** Data renders
- **THEN** the Events row shows "50 MB free for new data" and the Stats row shows no free line

#### Scenario: Legacy row without a free line
- **GIVEN** a Legacy data row kept for rollback whose collections have 2 GB free
- **WHEN** Data renders
- **THEN** the Legacy data row shows no free line and the Total does not count those 2 GB

### Requirement: Free space tip
Edition: CE. Each free line SHALL end with an info tip with a link, named "About free space of <class>" ("About free
space" on the Total), whose text reads "MongoDB reuses this space for new data. The rest of the space the deleted data
used stays reserved until the collection is compacted; see Freeing disk space." with "Freeing disk space" linking to the
documentation section the deletion dialogs link to.

#### Scenario: Free space tip of a class
- **GIVEN** an Events row with "1.8 GB free for new data"
- **WHEN** the user activates the info icon after that line
- **THEN** a panel reads "MongoDB reuses this space for new data. The rest of the space the deleted data used stays
  reserved until the collection is compacted; see Freeing disk space." and its "Freeing disk space" link opens
  `https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/#freeing-disk-space`
  in a new tab

#### Scenario: Free space tip of the Total
- **GIVEN** a Total row with a free line
- **WHEN** Data renders
- **THEN** the line ends with an info icon named "About free space"

### Requirement: Free space pending after a deletion
Edition: CE. When the open Data tab sees through the status poll a job it had seen in another state, or another job,
reach completed, it SHALL show "Free space updates in about a minute" in place of the free line of each class that job
completed and, if any, of the Total, until the second read replaces it. The first status after a load or opening only
sets that baseline, so a reload never shows it; leaving the tab drops it.

#### Scenario: Free space pending after an Events deletion
- **GIVEN** the Data tab open while an Events deletion runs
- **WHEN** a status reports it completed
- **THEN** the Events row and the Total show "Free space updates in about a minute" under their size, and the other
  rows keep their free lines

#### Scenario: Free space after the second read
- **GIVEN** the Events row showing "Free space updates in about a minute"
- **WHEN** the second read after the deletion reports 17.2 MB free for `events`
- **THEN** the Events row shows "17.2 MB free for new data" and the notice is gone from it and from the Total

#### Scenario: Free space pending after a Total deletion
- **GIVEN** the Data tab open while a Total deletion runs
- **WHEN** a status reports it completed
- **THEN** the seven class rows and the Total show "Free space updates in about a minute"

#### Scenario: Free space pending dropped on return
- **GIVEN** the Events row showing "Free space updates in about a minute"
- **WHEN** the user switches to Preferences and back to Data before the second read
- **THEN** no row shows the notice and the free lines are those of the read made when Data opened again

#### Scenario: No pending notice after a reload
- **GIVEN** an Events deletion that completed two hours ago
- **WHEN** the user reloads `/settings?tab=data` and the first status reports that completed job
- **THEN** no row shows "Free space updates in about a minute", the free lines are those of the read at opening and no
  second read follows 65 s later

### Requirement: Storage figures re-read
Edition: CE. Data SHALL read the info document each time the Data tab is opened, when a status reports that a
deletion it had seen in another state, or another job, ended, and once more 65 s after that report while the tab stays
open, so that it shows the space MongoDB releases at its next checkpoint; the first status after a load or opening
only sets that baseline, and it SHALL NOT read the info document periodically otherwise.

#### Scenario: Data tab opened
- **GIVEN** a session that read the info document on the Overview
- **WHEN** the user opens `/settings?tab=data`, then switches to Preferences and back to Data
- **THEN** `GET /api/v1/info` is requested once at each opening of Data

#### Scenario: Second read after a deletion
- **GIVEN** the Data tab open while an Events deletion runs
- **WHEN** a status reports it completed, and 65 s pass with the tab open
- **THEN** `GET /api/v1/info` is requested once at the report and once 65 s later, and the free lines show the figures
  of the second read

#### Scenario: No further reads
- **GIVEN** the Data tab open after the second read of a completed deletion
- **WHEN** ten more minutes pass with no deletion
- **THEN** `GET /api/v1/info` is not requested again

### Requirement: Delete buttons
Edition: CE. The Storage table SHALL end each class row, the Total row and the Legacy data row while it reads "Kept
until <date> for rollback" with an icon button, named "Delete <class>", "Delete all analytics data" and "Delete Legacy
data (before 3.10)", in a last column whose header is visually empty; no other row and no other page has one. On a
375 px viewport the page SHALL NOT scroll sideways.

#### Scenario: Buttons of the table
- **GIVEN** a completed migration with `legacyRetainedUntil` tomorrow and the Legacy data row
- **WHEN** Data renders
- **THEN** there are nine delete buttons: "Delete Events", "Delete Stats", "Delete Tracks and subscriptions", "Delete
  Entities", "Delete 5-minute rollups", "Delete Hourly rollups", "Delete Daily rollups", "Delete all analytics data"
  and "Delete Legacy data (before 3.10)"

#### Scenario: Legacy row without a button
- **GIVEN** a Legacy data row that reads "Being removed by the server", "In use by the migration" or "Kept until the
  migration completes"
- **WHEN** Data renders
- **THEN** the Legacy data row has no delete button

#### Scenario: Delete buttons on a phone
- **GIVEN** a 375 px viewport and the Legacy data row kept for rollback
- **WHEN** Data renders
- **THEN** every delete button is inside the viewport and the page does not scroll sideways

### Requirement: Delete buttons unavailable
Edition: CE. While the status reports a running deletion, every delete button SHALL be disabled with the tooltip "A
deletion is running"; while it reports a running migration, every delete button SHALL be disabled with the tooltip
"Available once the migration ends". A row without documents keeps its button enabled.

#### Scenario: Buttons while a deletion runs
- **GIVEN** a status that reports a running Stats deletion
- **WHEN** the user focuses "Delete Events"
- **THEN** the button is disabled and its tooltip reads "A deletion is running"

#### Scenario: Buttons while the migration runs
- **GIVEN** a status that reports a running migration
- **WHEN** Data renders
- **THEN** every delete button is disabled with the tooltip "Available once the migration ends"

#### Scenario: Empty class deletable
- **GIVEN** a Stats row with 0 documents and no deletion or migration running
- **WHEN** Data renders
- **THEN** "Delete Stats" is enabled

### Requirement: Detail and entity deletion dialogs
Edition: CE. The buttons of Events, Stats, Tracks and subscriptions and Entities SHALL open a confirmation dialog with
the title and first sentences of their scenarios, followed by "Data of rooms in progress and data that ended in the
last 5 minutes are kept. This cannot be undone. MongoDB keeps the freed disk space for new data of the same collections
and does not return it to the system." and a "How to free disk space" link to the documentation.

#### Scenario: Events dialog
- **WHEN** the user activates "Delete Events"
- **THEN** a dialog titled "Delete events?" reads "Deletes the stored events of rooms, participant sessions, egresses
  and ingresses that have ended. Their records stay, but their event timelines become empty." followed by the kept
  and disk space sentences, and a "How to free disk space" link that opens
  `https://openvidu.io/latest/docs/self-hosting/production-ready/observability/openvidu-dashboard/#freeing-disk-space`
  in a new tab

#### Scenario: Stats dialog
- **WHEN** the user activates "Delete Stats"
- **THEN** the dialog titled "Delete stats?" starts "Deletes the media statistics (quality, bitrate, packet loss) of
  sessions and tracks that have ended. Their charts become empty; Analytics keeps its figures."

#### Scenario: Tracks dialog
- **WHEN** the user activates "Delete Tracks and subscriptions"
- **THEN** the dialog titled "Delete tracks and subscriptions?" starts "Deletes the published tracks and subscriptions
  that have ended, with the statistics stored per track. Statistics stored per participant are kept."

#### Scenario: Entities dialog
- **WHEN** the user activates "Delete Entities"
- **THEN** the dialog titled "Delete entities?" starts "Deletes rooms, participant sessions, egresses and ingress
  sessions that have ended, with their events, stats, tracks and subscriptions. Ingresses that are not deleted and
  media node records are kept; Analytics keeps its figures."

### Requirement: Rollup deletion dialogs
Edition: CE. The buttons of the three rollup classes SHALL open a confirmation dialog with the title and first
sentences of their scenarios, followed by "This cannot be undone. MongoDB keeps the freed disk space for new data of
the same collections and does not return it to the system." and the "How to free disk space" link.

#### Scenario: 5-minute rollups dialog
- **WHEN** the user activates "Delete 5-minute rollups"
- **THEN** the dialog titled "Delete 5-minute rollups?" starts "Deletes the 5-minute rollups before the previous 5
  minutes. Analytics charts of ranges up to one day become empty for that time."

#### Scenario: Hourly rollups dialog
- **WHEN** the user activates "Delete Hourly rollups"
- **THEN** the dialog titled "Delete hourly rollups?" starts "Deletes the hourly rollups before the previous hour.
  Overview figures of today, list summaries and Analytics of ranges up to 90 days become empty for that time."

#### Scenario: Daily rollups dialog
- **WHEN** the user activates "Delete Daily rollups"
- **THEN** the dialog titled "Delete daily rollups?" starts "Deletes the daily rollups before yesterday. Analytics of
  ranges over 90 days and unique identities become empty for that time."

### Requirement: Total deletion dialog
Edition: CE. "Delete all analytics data" SHALL open a dialog titled "Delete all analytics data?" with the text of its
scenario, the disk space sentence and link, and, only while the Legacy data row reads "Kept until <date> for
rollback", an unchecked checkbox "Also delete the data before 3.10" that, when checked, adds the rollback warning and
makes the deletion include the legacy data.

#### Scenario: Total dialog
- **WHEN** the user activates "Delete all analytics data" on a deployment without legacy data
- **THEN** the dialog reads "Deletes events, stats, tracks and subscriptions, entities and the 5-minute, hourly and
  daily rollups: Analytics loses its history. Data of rooms in progress, data that ended in the last 5 minutes, the
  latest rollups, ingresses that are not deleted and media node records are kept. This cannot be undone." followed by
  the disk space sentence and link, and shows no checkbox

#### Scenario: Total with the legacy checkbox
- **GIVEN** the Legacy data row kept for rollback
- **WHEN** the user opens the Total dialog, checks "Also delete the data before 3.10" and confirms
- **THEN** the checkbox was unchecked at first, checking it added "The data before 3.10 is dropped and its disk space
  freed at once. A rollback to 3.9 will find no analytics data.", and the request has `class: "all"` and
  `includeLegacy: true`

#### Scenario: Total with the checkbox left unchecked
- **GIVEN** the Legacy data row kept for rollback
- **WHEN** the user confirms the Total dialog without checking the box
- **THEN** the request has `class: "all"` and no `includeLegacy: true`

### Requirement: Legacy deletion dialog
Edition: CE. "Delete Legacy data (before 3.10)" SHALL open a dialog titled "Delete data before 3.10?" that reads
"Deletes the analytics data of OpenVidu before 3.10. Its disk space is freed at once. A rollback to 3.9 will find no
analytics data. This cannot be undone.", with no disk space sentence and no link.

#### Scenario: Legacy dialog
- **GIVEN** the Legacy data row kept for rollback
- **WHEN** the user activates "Delete Legacy data (before 3.10)"
- **THEN** the dialog reads that text, has no "How to free disk space" link, and confirming sends `class: "legacy"`

### Requirement: Confirming a deletion
Edition: CE. Delete SHALL send the deletion request and close the dialog, without a toast; the Data tab then shows the
progress of the accepted job. A request that starts nothing SHALL show a dismissible error notice, cleared at the next
request: the message of a `409` response, or "The deletion did not start: <message of the error> Request <id>" for any
other failure. Cancel and Escape close the dialog and send nothing.

#### Scenario: Deletion confirmed
- **GIVEN** the Events dialog open
- **WHEN** the user presses Delete and the server answers `202`
- **THEN** the dialog closes, no toast shows and the progress of the Events deletion shows on the Data tab

#### Scenario: Deletion refused
- **GIVEN** a deletion started from another session that this one has not seen yet
- **WHEN** the user confirms the Stats dialog and the server answers `409`
- **THEN** an error notice reads "A deletion is already running" and the delete buttons become disabled

#### Scenario: Deletion not started
- **GIVEN** the Events dialog open
- **WHEN** the user confirms and the server answers `500` with the request id `caddy-7f3a`, or the request does not
  reach the server
- **THEN** an error notice reads "The deletion did not start: Something went wrong while loading the data. Request
  caddy-7f3a", or "The deletion did not start: The server is unreachable.", and no toast shows

#### Scenario: Deletion cancelled in the dialog
- **GIVEN** the Entities dialog open
- **WHEN** the user presses Cancel, or Escape
- **THEN** the dialog closes and no request is sent

### Requirement: Deletion progress on the Data tab
Edition: CE. While the status reports a running deletion, Data SHALL show above the Storage table a section "Deleting
analytics data" with the line "Deleting <class being deleted>: <n> documents deleted · collection <i> of <total>", n
counting the whole job, preceded by a small indeterminate spinner named "Deletion progress" (role `progressbar`), and
no progress bar, updated with every status response.

#### Scenario: Progress of an Entities deletion
- **GIVEN** a status reporting an Entities deletion with 1,234,000 documents deleted at its second of nine collections
- **WHEN** Data renders
- **THEN** the section "Deleting analytics data" shows an indeterminate spinner named "Deletion progress" beside
  "Deleting Entities: 1,234,000 documents deleted · collection 2 of 9", and no progress bar

#### Scenario: Progress follows the status
- **GIVEN** Data showing a running Total deletion at Events
- **WHEN** the next status reports it at Stats with more documents deleted
- **THEN** the line names Stats and the new count without a reload

### Requirement: Deletion outcome on the Data tab
Edition: CE. When a status reports that the deletion the open Data tab showed running has completed, Data SHALL show
the toast "<Class> deleted: <n> documents" ("All analytics data", "Data before 3.10" for Total and Legacy) and refresh
the table; no toast shows while another Settings tab is selected. An interrupted or failed latest job SHALL show a
warning notice, its texts in the scenarios, until a deletion starts.

#### Scenario: Deletion completed while watching
- **GIVEN** Data showing a running Events deletion
- **WHEN** a status reports it completed with 1,250,312 documents deleted
- **THEN** the toast "Events deleted: 1,250,312 documents" shows and the Storage table shows the figures read after
  the deletion

#### Scenario: No completion toast on Preferences
- **GIVEN** Settings open on Preferences while an Events deletion runs, or on Data and then switched to Preferences
- **WHEN** a status reports the deletion completed
- **THEN** no toast shows

#### Scenario: Interrupted deletion notice
- **GIVEN** a session in UTC and a status whose latest deletion, of Events, was interrupted at 10:20 after deleting
  400,000 documents
- **WHEN** Data renders, now or after a reload
- **THEN** a warning notice reads "Deleting Events was interrupted at 10:20: the dashboard stopped while running it.
  400,000 documents were deleted. Start it again to finish."

#### Scenario: Failed deletion notice
- **GIVEN** a status whose latest deletion, a Total one, failed at 10:20 with "The database user cannot delete data"
  and 0 documents deleted
- **WHEN** Data renders
- **THEN** a warning notice reads "Deleting all analytics data failed at 10:20: The database user cannot delete data.
  0 documents were deleted. Start it again to finish."

### Requirement: Last deletion of a class
Edition: CE. Under the name of a class whose `deletions` entry has `completed`, Data SHALL show a muted line "Deleted
<date and time in the session zone>"; one with `incomplete` SHALL instead show, in the warning colour, "Deletion
interrupted <date and time> (incomplete)" or "Deletion failed <date and time> (incomplete)". The Total and Legacy data
rows show none.

#### Scenario: Class deleted
- **GIVEN** a session in UTC and `deletions.events.completed.finishedAt` `2026-11-19T10:31:12Z`
- **WHEN** Data renders
- **THEN** the Events row shows "Deleted 2026-11-19 10:31" under its name

#### Scenario: Class left incomplete
- **GIVEN** a session in UTC and `deletions.entities.incomplete` `{ state: "interrupted", at: "2026-11-19T10:20:00Z" }`
- **WHEN** Data renders
- **THEN** the Entities row shows "Deletion interrupted 2026-11-19 10:20 (incomplete)" in the warning colour under its
  name, and the Total row shows no deletion line
