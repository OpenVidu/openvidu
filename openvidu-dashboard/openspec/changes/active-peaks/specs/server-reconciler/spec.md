## MODIFIED Requirements

### Requirement: Reconciler switch
Edition: CE and PRO servers. With `openvidu.analytics.reconciler.enabled: false` (default `true`) a node SHALL skip
the periodic and startup runs and SHALL log at startup that entities whose end event is lost stay open; the legacy
migration runs its own post-replay reconciliation whatever this setting.

#### Scenario: Reconciler disabled
- **GIVEN** `reconciler.enabled: false` and a participant of a crashed node `active` in the store
- **WHEN** 5 minutes pass
- **THEN** the participant stays `active`, `schema_meta` has no new `reconciler` run and the startup log says that lost entities stay open

## REMOVED Requirements

### Requirement: Daily unique identities
**Reason**: Computing the daily unique identities is not reconciliation; it moves to the aggregator, so that turning
the reconciler off no longer turns them off.
**Migration**: None. `server-aggregator` sets the same values on the same documents, with the same rules.
