# Spec Delta

## MODIFIED Requirements

### Requirement: Index-backed participant queries

Edition: CE. Every query of this capability SHALL be served by an index of `data-model` with no
collection scan and with `totalDocsExamined` bounded by the page size plus the documents of the filtered
range, verified with `explain()` on a generated dataset; only the ranked sorts, which rank over the range scan that
the list's filters select, and the identity searches that the query planner serves sort in memory.

#### Scenario: Explain plans

- **GIVEN** a database generated at scenario M
- **WHEN** the list with and without `q`, `room`, `kind`, `status` and `publisher`, the summary and the agents
  list queries are explained
- **THEN** no winning plan contains a `COLLSCAN` stage, and none sorts in memory but the ranked sorts and the identity
  searches of the participants list and of a room

#### Scenario: Ranked sorts over 24 hours
- **GIVEN** a database generated at scenario M
- **WHEN** the participants and agents lists are explained with `sort=leftAt` and `sort=duration` over 24 hours, with and without `q`, `room`, `kind` and `status`
- **THEN** each plan scans the range index of its filters (`joinedAt_id`, `kind_status_joinedAt_id`, `roomSid_joinedAt_id`, `identityLower_joinedAt` or `roomSid_identityLower_joinedAt`), or `status_kind` for an identity search with `status`, `totalDocsExamined` is at most the sessions joined in the range or in that status, and the p95 of a page is within 300 ms

#### Scenario: Publisher filter
- **WHEN** the list with `status=active&publisher=true` is explained
- **THEN** the plan uses `kind_status_joinedAt_id` with `isPublisher` as a residual filter

### Requirement: Origin filter of the agents list
Edition: CE. `GET /api/v1/agents` and `GET /api/v1/agents/export.csv` SHALL accept `origin`: `openvidu` keeps the
agent sessions whose `openvidu.agent` attribute is not empty and `third-party` the others; absent means both. It
combines with every other filter and sort as a residual filter on the range scan they select; any other value SHALL
answer `400` `VALIDATION_ERROR`. The participants list has no `origin` parameter.

#### Scenario: OpenVidu agents only
- **GIVEN** in range: an agent session with `openvidu.agent: "speech-processing"`, one with only `lk.agent_name: "dummy-agent"`, one without `attributes`, and a STANDARD session
- **WHEN** the client sends `GET /api/v1/agents?origin=openvidu`
- **THEN** exactly the first session is returned and `total` is 1

#### Scenario: Third-party agents only
- **GIVEN** the same sessions, and an agent session whose `openvidu.agent` is the empty string
- **WHEN** the client sends `GET /api/v1/agents?origin=third-party`
- **THEN** the agent sessions with only `lk.agent_name`, without `attributes` and with the empty mark are returned, `total` is 3, and neither the marked nor the STANDARD session is

#### Scenario: Origin with other filters
- **GIVEN** in range and in room `RM_a`: an active and a left OpenVidu agent session and an active third-party one, and an active OpenVidu agent session in room `RM_b`
- **WHEN** the client sends `GET /api/v1/agents?origin=openvidu&status=active&room=RM_a&sort=duration`
- **THEN** exactly the active OpenVidu agent session of `RM_a` is returned

#### Scenario: Unknown origin
- **WHEN** the client sends `GET /api/v1/agents?origin=livekit`
- **THEN** the response is `400` with code `VALIDATION_ERROR` and `details.issues[0].path` equal to `["origin"]`

#### Scenario: Exact SID ignores the origin
- **GIVEN** the third-party agent session `PA_ag1` joined 3 days ago
- **WHEN** the client sends `GET /api/v1/agents?q=PA_ag1&origin=openvidu`
- **THEN** the response has exactly one item with `sid: "PA_ag1"` and `total: 1`

#### Scenario: Origin explain plans
- **GIVEN** a database generated at scenario M, whose agents are of both origins
- **WHEN** the agents list is explained without `origin`, with `origin=openvidu` and with `origin=third-party`, alone and with `status`, `q`, `q` and `room`, `room`, and the ranked sorts over 24 hours
- **THEN** in each combination the plans with `origin` use the same index as the plan without it, with no `COLLSCAN`: `roomSid_identityLower_joinedAt` with `q` and `room`, `roomSid_joinedAt_id` with `room` alone and `kind_status_joinedAt_id` otherwise; they examine the same documents as it when the page does not cut the scan short, so a page with `origin` never examines more than that scan holds; no plan sorts in memory but the ranked sorts and the identity searches of a room; and the p95 of a page with `origin` is within 300 ms

## ADDED Requirements

### Requirement: Identity search plans

Edition: CE. An identity search (`q` as an identity prefix) with `room` SHALL run on `roomSid_identityLower_joinedAt`.
Without `room`, the agents list and a participants list whose `kind` lists no `STANDARD` SHALL run it on
`kind_status_joinedAt_id`, merged in `joinedAt` order with no in-memory sort; any other participants list SHALL leave
the index to the query planner. Each choice SHALL hold for the page, the ranked sorts and `total`.

#### Scenario: Selective identity prefix

- **GIVEN** a generated database whose STANDARD identities all start with `user-`
- **WHEN** the participants list is explained with `q` set to one session's whole identity, for the page, `total`
  and `sort=duration` over 24 hours
- **THEN** each plan uses `identityLower_joinedAt`, the page sorts in memory, and each examines at most the sessions
  of that identity joined in the range

#### Scenario: Broad identity prefix

- **GIVEN** the same database
- **WHEN** the participants list is explained with `q=user`, for the page, `total` and `sort=duration` over 24 hours
- **THEN** the page uses `joinedAt_id` with no in-memory sort and examines at most two pages, and `total` and the
  ranked sort examine at most the sessions joined in the range, with no `COLLSCAN`

#### Scenario: Identity prefix with a status

- **GIVEN** the same database
- **WHEN** the participants list is explained with `q=user&status=active`, for the page and `total`
- **THEN** no plan contains a `COLLSCAN`, and each examines at most the sessions joined in the range plus the active
  sessions

#### Scenario: Agents identity prefix

- **GIVEN** the same database
- **WHEN** the agents list is explained with `q=user`, which no agent identity starts with, and with `q` set to one
  agent identity, for the page, `total` and `sort=duration` over 24 hours
- **THEN** each plan uses `kind_status_joinedAt_id`, the page has no in-memory sort, and each examines at most the
  agent sessions joined in the range

#### Scenario: Identity prefix of a service kind

- **GIVEN** the same database
- **WHEN** the participants list is explained with `kind=AGENT&q=user` and with `kind=STANDARD,AGENT` and `q` set to
  one session's whole identity
- **THEN** the first uses `kind_status_joinedAt_id` with no in-memory sort, as the agents list does, and the second
  uses `identityLower_joinedAt`, as the query planner chooses

#### Scenario: Identity prefix within a room

- **WHEN** the participants and agents lists are explained with `q` and `room`
- **THEN** each plan uses `roomSid_identityLower_joinedAt` and examines at most the sessions of that room

#### Scenario: Identity search latency

- **GIVEN** a database generated at scenario M over 7 days whose STANDARD identities all start with `user-`
- **WHEN** a page with its `total` is requested from the participants list with one whole identity and with
  `q=user`, and from the agents list with `q=user` and with one agent identity
- **THEN** the p95 of each is within 300 ms
