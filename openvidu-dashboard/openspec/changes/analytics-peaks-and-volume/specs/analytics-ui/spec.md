## MODIFIED Requirements

### Requirement: Rooms section

Edition: CE. The Rooms section SHALL show the tiles Average room size (rounded to a whole number of participants) and
Average room duration (in the shared duration format) from the summary, then `roomsPeakActive` as the area chart
"Active rooms" beside `roomsCreated` as the bar chart "Rooms created"; with `roomsEnded: 0` both tiles read "n/a" with
the hint "No room ended in this range". The card SHALL read "No data in this range" only when no peak is above 0 and
no room was created.

#### Scenario: Rooms over 24 hours

- **GIVEN** the default range at `auto` and a summary with `avgRoomSize: 4.4` and `avgRoomDurationMs: 360000`
- **WHEN** the section renders
- **THEN** the chart "Active rooms" shows 288 five-minute buckets as one area beside the chart "Rooms created" with
  288 bars, the tiles read "4 participants" and "6 m 00 s", and no `roomsEnded` series is requested

#### Scenario: Daily buckets

- **GIVEN** a 30-day range at `granularity=1d` whose busiest day had at most 21 rooms open at once and 200 rooms created
- **WHEN** the section renders
- **THEN** that day reads 21 in "Active rooms" and 200 in "Rooms created", each chart on its own y-axis

#### Scenario: No room ended yet

- **GIVEN** a summary with `roomsCreated: 2`, `roomsEnded: 0` and neither average
- **WHEN** the section renders
- **THEN** both tiles read "n/a" with the hint "No room ended in this range"

#### Scenario: Range partly before the samples

- **GIVEN** a 7-day range whose `roomsPeakActive` points are `null` for the first 5 days, and a summary with
  `roomsCreated: 40`
- **WHEN** the section renders
- **THEN** the tiles and both charts are shown, "Active rooms" has a gap over the first 5 days instead of an area at 0,
  and "Rooms created" draws the bars of those days

#### Scenario: Range without rooms

- **GIVEN** a range whose `roomsPeakActive` points are all `0` or `null`, whose `roomsCreated` points are all `0` and
  a summary with `roomsCreated: 0`
- **WHEN** the section renders
- **THEN** the card shows "No data in this range" with "Widen range"

### Requirement: Egress section

Edition: CE. The Egress section SHALL show the tiles Total egress and Total duration (the summary's `egressStarted` and
`egressDurationMs`), `egressPeakActive` as the area chart "Active egress" beside `egressStarted` as the bar chart
"Egress started", then the `egressEnded.<status>` series as the stacked bar chart "Egress ended by status" and the
"Egress type" donut; each chart requested at `1h` while the effective granularity is finer reads "Hourly" in its note.

#### Scenario: Egress over 24 hours

- **GIVEN** the default range at `auto`
- **WHEN** the section renders
- **THEN** "Active egress" shows one area over 288 five-minute buckets beside "Egress started" with 288 bars, followed
  by "Egress ended by status", whose note reads "Hourly", and "Egress type"

#### Scenario: Ended by status

- **GIVEN** egresses ended as `complete`, `aborted`, `limit_reached` and `failed` (the `egressEnded.<status>` series)
- **WHEN** the chart renders
- **THEN** four stacked segments per bucket are drawn in four distinguishable colours, `failed` in the red slot and
  `aborted` apart from the red of aborted participants, and the legend names all four

#### Scenario: Totals

- **GIVEN** a summary with `egressStarted: 120` and `egressDurationMs: 36000000`
- **WHEN** the section renders
- **THEN** the tiles read Total egress "120" and Total duration "10 h 00 m"

#### Scenario: Status colours

- **WHEN** the "Egress ended by status" chart renders
- **THEN** failed statuses are drawn in red and every status in its own distinguishable colour

#### Scenario: Range before the egress samples

- **GIVEN** a 7-day range whose `egressPeakActive` points are `null` for the first 5 days and whose `egressStarted`
  points are above 0 on those days
- **WHEN** the section renders
- **THEN** "Active egress" has a gap over the first 5 days and "Egress started" draws their bars

### Requirement: Ingress section

