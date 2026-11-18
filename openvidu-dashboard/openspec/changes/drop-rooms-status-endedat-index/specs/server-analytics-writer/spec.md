## ADDED Requirements

### Requirement: Retired rooms index
Edition: CE and PRO. At every start, after creating the indexes of the `data-model` contract, the writer SHALL drop the
`rooms` index `status_endedAt_id`, which the contract no longer defines, when it exists, whatever schema version
`schema_meta` records, and report it among the dropped indexes of its initialization log. It SHALL leave every other
index outside the contract in place, and nodes starting at the same time SHALL all complete initialization.

#### Scenario: Retired rooms index dropped
- **GIVEN** an initialized database whose `schema_meta.schema` records version 2 and whose `rooms` collection has the index `status_endedAt_id` `{ status: 1, endedAt: -1, _id: -1 }` and an index `operator_custom` outside the contract
- **WHEN** the server starts, and then starts again
- **THEN** the first start drops `status_endedAt_id` and reports `rooms.status_endedAt_id` as dropped, `operator_custom` and every contract index remain without being recreated, `schema_meta.schema` records version 2, and the second start drops nothing

#### Scenario: Nodes dropping the retired index together
- **GIVEN** an initialized database whose `rooms` collection has the index `status_endedAt_id`
- **WHEN** several nodes initialize at the same time
- **THEN** every node completes initialization without error and `rooms` has no index `status_endedAt_id`
