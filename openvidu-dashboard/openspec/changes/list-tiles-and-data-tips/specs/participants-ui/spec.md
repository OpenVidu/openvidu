## MODIFIED Requirements

### Requirement: Participants summary tiles
Edition: CE. The Participants page SHALL show three KPI tiles from the participants summary above the filters, in this
order: Active now (STANDARD), Services active now (active sessions of the other kinds, with the visible kinds that have
active sessions as hint, explained by its info tip and carrying no tooltip of its own) and Sessions in range
(STANDARD, "≈" and the rollup tooltip when approximate); the tiles keep their last value while refreshing.

#### Scenario: Tiles after load
- **GIVEN** the summary answers `active { participants: 31, services: 5, byKind { EGRESS: 3, AGENT: 2 } }` and `sessions { participants: 900 }` with `approximate: false`
- **WHEN** the page renders
- **THEN** the tiles read "Active now 31", "Services active now 5" with the hint "Egress 3 · Agent 2", and "Sessions in
  range 900"

#### Scenario: Approximate sessions
- **GIVEN** a 30-day range and `approximate: true`
- **WHEN** the tiles render
- **THEN** Sessions in range shows a "≈" prefix whose tooltip says the count is an hour-aligned rollup sum

#### Scenario: Services explained
- **WHEN** the user hovers the Services active now tile outside its info icon, and then opens the info icon
- **THEN** the first shows nothing and the info tip reads "Egress, ingress, agent and other non-user sessions. They join rooms as participants but are not counted as participants."