Edition: CE. The Ingress section SHALL render after the Egress section and before the Quality card, never locked, with
the tiles Total sessions and Total duration (the summary's `ingressSessions` and `ingressDurationMs`), then
`ingressPeakActive` as the area chart "Active ingress" beside `ingressSessions` as the bar chart "Ingress sessions",
both reading "Hourly" in their note while requested at `1h` below an effective `1h`, and the "Ingress input type"
donut.

#### Scenario: Ingress sessions

- **GIVEN** a summary with `ingressSessions: 12` and `ingressDurationMs: 21600000`
- **WHEN** the card renders
- **THEN** "Active ingress" draws an area and "Ingress sessions" bars per bucket, and the tiles read Total sessions
  "12" and Total duration "6 h 00 m"

#### Scenario: Ingress at five minutes

- **GIVEN** the default range at `auto`, which the other sections draw in five-minute buckets
- **WHEN** the card renders
- **THEN** "Active ingress" and "Ingress sessions" show 24 hourly buckets and both notes read "Hourly"

#### Scenario: Ingress input type donut

- **GIVEN** a breakdown `ingressInputType` with `rtmp` 8, `whip` 3 and `url` 1
- **WHEN** the card renders
- **THEN** the donut "Ingress input type" shows the slices RTMP 8 (66.7 %), WHIP 3 (25.0 %) and URL 1 (8.3 %)

#### Scenario: Ingress in CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** the Analytics page renders
- **THEN** the Ingress section follows the Egress section and precedes the locked Quality card, shows its data without
  a lock, and its ingress series request is sent

### Requirement: CSV export per section

Edition: CE. Every section card except Top rooms SHALL have an "Export CSV" action in its header that downloads the CSV
of the card's series or breakdowns with the current URL parameters through the shared HTTP service, saves it under the
server file name and is disabled on locked cards.

#### Scenario: Bandwidth export

- **GIVEN** the Bandwidth card over the last 7 days
- **WHEN** the user clicks "Export CSV"
- **THEN** `GET /api/v1/analytics/export.csv?kind=series&metrics=bytesUp,bytesDown&from=…&to=…&tz=…&granularity=…`
  is requested with the bearer token and the browser saves `analytics-series-….csv`

#### Scenario: Entity section exports

- **GIVEN** the default range at `auto`
- **WHEN** the user exports the Rooms, Participants, Egress and Ingress cards
- **THEN** the requested metrics are `roomsPeakActive,roomsCreated` at `auto`,
  `participantsPeakActive,participantsJoined,connectionSuccessRate` at `auto`,
  `egressPeakActive,egressStarted,egressEnded` at `1h` and `ingressPeakActive,ingressSessions` at `1h`; at
  `granularity=1d` the Participants export adds `uniqueIdentities`

#### Scenario: Export failure

- **WHEN** the export request fails
- **THEN** a toast shows the error message and request id and the card stays interactive

### Requirement: Analytics chart notes

Edition: CE. Every time-series chart of the Analytics page SHALL name, in the note under its heading, its bucket
("Hourly" for a chart requested at `1h` while the effective granularity is finer, otherwise the effective granularity)
and the time zone of its time axis; the unique identities chart names UTC and keeps "per UTC day".

#### Scenario: Default range

- **GIVEN** the default 24 h range at `auto` with `tz=Europe/Madrid`
- **WHEN** the charts render
- **THEN** the notes of "Active rooms", "Rooms created" and "Active egress" name the five-minute bucket and
  Europe/Madrid, and the notes of "Egress ended by status", "Active ingress" and "Ingress sessions" read "Hourly" with
  Europe/Madrid

#### Scenario: Daily unique identities

- **GIVEN** `granularity=1d` and `tz=Europe/Madrid`
- **WHEN** the unique identities chart renders
- **THEN** its note reads "per UTC day" and names UTC, not Europe/Madrid

#### Scenario: Unique identities in a five-minute view

- **GIVEN** the default 24 h range at `auto` with `tz=Europe/Madrid`
- **WHEN** the unique identities chart renders
- **THEN** its note reads "per UTC day" and names UTC, while the other Participants charts name the five-minute bucket

## REMOVED Requirements

### Requirement: Participants section

**Reason**: Replaced by "Participants and unique identities section", which draws the peak and volume pair and shows
unique identities per UTC day at every granularity instead of only at `1d`.
**Migration**: None; the section keeps its place on the page.

## ADDED Requirements

### Requirement: Participants and unique identities section

Edition: CE. The Participants section SHALL show `participantsPeakActive` as the area chart "Active participants"
beside `participantsJoined` as the bar chart "Participant sessions", then `connectionSuccessRate` as a percentage line
with a fitted y-axis, a participant kind breakdown without SIP, CONNECTOR and BRIDGE in which every kind has a distinct
colour, and `uniqueIdentities` as the bar chart "Unique identities", requested at `1d` whatever the page granularity.

#### Scenario: Active participants over 24 hours

- **GIVEN** the default range at `auto`
- **WHEN** the section renders
- **THEN** the chart "Active participants" shows one area over 288 five-minute buckets beside "Participant sessions"
  with 288 bars, followed by "Connection success", "Participant kind" and "Unique identities", and
  `participantsAborted` is not requested

#### Scenario: Fitted connection success

- **GIVEN** `connectionSuccessRate` points between 96.2 and 99.0
- **WHEN** the section renders
- **THEN** the y-axis of "Connection success" runs from 90 % to 100 %

#### Scenario: Unique identities over a week

- **GIVEN** `from=now-7d` at `auto`, which resolves to `1h`
- **WHEN** the section renders
- **THEN** `uniqueIdentities` is requested with `granularity=1d` and drawn as one bar per UTC day, and no "Switch to
  1 d" action is shown

#### Scenario: Day not closed yet

- **GIVEN** the default 24 h range, which spans yesterday and today in UTC, with yesterday's `uniqueIdentities` stored
- **WHEN** the section renders
- **THEN** "Unique identities" draws yesterday's bar and leaves today as a gap

#### Scenario: Kind breakdown

- **GIVEN** a breakdown with `STANDARD: 900`, `EGRESS: 40`, `AGENT: 12`, `INGRESS: 3` and `SIP: 1`
- **WHEN** the section renders
- **THEN** the chart shows Standard, Egress, Agent and Ingress, each in a different palette colour, and no SIP entry


### Requirement: Analytics section colours

Edition: CE. The Rooms, Participants, Egress and Ingress sections SHALL each draw their own series in one section
colour, different for each section, and every breakdown slice of a section's main kind in that colour; Connection
success SHALL be green and failures red.

#### Scenario: One colour per section

- **WHEN** the Analytics page renders in the light or the dark theme
- **THEN** "Active rooms" and "Rooms created" share one colour; "Active participants", "Participant sessions" and
  "Unique identities" a second; "Active egress" and "Egress started" a third; "Active ingress" and "Ingress sessions" a
  fourth; the four differ, and "Connection success" is green

#### Scenario: Main kinds in the section colour

- **GIVEN** breakdowns in which `STANDARD`, `room_composite` and `rtmp` are present
- **WHEN** the Participant kind, Egress type and Ingress input type donuts render
- **THEN** the Standard slice has the Participants colour, Room composite the Egress colour and RTMP the Ingress colour,
  and the Egress and Ingress slices of Participant kind have the Egress and Ingress colours

### Requirement: Analytics card layout

Edition: CE and PRO. Every Analytics card with several charts, the cards of an edition that extends CE included, SHALL
lay them out in the balanced chart grid below its tiles; an entity section SHALL put its peak and volume pair first.

#### Scenario: Four charts on a 1920 px screen

- **GIVEN** a 1920 px viewport, where three 420 px charts fit side by side in a card
- **WHEN** the Participants, Client breakdowns and Egress cards render
- **THEN** Client breakdowns and Egress show two rows of two charts, Participants a row of three and a row of two, and
  the first row of Participants and Egress starts with their peak and volume pair

#### Scenario: Three charts with room for two

- **GIVEN** a viewport where two 420 px charts fit side by side in a card
- **WHEN** the Ingress card renders
- **THEN** "Active ingress" and "Ingress sessions" share the first row and "Ingress input type" spans the second

#### Scenario: Phone

- **GIVEN** a 375 px viewport
- **WHEN** the Analytics page renders
- **THEN** every card shows one chart per row

### Requirement: Egress and ingress in a node scope

Edition: CE. With a `node:<label>` scope, the Egress and Ingress KPI tiles and the Egress and Ingress sections SHALL
render unavailable (tiles reading "—", not "n/a", and charts and breakdowns over hatching) under the warning "Egress and ingress are
not attributed to media nodes. Select All nodes in Scope to see them.", request none of their series or breakdowns,
and disable their Export CSV; the Participant kind breakdown keeps its Egress and Ingress slices.

#### Scenario: Node scope

- **GIVEN** the `per-node-breakdown` feature and `scope=node:media-node-10-0-0-2`
- **WHEN** the Analytics page renders
- **THEN** the Egress and Ingress tiles read a dimmed "—" with the warning, the Egress and Ingress cards carry the
  warning after their heading and show their tiles, area, bar and breakdown charts unavailable, their Export CSV is
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

