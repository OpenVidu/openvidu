# Spec Delta

## ADDED Requirements

### Requirement: Participants CSV export

Edition: CE. The Participants table SHALL offer "Export CSV", which downloads `GET /api/v1/participants/export.csv`
with the parameters of the list request it shows (range, `q`, `kind`, `status`, `room`, `publisher`, `sort` and
`order`), without `cursor` and `limit`, and saves `participants-<from>-<to>.csv`.

#### Scenario: Default kind

- **GIVEN** `/participants?status=left&room=RM_abc` without `kind`
- **WHEN** the user clicks "Export CSV"
- **THEN** the request carries `kind=STANDARD`, `status=left` and `room=RM_abc`, as the list request does
