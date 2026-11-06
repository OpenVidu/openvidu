## MODIFIED Requirements

### Requirement: Nodes
Edition: CE and PRO. The `nodes` collection SHALL hold one document per server process (its node id: a restart
writes a new one) with `firstSeenAt`, `lastSeenAt`, `serverVersion`, `batchIntervalMs` (int32 milliseconds, at least
1 000), `mediaStats`, `rtcEngine` (`pion` | `mediasoup`), `rooms.hosted` and `rooms.reconciled` (int32), and the
optional `mediaNode`, `ip`, `drainingAt` and `stoppedAt`, and SHALL expire it `retention.entities` after its last
heartbeat. A field a document lacks SHALL read as its default.

#### Scenario: Node heartbeat
- **GIVEN** a node writing batches every 10 s
- **WHEN** `nodes` is read
- **THEN** its document has `lastSeenAt` within the last batch interval and `batchIntervalMs: 10000`

#### Scenario: Node document without the interval
- **GIVEN** a `nodes` document without `batchIntervalMs`
- **WHEN** the dashboard derives that node's freshness windows
- **THEN** it uses a 10 000 ms interval

#### Scenario: Interval below the minimum
- **GIVEN** the test configuration
- **WHEN** a `nodes` document with `batchIntervalMs: 500` is written
- **THEN** the write is rejected by the validator

#### Scenario: Node document without media statistics
- **GIVEN** a `nodes` document without `mediaStats`
- **WHEN** the dashboard reads it
- **THEN** it treats the node as reporting media statistics

#### Scenario: Restarted labelled server
- **GIVEN** a server with the media node label `mn-a` that stopped gracefully and started again
- **WHEN** `nodes` is read
- **THEN** it holds two documents with `mediaNode: "mn-a"`: the earlier one with `stoppedAt`, the new one with a later
  `firstSeenAt` and no `stoppedAt`

#### Scenario: Document written before the new fields
- **GIVEN** a `nodes` document without `rtcEngine` or `rooms`, with a `region`
- **WHEN** the dashboard reads it and the reconciler increments its `rooms.reconciled`
- **THEN** it reads `rtcEngine` as `pion` and both counters as 0, and the validator accepts the update with the
  `region` left in place

#### Scenario: Retention of node documents
- **GIVEN** `retention.entities: 90d` and a server whose last heartbeat was 60 days ago
- **WHEN** the TTL monitor runs
- **THEN** its document exists, and the document of a server last seen 91 days ago is gone

#### Scenario: Servers of a media node
- **WHEN** the dashboard reads the documents with `mediaNode: "mn-a"`, newest `firstSeenAt` first
- **THEN** the query uses the partial index `mediaNode_firstSeenAt` (`mediaNode` ascending, `firstSeenAt` descending,
  documents with `mediaNode` only)

### Requirement: Retention
Edition: CE and PRO. Retention SHALL be configurable per class with defaults events 7 d, stats 7 d,
tracks (tracks and subscriptions) 7 d, entities (rooms, participants, egress, ingress) 90 d, 5-minute rollups 7 d,
hourly rollups 400 d, daily rollups unlimited unless configured. A closed entity document SHALL carry `expiresAt` = its
end time plus its class retention, computed when written, and an open one `expiresAt: null`; `events`, `track_stats`,
the rollups and `nodes` expire by TTL indexes.

#### Scenario: TTL indexes
- **GIVEN** a writer that finished initialization with the default retention
- **WHEN** the TTL indexes are listed
- **THEN** `events` expires by `ts` after `retention.events`, `track_stats` by `ts` after `retention.stats`, `analytics_5min` by `bucket` after `retention.rollups_5min`, `analytics_hourly` by `bucket` after `retention.rollups_hourly`, every entity collection by `expiresAt` with `expireAfterSeconds: 0`, `nodes` by `lastSeenAt` after `retention.entities`, and `analytics_daily` has no TTL index

#### Scenario: Daily rollups with a retention
- **GIVEN** a writer that finished initialization with `retention.rollups_daily: 1825d`
- **WHEN** the TTL indexes of `analytics_daily` are listed
- **THEN** it expires by `bucket` after 1 825 days

