# Spec Delta

## ADDED Requirements

### Requirement: Table export

Edition: CE. A data table SHALL be able to offer an "Export CSV" button after the other controls of its toolbar, or in
the header of its section card, as a table and as cards. It is disabled while the table has no rows and while its
download runs, saves the file under the server file name, and toasts the error and request id of a failed export and
the cap notice of a cut one.

#### Scenario: Toolbar of a list

- **GIVEN** the Rooms table with rows at 1440 px
- **WHEN** it renders
- **THEN** "Export CSV" is at the end of the table toolbar, after the Columns button

#### Scenario: Cards on a phone

- **GIVEN** a 375 px viewport, where the Rooms table renders as cards
- **WHEN** it renders
- **THEN** "Export CSV" stays in the toolbar, after the sort controls

#### Scenario: Table in a section card

- **GIVEN** a table with an export inside a section card
- **WHEN** it renders
- **THEN** "Export CSV" is in the section header, after the Columns button

#### Scenario: Empty table

- **GIVEN** a list with no rows in the range
- **WHEN** it renders
- **THEN** its "Export CSV" is disabled

#### Scenario: Cut export

- **GIVEN** an export answered with `X-Export-Truncated: true`
- **WHEN** the download ends
- **THEN** the file is saved and a toast reads "Exported the first 10,000 rows. Narrow the range or the filters to
  export the rest."

#### Scenario: Failed export

- **WHEN** the export request fails with request id `abc`
- **THEN** a toast reads "Export failed: <message> Request abc" and "Export CSV" is enabled again
