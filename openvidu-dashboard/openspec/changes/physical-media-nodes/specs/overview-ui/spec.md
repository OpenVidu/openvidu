## ADDED Requirements

### Requirement: Per-node card only with per-node breakdown

Edition: CE. Without `per-node-breakdown` the Overview SHALL render no per-node card, lock or request of its own; with
it, the "By node" card next to the recent rooms table holds the per-node content the edition provides.

#### Scenario: Nothing per node in CE
- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the page renders
- **THEN** no "By node" card, lock or text about nodes is shown, and the page requests nothing besides `GET /api/v1/overview` and the shell's status poll

## MODIFIED Requirements

### Requirement: Overview route and layout
Edition: CE. `/overview` SHALL read only `tz` from the URL, show the page title, the live chip and the refresh
control in its header, and render, in order: live tiles (balanced tile rows), the today card next to the server status
card, and the recent rooms table, next to the per-node card when there is one and at full width otherwise.

#### Scenario: Default landing
- **GIVEN** an authenticated user without a stored default zone, in a browser whose zone is Europe/Madrid
- **WHEN** the application opens `/`
- **THEN** it redirects to `/overview?tz=Europe/Madrid`, requests `GET /api/v1/overview?tz=Europe/Madrid` and shows the header with "LIVE", "updated hh:mm:ss" and the interval select

#### Scenario: Phone width
- **WHEN** the viewport is narrower than 600 px
- **THEN** tiles render two per row, the cards stack and the recent rooms table switches to cards

#### Scenario: Recent rooms at full width
- **GIVEN** `features` without `per-node-breakdown` and a viewport 1440 px wide
- **WHEN** the page renders
- **THEN** the recent rooms card spans the width of the today and server status cards together

### Requirement: Server status card
Edition: CE. A "Data pipeline" card SHALL show, from the last server status, the writer line, the migration progress
bar only while it runs, and a "Storage and retention" link to `/settings?tab=about`; it shows a skeleton until the
first status and updates with the status poll. The writer line reads "Server stopped at hh:mm:ss" with a neutral icon
when `writer.stoppedAt` is set, "Last batch: never" with a warning icon when no batch was seen, and otherwise "Last
batch at hh:mm:ss" with a check icon when fresh, as for the live chip, a warning icon if not.

#### Scenario: Healthy card
- **GIVEN** a status with the writer batch 4 s before `generatedAt` at 12:31:05 and migration `completed`
- **WHEN** the card renders
- **THEN** it reads "Data pipeline" and "Last batch at 12:31:05" with the check icon, has no line about nodes, and shows no migration progress

#### Scenario: Server stopped
- **GIVEN** a status with `writer.stoppedAt` and `writer.lastSeenAt` at 12:00:04, 10 minutes before `generatedAt`
- **WHEN** the card renders
- **THEN** the writer line reads "Server stopped at 12:00:04" with the neutral icon, not the warning icon

#### Scenario: Server silent without a stop
- **GIVEN** a status whose writer batch is 10 minutes old and that has no `writer.stoppedAt`
- **WHEN** the card renders
- **THEN** the writer line reads "Last batch at hh:mm:ss" with the warning icon

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
- **THEN** the empty state reads "Waiting for the first events", every tile reads 0, the status card shows "Last batch: never" with the warning icon, and no error banner is shown

## REMOVED Requirements

### Requirement: Per-node cards
**Reason**: CE runs only in single-machine deployments, where a per-node card says nothing; CE stops showing it locked.
**Migration**: "Per-node card only with per-node breakdown" renders the card only for an edition that provides it.
