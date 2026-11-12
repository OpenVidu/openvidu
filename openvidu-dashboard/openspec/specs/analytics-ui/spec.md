# analytics-ui Specification

## Purpose
The Analytics page: usage of the deployment over the global time range as KPI tiles, time-series charts and
breakdowns (ingress with its input type included), with locked cards for quality, diagnostics and top rooms, a locked
per-node scope, and CSV export per section.

## Requirements

### Requirement: Analytics route and URL state

Edition: CE. `/analytics` SHALL be a range-scoped route whose state lives only in `from`, `to`, `tz`, `granularity`
(default `auto`) and `scope` (default `global`); invalid values SHALL fall back silently, and `scope` SHALL be
dropped when `per-node-breakdown` is not enabled.

#### Scenario: Deep link

- **GIVEN** `/analytics?from=now-7d&to=now&tz=UTC&granularity=1h`
- **WHEN** the page opens in a new browser
- **THEN** every request carries the same range and `granularity=1h`, and the selectors show "Last 7 days", "UTC"
  and "1 h"

#### Scenario: Node scope in CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** `/analytics?scope=node:n1` opens
- **THEN** the URL is rewritten without `scope` and every request uses the global scope

### Requirement: Granularity selector

Edition: CE. The granularity selector SHALL offer `auto`, its label always naming what `auto` resolves to for the
current range whatever value is selected, and only the explicit values the API accepts for the range; changing it SHALL
write `granularity` to the URL. A chart of metrics stored only in hourly and daily documents SHALL be requested at `1h`
while the effective granularity is below `1h` and read "Hourly" in its subtitle.

#### Scenario: Seven-day range

- **GIVEN** `from=now-7d&to=now&granularity=auto`
- **WHEN** the selector renders
- **THEN** it reads "auto (1 h)" and offers `1h`, `6h` and `1d`, not `5m` or `15m`

#### Scenario: Explicit value selected

- **GIVEN** `from=now-7d&to=now&granularity=1d`
- **WHEN** the user opens the selector
- **THEN** "1 d" is selected and the auto option reads "auto (1 h)"

#### Scenario: Hourly-only chart on the default range

- **GIVEN** the default 24 h range at `auto`
- **WHEN** the Egress section renders
- **THEN** the `egressStarted` chart is requested at `5m` and the `egressEnded` chart at `1h` with 24 buckets and the
  subtitle "Hourly"

#### Scenario: Old 24-hour range

- **GIVEN** an absolute 24 h range that ended 30 days ago and a 5-minute rollup retention of 7 d
- **WHEN** the selector renders
- **THEN** it reads "auto (1 h)" and offers `1h`, `6h` and `1d`

#### Scenario: Short 5-minute rollup retention

- **GIVEN** `GET /api/v1/info` reports `retention.statsMs` of 7 d and `retention.rollups5MinMs` of 2 d, and an
  absolute 24 h range that ended 3 days ago
- **WHEN** the selector renders
- **THEN** it reads "auto (1 h)" and does not offer `5m` or `15m`

#### Scenario: Explicit values of the range

- **WHEN** the selector lists its explicit values for the current range
- **THEN** it offers `5m` and `15m` only for ranges of at most 24 h inside the 5-minute rollup retention, and no value
  above 1 000 buckets

### Requirement: KPI tiles

Edition: CE. The tile row SHALL show, in this order, Rooms created, Participant sessions, Unique identities (labelled
"sum of N UTC days"), Data up / down (up and down on two lines, each with its arrow), Connection success, Egress
(count and total duration) and Ingress (sessions and total duration) from the summary endpoint with the shared
formatters, show "n/a" with a hint for a value the summary omits and keep the last value while refreshing.

#### Scenario: Tiles from the summary

- **GIVEN** a summary with `roomsCreated: 1203`, `bytesUp: 1200000000000`, `bytesDown: 3400000000000`,
  `uniqueIdentities: { value: 4120, days: 7 }`, `ingressSessions: 12` and `ingressDurationMs: 21600000`
- **WHEN** the tiles render
- **THEN** they read "1,203", "↑ 1.2 TB" over "↓ 3.4 TB" under "Data up / down", "4,120" with the label "Unique
  identities (sum of 7 UTC days)", and the Ingress tile "12" with the hint "6 h 00 m in total"

#### Scenario: Tile order

- **WHEN** the tile row renders
- **THEN** the labels read Rooms created, Participant sessions, Unique identities, Data up / down, Connection
  success, Egress and Ingress

#### Scenario: Missing average

- **GIVEN** a summary with `roomsEnded: 12` and without `avgRoomSize`
- **WHEN** the Rooms section tiles render
- **THEN** the Average room size tile reads "n/a" with the hint "Not provided by this server version"

