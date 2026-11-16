# Spec Delta

## ADDED Requirements

### Requirement: Workbook export without media statistics

Edition: CE. With `mediaStats: "none"` in the summary, "Export XLSX" of the Data transferred section SHALL be disabled
while the section keeps its tiles and chart unavailable. With `"partial"` or without `mediaStats`, the section SHALL
keep its "Export XLSX" as any other card: enabled with data, disabled while it reads "No data in this range".

#### Scenario: Export without media statistics

- **GIVEN** a summary with `mediaStats: "none"`, and `bytesUp` and `bytesDown` series whose every bucket is 0
- **WHEN** the Analytics page renders
- **THEN** the Data transferred section shows its tiles and chart unavailable, not "No data in this range", its
  "Export XLSX" is disabled, and "Export XLSX" of the Rooms section stays enabled

#### Scenario: Export with partial media statistics

- **GIVEN** a summary with `mediaStats: "partial"`, and `bytesUp` and `bytesDown` series with bytes
- **WHEN** the user clicks "Export XLSX" of the Data transferred section
- **THEN** the browser saves `analytics-bandwidth-<from>-<to>.xlsx`, whose series sheet holds those bytes in the columns
  "Data up / down · Up (bytes)" and "Data up / down · Down (bytes)"

#### Scenario: Partial media statistics without bytes

- **GIVEN** a summary with `mediaStats: "partial"`, and `bytesUp` and `bytesDown` series whose every bucket is 0
- **WHEN** the Analytics page renders
- **THEN** the Data transferred section reads "No data in this range" under the range `partial` warning of its heading,
  and its "Export XLSX" is disabled
