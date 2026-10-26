# overview-ui Specification

## Purpose

The Overview page: the landing screen that shows what the deployment is doing right now, what it did today, the
newest rooms and whether the analytics writer, schema and migration are healthy.

## Requirements

### Requirement: Overview route and layout
Edition: CE. `/overview` SHALL read only `tz` from the URL, show the page title, the live chip and the refresh
control in its header, and render, in order: live tiles (balanced tile rows), the today card next to the server status
card, and the recent rooms table next to the per-node card.

#### Scenario: Default landing
- **GIVEN** an authenticated user without a stored default zone, in a browser whose zone is Europe/Madrid
- **WHEN** the application opens `/`
- **THEN** it redirects to `/overview?tz=Europe/Madrid`, requests `GET /api/v1/overview?tz=Europe/Madrid` and shows the header with "LIVE", "updated hh:mm:ss" and the interval select

#### Scenario: Phone width
- **WHEN** the viewport is narrower than 600 px
- **THEN** tiles render two per row, the cards stack and the recent rooms table switches to cards

### Requirement: Live KPI tiles

Edition: CE. Six KPI tiles SHALL show Active rooms, Participants, Publishers, Egress, Ingress and Agents from `live`,
keep the last value while refreshing, highlight changes, and link to the list filtered to the live entities:
Publishers to `/participants?status=active&publisher=true` and Agents to `/agents?status=active`; a tile's info icon
is not part of its link.

#### Scenario: Tile values and links
- **GIVEN** CE, and `live` with `rooms: 12`, `participants: 85`, `publishers: 54`, `participantsByKind` `{ EGRESS: 3, AGENT: 2 }`, `egresses: 3` and `ingressSessions: 1`
- **WHEN** the tiles render
- **THEN** they read 12, 85, 54, 3, 1 and 2, no Services tile is shown, and they link to `/rooms?status=active`, `/participants?status=active`, `/participants?status=active&publisher=true`, `/egress?status=active`, `/ingress?status=publishing` and `/agents?status=active`

#### Scenario: Refresh keeps values
- **GIVEN** the tiles showing the last response
- **WHEN** the next poll answers `304`
- **THEN** no value, skeleton or highlight changes and "updated hh:mm:ss" advances

#### Scenario: Publishers tile
- **WHEN** the user follows the Publishers tile
- **THEN** the application opens `/participants?status=active&publisher=true` and the Participants page shows the "Publishers" chip

### Requirement: Live chip from writer freshness
Edition: CE. The header live chip SHALL read "LIVE" while the page auto-refreshes and the last server status found
`generatedAt − writer.lastSeenAt` within the fresh window of `writer.batchIntervalMs` (30 s at the default 10 s),
"paused" while the auto-refresh is off, and "stale" with the clock icon and the tooltip "Last writer batch at hh:mm:ss"
(or "No writer batch received yet") when the last status found the writer older or never seen. Between two status
responses the state does not change.

#### Scenario: Silent writer
- **GIVEN** a status without `writer.batchIntervalMs` whose `writer.lastSeenAt` is 45 s before its `generatedAt`
- **WHEN** the chip renders
- **THEN** it reads "stale" with the tooltip "Last writer batch at hh:mm:ss"

#### Scenario: Long interval
- **GIVEN** the auto-refresh at 5 min and status responses every 30 s whose writer batch is 5 s old
- **WHEN** four minutes pass after the last overview response
- **THEN** the chip still reads "LIVE" and no banner says that no data was received

#### Scenario: Auto-refresh off
- **GIVEN** the auto-refresh set to Off and a fresh writer
- **WHEN** the chip renders
- **THEN** it reads "paused" with the tooltip "Auto-refresh is off · data from hh:mm:ss"

#### Scenario: Slow writer batches
- **GIVEN** a status with `writer.batchIntervalMs: 60000`, whose fresh window is 95 s, and `writer.lastSeenAt` 80 s before its `generatedAt`
- **WHEN** the chip renders
- **THEN** it reads "LIVE"

