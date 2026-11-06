## ADDED Requirements

### Requirement: Media statistics warning
Edition: CE. A media statistics warning SHALL be a warning icon button, in the warning colour, placed after a label or
heading and after its info tip when it has one, named by its text for assistive technology and showing that text as a
tooltip with the info tip interactions: hover, keyboard focus or tap to show; Escape, blur or a second tap to hide.
KPI tiles, chart headings, Analytics card headings and data table column headers, in table and card layouts, take one
from their definition.

#### Scenario: Hover
- **GIVEN** a KPI tile "Data up / down" with a media statistics warning
- **WHEN** the pointer rests on the warning icon
- **THEN** the tooltip shows the warning text, and resting on the label or the value shows nothing

#### Scenario: Keyboard
- **GIVEN** a chart heading with a media statistics warning
- **WHEN** the user tabs to the icon and then presses Escape
- **THEN** the icon is announced with the warning text, the tooltip shows on focus and hides on Escape

#### Scenario: Next to an info tip
- **GIVEN** the KPI tile "Quality" with an info tip and a media statistics warning
- **WHEN** it renders
- **THEN** the label is followed by the info icon and then the warning icon

#### Scenario: Column header in card layout
- **GIVEN** an XSmall viewport and a Data up / down column with a media statistics warning
- **WHEN** the rows render as cards
- **THEN** that column's label in each card carries the warning icon

### Requirement: Unavailable tile and chart
Edition: CE. A KPI tile marked unavailable SHALL read "—", dimmed to 38 % opacity without colour and announced as "Not
available", keeping its label, info tip and warning at full strength. A time-series chart marked unavailable SHALL
keep its heading, warning and x-axis over the range and render its plot dimmed the same way over a hatched
background, with no legend, tooltip or "Show table". Neither is highlighted on refresh.

#### Scenario: Unavailable tile
- **GIVEN** a KPI tile "Quality" marked unavailable with a media statistics warning
- **WHEN** it renders
- **THEN** its value reads a dimmed "—", a screen reader reads "Quality, Not available", and the label and the
  warning icon keep their colours

#### Scenario: Unavailable chart
- **GIVEN** a "Bitrate up / down" chart from 10:01:25 to 10:06:55 marked unavailable
- **WHEN** it renders
- **THEN** its x-axis reads 10:02 to 10:06, the plot is dimmed over hatching, and it shows no legend, no tooltip on
  hover and no "Show table" action

#### Scenario: Unavailable cell
- **GIVEN** a data table cell rendered as unavailable
- **WHEN** it renders
- **THEN** it reads a dimmed "—" announced as "Not available"

### Requirement: Media statistics texts
Edition: CE. The UI library SHALL export four media statistics warning texts, shown by every edition: one for an
entity (room, session or track), one for a range with `none`, one for a range with `partial` and one for a column
header.

#### Scenario: Texts
- **WHEN** the exported texts are read
- **THEN** they are:
  - entity: "This data is not available when using mediasoup as RTC engine. It will be available soon."
  - range `none`: "The servers of this range use mediasoup as RTC engine, which does not generate media statistics
    yet. This data will be available soon."
  - range `partial`: "This data comes only from rooms on servers using Pion as RTC engine. mediasoup does not generate
    media statistics yet. They will be available soon."
  - column: "Rooms on servers using mediasoup as RTC engine show no value here yet. This data will be available soon."

#### Scenario: Same texts in every edition
- **GIVEN** a room with `mediaStats: false` in the CE Rooms list and the same room in a PRO room page
- **WHEN** the user opens the warnings of both
- **THEN** the Rooms list column reads the column text and the room page tiles read the entity text, from the same
  exported texts