#### Scenario: Expiry of closed entities
- **WHEN** closed entity documents are read
- **THEN** `expiresAt` is `endedAt` + `retention.entities` for rooms, `leftAt` + `retention.entities` for participants, `endedAt` (else `updatedAt`) + `retention.entities` for egresses in a terminal status, `endedAt` (else `startedAt`) + `retention.entities` for ended ingress sessions, `unpublishedAt` + `retention.tracks` for tracks, `unsubscribedAt` + `retention.tracks` for subscriptions and the failure time + `retention.tracks` for failed subscriptions

#### Scenario: Ingress definition
- **GIVEN** a reusable ingress
- **WHEN** its document is read before and after its `INGRESS_DELETED`
- **THEN** `expiresAt` is `null` before, whatever its sessions, and `deletedAt` + `retention.entities` after

#### Scenario: Entities retention change
- **GIVEN** a room closed while `retention.entities` was `90d`
- **WHEN** the writer restarts with `retention.entities: 30d`
- **THEN** that room keeps its `expiresAt` and rooms closed afterwards get `endedAt` + 30 days

#### Scenario: Active entity never expires
- **GIVEN** a room active for longer than the entities retention
- **WHEN** the TTL monitor runs
- **THEN** the room document exists

#### Scenario: Retention change applies to existing data
- **GIVEN** a deployment that changes `retention.events` from 7 d to 30 d
- **WHEN** the writer restarts
- **THEN** the TTL index of `events` has the new `expireAfterSeconds` and `schema_meta` (`_id: "retention"`) reflects the configured values

#### Scenario: Node retention follows the entities
- **GIVEN** a writer that restarts with `retention.entities: 30d` after running with the default
- **WHEN** the TTL indexes of `nodes` are listed
- **THEN** `lastSeenAt_ttl` has `expireAfterSeconds` of 30 days

### Requirement: Generated media nodes
Edition: CE and PRO. With `--media-nodes` the data generator SHALL label five media nodes `media-node-10-0-0-1` to
`-5`, with `ip` `10.0.0.1` to `.5`, one per node state an edition shows: restarted, alive, draining, not reporting
and stopped. It SHALL stamp each label on the rooms and sessions its node hosted, key the node rollup scopes
(`--node-rollups`) by it and fill `rtcEngine` and the room counters. Without it nothing carries a label and
`--node-rollups` is rejected.

#### Scenario: Labelled generated database
- **GIVEN** a database generated with `--media-nodes --node-rollups`
- **WHEN** `nodes`, `rooms` and `analytics_hourly` are read
- **THEN** there are six node documents for five labels:
  - `media-node-10-0-0-1` has two, the earlier with `stoppedAt` before the later one's `firstSeenAt`;
  - `-2` is alive;
  - `-3` is alive with `drainingAt` 20 minutes before the end of the data;
  - `-4` was last seen 3 hours before the end, without `stoppedAt`, and its rooms open at that time are closed by the
    reconciler, with `closedBy: "reconciler"`, and counted in its `rooms.reconciled`;
  - `-5` has `drainingAt` and, 10 minutes later, `stoppedAt` 30 minutes before the end.
  Every room has the `mediaNode` of its node document, each document's `rooms.hosted` equals the rooms with its
  `nodeId`, and every node scope of the rollups is `node:media-node-10-0-0-<n>`.

#### Scenario: Keep-alive and the stopped process
- **GIVEN** that database kept live by the generator's keep-alive
- **WHEN** `nodes` is read ten minutes later
- **THEN** the documents of `-1` (the later one), `-2` and `-3` have a fresh `lastSeenAt`, `-3` keeps its
  `drainingAt`, and the earlier `-1`, `-4` and `-5` keep their `lastSeenAt` and `stoppedAt`

#### Scenario: Engines of the generated nodes
- **GIVEN** a database generated with `--media-nodes --nodes-without-media-stats 1`
- **WHEN** `nodes` is read
- **THEN** the documents of the node chosen without media statistics have `mediaStats: false` and
  `rtcEngine: "mediasoup"`, and the others `mediaStats: true` and `rtcEngine: "pion"`
