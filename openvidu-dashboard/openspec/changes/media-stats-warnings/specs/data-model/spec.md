## ADDED Requirements

### Requirement: Media statistics marks of the rollups
Edition: CE and PRO. A rollup document of `analytics_5min`, `analytics_hourly` or `analytics_daily` MAY carry
`mediaStats` with the optional booleans `reported` and `missing`, each only ever `true`; a document without
`mediaStats`, written before the marks existed, counts as reported. The data generator SHALL mark its rollups as the
writer does, from the `mediaStats` of the node of each room or session it counts.

#### Scenario: Validator
- **GIVEN** the contract validators
- **WHEN** an hourly document with `mediaStats: { reported: true, missing: true }` is written, and then one with
  `mediaStats: { other: true }`
- **THEN** the first is accepted and the second is rejected

#### Scenario: Generated rollups of nodes without media statistics
- **GIVEN** a database generated with `--nodes-without-media-stats 1` over three nodes
- **WHEN** the hourly `global` documents and the node scope documents are read
- **THEN** the `global` buckets with rooms of both kinds have both marks, and each node scope bucket has only the
  mark of its node

#### Scenario: Generated rollups of servers reporting media statistics
- **GIVEN** a database generated without `--nodes-without-media-stats`
- **WHEN** the rollups are read
- **THEN** every document with counters has `mediaStats.reported: true` and none has `mediaStats.missing`
