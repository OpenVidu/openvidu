## MODIFIED Requirements

### Requirement: Status endpoint

Edition: CE. `GET /api/v1/status` SHALL require a bearer token, take no parameters and answer `200` with `generatedAt`
(the MongoDB clock), `schema` and `migration` with the same shapes and sources as `GET /api/v1/info`, and
`writer { lastSeenAt?, stoppedAt?, batchIntervalMs? }`. A node document is alive while it has no `stoppedAt` and its
`lastSeenAt` is within `max(30 s, 1.5 × I + 5 s)`, I being its `batchIntervalMs` (10 s when absent). The response
carries `Cache-Control: private, no-store`.

#### Scenario: Running migration
- **GIVEN** two nodes last seen 4 s and 12 s ago, both with `batchIntervalMs: 10000`, writer schema 1 equal to the dashboard's and a migration with `processed` 400000 of `total` 1200000
- **WHEN** the client requests `GET /api/v1/status` with a valid token
- **THEN** the response is `200`, `writer` is `{ lastSeenAt, batchIntervalMs: 10000 }` with the 4 s old timestamp, `schema.status` is `"ok"` and `migration` is `{ state: "running", progress: { processed: 400000, total: 1200000, startedAt } }`

#### Scenario: Writer never seen
- **GIVEN** empty `nodes` and `schema_meta` collections
- **WHEN** the client requests the status
- **THEN** `writer` is `{}`, `schema.status` is `"uninitialized"` and `migration.state` is `"none"`

#### Scenario: Server stopped
- **GIVEN** one node document with `stoppedAt` 12:00:04 and `lastSeenAt` 12:00:04, and no other node seen since
- **WHEN** the client requests the status at 12:00:10
- **THEN** `writer.lastSeenAt` and `writer.stoppedAt` are 12:00:04

#### Scenario: Restarted after a stop
- **GIVEN** a node document with `stoppedAt` and a newer node document seen 3 s ago without it
- **WHEN** the client requests the status
- **THEN** `writer` has no `stoppedAt` and `writer.lastSeenAt` is the newer document's

#### Scenario: One of several nodes stopped
- **GIVEN** a node document stopped 2 s ago and another one seen 6 s ago, alive
- **WHEN** the client requests the status
- **THEN** `writer` has no `stoppedAt`

#### Scenario: A node stopped reporting
- **GIVEN** `node-a` seen 4 s ago and `node-b` seen 50 s ago, neither with `stoppedAt`
- **WHEN** the client requests the status
- **THEN** `writer.lastSeenAt` is the 4 s old timestamp and `writer` has no `stoppedAt`

#### Scenario: Each node judged by its own interval
- **GIVEN** `node-a` with `batchIntervalMs: 60000` seen 80 s ago, and `node-b` with `batchIntervalMs: 10000` stopped
  and last seen 2 minutes ago
- **WHEN** the client requests the status
- **THEN** `writer` has no `stoppedAt` (`node-a` is alive within its 95 s window) and `writer.batchIntervalMs` is
  `60000`

#### Scenario: Largest interval of the last hour
- **GIVEN** `node-a` with `batchIntervalMs: 10000` seen 5 s ago, `node-b` with `30000` seen 20 minutes ago and `node-c` with `60000` seen 2 hours ago
- **WHEN** the client requests the status
- **THEN** `writer.batchIntervalMs` is `30000`

#### Scenario: Nodes without a reported interval
- **GIVEN** one node seen 25 s ago whose document has no `batchIntervalMs`
- **WHEN** the client requests the status
- **THEN** `writer` has `lastSeenAt` and no `batchIntervalMs`

#### Scenario: No token
- **WHEN** the client requests `GET /api/v1/status` without `Authorization`
- **THEN** the response is `401` with code `UNAUTHORIZED`

#### Scenario: Writer fields
- **WHEN** a client with a bearer token requests `GET /api/v1/status`
- **THEN** `writer.lastSeenAt` is the newest `nodes.lastSeenAt`, `writer.stoppedAt` the `stoppedAt` of the document
  with that `lastSeenAt` when no node document is alive at `generatedAt` (absent otherwise), and
  `writer.batchIntervalMs` the largest `nodes.batchIntervalMs` among the nodes whose `lastSeenAt` is within one hour of
  `generatedAt`, absent when none of them reports one