### Requirement: Rooms section

Edition: CE. The Rooms section SHALL show the tiles Average room size (rounded to a whole number of participants) and
Average room duration (in the shared duration format) from the summary, then `roomsPeakActive` as the area chart
"Active rooms" beside `roomsCreated` as the bar chart "Rooms created", the two alone in the first row of charts. The
card SHALL read "No data in this range" only when no peak is above 0 and no room was created.

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
`uniqueIdentities` as the bar chart "Unique identities" per UTC day, a participant kind breakdown without SIP,
CONNECTOR and BRIDGE in which every kind has a distinct colour, and `connectionSuccessRate` as the percentage line
"Connection success" with a fitted y-axis.

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

### Requirement: Client breakdowns section

Edition: CE. The Client breakdowns section SHALL show SDK, OS, browser and connection type from the breakdowns
endpoint as donuts with legend, direct labels, fixed colours per key, "Other" beyond eight entries and a table toggle
listing key, count and percent, every key shown by its shared friendly label and every percent in the shared percent
format ("62.8 %").

#### Scenario: Nine SDKs

- **GIVEN** nine SDK keys in the range
- **WHEN** the SDK donut renders
- **THEN** eight slices plus "Other" are drawn and the table toggle lists all nine with counts and percentages

#### Scenario: Donut percent

- **GIVEN** an SDK breakdown in which `js` holds 628 of 1 000 sessions
- **WHEN** the SDK donut renders
- **THEN** the direct label of its slice and the percent column of its table read "62.8 %"

#### Scenario: Friendly labels

- **GIVEN** a connection type breakdown with a known key and a key the label map does not know
- **WHEN** the donut and its table render
- **THEN** the known key reads its friendly label and the other key reads as stored

#### Scenario: Sessions without a browser

- **GIVEN** a browser breakdown with `chrome: 5` and `none: 5`
- **WHEN** the browser donut renders
- **THEN** its slices read "Chrome: 50.0 %" and "No browser: 50.0 %"

### Requirement: Bandwidth section

Edition: CE. The Bandwidth section, headed "Data transferred", SHALL show `bytesUp` and `bytesDown` per bucket in the
area chart "Data up / down", one unstacked area per direction with byte formatting, and the two totals from the summary
as tiles.

#### Scenario: Bandwidth chart

- **GIVEN** series with bytes in half of the buckets
- **WHEN** the chart renders
- **THEN** the x-axis spans the whole range, empty buckets read 0 and the tooltip formats values as "1.2 GB"

#### Scenario: Unstacked directions

- **GIVEN** a bucket with 2 GB up and 3 GB down
- **WHEN** the chart titled "Data up / down" renders
- **THEN** the Down area reaches 3 GB from zero, not 5 GB on top of the Up area

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

#### Scenario: Legend names

- **WHEN** the Egress and Ingress sections render
- **THEN** the legends of "Egress started" and "Ingress sessions" read "Egress started" and "Ingress sessions", their
  chart names, as those of "Rooms created" and "Participant sessions" do

#### Scenario: Range before the egress samples

- **GIVEN** a 7-day range whose `egressPeakActive` points are `null` for the first 5 days and whose `egressStarted`
  points are above 0 on those days
- **WHEN** the section renders
- **THEN** "Active egress" has a gap over the first 5 days and "Egress started" draws their bars

### Requirement: PRO strip and locked cards

Edition: CE. Right after the Ingress section, in the same column of cards as the CE sections, the page SHALL render
the cards Quality, Diagnostics and Top rooms; when the matching feature is disabled each card SHALL render the compact
in-card lock, sized to its message rather than to the real card, without any request.

#### Scenario: Strip in CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** the Analytics page renders
- **THEN** the three PRO cards follow the Ingress section and show the compact lock with their feature title, each
  only as tall as its message, and no request to `/analytics/top`, `/analytics/scopes` or a PRO metric is sent

### Requirement: Diagnostics section

Edition: CE. Without `analytics-diagnostics` the Diagnostics card SHALL render its lock, reading "Diagnostics is
available in OpenVidu PRO".

#### Scenario: Locked in CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** the card renders
- **THEN** its heading reads "Diagnostics" and the lock reads "Diagnostics is available in OpenVidu PRO"

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
- **THEN** the requested metrics are `roomsPeakActive,roomsCreated,recordedRoomsRate` at `1h`,
  `participantsPeakActive,participantsJoined,connectionSuccessRate` at `auto`,
  `egressPeakActive,egressStarted,egressEnded` at `1h` and `ingressPeakActive,ingressSessions` at `1h`; at
  `granularity=1d` the Participants export adds `uniqueIdentities`

