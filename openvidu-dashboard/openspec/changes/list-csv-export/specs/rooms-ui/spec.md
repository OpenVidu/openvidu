# Spec Delta

## ADDED Requirements

### Requirement: Rooms CSV export

Edition: CE. The Rooms table SHALL offer "Export CSV", which downloads `GET /api/v1/rooms/export.csv` with the
parameters of the list request it shows (range, `status`, `q`, `features`, `node` as `mediaNode`, `sort` and `order`),
without `cursor` and `limit`, and saves `rooms-<from>-<to>.csv`.

#### Scenario: Export of the filtered list

- **GIVEN** `/rooms?status=closed&features=egress&sort=duration&order=asc&from=now-24h&to=now&tz=Europe/Madrid&limit=50`
  on its second page
- **WHEN** the user clicks "Export CSV"
- **THEN** the request carries `status=closed`, `features=egress`, `sort=duration`, `order=asc`, the resolved `from`
  and `to` and `tz=Europe/Madrid`, and neither `cursor` nor `limit`
