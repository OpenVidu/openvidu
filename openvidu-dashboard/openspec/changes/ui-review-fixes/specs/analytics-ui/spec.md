## MODIFIED Requirements

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

Edition: CE. The Rooms section SHALL show a bar chart of `roomsCreated` and `roomsEnded` per bucket and the tiles
Average room size (rounded to a whole number of participants) and Average room duration (in the shared duration
format) from the summary; with `roomsEnded: 0` both tiles read "n/a" with the hint "No room ended in this range".

#### Scenario: Rooms over 24 hours

- **GIVEN** the default range at `auto` and a summary with `avgRoomSize: 4.4` and `avgRoomDurationMs: 360000`
- **WHEN** the section renders
- **THEN** the chart shows 288 five-minute buckets with two bar series in fixed colours and the tiles read
  "4 participants" and "6 m 00 s"

#### Scenario: No room ended yet

- **GIVEN** a summary with `roomsCreated: 2`, `roomsEnded: 0` and neither average
- **WHEN** the section renders
- **THEN** both tiles read "n/a" with the hint "No room ended in this range"

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
