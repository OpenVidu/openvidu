# Spec Delta

## MODIFIED Requirements

### Requirement: Index-backed participant queries

Edition: CE. Every query of this capability SHALL be served by an index of `data-model` with no collection scan and
with `totalDocsExamined` bounded by the page size plus the documents of the filtered range, verified with `explain()`
on a generated dataset. No list query SHALL sort in memory but two kinds: the ranked sorts, which rank over the range
scan that the list's filters select, and the identity searches of the participants and agents lists (`q` as an
identity prefix, alone or with other filters), which may sort their matches by `joinedAt`, since a prefix is a range
on the identity and no index returns it in `joinedAt` order. An identity search SHALL run on one index, whichever the
query planner chooses among the identity indexes (`identityLower_joinedAt`, `roomSid_identityLower_joinedAt`) and the
range indexes of its other filters (`joinedAt_id`, `kind_status_joinedAt_id`, `roomSid_joinedAt_id`), and SHALL
examine at most the sessions joined in the range.

#### Scenario: Explain plans

- **GIVEN** a database generated at scenario M
- **WHEN** the list with and without `q`, `room`, `kind`, `status` and `publisher`, the summary and the agents
  list queries are explained
- **THEN** no winning plan contains a `COLLSCAN` stage; none sorts in memory but the ranked sorts and the identity
  searches (`q`, `q` and `room`) of the participants and agents lists; and each identity search uses one of
  `identityLower_joinedAt`, `roomSid_identityLower_joinedAt`, `joinedAt_id`, `kind_status_joinedAt_id` and
  `roomSid_joinedAt_id` and examines at most the sessions joined in the range

#### Scenario: Ranked sorts over 24 hours
- **GIVEN** a database generated at scenario M
- **WHEN** the participants and agents lists are explained with `sort=leftAt` and `sort=duration` over 24 hours, with and without `q`, `room`, `kind` and `status`
- **THEN** each plan scans the range index of its filters (`joinedAt_id`, `kind_status_joinedAt_id`, `roomSid_joinedAt_id`, `identityLower_joinedAt` or `roomSid_identityLower_joinedAt`), `totalDocsExamined` is at most the sessions joined in the range, and the p95 of a page is within 300 ms

#### Scenario: Publisher filter
- **WHEN** the list with `status=active&publisher=true` is explained
- **THEN** the plan uses `kind_status_joinedAt_id` with `isPublisher` as a residual filter