### Requirement: Today tiles
Edition: CE. A card titled "Today (<zone>, since 00:00)" SHALL show Rooms, Participants, Minutes, Egress and
Ingress from `today`, with a "≈" prefix and tooltip when `approximate` is `true`, and the hint "No rooms today yet"
when every counter is `0`; Participants and Minutes are explained by their info tips, and no tile carries a tooltip
of its own.

#### Scenario: Approximate zone
- **GIVEN** `today` with `tz: "Asia/Kolkata"`, `rooms: 143` and `approximate: true`
- **WHEN** the card renders
- **THEN** the title names "Asia/Kolkata", Rooms reads "≈ 143" and the tooltip of the "≈" explains the hour-aligned sum

#### Scenario: Minutes explained
- **WHEN** the user hovers the Minutes tile outside its info icon
- **THEN** no tooltip shows, and its info icon reads "Minutes of the participant sessions that ended today."

### Requirement: Recent rooms table

Edition: CE. The table SHALL show the 10 `recentRooms` in the column order of the Rooms list: SID, Name, Status,
Started, Duration and Unique identities, with no live chip, plus a "View active rooms" link while there are active rooms
and a "View all rooms" link while there are recent rooms.

#### Scenario: Active row
- **GIVEN** an active room `demo-room` `RM_ab12cd` created at 12:31 with 6 unique identities, 5 of them active, and fresh stats
- **WHEN** the row renders
- **THEN** the cells read, in order, `RM_ab12cd` once (linking to `/rooms/RM_ab12cd` with its copy button), `demo-room` with its copy button, "active" without a live chip, the start time, the live duration and 6, and "View active rooms" links to `/rooms?status=active`

#### Scenario: Stale active row
- **GIVEN** an active room that the overview response marks `stale: true`, with `lastStatsAt` at 12:31:05
- **WHEN** the row renders
- **THEN** its status badge carries the clock cue with the tooltip "No stats since 12:31:05"

#### Scenario: Fresh row while the auto-refresh is off
- **GIVEN** the auto-refresh set to Off and an active room without `stale` in the last overview response
- **WHEN** ten minutes pass without a new overview response
- **THEN** its status badge carries no stale cue

#### Scenario: Closed row
- **GIVEN** a closed room with `participants.unique: 9` and 14 sessions
- **WHEN** the row renders
- **THEN** the Unique identities cell reads 9 and the column header reads "Unique identities"

#### Scenario: Narrow card
- **GIVEN** the Recent rooms card narrower than the table's columns on a wide viewport
- **WHEN** the table renders
- **THEN** every column shows, Started with the time-zone hint in its header, and the table scrolls sideways inside
  the card

#### Scenario: No rooms to list

- **GIVEN** an overview with no active room and no recent room
- **WHEN** the card renders
- **THEN** neither "View active rooms" nor "View all rooms" is shown

#### Scenario: Columns

- **WHEN** the table renders a recent room
- **THEN** SID links to `/rooms/{sid}` with a copy button, Name has a copy button, Status shows the badge with the
  estimated outline for `closedBy: "reconciler"` and the stale cue of `stale: true`, Started carries the time-zone
  header hint, Duration is live while active and Unique identities shows `participants.unique` in every state

### Requirement: Stale entities hint
Edition: CE. When two consecutive overview responses, a `304` included, have
`live.stale.rooms + live.stale.participants > 0`, the page SHALL show the shared warning notice under the tiles naming
both counts and stating that they have had no stats for over `live.stale.olderThanMs` and may be closed by the server
reconciler, with a link to `/rooms?status=active`; the notice SHALL disappear with the first response whose counts add
up to `0`.

#### Scenario: Hint shown
- **GIVEN** two consecutive overview responses with `live.stale` `{ rooms: 1, participants: 4, olderThanMs: 90000 }`
- **WHEN** the page renders
- **THEN** the notice reads "1 active room and 4 participants have had no stats for over 90 s and may be stale" with the link "View active rooms"

