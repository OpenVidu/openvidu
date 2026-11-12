# Spec Delta

## ADDED Requirements

### Requirement: Egress CSV export

Edition: CE. The Egress table SHALL offer "Export CSV", which downloads `GET /api/v1/egresses/export.csv` with the
parameters of the list request it shows (range, `status`, `type`, `room`, `q`, `sort` and `order`), without `cursor`
and `limit`, and saves `egresses-<from>-<to>.csv`.

#### Scenario: Active egresses of one type

- **GIVEN** `/egress?status=starting,active,ending&type=room_composite`, the Active option of the status filter
- **WHEN** the user clicks "Export CSV"
- **THEN** the request carries `status=starting,active,ending` and `type=room_composite`, as the list request does
