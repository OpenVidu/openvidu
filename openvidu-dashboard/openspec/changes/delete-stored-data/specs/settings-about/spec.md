# Spec Delta

## MODIFIED Requirements

### Requirement: Size estimate at full retention
Edition: CE. The tip of a class that is still filling SHALL end with " · ≈ <size> at full retention (estimate)", its
size in use (its size less the space free for new data) times its retention over its data span, when the span reaches
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

## ADDED Requirements

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
Edition: CE. When a status reports that the deletion Data showed running has completed, Data SHALL show the toast
"<Class> deleted: <n> documents" ("All analytics data", "Data before 3.10" for Total and Legacy) and refresh the table.
An interrupted or failed latest job SHALL show a warning notice, its texts in the scenarios, until a deletion starts.

#### Scenario: Deletion completed while watching
- **GIVEN** Data showing a running Events deletion
- **WHEN** a status reports it completed with 1,250,312 documents deleted
- **THEN** the toast "Events deleted: 1,250,312 documents" shows and the Storage table shows the figures read after
  the deletion

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
