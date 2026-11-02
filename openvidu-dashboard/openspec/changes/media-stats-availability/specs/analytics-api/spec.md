## ADDED Requirements

### Requirement: Media statistics coverage

Edition: CE. The summary SHALL carry `mediaStats: "none"` when every `nodes` document of its scope whose heartbeat span
(`firstSeenAt` to `lastSeenAt`) overlaps the range has `mediaStats: false`, `mediaStats: "partial"` when only some do,
and no `mediaStats` property when none does or no node document overlaps the range. The `global` scope covers every
node, a `node:<id>` scope that node only.

#### Scenario: No server reports media statistics

- **GIVEN** two nodes seen during the range, both with `mediaStats: false`
- **WHEN** the summary is requested
- **THEN** the body has `mediaStats: "none"` and still carries `bytesUp` and `bytesDown`

#### Scenario: Some servers report media statistics

- **GIVEN** a node with `mediaStats: false` and a node with `mediaStats: true` seen during the range
- **WHEN** the summary is requested with the `global` scope
- **THEN** the body has `mediaStats: "partial"`

#### Scenario: Node scope

- **GIVEN** the same two nodes and `scope=node:<id>` of the node with `mediaStats: true`
- **WHEN** the summary is requested
- **THEN** the body has no `mediaStats` property

#### Scenario: Node seen outside the range

- **GIVEN** a node with `mediaStats: false` whose `lastSeenAt` is earlier than `from`, and a node with
  `mediaStats: true` seen during the range
- **WHEN** the summary is requested
- **THEN** the body has no `mediaStats` property
