# Spec Delta

## ADDED Requirements

### Requirement: Agents CSV export

Edition: CE. The Agents table SHALL offer "Export CSV", which downloads `GET /api/v1/agents/export.csv` with the
parameters of the list request it shows (range, `q`, `status`, `room`, `sort` and `order`), without `cursor` and
`limit`, and saves `agents-<from>-<to>.csv`.

#### Scenario: Active agents

- **GIVEN** `/agents?status=active&sort=duration`
- **WHEN** the user clicks "Export CSV"
- **THEN** the request carries `status=active` and `sort=duration`, and the browser saves `agents-<from>-<to>.csv`
