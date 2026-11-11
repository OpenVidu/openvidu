# Spec Delta

## MODIFIED Requirements

### Requirement: Breakdown chart
Edition: CE. The breakdown chart SHALL render a donut or horizontal bar with a legend, direct labels, a fixed colour per
entity and a toggle to a table of the same data; more than eight entries fold into "Other" (outline grey). An ordered
breakdown SHALL keep the order of its entries in the chart and the table, show every entry even at 0, never fold into
"Other", and show the shared empty state, "No data in this range", when every value is 0.

#### Scenario: Nine SDKs
- **GIVEN** nine SDK entries
- **WHEN** the donut renders
- **THEN** eight slices are shown plus "Other", and the table toggle lists all nine

#### Scenario: Ordered bars
- **GIVEN** an ordered breakdown with the entries `0-5: 40`, `6-10: 0` and `11-25: 8`, in that order
- **WHEN** the horizontal bars render
- **THEN** three bars are shown from top to bottom `0-5` "40 (83.3 %)", `6-10` "0 (0.0 %)" and `11-25` "8
  (16.7 %)", and the table lists the three rows in that order

#### Scenario: Ordered breakdown without data
- **GIVEN** an ordered breakdown whose entries are all 0
- **WHEN** it renders
- **THEN** it shows "No data in this range" and no "Show table" action

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
