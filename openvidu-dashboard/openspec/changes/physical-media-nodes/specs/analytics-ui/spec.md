## ADDED Requirements

### Requirement: Scope selector only with per-node breakdown

Edition: CE. Without `per-node-breakdown` the page header SHALL show no scope selector, lock or text about nodes and
send no `/analytics/scopes` request; with it, it renders the scope selector the edition provides, whose node options
are `node:<label>` scopes.

#### Scenario: Nothing per node in CE

- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the header renders
- **THEN** it has the range, time zone and granularity controls and no scope selector or lock, and no
  `/analytics/scopes` request is sent

## REMOVED Requirements

### Requirement: Per-node scope selector
**Reason**: CE has a single machine to analyse; CE stops showing the selector locked.
**Migration**: "Scope selector only with per-node breakdown" renders the selector only for an edition that provides it.
