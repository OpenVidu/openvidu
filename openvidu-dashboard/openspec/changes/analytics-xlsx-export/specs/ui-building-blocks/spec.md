# Spec Delta

## MODIFIED Requirements

### Requirement: Section card

Edition: CE. The section card SHALL show a title, a count, an actions slot and collapse/expand, remembering the
collapsed state in memory per route for the session. The actions slot, in the section header, holds the section's
filters and the Columns button of its table.

#### Scenario: Collapsed card survives a reload

- **GIVEN** the Rooms card of the Analytics page collapsed
- **WHEN** the page reloads its data after a range change
- **THEN** the card stays collapsed

#### Scenario: Card actions in the header

- **GIVEN** the Rooms card of the Analytics page
- **WHEN** it renders
- **THEN** its Export XLSX button is in the section header, after the title
