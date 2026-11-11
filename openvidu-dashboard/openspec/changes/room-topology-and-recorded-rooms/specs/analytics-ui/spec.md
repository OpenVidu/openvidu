# Spec Delta

## MODIFIED Requirements

### Requirement: Rooms section

Edition: CE. The Rooms section SHALL show the tiles Average room size (rounded to a whole number of participants) and
Average room duration (in the shared duration format) from the summary, then `roomsPeakActive` as the area chart
"Active rooms" beside `roomsCreated` as the bar chart "Rooms created", the two alone in the first row of charts; with
`roomsEnded: 0` the tiles read "n/a" with the hint "No room ended in this range". The card SHALL read "No data in this
range" only when no peak is above 0 and no room was created.

#### Scenario: Rooms over 24 hours

- **GIVEN** the default range at `auto` and a summary with `avgRoomSize: 4.4` and `avgRoomDurationMs: 360000`
- **WHEN** the section renders
- **THEN** the chart "Active rooms" shows 288 five-minute buckets as one area beside the chart "Rooms created" with
  288 bars, the two alone in the first row, followed by "Room topology", "Room size" and "Recorded rooms", the tiles
  read "4 participants" and "6 m 00 s", and no `roomsEnded` series is requested

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

### Requirement: Participants and unique identities section

Edition: CE. The Participants section SHALL show `participantsPeakActive` as the area chart "Active participants"
beside `participantsJoined` as the bar chart "Participant sessions", the two alone in the first row of charts, then
`uniqueIdentities` as the bar chart "Unique identities", requested at `1d` whatever the page granularity, a participant
kind breakdown without SIP, CONNECTOR and BRIDGE in which every kind has a distinct colour, and `connectionSuccessRate`
as the percentage line "Connection success" with a fitted y-axis.

#### Scenario: Active participants over 24 hours

- **GIVEN** the default range at `auto`
- **WHEN** the section renders
- **THEN** the chart "Active participants" shows one area over 288 five-minute buckets beside "Participant sessions"
  with 288 bars, the two alone in the first row, followed by "Unique identities", "Participant kind" and "Connection
  success", and `participantsAborted` is not requested

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

### Requirement: Analytics card layout

Edition: CE and PRO. Every Analytics card with several charts, the cards of an edition that extends CE included, SHALL
lay them out in the balanced chart grid below its tiles; an entity section SHALL put its peak and volume pair first.
The Rooms and Participants sections SHALL give that pair a row of its own and lay out their other charts in a second
balanced grid below it.

#### Scenario: Four charts on a 1920 px screen

- **GIVEN** a 1920 px viewport, where three 420 px charts fit side by side in a card
- **WHEN** the Client breakdowns and Egress cards render
- **THEN** both show two rows of two charts, and the first row of Egress starts with its peak and volume pair

#### Scenario: Rooms and Participants on a 1920 px screen

- **GIVEN** a 1920 px viewport, where three 420 px charts fit side by side in a card
- **WHEN** the Rooms and Participants cards render
- **THEN** each shows its peak and volume pair alone in a first row and its other three charts in a row of three

#### Scenario: Three charts with room for two

- **GIVEN** a viewport where two 420 px charts fit side by side in a card
- **WHEN** the Rooms and Ingress cards render
- **THEN** in Rooms "Active rooms" and "Rooms created" share the first row, "Room topology" and "Room size" the second
  and "Recorded rooms" spans the third; in Ingress "Active ingress" and "Ingress sessions" share the first row and
  "Ingress input type" spans the second

#### Scenario: Phone

- **GIVEN** a 375 px viewport
- **WHEN** the Analytics page renders
- **THEN** every card shows one chart per row

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
- **THEN** the requested metrics are `roomsPeakActive,roomsCreated,recordedRoomsRate` at `1h`,
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
- **THEN** "Active rooms", "Rooms created", "Room size" and "Recorded rooms" share one colour; "Active participants",
  "Participant sessions" and "Unique identities" a second; "Active egress" and "Egress started" a third; "Active
  ingress" and "Ingress sessions" a fourth; the four differ, and "Connection success" is green

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

Edition: CE. Under the first row the Rooms section SHALL show the `roomTopology` breakdown of the range as the
horizontal bar chart "Room topology": one bar per class, always in the order N:M, 1:N, 1:1, Single participant, No
publishers and Empty, every class shown even at 0, each in its class colour and labelled with its count and its share
of the classified rooms. It SHALL read "No data in this range" when no room of the range has a class, while the other
charts of the card keep their data.

#### Scenario: Classes of the range

- **GIVEN** the `roomTopology` breakdown of the range with `many_to_many: 62`, `one_to_one: 14` and `one_to_many: 4`
- **WHEN** the section renders
- **THEN** "Room topology" shows six bars from top to bottom N:M "62 (77.5 %)", 1:N "4 (5.0 %)", 1:1 "14 (17.5 %)",
  Single participant, No publishers and Empty "0 (0.0 %)", each in its class colour

#### Scenario: Range before the writer classified rooms

- **GIVEN** a 7-day range whose rooms all ended before the server classified rooms
- **WHEN** the section renders
- **THEN** "Room topology" and "Room size" read "No data in this range", "Recorded rooms" has gaps only, and "Active
  rooms" and "Rooms created" draw their data

### Requirement: Room size chart

Edition: CE. After "Room topology" the Rooms section SHALL show the `roomSize` breakdown of the range as the
horizontal bar chart "Room size": one bar per size range, always in the order `0-5`, `6-10`, `11-25`, `26-50`,
`51-100` and `101+`, every range shown even at 0, all in the Rooms colour, each labelled with its count and its share
of the classified rooms. It SHALL read "No data in this range" when no room of the range has a class.

#### Scenario: Sizes of the range

- **GIVEN** the `roomSize` breakdown of the range with `0-5: 40`, `11-25: 8` and `101+: 2`
- **WHEN** the section renders
- **THEN** "Room size" shows six bars from top to bottom `0-5` "40 (80.0 %)", `6-10` "0 (0.0 %)", `11-25` "8
  (16.0 %)", `26-50` and `51-100` "0 (0.0 %)" and `101+` "2 (4.0 %)", all in the Rooms colour

### Requirement: Recorded rooms chart

Edition: CE. After "Room size" the Rooms section SHALL show `recordedRoomsRate` as the percentage line "Recorded
rooms" with a fitted y-axis, in the Rooms colour, requested at `1h` while the effective granularity is finer, with a gap
in every bucket without classified rooms.

#### Scenario: Recorded share per hour

- **GIVEN** the default 24 h range at `auto` whose `recordedRoomsRate` points range from 20.0 to 40.0, with `null` at
  night
- **WHEN** the section renders
- **THEN** "Recorded rooms" is requested with `granularity=1h`, reads "Hourly" in its note, draws one line with gaps at
  night and fits its y-axis to the data
