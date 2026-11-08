## MODIFIED Requirements

### Requirement: Live agents counter tile
Edition: CE. Above the filters, the page SHALL show first a KPI tile "Active now" with the number of active agent
sessions across all rooms, read from the overview live counters and refreshed at the auto-refresh interval, keeping the
last value while refreshing.

#### Scenario: Counter refresh
- **GIVEN** the Active now tile shows 3
- **WHEN** a refresh reports 4
- **THEN** the tile reads 4 with the change highlight and the table is reloaded with the current URL state

### Requirement: Agent sessions tile
Edition: CE. After "Active now", the page SHALL show a KPI tile "Agent sessions in range" with the agent sessions
joined in the global range, read from the participants summary (`sessions.byKind.AGENT`, "≈" and the rollup tooltip
when approximate) and refreshed with the page.

#### Scenario: Sessions in range
- **GIVEN** the participants summary answers `sessions.byKind.AGENT: 12` with `approximate: false`
- **WHEN** the page renders
- **THEN** the tiles read "Active now" and then "Agent sessions in range 12"

#### Scenario: Approximate sessions
- **GIVEN** a 30-day range and `approximate: true`
- **WHEN** the tile renders
- **THEN** it shows "≈" before the value and the rollup tooltip on that mark
