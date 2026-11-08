## MODIFIED Requirements

### Requirement: Ingress summary tiles

Edition: CE. The Ingress page SHALL show four KPI tiles from the summary endpoint above the filters: Active now
(ingresses publishing now), Ingress in range (with the input type breakdown as hint), Sessions in range and Duration in
range; approximate values carry a tooltip saying the numbers are hour-aligned; tiles keep their value while the list
reloads or fails.

#### Scenario: Tiles of a range

- **GIVEN** the summary answers `{ publishingNow: 2, ingressesInRange: 5, byInputType: { rtmp: 3, whip: 2, url: 0 },
  sessionsInRange: 12, totalDurationMs: 21600000, approximate: true }`
- **WHEN** the tiles render
- **THEN** they read "Active now 2", "Ingress in range 5" with hint "RTMP 3 · WHIP 2 · URL 0", "Sessions in range 12"
  and "Duration in range 6 h 00 m", the last two with the approximate tooltip

#### Scenario: Failed list keeps the tiles

- **GIVEN** tiles already rendered
- **WHEN** the list request fails
- **THEN** the tiles keep their values and the error banner appears over the table only
