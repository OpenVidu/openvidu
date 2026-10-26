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

- **GIVEN** a summary without `avgRoomSize`
- **WHEN** the Rooms section tiles render
- **THEN** the Average room size tile reads "n/a" with the hint "Not provided by this server version"

### Requirement: Rooms section

Edition: CE. The Rooms section SHALL show a bar chart of `roomsCreated` and `roomsEnded` per bucket and the tiles
Average room size (rounded to a whole number of participants) and Average room duration (in the shared duration
format) from the summary.

#### Scenario: Rooms over 24 hours

- **GIVEN** the default range at `auto` and a summary with `avgRoomSize: 4.4` and `avgRoomDurationMs: 360000`
- **WHEN** the section renders
- **THEN** the chart shows 288 five-minute buckets with two bar series in fixed colours and the tiles read
  "4 participants" and "6 m 00 s"

### Requirement: Participants section

Edition: CE. The Participants section SHALL show `participantsJoined` and `participantsAborted` as lines,
`connectionSuccessRate` as a percentage line in its own chart, a participant kind breakdown without SIP, CONNECTOR and
BRIDGE in which every kind has a distinct colour, and `uniqueIdentities` as bars per UTC day only when the effective
granularity is `1d`, otherwise a hint that unique identities are available at daily granularity.

#### Scenario: Weekly range hides unique identities

- **GIVEN** `from=now-7d` at `auto`
- **WHEN** the section renders
- **THEN** no `uniqueIdentities` series is requested and the card shows "Unique identities are available at daily
  granularity" with a "Switch to 1 d" action

#### Scenario: Daily override

- **GIVEN** `granularity=1d`
- **WHEN** the section renders
- **THEN** the unique identities bars are shown with the note "per UTC day" under the chart title, clear of the legend

#### Scenario: Kind breakdown

- **GIVEN** a breakdown with `STANDARD: 900`, `EGRESS: 40`, `AGENT: 12`, `INGRESS: 3` and `SIP: 1`
- **WHEN** the section renders
- **THEN** the chart shows Standard, Egress, Agent and Ingress, each in a different palette colour, and no SIP entry

### Requirement: Client breakdowns section

Edition: CE. The Client breakdowns section SHALL show SDK, OS, browser and connection type from the breakdowns
endpoint as donuts with legend, direct labels, fixed colours per key, "Other" beyond eight entries and a table toggle
listing key, count and percent, every SDK, OS and connection type key shown by its shared friendly label (browser
names as stored) and every percent in the shared percent format ("62.8 %").

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
`egressDurationMs`), `egressStarted` as the bar chart "Egress started" beside the "Egress type" donut, and the
`egressEnded.<status>` series as the stacked bar chart "Egress ended by status"; each chart requested at `1h` while
the effective granularity is finer reads the "Hourly" note under its title.

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

Edition: CE. The Ingress section SHALL render right after the Egress section and before the Quality card, never
locked, with the tiles Total sessions (`ingressSessions` of the summary) and Total duration (`ingressDurationMs` of
the summary), `ingressSessions` as the bar chart "Ingress sessions", which reads "Hourly" in its note while it is
requested at `1h` below an effective `1h`, and the `ingressInputType` breakdown as the donut "Ingress input type".

#### Scenario: Ingress sessions

- **GIVEN** a summary with `ingressSessions: 12` and `ingressDurationMs: 21600000`
- **WHEN** the card renders
- **THEN** bars per bucket are drawn and the tiles read Total sessions "12" and Total duration "6 h 00 m"

#### Scenario: Ingress input type donut

- **GIVEN** a breakdown `ingressInputType` with `rtmp` 8, `whip` 3 and `url` 1
- **WHEN** the card renders
- **THEN** the donut "Ingress input type" shows the slices RTMP 8 (66.7 %), WHIP 3 (25.0 %) and URL 1 (8.3 %)

#### Scenario: Ingress in CE

- **GIVEN** the UI loaded `features: []`
- **WHEN** the Analytics page renders
- **THEN** the Ingress section follows the Egress section and precedes the locked Quality card, shows its data without
  a lock, and its ingress series request is sent

### Requirement: Per-node scope selector

Edition: CE. Without `per-node-breakdown` the page header SHALL show the scope selector disabled on "All nodes"
with a lock icon whose tooltip says per-node analytics is available in OpenVidu PRO.

#### Scenario: Locked in CE

- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the header renders
- **THEN** the selector reads "All nodes", is disabled with the lock icon and no `/analytics/scopes` request is sent

### Requirement: CSV export per section

Edition: CE. Every section card except Top rooms SHALL have an "Export CSV" action in its header that downloads the CSV
of the card's series or breakdowns with the current URL parameters through the shared HTTP service, saves it under the
server file name and is disabled on locked cards.

#### Scenario: Bandwidth export

- **GIVEN** the Bandwidth card over the last 7 days
- **WHEN** the user clicks "Export CSV"
- **THEN** `GET /api/v1/analytics/export.csv?kind=series&metrics=bytesUp,bytesDown&from=…&to=…&tz=…&granularity=…`
  is requested with the bearer token and the browser saves `analytics-series-….csv`

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
- **THEN** the note of "Rooms created and ended" names the five-minute bucket and Europe/Madrid, and the note of
  "Egress ended by status" reads "Hourly" with Europe/Madrid

#### Scenario: Daily unique identities

- **GIVEN** `granularity=1d` and `tz=Europe/Madrid`
- **WHEN** the unique identities chart renders
- **THEN** its note reads "per UTC day" and names UTC, not Europe/Madrid
