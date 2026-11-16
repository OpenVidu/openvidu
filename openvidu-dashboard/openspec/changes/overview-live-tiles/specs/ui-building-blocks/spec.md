# Spec Delta

## ADDED Requirements

### Requirement: KPI tile values level in a row
Edition: CE. In a row of KPI tiles, the labels SHALL start at the top of the tiles and the values SHALL end at the same
height in every tile that shares a line of the row, whatever number of lines each label or value takes and whether or
not a tile has a delta or a hint, which stay under its value. With nothing under the values, they rest at the bottom of
the tiles. A label that does not fit its tile SHALL wrap.

#### Scenario: Label on two lines
- **GIVEN** the Overview in a viewport 1280 px wide, where the six live tiles share one line and "Active participants" takes two lines while "Active rooms" takes one
- **WHEN** the live tiles render
- **THEN** the six labels start at the same height, and the six values end at the same height, at the bottom of their tiles

#### Scenario: Hint under one value
- **GIVEN** the Egress page, where "Started in range" has the hint "Room composite 3 · Web 1 · Track 1" and "Active now" has none
- **WHEN** the summary tiles render
- **THEN** the four values end at the same height and the hint shows under the value of "Started in range"

#### Scenario: Value on two lines
- **GIVEN** the Analytics summary, where "Data up / down" reads its value on two lines and "Rooms created" on one, both on the same line of the row
- **WHEN** the summary tiles render
- **THEN** the value of "Rooms created" ends at the height where the second line of "Data up / down" ends
