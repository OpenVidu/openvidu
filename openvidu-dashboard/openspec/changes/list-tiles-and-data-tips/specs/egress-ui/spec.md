## MODIFIED Requirements

### Requirement: Egress summary tiles

Edition: CE. The Egress page SHALL show four KPI tiles from the summary endpoint above the filters: Active now,
Started in range (hint: count by type, in the fixed order room composite, web, participant, track composite, track,
with type labels and without zero counts), Failed in range (hint: aborted and limit reached) and Duration in range
(with an info tip); approximate values carry a tooltip saying the range exceeds the exact-count limit, and the tiles
keep their last value while refreshing.

#### Scenario: Tiles after load

- **GIVEN** the summary answers `{ active: 3, startedInRange: 120, byType: { track: 20, room_composite: 100 },
  byEndStatus: { complete: 110, failed: 7, aborted: 2 }, totalDurationMs: 36000000, approximate: false }`
- **WHEN** the page renders
- **THEN** the tiles read "Active now 3", "Started in range 120" with hint "Room composite 100 · Track 20", "Failed in
  range 7" with hint "Aborted 2", and "Duration in range 10 h 00 m"

#### Scenario: Total duration explained

- **WHEN** the user hovers or focuses the info icon of the Duration in range tile
- **THEN** it reads "Time from each egress request to its end, failed egress included."

#### Scenario: Stable hint order

- **GIVEN** a refresh that answers `byType` with its keys in another order
- **WHEN** the tile updates
- **THEN** the hint keeps the order "Room composite · Track"
