# server-aggregator Specification

## Purpose
Writes the analytics values that no single server's writer can compute from its own events: the peaks of rooms and
participants active at once, and the daily unique identities, from one node at a time.

## Requirements

### Requirement: Leader-only periodic runs
Edition: CE and PRO servers. Whenever analytics is enabled, aggregator runs SHALL execute on one node at a time, chosen
by a Redis lock (`analytics-aggregator-lock`, or the local mutex without Redis), every 60 s and once right after the
writer initializes the database; a lock lost in a Redis restart SHALL be re-acquired without manual intervention.

#### Scenario: Two nodes
- **GIVEN** two server nodes with analytics enabled
- **WHEN** 5 minutes pass
- **THEN** `openvidu_analytics_aggregator_runs_total` grows by about five across both nodes, and only one node at a time increments it

#### Scenario: Startup run
- **GIVEN** a single node starting with 2 active rooms in the store
- **WHEN** the writer finishes initializing the database
- **THEN** within a few seconds the 5-minute global rollup of the current bucket has `rooms.peakActive: 2`, without waiting 60 s

#### Scenario: Redis restart
- **GIVEN** a leader holding the lock
- **WHEN** Redis restarts
- **THEN** within 2 minutes a node holds the lock again and runs resume

### Requirement: Independent of the reconciler
Edition: CE and PRO servers. The aggregator SHALL run whatever `openvidu.analytics.reconciler.enabled` says, under a
lock of its own, so the reconciler and the aggregator may run on different nodes; it SHALL add no configuration key.

#### Scenario: Reconciler disabled
- **GIVEN** `reconciler.enabled: false`, one active room and a closed UTC day whose global daily document lacks `uniqueIdentities`
- **WHEN** 5 minutes pass after 00:05 UTC
- **THEN** the current 5-minute rollup has `rooms.peakActive: 1` and the closed day has its `uniqueIdentities`

### Requirement: Active peaks
Edition: CE and PRO servers. Every run SHALL count the rooms with status `active` and the STANDARD participant sessions
with status `active`, and write the counts with `$max` as `rooms.peakActive` and `participants.peakActive` into the
global documents of the bucket containing the run time in `analytics_5min`, `analytics_hourly` and `analytics_daily`,
writing `0` when nothing is active.

#### Scenario: Busy minute
- **GIVEN** 3 active rooms, 7 active and 1 `joining` STANDARD sessions, and 2 active EGRESS sessions
- **WHEN** a run executes at 10:02 UTC
- **THEN** the global documents of `…T10:00:00Z` in `analytics_5min` and `analytics_hourly`, and of that UTC day in `analytics_daily`, have `rooms.peakActive` of at least 3 and `participants.peakActive` of at least 7

#### Scenario: Peak kept across samples
- **GIVEN** runs at 10:01 and 10:03 UTC that count 4 and then 2 active rooms
- **WHEN** both have written
- **THEN** the 5-minute document of `…T10:00:00Z` keeps `rooms.peakActive: 4`, and the hourly document of `…T10:00:00Z` has at least 4

#### Scenario: Idle deployment
- **GIVEN** no active room or session
- **WHEN** a run executes
- **THEN** the global documents of the current bucket exist with `rooms.peakActive: 0` and `participants.peakActive: 0`, and no other counter is set by the run

#### Scenario: Media statistics marks untouched
- **WHEN** a run writes a rollup document
- **THEN** it sets neither `mediaStats.reported` nor `mediaStats.missing`

### Requirement: Active peaks per media node
Edition: CE and PRO servers. Every run SHALL also write the peaks into the `node:<label>` documents of each media node
label held by an active room or session (counting the entities with that `mediaNode`) and of each live labelled node (a
`nodes` document with that `mediaNode`, without `stoppedAt` and within its silent window), with `0` when that label has
nothing active; entities without a label count in the global scope only.

