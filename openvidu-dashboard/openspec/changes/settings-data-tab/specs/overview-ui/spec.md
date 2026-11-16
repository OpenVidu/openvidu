# Spec Delta

## MODIFIED Requirements

### Requirement: Server status card
Edition: CE. A "Data pipeline" card SHALL show, from the last server status (a skeleton until the first, updated on
each poll), the writer line, the migration progress bar only while it runs, and a "Storage and retention" link to
`/settings?tab=data`. The writer line reads "Server stopped at hh:mm:ss" (neutral icon) when `writer.stoppedAt` is
set, "Last batch: never" (warning icon) without batches, and otherwise "Last batch at hh:mm:ss" with a check icon when
fresh, a warning icon if not.

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

#### Scenario: Storage and retention link
- **GIVEN** a server status
- **WHEN** the card renders
- **THEN** its "Storage and retention" link points to `/settings?tab=data`
