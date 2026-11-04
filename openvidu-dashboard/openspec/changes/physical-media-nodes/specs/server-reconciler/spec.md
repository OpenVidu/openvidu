## MODIFIED Requirements

### Requirement: Daily unique identities
Edition: CE and PRO servers. After its closures, within its time budget, each run SHALL set `uniqueIdentities` on
the daily rollups (global, and per media node label: distinct identities of the STANDARD sessions that joined that UTC
day, those of a node scope taken from the sessions with that `mediaNode`) of up to 7 days whose global document lacks
it, from 5 minutes after the day closes and only for days inside the entities retention; a node scope without sessions
that day gets 0.

#### Scenario: Day closed
- **GIVEN** a global daily document of yesterday without `uniqueIdentities`, STANDARD sessions of `alice` twice and `bob` with `mediaNode: "mn-1"`, and `carol` with `mediaNode: "mn-2"`
- **WHEN** a run executes after 00:05 UTC today
- **THEN** the global document has `uniqueIdentities: 3`, `node:mn-1` 2 and `node:mn-2` 1

#### Scenario: Sessions without a label
- **GIVEN** a global daily document of yesterday without `uniqueIdentities` and STANDARD sessions of `alice` and `bob` without `mediaNode`
- **WHEN** a run executes after 00:05 UTC today
- **THEN** the global document has `uniqueIdentities: 2` and no node scope document is written

#### Scenario: Day just closed
- **GIVEN** a run at 00:03 UTC
- **WHEN** it evaluates the previous day
- **THEN** that day's `uniqueIdentities` is not set yet
