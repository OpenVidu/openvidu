## MODIFIED Requirements

### Requirement: Overview route and layout
Edition: CE. `/overview` SHALL read only `tz` from the URL, show the page title, the live chip and the refresh
control in its header, and render, in order: live tiles (balanced tile rows), the today card next to the server status
card, the per-node card at full width when there is one, and the recent rooms table at full width.

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

#### Scenario: Per-node card at full width
- **GIVEN** `features` with `per-node-breakdown`, an edition that provides the per-node content and a viewport 1440 px
  wide
- **WHEN** the page renders
- **THEN** the "By node" card follows the today and server status row, spans their width together, and the recent
  rooms card follows it at the same width

### Requirement: Per-node card only with per-node breakdown

Edition: CE. Without `per-node-breakdown` the Overview SHALL render no per-node card, lock or request of its own; with
it, the "By node" card, at full width above the recent rooms table, holds the per-node content the edition provides.

#### Scenario: Nothing per node in CE
- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the page renders
- **THEN** no "By node" card, lock or text about nodes is shown, and the page requests nothing besides `GET /api/v1/overview` and the shell's status poll
