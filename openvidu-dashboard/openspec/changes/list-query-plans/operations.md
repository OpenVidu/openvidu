# Operations

- Owner decisions: the proposal is approved on the full track, and it supersedes `agents-identity-search-plan`, whose
  folder is deleted in the proposal commit. A participants identity search filtered to service kinds without STANDARD
  takes the agents plan; identity searches enforce 300 ms for a page with its total at scenario M; egress is in scope
  and ingress code is not changed; the rooms `total` uses the hint of its page; with a name prefix and a status, the
  rooms ranked sorts and total use the status (or media node) index.
- Follow-up outside this change: removing the unused rooms index `status_endedAt_id` is a separate data contract and
  writer change, after this one.
- Applied after `legacy-collections` is archived.
- Evidence gap recorded for the owner: "Activity range over 30 days" (ingress, carried unchanged from before this
  change) asks for scenario M over 30 days; an M dataset of 30 days (~60 M documents) does not fit this machine, so the
  group 7 run covers every suite at M over 7 days and that 30-day premise stays unverified at M. The owner accepted the gap.
- Group 7, scenario M over 7 days, 2026-11-18, at 3ef8e85f5: each plan suite run once and alone, in order, against a
  throwaway single-node replica set on `openvidu/mongodb:8.0.29-r1` (MongoDB 8.0.29, WiredTiger cache 2 GB, container
  memory 4 GB), recreated empty before each suite. Every test passed (participants 21, rooms 20, egress 9, ingress 5)
  with no enforced overrun. The only row over its budget is "List (100 rows)" of participants (51.6 ms against 50 ms),
  a report-only row on a query this change does not touch.

  Participants, 12:19, load average 1.31:

  Participants p95 of 20 runs, scenario M, 7 days, 669 agent sessions in range
  | Query | Budget | p95 |
  | --- | --- | --- |
  | List (100 rows) | 50 ms | 51.6 ms |
  | List, status active | 50 ms | 7.9 ms |
  | Agents list | 50 ms | 5.1 ms |
  | Agents list, origin openvidu | 300 ms | 5.4 ms |
  | Agents list, origin third-party | 300 ms | 10.7 ms |
  | Summary, 24 h | 50 ms | 46.5 ms |
  | List, ranked by leftAt (24 h) | 300 ms | 208.9 ms |
  | List, ranked by duration (24 h) | 300 ms | 198.2 ms |
  | Export (up to 10,000 rows) | 2000 ms | 287.4 ms |
  | Export, ranked by duration (24 h) | 2000 ms | 476.6 ms |
  | List, identity "user-frank-60323" | 300 ms | 2.1 ms |
  | List, identity prefix "user" | 300 ms | 98.9 ms |
  | Agents list, identity prefix "user" | 300 ms | 4.2 ms |
  | Agents list, identity "agent-transcriber" | 300 ms | 9.7 ms |
  | List, identity "user-frank-60323", ranked by duration (24 h) | 300 ms | 1.9 ms |
  | List, identity prefix "user", ranked by duration (24 h) | 300 ms | 212.4 ms |
  | Agents list, identity prefix "user", ranked by duration (24 h) | 300 ms | 3.0 ms |
  | Agents list, identity "agent-transcriber", ranked by duration (24 h) | 300 ms | 4.6 ms |

  Rooms, 12:33, load average 2.20:

  Rooms p95 of 20 runs, scenario M, 7 days
  | Query | Budget | p95 |
  | --- | --- | --- |
  | List, status all (100 rows) | 150 ms | 12.1 ms |
  | List, ranked by endedAt | 300 ms | 132.7 ms |
  | List, ranked by duration | 300 ms | 113.9 ms |
  | List, ranked by uniqueIdentities | 300 ms | 120.7 ms |
  | List, ranked by active | 300 ms | 123.3 ms |
  | List, two features | 150 ms | 7.5 ms |
  | Export, status all (up to 10,000 rows) | 2000 ms | 222.8 ms |
  | Export, ranked by duration | 2000 ms | 376.8 ms |
  | List, node | 150 ms | 6.7 ms |
  | List, prefix "ro" | 150 ms | 27.0 ms |
  | List, ranked by endedAt, prefix and status closed | 300 ms | 116.2 ms |
  | Summary, exact (24 h) | 150 ms | 10.9 ms |
  | Summary, rollups (30 d) | 100 ms | 3.1 ms |

  Egress, 12:47, load average 1.85:

  Egress p95 of 20 runs, scenario M, 7 days
  | Query | Budget | p95 |
  | --- | --- | --- |
  | List, status all (100 rows) | 150 ms | 8.4 ms |
  | List, in flight | 150 ms | 5.9 ms |
  | List, failed | 150 ms | 6.7 ms |
  | List, type=web | 300 ms | 10.7 ms |
  | List, room | 150 ms | 3.2 ms |
  | List, room name prefix "roo" | 200 ms | 8.4 ms |
  | List, room name prefix of one room | 200 ms | 2.7 ms |
  | List, ranked by endedAt | 200 ms | 49.4 ms |
  | List, ranked by duration | 200 ms | 50.5 ms |
  | Export, status all (up to 10,000 rows) | 2000 ms | 79.4 ms |
  | Export, ranked by duration | 2000 ms | 139.8 ms |
  | Summary, exact (24 h) | 150 ms | 4.0 ms |
  | Summary, rollups (30 d) | 100 ms | 5.4 ms |

  Ingress, 13:00, load average 2.05:

  Ingress p95 of 20 runs, scenario M, 7 days
  | Query | Budget | p95 |
  | --- | --- | --- |
  | List, status all (100 rows) | 100 ms | 4.6 ms |
  | List, publishing | 100 ms | 1.4 ms |
  | List, input type | 100 ms | 2.3 ms |
  | List, name prefix | 100 ms | 9.8 ms |
  | List, ranked by total duration (7 d) | 200 ms | 4.9 ms |
  | List, ranked by sessions (7 d) | 200 ms | 4.3 ms |
  | List, ranked by last session (7 d) | 200 ms | 3.1 ms |
  | List, created over 30 days | 200 ms | 3.0 ms |
  | Summary (24 h) | 100 ms | 1.2 ms |
  | Export, status all (up to 10,000 rows) | 2000 ms | 8.4 ms |
  | Export, ranked by total duration (7 d) | 2000 ms | 7.1 ms |