#### Scenario: Export failure

- **WHEN** the export request fails
- **THEN** a toast shows the error message and request id and the card stays interactive

### Requirement: Card states

Edition: CE. Each card SHALL show a skeleton of its height only until its first data, "No data in this range" with a
"Widen range" action, only as tall as that message, when every point is empty, and, when its request fails, the shared
error notice with retry and request id above the card's last content, without affecting other cards; the page SHALL show
an info banner when `from` is older than the retention of the source collection.

#### Scenario: One card fails

- **GIVEN** the breakdowns request fails and the series requests succeed
- **WHEN** the page renders
- **THEN** the Client breakdowns card shows the error notice with "Retry" and the other cards show their data

#### Scenario: Failed refresh keeps the content

- **GIVEN** every card showing data
- **WHEN** a manual refresh fails for the series of the Rooms card
- **THEN** the Rooms card keeps its chart and tiles under the error notice, and no skeleton replaces them

#### Scenario: Empty card

- **GIVEN** a range in which the Egress card has no data
- **WHEN** the page renders
- **THEN** the Egress card shows "No data in this range" with "Widen range", only as tall as that message and not as
  tall as its charts would be

#### Scenario: Range older than the hourly retention

- **GIVEN** `from` 500 days ago and an hourly retention of 400 d
- **WHEN** the page renders
- **THEN** a banner reads "Hourly data older than 400 days is not retained; daily values are shown" and the charts use
  `1d`

### Requirement: Analytics refresh

Edition: CE. The page SHALL NOT refresh on its own, whatever the range: the header's refresh control SHALL show only
the manual refresh button and the last update time, without an interval menu, and a manual refresh SHALL re-query
every section with one request per endpoint, keep the previous values while it runs and update the charts in place.

#### Scenario: Absolute range

- **GIVEN** `from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z`
- **WHEN** the page is open for several refresh intervals
- **THEN** no further analytics requests are sent after the initial load

#### Scenario: Relative range

- **GIVEN** `from=now-24h&to=now`
- **WHEN** the page is open for several minutes
- **THEN** no further analytics requests are sent after the initial load, and the header shows the refresh button
  and "updated hh:mm:ss" with no interval menu

#### Scenario: Manual refresh

- **GIVEN** the page loaded with `from=now-24h&to=now`
- **WHEN** the user presses the refresh button
- **THEN** each analytics endpoint the page uses is requested once, the cards keep their values until the answers
  arrive, and the charts update without a skeleton

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

### Requirement: Scope selector only with per-node breakdown

Edition: CE. Without `per-node-breakdown` the page header SHALL show no scope selector, lock or text about nodes and
send no `/analytics/scopes` request; with it, it renders the scope selector the edition provides, whose node options
are `node:<label>` scopes.

#### Scenario: Nothing per node in CE

- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the header renders
- **THEN** it has the range, time zone and granularity controls and no scope selector or lock, and no
  `/analytics/scopes` request is sent

### Requirement: Media statistics coverage warnings

Edition: CE. With `mediaStats: "none"` in the summary, the Data up / down tile SHALL be unavailable and carry the
range `none` warning, and the Data transferred section SHALL keep its tiles and chart, unavailable, with that warning
on its heading. With `"partial"`, the tile and the section heading SHALL carry the range `partial` warning and keep
their values. Without `mediaStats`, neither carries a warning. No notice replaces the section's content.

#### Scenario: No server reports media statistics

- **GIVEN** a summary with `mediaStats: "none"`, `bytesUp: 0` and `bytesDown: 0`
- **WHEN** the page renders
- **THEN** the Data up / down tile reads an unavailable "—" with the warning after its label, and the Data
  transferred section shows the warning after its heading, the Total up and Total down tiles unavailable and the "Data
  up / down" chart unavailable over the whole range

#### Scenario: Some servers report media statistics

- **GIVEN** a summary with `mediaStats: "partial"`, `bytesUp: 1200000000` and `bytesDown: 3400000000`
- **WHEN** the page renders and the user opens the warning of the Data transferred heading
- **THEN** the tile reads "↑ 1.2 GB" over "↓ 3.4 GB" with the warning after its label, the chart renders its data at
  full strength, and the tooltip reads "This data comes only from rooms on servers using Pion as RTC engine.
  mediasoup does not generate media statistics yet. They will be available soon."

#### Scenario: Every server reports media statistics

- **GIVEN** a summary without `mediaStats`
- **WHEN** the page renders
- **THEN** neither the tile nor the Data transferred section carries a warning or the unavailable state

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
