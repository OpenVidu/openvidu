# Spec Delta

## MODIFIED Requirements

### Requirement: Rooms section

Edition: CE. The Rooms section SHALL show the tiles Average room size (rounded to a whole number of participants) and
Average room duration (in the shared duration format) from the summary, then `roomsPeakActive` as the area chart
"Active rooms" beside `roomsCreated` as the bar chart "Rooms created"; with `roomsEnded: 0` the tiles read "n/a" with
the hint "No room ended in this range". The card SHALL read "No data in this range" only when no peak is above 0 and
no room was created.

#### Scenario: Rooms over 24 hours

- **GIVEN** the default range at `auto` and a summary with `avgRoomSize: 4.4` and `avgRoomDurationMs: 360000`
- **WHEN** the section renders
- **THEN** the chart "Active rooms" shows 288 five-minute buckets as one area beside the chart "Rooms created" with
  288 bars, followed by "Room topology", "Recorded rooms" and "Room size by topology", the tiles read "4 participants"
  and "6 m 00 s", and no `roomsEnded` series is requested

#### Scenario: Daily buckets

- **GIVEN** a 30-day range at `granularity=1d` whose busiest day had at most 21 rooms open at once and 200 rooms created
- **WHEN** the section renders
- **THEN** that day reads 21 in "Active rooms" and 200 in "Rooms created", each chart on its own y-axis

#### Scenario: No room ended yet

- **GIVEN** a summary with `roomsCreated: 2`, `roomsEnded: 0`, neither average and no `recordedRoomsRate`
- **WHEN** the section renders
- **THEN** the Average room size, Average room duration and Recorded rooms tiles read "n/a" with the hint "No room
  ended in this range"

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
- **THEN** the requested metrics are `roomsPeakActive,roomsCreated,roomsByTopology,recordedRoomsRate` at `1h`,
  `participantsPeakActive,participantsJoined,connectionSuccessRate` at `auto`,
  `egressPeakActive,egressStarted,egressEnded` at `1h` and `ingressPeakActive,ingressSessions` at `1h`; at
  `granularity=1d` the Participants export adds `uniqueIdentities`

#### Scenario: Export failure

- **WHEN** the export request fails
- **THEN** a toast shows the error message and request id and the card stays interactive

### Requirement: Analytics section colours

Edition: CE. The Rooms, Participants, Egress and Ingress sections SHALL each draw their own series in one section
colour, different for each section, and every breakdown slice of a section's main kind in that colour; Connection
success SHALL be green and failures red.

#### Scenario: One colour per section

- **WHEN** the Analytics page renders in the light or the dark theme
- **THEN** "Active rooms", "Rooms created" and "Recorded rooms" share one colour; "Active participants", "Participant sessions" and
  "Unique identities" a second; "Active egress" and "Egress started" a third; "Active ingress" and "Ingress sessions" a
  fourth; the four differ, and "Connection success" is green

#### Scenario: Main kinds in the section colour

- **GIVEN** breakdowns in which `STANDARD`, `room_composite` and `rtmp` are present
- **WHEN** the Participant kind, Egress type and Ingress input type donuts render
- **THEN** the Standard slice has the Participants colour, Room composite the Egress colour and RTMP the Ingress colour,
  and the Egress and Ingress slices of Participant kind have the Egress and Ingress colours

## ADDED Requirements

### Requirement: Recorded rooms tile

Edition: CE. The Rooms section SHALL show, after Average room duration, the tile Recorded rooms with the summary's
`recordedRoomsRate` as a percentage with one decimal and the hint "<roomsRecorded> rooms recorded"; without
`recordedRoomsRate` it SHALL read "n/a" with the hint "No room ended in this range" when `roomsEnded` is `0`, and
"Not provided by this server version" otherwise.

#### Scenario: Share of the range

- **GIVEN** a summary with `roomsEnded: 200`, `roomsRecorded: 49` and `recordedRoomsRate: 25.0`
- **WHEN** the Rooms section renders
- **THEN** the tiles read Average room size, Average room duration and Recorded rooms "25.0 %" with the hint "49 rooms
  recorded"

#### Scenario: Rooms ended by an earlier writer

- **GIVEN** a summary with `roomsEnded: 30` and neither `roomsRecorded` nor `recordedRoomsRate`
- **WHEN** the Rooms section renders
- **THEN** the Recorded rooms tile reads "n/a" with the hint "Not provided by this server version"

### Requirement: Room topology chart

Edition: CE. After "Rooms created" the Rooms section SHALL show the `roomsByTopology.<class>` series as the stacked
bar chart "Room topology", requested at `1h` while the effective granularity is finer, its segments in the order Empty,
Single participant, No publishers, 1:1, 1:N and N:M, labelled so in the legend and the tooltip, each class in its fixed
colour.

#### Scenario: Default range

- **GIVEN** the default 24 h range at `auto` and rooms of the classes `one_to_one`, `one_to_many` and `many_to_many`
  ended in it
- **WHEN** the section renders
- **THEN** "Room topology" is requested with `granularity=1h`, draws 24 stacked bars, reads "Hourly" in its note and
  names 1:1, 1:N and N:M in its legend, in that order

#### Scenario: Range before the writer classified rooms

- **GIVEN** a 7-day range in which the server classified rooms only over the last 2 days
- **WHEN** the section renders
- **THEN** "Room topology" draws bars on the last 2 days only and "Recorded rooms" has a gap over the first 5

### Requirement: Recorded rooms chart

Edition: CE. After "Room topology" the Rooms section SHALL show `recordedRoomsRate` as the percentage line "Recorded
rooms" with a fitted y-axis, in the Rooms colour, requested at `1h` while the effective granularity is finer, with a gap
in every bucket without classified rooms.

#### Scenario: Recorded share per hour

- **GIVEN** the default 24 h range at `auto` whose `recordedRoomsRate` points range from 20.0 to 40.0, with `null` at
  night
- **WHEN** the section renders
- **THEN** "Recorded rooms" is requested with `granularity=1h`, reads "Hourly" in its note, draws one line with gaps at
  night and fits its y-axis to the data

### Requirement: Room size by topology chart

Edition: CE. After "Recorded rooms" the Rooms section SHALL show the breakdowns `roomSizeNoPublishers`,
`roomSizeOneToMany` and `roomSizeManyToMany` of the range as the stacked category chart "Room size by topology": one
bar per size range from `2-5` to `101+`, all six always shown, stacked by No publishers, 1:N and N:M in their class
colours.

#### Scenario: Sizes of the range

- **GIVEN** breakdowns of the range with `roomSizeOneToMany` `11-25: 6`, `roomSizeManyToMany` `2-5: 40` and
  `11-25: 2`, and `roomSizeNoPublishers` empty
- **WHEN** the section renders
- **THEN** the chart shows the six ranges in order, `2-5` with one N:M segment of 40, `11-25` with a 1:N segment of 6
  and an N:M segment of 2, and the other ranges empty

#### Scenario: No room with several participants

- **GIVEN** breakdowns of the range whose three totals are `0`
- **WHEN** the section renders
- **THEN** the chart reads "No data in this range" while the other charts of the card keep their data
