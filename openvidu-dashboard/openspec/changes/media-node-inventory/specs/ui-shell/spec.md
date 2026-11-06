## ADDED Requirements

### Requirement: Navigation entries hidden without their feature
Edition: CE. A route config MAY mark its navigation entry as hidden without its feature. Without that feature in
`GET /api/v1/info`, the sidenav SHALL leave the entry out, and the route and its children SHALL behave as an unknown
path, with no lock and no request; with the feature, the entry is listed at its order. This is the only exception to
"Locked PRO features in CE", and no CE route uses it.

#### Scenario: Entry hidden without its feature
- **GIVEN** an edition route `/extra` labelled "Extra" with the order 80, the feature `per-node-breakdown` and the
  hidden mark, and `GET /api/v1/info` without that feature
- **WHEN** the sidenav renders and the user opens `/extra/mn-a`
- **THEN** the sidenav lists no Extra entry and no lock, and the application redirects as for an unknown path, to the
  overview when signed in, without any request of that page

#### Scenario: Entry shown with its feature
- **GIVEN** the same route and `GET /api/v1/info` with `per-node-breakdown`
- **WHEN** the sidenav renders
- **THEN** the entry is listed after Ingress and before Settings, with its icon and no lock

#### Scenario: CE routes
- **GIVEN** the CE shell
- **WHEN** its route configs are read
- **THEN** none of them carries the hidden mark
