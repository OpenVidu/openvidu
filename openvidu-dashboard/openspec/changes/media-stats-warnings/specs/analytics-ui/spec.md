## ADDED Requirements

### Requirement: Media statistics coverage warnings

Edition: CE. With `mediaStats: "none"` in the summary, the Data up / down tile SHALL be unavailable and carry the
range `none` warning, and the Data transferred section SHALL keep its tiles and chart, unavailable, with that warning
on its heading. With `"partial"`, the tile and the section heading SHALL carry the range `partial` warning and keep
their values. Without `mediaStats`, neither carries a warning. No notice replaces the section's content.

#### Scenario: No server reports media statistics

- **GIVEN** a summary with `mediaStats: "none"`, `bytesUp: 0` and `bytesDown: 0`
- **WHEN** the page renders
- **THEN** the Data up / down tile reads an unavailable "—" with the warning after its label, and the Data
  transferred section shows the warning after its heading, the Total up and Total down tiles unavailable and the "Data
  up / down" chart unavailable over the whole range

#### Scenario: Some servers report media statistics

- **GIVEN** a summary with `mediaStats: "partial"`, `bytesUp: 1200000000` and `bytesDown: 3400000000`
- **WHEN** the page renders and the user opens the warning of the Data transferred heading
- **THEN** the tile reads "↑ 1.2 GB" over "↓ 3.4 GB" with the warning after its label, the chart renders its data at
  full strength, and the tooltip reads "This data comes only from rooms on servers using Pion as RTC engine.
  mediasoup does not generate media statistics yet. They will be available soon."

#### Scenario: Every server reports media statistics

- **GIVEN** a summary without `mediaStats`
- **WHEN** the page renders
- **THEN** neither the tile nor the Data transferred section carries a warning or the unavailable state

## REMOVED Requirements

### Requirement: Media statistics coverage notes

**Reason**: The notices that replaced the section's chart and tiles, and the notes under the tile and heading, become
warnings with the unavailable state.

**Migration**: See "Media statistics coverage warnings".
