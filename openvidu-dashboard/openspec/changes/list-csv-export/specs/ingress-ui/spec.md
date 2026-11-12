# Spec Delta

## ADDED Requirements

### Requirement: Ingress CSV export

Edition: CE. The Ingress table SHALL offer "Export CSV", which downloads `GET /api/v1/ingresses/export.csv` with the
parameters of the list request it shows (range, `status`, `inputType`, `q`, `sort` and `order`), without `cursor` and
`limit`, and saves `ingresses-<from>-<to>.csv`.

#### Scenario: Ingresses by sessions

- **GIVEN** `/ingress?inputType=whip&sort=sessions`
- **WHEN** the user clicks "Export CSV"
- **THEN** the request carries `inputType=whip` and `sort=sessions`, and neither `cursor` nor `limit`
