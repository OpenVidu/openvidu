# Spec Delta

## MODIFIED Requirements

### Requirement: Chart palette and quality bands

Edition: CE. Series colours SHALL follow the entity, never the rank, from eight palette slots with light and dark values
that are pairwise distinguishable; known values (the entities rooms, participants, egress and ingress, participant
kinds, egress statuses and types, ingress input types, room topology classes, directions) have fixed distinct slots, each entity's main kind
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

#### Scenario: Topology classes
- **WHEN** the room topology classes render in one chart
- **THEN** N:M takes `--ovd-chart-1` (teal, the rooms colour), 1:N `--ovd-chart-6` (blue), 1:1 `--ovd-chart-7`
  (violet), No publishers `--ovd-chart-4` (yellow), Single participant `--ovd-chart-5` (pink) and Empty
  `--ovd-chart-2` (orange), and none takes the red of failures

## ADDED Requirements

### Requirement: Stacked category chart
Edition: CE. The stacked category chart SHALL draw one vertical bar per key of a given order, every key shown even
without data, each bar stacked by series in their fixed colours, with a legend, a tooltip naming each segment and the
bar's total, the chart accessibility summary and data table toggle, and the shared empty state when every value is 0.

#### Scenario: Keys in order
- **GIVEN** the keys `2-5`, `6-10` and `11-25` and two series with values only for `2-5` and `11-25`
- **WHEN** the chart renders
- **THEN** it shows three bars in that order, `6-10` empty, and the legend names both series

#### Scenario: Tooltip
- **GIVEN** a bar whose segments are 6 and 2
- **WHEN** the user hovers it
- **THEN** the tooltip names the key, each series with its value and the total 8

#### Scenario: Data table
- **WHEN** the user toggles the data table
- **THEN** a table lists one row per key, in order, with one column per series and a total column

#### Scenario: No data
- **GIVEN** series whose values are all 0
- **WHEN** the chart renders
- **THEN** it shows the shared empty state, "No data in this range"
