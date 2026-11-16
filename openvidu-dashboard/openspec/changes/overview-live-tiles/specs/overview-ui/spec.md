# Spec Delta

## MODIFIED Requirements

### Requirement: Live KPI tiles

Edition: CE. Six KPI tiles SHALL show Active rooms, Active participants, Active publishers, Active egress, Active
ingress and Active agents from `live`, keep the last value while refreshing, highlight changes, and link to the list
filtered to the live entities: Active publishers to `/participants?status=active&publisher=true`, Active egress to
`/egress?status=starting,active,ending` (the Active option of the Egress status filter) and Active agents to
`/agents?status=active`; a tile's info icon is not part of its link.

#### Scenario: Tile values and links
- **GIVEN** CE, and `live` with `rooms: 12`, `participants: 85`, `publishers: 54`, `participantsByKind` `{ EGRESS: 3, AGENT: 2 }`, `egresses: 3` and `ingressSessions: 1`
- **WHEN** the tiles render
- **THEN** they are labelled "Active rooms", "Active participants", "Active publishers", "Active egress", "Active ingress" and "Active agents", they read 12, 85, 54, 3, 1 and 2, and they link to `/rooms?status=active`, `/participants?status=active`, `/participants?status=active&publisher=true`, `/egress?status=starting,active,ending`, `/ingress?status=publishing` and `/agents?status=active`

#### Scenario: Refresh keeps values
- **GIVEN** the tiles showing the last response
- **WHEN** the next poll answers `304`
- **THEN** no value, skeleton or highlight changes and "updated hh:mm:ss" advances

#### Scenario: Publishers tile
- **WHEN** the user follows the Active publishers tile
- **THEN** the application opens `/participants?status=active&publisher=true` and the Participants page shows the "Publishers" chip

#### Scenario: Active egress tile
- **GIVEN** egresses started in the global range with the statuses `starting`, `active`, `ending` and `complete`, one of each
- **WHEN** the user follows the Active egress tile
- **THEN** the application opens `/egress?status=starting,active,ending`, the status filter of the Egress page shows Active, the list request carries `status=starting,active,ending` and the table lists the three egresses that are not complete