#### Scenario: One stale response
- **GIVEN** a previous response without stale entities
- **WHEN** a response reports `live.stale` `{ rooms: 1, participants: 0 }`
- **THEN** no notice is shown until the next response reports stale entities again

#### Scenario: Hint hidden again
- **GIVEN** the notice shown
- **WHEN** a response reports `live.stale` `{ rooms: 0, participants: 0 }`
- **THEN** the notice disappears

#### Scenario: Slow writer window
- **GIVEN** two consecutive responses with `live.stale` `{ rooms: 2, participants: 0, olderThanMs: 135000 }`
- **WHEN** the page renders
- **THEN** the notice reads "2 active rooms and 0 participants have had no stats for over 135 s and may be stale"

### Requirement: Server status card
Edition: CE. A "Data pipeline" card SHALL show, from the last server status, the writer line ("Last batch at
hh:mm:ss" with a check icon when the batch is fresh, as for the live chip, a warning icon otherwise, "Last batch:
never" when no node was seen), "N of M nodes reporting" (warning icon when N < M), the migration progress bar only
while it runs, and a "Storage and retention" link to `/settings?tab=about`; it shows a skeleton until the first status
and updates with the status poll.

#### Scenario: Healthy card
- **GIVEN** a status with the writer batch 4 s before `generatedAt` at 12:31:05, `nodes: 2`, `aliveNodes: 2` and migration `completed`
- **WHEN** the card renders
- **THEN** it reads "Data pipeline", "Last batch at 12:31:05" with the check icon and "2 of 2 nodes reporting", and shows neither the migration, a version, the schema nor the retention

#### Scenario: Migration running
- **GIVEN** a status with `migration` `{ state: "running", progress: { processed: 400000, total: 1200000 } }`
- **WHEN** the card renders
- **THEN** a determinate progress bar at 33 % with "400,000 / 1,200,000" is shown and updates with every status response, every 10 s

#### Scenario: Auto-refresh off
- **GIVEN** the auto-refresh set to Off
- **WHEN** a new status reports a newer writer batch
- **THEN** the writer line shows the new batch time while the tiles keep the last overview response

#### Scenario: Before the first status
- **GIVEN** the page opened and no server status received yet
- **WHEN** the card renders
- **THEN** it shows a skeleton of its lines and no "Loading" text

#### Scenario: Slow writer batches
- **GIVEN** a status with `writer.batchIntervalMs: 60000` and the writer batch 80 s before `generatedAt`
- **WHEN** the card renders
- **THEN** the writer line shows the check icon

### Requirement: Fresh deployment empty state
Edition: CE. When the server status reports `schema.status` `uninitialized`, or `recentRooms` is empty with every live
and today counter at `0`, the page SHALL replace the recent rooms table with the empty state "Waiting for the first
events" and a hint that the server writes analytics once a room is created, keeping tiles at 0 and the status card
visible.

#### Scenario: Empty database
- **GIVEN** a fresh deployment with no room ever created
- **WHEN** the page renders
- **THEN** the empty state reads "Waiting for the first events", every tile reads 0, the status card shows "Last batch: never" and no error banner is shown

### Requirement: Overview refresh policy
Edition: CE. The page SHALL follow the shared auto-refresh policy with the live-view default of 10 s, send
`If-None-Match`, re-render only on `200`, keep the last values and show the error banner with retry on failure,
and expose the latest `live` counters to other pages through a shared service.

#### Scenario: Failed poll
- **GIVEN** the tiles showing the last response
- **WHEN** a poll fails with `500`
- **THEN** the values stay, the error banner shows the message, request id and retry, and the next tick follows the back-off

### Requirement: Per-node cards

Edition: CE. Without `per-node-breakdown` the "By node" card next to the recent rooms table SHALL render the lock
for `per-node-breakdown` without any request of its own.

#### Scenario: Locked in CE
- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the page renders
- **THEN** the card shows the lock with "Per-node breakdown is available in OpenVidu PRO" and its link, and the page requests nothing besides `GET /api/v1/overview` and the shell's status poll
