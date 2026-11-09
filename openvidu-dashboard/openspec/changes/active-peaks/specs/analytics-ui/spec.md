## MODIFIED Requirements

### Requirement: Rooms section

Edition: CE. The Rooms section SHALL show `roomsPeakActive` as the step chart "Active rooms" and the tiles Average room
size (rounded to a whole number of participants) and Average room duration (in the shared duration format) from the
summary; with `roomsEnded: 0` both tiles read "n/a" with the hint "No room ended in this range". The card SHALL read
"No data in this range" only when no peak is above 0 and the summary has no room created.

#### Scenario: Rooms over 24 hours

- **GIVEN** the default range at `auto` and a summary with `avgRoomSize: 4.4` and `avgRoomDurationMs: 360000`
- **WHEN** the section renders
- **THEN** the chart "Active rooms" shows 288 five-minute buckets as one step line, the tiles read "4 participants"
  and "6 m 00 s", and no `roomsCreated` or `roomsEnded` series is drawn

#### Scenario: No room ended yet

- **GIVEN** a summary with `roomsCreated: 2`, `roomsEnded: 0` and neither average
- **WHEN** the section renders
- **THEN** both tiles read "n/a" with the hint "No room ended in this range"

#### Scenario: Range partly before the samples

- **GIVEN** a 7-day range whose `roomsPeakActive` points are `null` for the first 5 days, and a summary with
  `roomsCreated: 40`
- **WHEN** the section renders
- **THEN** the tiles and the chart are shown, and the chart has a gap over the first 5 days instead of a line at 0

#### Scenario: Range without rooms

- **GIVEN** a range whose `roomsPeakActive` points are all `0` or `null` and a summary with `roomsCreated: 0`
- **WHEN** the section renders
- **THEN** the card shows "No data in this range" with "Widen range"

### Requirement: Participants section

Edition: CE. The Participants section SHALL show `participantsPeakActive` as the step chart "Active participants",
`connectionSuccessRate` as a percentage line in its own chart, a participant kind breakdown without SIP, CONNECTOR and
BRIDGE in which every kind has a distinct colour, and `uniqueIdentities` as bars per UTC day only when the effective
granularity is `1d`, otherwise a hint that unique identities are available at daily granularity.

#### Scenario: Active participants over 24 hours

- **GIVEN** the default range at `auto`
- **WHEN** the section renders
- **THEN** the chart "Active participants" shows one step line over 288 five-minute buckets beside "Connection
  success", no "Participant sessions" chart is drawn and neither `participantsJoined` nor `participantsAborted` is
  requested

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

### Requirement: Analytics chart notes

Edition: CE. Every time-series chart of the Analytics page SHALL name, in the note under its heading, its bucket
("Hourly" for a chart requested at `1h` while the effective granularity is finer, otherwise the effective granularity)
and the time zone of its time axis; the unique identities chart names UTC and keeps "per UTC day".

#### Scenario: Default range

- **GIVEN** the default 24 h range at `auto` with `tz=Europe/Madrid`
- **WHEN** the charts render
- **THEN** the note of "Active rooms" names the five-minute bucket and Europe/Madrid, and the note of
  "Egress ended by status" reads "Hourly" with Europe/Madrid

#### Scenario: Daily unique identities

- **GIVEN** `granularity=1d` and `tz=Europe/Madrid`
- **WHEN** the unique identities chart renders
- **THEN** its note reads "per UTC day" and names UTC, not Europe/Madrid
