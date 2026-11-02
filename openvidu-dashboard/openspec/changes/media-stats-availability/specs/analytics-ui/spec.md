## ADDED Requirements

### Requirement: Media statistics coverage notes

Edition: CE. With `mediaStats: "none"` in the summary, the Data up / down tile SHALL read "—" with the hint "Not
reported by the servers of this range" and the Bandwidth section SHALL show the notice "The servers of this range do
not report media statistics" instead of its chart and tiles. With `"partial"`, the tile and the section SHALL keep their
values and add the note "Only from the servers that report media statistics".

#### Scenario: No server reports media statistics

- **GIVEN** a summary with `mediaStats: "none"`
- **WHEN** the page renders
- **THEN** the Data up / down tile reads "—" with its hint, and the Bandwidth section shows the notice and no chart

#### Scenario: Some servers report media statistics

- **GIVEN** a summary with `mediaStats: "partial"`, `bytesUp: 1200000000` and `bytesDown: 3400000000`
- **WHEN** the page renders
- **THEN** the tile reads "↑ 1.2 GB" over "↓ 3.4 GB" with the hint "Only from the servers that report media
  statistics", and the Bandwidth chart renders with the same note under its heading

#### Scenario: Every server reports media statistics

- **GIVEN** a summary without `mediaStats`
- **WHEN** the page renders
- **THEN** the tile and the Bandwidth section render as before, without the note
