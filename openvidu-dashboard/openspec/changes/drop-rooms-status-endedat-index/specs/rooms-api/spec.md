## MODIFIED Requirements

### Requirement: Room list plans

Edition: CE. Without `q`, the rooms list SHALL run its page, ranked sorts and `total` on
`mediaNode_status_createdAt_id` with `mediaNode`, else on the partial index of the feature with one feature, else on
`status_createdAt_id` with a status. Several features without `mediaNode`, and `q`, SHALL leave the index to the query planner, except
that `q` with a status SHALL run its ranked sorts and `total` on `mediaNode_status_createdAt_id` with `mediaNode` and
on `status_createdAt_id` otherwise.

#### Scenario: Hinted room filters

- **WHEN** the list is explained with `status=closed`, with `mediaNode` and with `features=egress`, for the page,
  `total` and each ranked sort
- **THEN** every plan of a filter uses its index (`status_createdAt_id`, `mediaNode_status_createdAt_id`,
  `status_createdAt_id_egress`) and examines at most the rooms of that filter created in the range

#### Scenario: Several features

- **WHEN** the list with `features=egress,agent` is requested and explained
- **THEN** the page uses `status_createdAt_id_egress` and `status_createdAt_id_agent` with no in-memory sort, and
  `items` and `total` hold every room created in the range that used egress or an agent

#### Scenario: Selective room name prefix

- **WHEN** the list is explained with `q` set to a prefix of one room's name, for the page, `total` and a ranked sort
- **THEN** each plan uses `nameLower_createdAt` and examines at most the rooms of that prefix created in the range

#### Scenario: Broad room name prefix

- **GIVEN** a generated database whose room names all start with `room-`
- **WHEN** the list is explained with `q=room`, alone and with `status=closed`, for the page, `total` and each ranked
  sort
- **THEN** the page uses a range index with no in-memory sort and examines at most two pages, the ranked sorts and
  `total` with `status=closed` use `status_createdAt_id`, and no plan scans the collection or examines more than the
  rooms created in the range
