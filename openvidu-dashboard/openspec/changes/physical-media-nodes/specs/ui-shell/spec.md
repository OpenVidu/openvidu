## MODIFIED Requirements

### Requirement: URL query parameters as the single source of truth

Edition: CE. List and chart state SHALL live only in the query parameters `from`, `to`, `tz`, `granularity`, `scope`,
`status`, `kind`, `publisher`, `features`, `node`, `room`, `type`, `inputType`, `q`, `sort`, `order`, `limit`,
`cursor` and `page`, read by components as signals with no parallel state. Invalid values fall back to defaults
silently. Every change is a new history entry merged into the current parameters; changing a filter, sort, range or
`limit` removes `cursor` and `page`.

#### Scenario: Link reproduces a view
- **GIVEN** `/rooms?from=now-7d&to=now&tz=UTC&status=active&sort=uniqueIdentities&order=desc&limit=50`
- **WHEN** the URL is opened in a new browser
- **THEN** the page shows the same range, filter, sort and page size

#### Scenario: Invalid value falls back
- **GIVEN** `?limit=7&order=sideways`
- **WHEN** the page parses the parameters
- **THEN** it uses the stored page size and `desc`, without an error page

#### Scenario: Filter change drops the cursor
- **GIVEN** a list on its third page
- **WHEN** the status filter changes
- **THEN** the new URL has the new status, no `cursor` and no `page`, and Back returns to the third page

