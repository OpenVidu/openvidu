# Spec Delta

## ADDED Requirements

### Requirement: Workbook export per section

Edition: CE. Every section card SHALL have an "Export XLSX" action in its header that saves, without a new request, an
`.xlsx` workbook of the data the card draws, named `analytics-<section>-<from>-<to>.xlsx` (resolved instants, colons
removed): an Info sheet, one sheet per time resolution of its series and one per breakdown. It is disabled while the
card has no data, on locked cards and while the workbook is built; a failure is toasted.

#### Scenario: Rooms over 24 hours

- **GIVEN** the Rooms card over the last 24 hours at `auto` in `Europe/Madrid`
- **WHEN** the user clicks "Export XLSX"
- **THEN** the browser saves `analytics-rooms-<from>-<to>.xlsx` with the sheets "Info", "5 min" (Active rooms, Rooms
  created), "1 h" (Recorded rooms), "Room topology" and "Room size", and no request is sent

#### Scenario: Participants over a week

- **GIVEN** the Participants card over the last 7 days at `auto` in `Europe/Madrid`
- **WHEN** the user exports it
- **THEN** the workbook holds "Info", "1 h" (Active participants, Participant sessions, Connection success), "1 d (UTC)"
  (Unique identities) and "Participant kind"

#### Scenario: Breakdowns only

- **GIVEN** the Client breakdowns card
- **WHEN** the user exports it
- **THEN** the workbook holds "Info", "SDK", "OS", "Browser" and "Connection type"

#### Scenario: Card without data

- **GIVEN** a card reading "No data in this range"
- **WHEN** it renders
- **THEN** its "Export XLSX" is disabled

#### Scenario: Export failure

- **WHEN** the workbook cannot be built or saved
- **THEN** a toast reads "Export failed: <message>" and the card stays interactive

### Requirement: Workbook info sheet

Edition: CE. The Info sheet SHALL list, as label and value rows, the section, the start and end of the range in the
page's time zone, the zone, the scope when the page shows the scope selector, and the export time.

#### Scenario: Info of a node scope

- **GIVEN** the `per-node-breakdown` feature, `scope=node:media-node-10-0-0-2` and the range 2026-11-10 00:00 to
  2026-11-11 00:00 in `Europe/Madrid`
- **WHEN** the user exports the Rooms card
- **THEN** the Info sheet reads Section "Rooms", From "2026-11-10 00:00", To "2026-11-11 00:00", Time zone
  "Europe/Madrid", Scope "media-node-10-0-0-2" and the export time in that zone

### Requirement: Workbook time series sheets

Edition: CE. A time series sheet SHALL hold the series that share a resolution and zone: one row per bucket, the bucket
start first as a date in the page's zone (UTC for the daily unique identities) under a header naming the zone, then a
column per series headed by its chart heading, plus " · " and the series name when the chart draws several, and an
empty cell where the chart shows a gap.

#### Scenario: Egress at two resolutions

- **GIVEN** the Egress card over the last 24 hours at `auto` in `Europe/Madrid`
- **WHEN** the user exports it
- **THEN** "5 min" has 288 rows and the columns "Bucket start (Europe/Madrid)", "Active egress" and "Egress started",
  and "1 h" has 24 rows and the columns "Bucket start (Europe/Madrid)" and "Egress ended by status · complete", one per
  status the chart draws, named as its legend

#### Scenario: Gap in a series

- **GIVEN** a Connection success bucket in which no participant joined, drawn as a gap
- **WHEN** the Participants card is exported
- **THEN** that bucket's Connection success cell is empty, not `0`

#### Scenario: Header row

- **WHEN** the user opens any sheet of the workbook
- **THEN** its header row is bold and stays visible while scrolling

### Requirement: Workbook breakdown sheets

Edition: CE. A breakdown sheet SHALL hold one row per entry the chart shows, in its order, with the label the chart
shows, the count and the share; the keys an ordered breakdown shows at 0 are included.

#### Scenario: Room topology

- **GIVEN** the Room topology chart showing N:M 30 (60.0 %), 1:N 10 (20.0 %), 1:1 10 (20.0 %) and the other classes at 0
- **WHEN** the Rooms card is exported
- **THEN** the "Room topology" sheet has the columns "Room topology", "Count" and "Share", and six rows in the chart's
  order, the last three with count 0

### Requirement: Workbook cells

Edition: CE. Workbook cells SHALL be typed: dates as dates, counts and bytes as whole numbers, rates and shares as
percentages with one decimal, quality scores with two decimals, durations in hours, minutes and seconds, and labels as
text, which a spreadsheet never evaluates.

#### Scenario: Rate as a percentage

- **GIVEN** a Recorded rooms bucket of 40 %
- **WHEN** the Rooms card is exported
- **THEN** its cell holds the number 0.4 shown as "40.0%"

#### Scenario: Label that looks like a formula

- **GIVEN** a Browser breakdown with the raw key `=cmd|' /C calc'!A0`
- **WHEN** the Client breakdowns card is exported
- **THEN** the "Browser" sheet holds that key as a text cell, which the spreadsheet shows and does not run

## MODIFIED Requirements

### Requirement: Egress and ingress in a node scope

Edition: CE. With a `node:<label>` scope, the Egress and Ingress KPI tiles and the Egress and Ingress sections SHALL
render unavailable (tiles reading "—", not "n/a", and charts and breakdowns over hatching) under the warning "Egress and
ingress are not attributed to media nodes. Select All nodes in Scope to see them.", request none of their series or
breakdowns, and disable their Export XLSX; the Participant kind breakdown keeps its Egress and Ingress slices.

#### Scenario: Node scope

- **GIVEN** the `per-node-breakdown` feature and `scope=node:media-node-10-0-0-2`
- **WHEN** the Analytics page renders
- **THEN** the Egress and Ingress tiles read a dimmed "—" with the warning, the Egress and Ingress cards carry the
  warning after their heading and show their tiles, area, bar and breakdown charts unavailable, their Export XLSX is
  disabled, and no request names an egress or ingress metric or the dimensions `egressType`, `egressStatus` or
  `ingressInputType`

#### Scenario: Participant kind of a node

- **GIVEN** a node scope whose rooms had EGRESS and INGRESS participants
- **WHEN** the Participants section renders
- **THEN** the Participant kind breakdown shows their Egress and Ingress slices

#### Scenario: Back to all nodes

- **GIVEN** the page in a node scope
- **WHEN** the user selects All nodes in Scope
- **THEN** the egress and ingress series and breakdowns are requested and the tiles and sections show their data

### Requirement: PRO strip and locked cards

Edition: CE. Right after the Ingress section, in the same column of cards as the CE sections, the page SHALL render
the cards Quality, Diagnostics and Top rooms; when the matching feature is disabled each card SHALL render the compact
in-card lock, sized to its message rather than to the real card, with its Export XLSX disabled and without any request.

#### Scenario: Strip in CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** the Analytics page renders
- **THEN** the three PRO cards follow the Ingress section and show the compact lock with their feature title and a
  disabled "Export XLSX", each only as tall as its message, and no request to `/analytics/top`, `/analytics/scopes` or
  a PRO metric is sent

## REMOVED Requirements

### Requirement: CSV export per section

**Reason**: Replaced by "Workbook export per section": a CSV holds one shape at one resolution, so it could not hold
every chart of a card as drawn.

**Migration**: "Export XLSX" saves every chart of the card. `GET /api/v1/analytics/export.csv` is unchanged for scripts.
