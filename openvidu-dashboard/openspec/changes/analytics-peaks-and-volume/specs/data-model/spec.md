## MODIFIED Requirements

### Requirement: Rollups
Edition: CE and PRO. `analytics_5min`, `analytics_hourly` and `analytics_daily` SHALL hold one document per
scope (`global`, and `node:<label>` for a labelled server's media node) and bucket with pre-aggregated counters. Map
keys SHALL be enum names or a fixed vocabulary, never user input. Participant counters SHALL count STANDARD sessions
only, except `participants.byKind` and the 5-minute `participants.connected` (participants with stats), which count
every kind.

#### Scenario: Fields of the rollup documents
- **WHEN** hourly or daily rollup documents are read
- **THEN** they have counters for rooms (created, ended, by end reason, `durationMsSum`, `participantsSum`), participants (joined, active, aborted, left, by kind, SDK, OS, browser, connection type, disconnect reason, connect time, minutes), tracks, egress (started, by type, by end status, duration), ingress sessions (started, ended, started by input type, duration), bytes, quality (score sum/count, poor, lost), API calls and API errors (total and by method), and daily documents also `uniqueIdentities` (set by the server's aggregator once the UTC day has closed); 5-minute documents have bytes, quality, `participants.connected` (distinct participants with stats), the `PARTICIPANT_ACTIVE` count and the lifecycle counters (rooms created/ended, participants joined/left/aborted, egress started/ended); documents of the three collections may also have `rooms.peakActive`, `participants.peakActive` and `egress.peakActive`, and hourly and daily documents `ingress.peakActive` (int32, written by the server's aggregator)

#### Scenario: Peaks of active rooms and participants
- **GIVEN** the server's aggregator counted 4 active rooms and 11 active STANDARD sessions at 10:01 UTC and 6 and 9 at 10:40 UTC, no more at any other minute of that hour, and no server wrote any other counter in it
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute document of `…T10:00:00Z` has `rooms.peakActive: 4` and `participants.peakActive: 11`, the one of `…T10:40:00Z` has 6 and 9, and the hourly document of `…T10:00:00Z` has `rooms.peakActive: 6` and `participants.peakActive: 11` and no other counter

#### Scenario: Peaks of active egress and ingress
- **GIVEN** the server's aggregator counted 2 open egresses and 1 publishing ingress session at 10:01 UTC and 3 and 0 at 10:40 UTC, no more at any other minute of that hour
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:00:00Z` and `…T10:40:00Z` have `egress.peakActive` 2 and 3 and no `ingress` field, and the hourly document of `…T10:00:00Z` has `egress.peakActive: 3` and `ingress.peakActive: 1`

#### Scenario: Five-minute bandwidth
- **GIVEN** stats flushed between 10:00 and 10:05 UTC
- **WHEN** `analytics_5min` is read for `global:…T10:00:00Z`
- **THEN** `bytes.up` and `bytes.down` equal the sum of the flushed upstream and downstream bytes and `quality.scoreCount` equals the number of samples

#### Scenario: Hourly counters
- **GIVEN** five rooms created and two ended between 10:00 and 11:00 UTC on a server with the media node label `mn-a`
- **WHEN** the events are processed
- **THEN** `analytics_hourly` has `global:2026-…T10:00:00Z` and `node:mn-a:2026-…T10:00:00Z` with `rooms.created: 5` and `rooms.ended: 2`

#### Scenario: Replayed batch does not double count
- **GIVEN** a batch whose raw events were already inserted
- **WHEN** the batch is processed again
- **THEN** rollup counters are unchanged

#### Scenario: Services in rollups
- **GIVEN** between 10:00 and 11:00 UTC three STANDARD, one EGRESS and one AGENT participant joined, and the AGENT left after 10 minutes
- **WHEN** the hourly rollup is read
- **THEN** `participants.joined` is 3, `participants.left` is 0, `participants.minutes` counts only the STANDARD sessions and `participants.byKind` is `{ STANDARD: 3, EGRESS: 1, AGENT: 1 }`

#### Scenario: Ingress sessions by input type
- **GIVEN** two RTMP and one WHIP ingress sessions started between 10:00 and 11:00 UTC
- **WHEN** the hourly rollup is read
- **THEN** it has `ingress.sessionsStarted: 3` and `ingress.byInputType: { rtmp: 2, whip: 1 }`

### Requirement: Generated active peaks
Edition: CE and PRO. The data generator SHALL write `rooms.peakActive` and `participants.peakActive` on every rollup
document it writes, and `egress.peakActive` on every global one and `ingress.peakActive` on every global hourly and
daily one, from the generated rooms, STANDARD sessions, egresses and ingress sessions active at each minute of the
bucket counted as the server's aggregator counts them, and SHALL write the global documents of the buckets without
activity with every peak at `0`.

#### Scenario: Generated peaks
- **GIVEN** a database generated with `--five-minute-rollups` whose rooms `A` (10:00–10:20 UTC) and `B` (10:10–10:30 UTC) are the only ones that day, each with one STANDARD session for its whole life
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:10:00Z` and `…T10:15:00Z` have `rooms.peakActive: 2` and `participants.peakActive: 2`, the one of `…T10:25:00Z` has 1 and 1, and the hourly document of `…T10:00:00Z` has 2 and 2

#### Scenario: Generated egress and ingress peaks
- **GIVEN** a generated egress of room `A` from 10:05 to 10:15 UTC and an ingress session from 10:12 to 10:40 UTC, the only ones that day
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the `global` scope
- **THEN** the 5-minute documents of `…T10:05:00Z` and `…T10:10:00Z` have `egress.peakActive: 1`, the one of `…T10:20:00Z` has `egress.peakActive: 0`, none has an `ingress` field, and the hourly document of `…T10:00:00Z` has `egress.peakActive: 1` and `ingress.peakActive: 1`

#### Scenario: Idle generated hour
- **GIVEN** a generated range with an hour without any room
- **WHEN** `analytics_hourly` is read for that hour and the `global` scope
- **THEN** the document exists with `rooms.peakActive: 0`, `participants.peakActive: 0`, `egress.peakActive: 0` and `ingress.peakActive: 0`

## ADDED Requirements

### Requirement: Egress and ingress rollups in the global scope only
Edition: CE and PRO. Egress and ingress counters and peaks SHALL be written to the `global` rollup documents only: a
`node:<label>` document SHALL carry no `egress` or `ingress` field, because the media node that runs an egress or an
ingress session is not known.

#### Scenario: Egress and ingress on a labelled server
- **GIVEN** a server with the media node label `mn-a` that writes the start and end of an egress and of an ingress session between 10:00 and 11:00 UTC, while the aggregator samples both active
- **WHEN** `analytics_5min` and `analytics_hourly` are read for the bucket
- **THEN** the `global` documents have the egress and ingress counters and peaks, and the `node:mn-a` documents have neither an `egress` nor an `ingress` field

### Requirement: Generated egress and ingress rollups stay global
Edition: CE and PRO. The data generator SHALL write the egress and ingress counters and peaks into the global rollup
documents only, and SHALL write no `mediaNode` on egresses or ingress sessions, with or without `--media-nodes`.

#### Scenario: Labelled generated database
- **GIVEN** a database generated with `--media-nodes --node-rollups`
- **WHEN** the rollups, `egresses` and `ingress_sessions` are read
- **THEN** no `node:` rollup document has an `egress` or `ingress` field, the global documents count every generated egress and ingress session, and no egress or ingress session has a `mediaNode` field
