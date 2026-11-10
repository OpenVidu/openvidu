## MODIFIED Requirements

### Requirement: Chart palette and quality bands

Edition: CE. Series colours SHALL follow the entity, never the rank, from eight palette slots with light and dark values
that are pairwise distinguishable; known values (the entities rooms, participants, egress and ingress, participant
kinds, egress statuses and types, ingress input types, directions) have fixed distinct slots, each entity's main kind
shares its slot, and two other entities of one chart never share a slot.

#### Scenario: Palette values
- **WHEN** series and quality bands render in light and dark themes
- **THEN** the series take the colours of the slot tokens `--ovd-chart-1` to `--ovd-chart-8` for the applied theme,
  each slot with a light and a dark value, and each quality band is drawn in its own colour tinted at 12 % opacity

#### Scenario: Same entity, same colour
- **GIVEN** the Participant kind breakdown of two ranges, with `EGRESS` first in one and second in the other
- **WHEN** both render
- **THEN** `EGRESS` has the same colour in both

#### Scenario: Egress statuses
- **GIVEN** egresses ended as complete, aborted, limit reached and failed in one chart
- **WHEN** the chart renders
- **THEN** the four segments have four distinguishable colours and failed is red

#### Scenario: Entity slots
- **WHEN** a series or a slice of rooms, participants, egress or ingress renders
- **THEN** rooms take `--ovd-chart-1` (teal), participants and the `STANDARD` kind `--ovd-chart-7` (violet), egress,
  the `EGRESS` kind and the `room_composite` type `--ovd-chart-2` (orange), and ingress, the `INGRESS` kind and the
  `rtmp` input type `--ovd-chart-6` (blue), and success rates `--ovd-chart-3` (green)

#### Scenario: Dense stacked bars
- **GIVEN** a stacked bar chart of 168 hourly buckets, such as "Egress ended by status" over 7 days at `1h`
- **WHEN** it renders in the light or the dark theme
- **THEN** every segment shows the colour of its slot, with no border in the background colour covering the narrow
  bars

#### Scenario: Kinds of one chart stay distinct
- **WHEN** the participant kinds, the egress types or the ingress input types render in one chart
- **THEN** every value has its own slot: `AGENT` is neither violet, orange nor blue, and no egress type or input type
  shares the slot of another in its chart

### Requirement: Info tips
Edition: CE. An info tip SHALL be an info icon button right after a label or heading, named "About <label>" for
assistive technology, that shows its text as a tooltip on hover, keyboard focus or tap and hides it on Escape, blur or a
second tap. KPI tiles, section and Analytics cards, charts, data table column headers (table and card layouts) and
entity facts take one from their definition; the label then carries no hover text of its own.

#### Scenario: Hover
- **GIVEN** a KPI tile "Unique identities" with an info tip
- **WHEN** the pointer rests on its info icon
- **THEN** the tooltip shows the explanation, and resting on the label or the value shows nothing

#### Scenario: Keyboard
- **GIVEN** a section card heading with an info tip
- **WHEN** the user tabs to its info icon and then presses Escape
- **THEN** the icon is announced as "About <heading>" with the explanation as its description, the tooltip shows on focus and hides on Escape

#### Scenario: Touch
- **GIVEN** a phone and a chart heading with an info tip
- **WHEN** the user taps the info icon and then taps it again
- **THEN** the first tap shows the tooltip and the second hides it, without a long press

#### Scenario: Sortable column header
- **GIVEN** a sortable column header with an info tip
- **WHEN** the user activates the info icon
- **THEN** the tooltip shows and the sort does not change; activating the header label sorts

#### Scenario: Tile that links to a list
- **GIVEN** an Overview live tile that opens a filtered list and has an info tip
- **WHEN** the user activates the info icon
- **THEN** the tooltip shows and the list does not open; activating the rest of the tile opens it

#### Scenario: Card layout
- **GIVEN** an XSmall viewport and a table column with an info tip
- **WHEN** the rows render as cards
- **THEN** that column's label in each card carries the info icon

#### Scenario: Level chart headings
- **GIVEN** two charts side by side, one with an info tip or a warning after its title and one without
- **WHEN** they render
- **THEN** their titles and their plots start at the same height


## ADDED Requirements

### Requirement: Balanced chart grid

Edition: CE. The chart grid SHALL lay out its charts in the fewest rows in which each is at least 420 px wide, spread
evenly so no row holds more than one chart more than another, the charts of a shorter last row sharing its width. It
is laid out from its measured width before first paint and again when its width or its charts change.

#### Scenario: Four charts with room for three
- **GIVEN** a grid of four charts whose width fits three
- **WHEN** it renders
- **THEN** the charts take two rows of two, not three and one

#### Scenario: Four charts with room for four
- **GIVEN** a grid of four charts whose width fits four
- **WHEN** it renders
- **THEN** they share one row

#### Scenario: Three charts with room for two
- **GIVEN** a grid of three charts whose width fits two
- **WHEN** it renders
- **THEN** the first two share a row and the third spans the row below

#### Scenario: Five charts with room for three
- **GIVEN** a grid of five charts whose width fits three
- **WHEN** it renders
- **THEN** they take a row of three and a row of two that share its width

#### Scenario: Narrow grid
- **GIVEN** a grid narrower than two charts of 420 px
- **WHEN** it renders
- **THEN** every chart takes its own row

#### Scenario: Charts change
- **GIVEN** a grid of four charts on two rows of two
- **WHEN** a fifth chart is added
- **THEN** the grid lays out the five again without a reload

### Requirement: Fitted percentage axis

Edition: CE. A percentage time-series chart SHALL offer a y-axis fitted to its data, which ends at 100 % and starts at
the highest multiple of 10 % that is at least 5 points below the lowest value, never below 0 %; a fitted chart without
values keeps 0 % to 100 %.

#### Scenario: High rates
- **GIVEN** a fitted chart whose values run from 96.2 % to 99.0 %
- **WHEN** it renders
- **THEN** its y-axis runs from 90 % to 100 %

#### Scenario: One low bucket
- **GIVEN** a fitted chart whose lowest value is 62.0 %
- **WHEN** it renders
- **THEN** its y-axis runs from 50 % to 100 %

#### Scenario: Very low rate
- **GIVEN** a fitted chart whose lowest value is 3.0 %
- **WHEN** it renders
- **THEN** its y-axis runs from 0 % to 100 %

#### Scenario: No values
- **GIVEN** a fitted chart whose points are all `null`
- **WHEN** it renders
- **THEN** its y-axis runs from 0 % to 100 %

### Requirement: Unavailable breakdown chart

Edition: CE. A breakdown chart marked unavailable SHALL keep its heading and info tip and draw an empty ring (donut)
or an empty plot (bar) over hatching, dimmed as an unavailable time-series chart, with no slices, bars, labels, legend,
tooltip or "Show table" action.

#### Scenario: Unavailable donut
- **GIVEN** an "Egress type" donut marked unavailable
- **WHEN** it renders
- **THEN** its heading is dimmed within the text contrast minimum, an empty ring is drawn over hatching, and it shows no
  slice, legend, label, tooltip on hover or "Show table" action