#### Scenario: Two media nodes
- **GIVEN** active rooms `mediaNode: "mn-1"` (2) and `"mn-2"` (1), holding 5 and 2 active STANDARD sessions with the same labels
- **WHEN** a run executes
- **THEN** the `node:mn-1` documents of the current buckets have `rooms.peakActive` at least 2 and `participants.peakActive` at least 5, and `node:mn-2` at least 1 and 2

#### Scenario: Idle live node
- **GIVEN** a node document with `mediaNode: "mn-3"`, a `lastSeenAt` 5 s ago, no `stoppedAt` and no active entity on `mn-3`
- **WHEN** a run executes
- **THEN** the `node:mn-3` documents of the current buckets have `rooms.peakActive: 0` and `participants.peakActive: 0`

#### Scenario: Stopped node
- **GIVEN** a node document with `mediaNode: "mn-4"` and `stoppedAt` set, and no active entity on `mn-4`
- **WHEN** a run executes
- **THEN** no `node:mn-4` document is written for the current buckets

#### Scenario: Server without a label
- **GIVEN** active rooms and sessions without `mediaNode`
- **WHEN** a run executes
- **THEN** only the global documents get the peaks

### Requirement: Daily unique identities
Edition: CE and PRO servers. Each aggregator run SHALL set `uniqueIdentities` on the daily rollups (global, and per
media node label: distinct identities of the STANDARD sessions that joined that UTC day, those of a node scope taken
from the sessions with that `mediaNode`) of up to 7 days whose global document lacks it, from 5 minutes after the day
closes and only for days inside the entities retention; a node scope without sessions that day gets 0.

#### Scenario: Day closed
- **GIVEN** a global daily document of yesterday without `uniqueIdentities`, STANDARD sessions of `alice` twice and `bob` with `mediaNode: "mn-1"`, and `carol` with `mediaNode: "mn-2"`
- **WHEN** a run executes after 00:05 UTC today
- **THEN** the global document has `uniqueIdentities: 3`, `node:mn-1` 2 and `node:mn-2` 1

#### Scenario: Sessions without a label
- **GIVEN** a global daily document of yesterday without `uniqueIdentities` and STANDARD sessions of `alice` and `bob` without `mediaNode`
- **WHEN** a run executes after 00:05 UTC today
- **THEN** the global document has `uniqueIdentities: 2` and no node scope document gets a `uniqueIdentities`

#### Scenario: Day just closed
- **GIVEN** a run at 00:03 UTC
- **WHEN** it evaluates the previous day
- **THEN** that day's `uniqueIdentities` is not set yet

#### Scenario: Idle day
- **GIVEN** a closed UTC day without sessions, whose global daily document holds only the aggregator's peaks
- **WHEN** a run executes after 00:05 UTC the next day
- **THEN** the global document has `uniqueIdentities: 0`

### Requirement: Idempotent and failure-tolerant runs
Edition: CE and PRO servers. A run SHALL never lower a stored peak or a stored `uniqueIdentities`, so a repeated run or
two leaders during a lock handover leave the maximum; a run that fails SHALL log a warning, count as `error` and leave
the next run to the regular schedule.

#### Scenario: Run repeated
- **GIVEN** a run that wrote `rooms.peakActive: 3` into the current 5-minute bucket
- **WHEN** another run counts 3 active rooms in the same bucket
- **THEN** the document is unchanged

#### Scenario: Database unavailable
- **GIVEN** MongoDB rejects the count of active rooms
- **WHEN** a run executes
- **THEN** a warning is logged, `openvidu_analytics_aggregator_runs_total{result="error"}` increases by 1 and the next run starts 60 s later

### Requirement: Aggregator metrics
Edition: CE and PRO servers. The node SHALL expose `openvidu_analytics_aggregator_runs_total{result}` and
`openvidu_analytics_aggregator_run_duration_seconds` on its Prometheus endpoint, with `result` in ok and error.

#### Scenario: After a run
- **GIVEN** a node holding the aggregator lock
- **WHEN** a run completes and the metrics endpoint is scraped
- **THEN** `openvidu_analytics_aggregator_runs_total{result="ok"}` increased by 1 and the duration histogram counted one observation
