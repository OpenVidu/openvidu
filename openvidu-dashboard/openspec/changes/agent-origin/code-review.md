# Code review: agent-origin

- Date: 2026-11-16
- Reviewed commit: `ff7cd0f23d23f394da86ba0a0fdb1a01c7aa14f9` (`git diff 7d85e6d07..HEAD -- openvidu-dashboard`, working
  tree clean)
- Writer side (openvidu-livekit, `openvidu/main`): `15b31983` (projector, pushed) and `e5891220` (tests only, local)
- Result: 0 CRITICAL, 2 WARNING, 5 SUGGESTION

How this review ran: as a general agent, without the PreToolUse guard (`operations.md` records the owner's consent).
The guard probe was not run. Only read-only `git diff|log|show|status|ls-files|grep|rev-parse` commands were used, and
this file is the only one written. Two things go beyond what the guard would have allowed, both read-only: `git -C` on
the openvidu-livekit checkout (asked for by the orchestrator, to review the writer commits) and two first commands with
`git -C` on the repository root instead of the project folder. No workspace suite was run; nothing here is a test
result.

## CRITICAL

None.

## WARNING

### W1. A sparse origin scans every agent session of the range, and the range of the default sort has no limit

- `dashboard-ce/backend/src/participants/participants-query.ts:93-101` and `:118-151` (the residual `$expr`),
  `dashboard-ce/backend/src/participants/participants-service.ts:195-199` (page and `total`),
  `dashboard-ce/backend/test/integration/participants-query-plan.test.ts:254-343` and `:405-409` (the evidence).
- Triggering case: a deployment with many agent sessions where one origin is rare, which is the state right after the
  upgrade (every session stored before 3.10 is unmarked). The user selects Origin OpenVidu with a wide range, for
  example `/agents?origin=openvidu&from=now-30d&to=now`.
- What happens: the `joinedAt` page stops at `limit + 1` matches, so with few or no matches it walks every
  `kind: AGENT` entry of `kind_status_joinedAt_id` in the range and fetches each document to evaluate `$getField`
  (`attributes` is in no index). Only the ranked sorts and `total` have a range limit; the default sort accepts any
  range, and no query of the backend carries a time limit. Within 7 days `countDocuments` runs the same fetch scan in
  parallel; without `origin` that count is answered from the index alone. The Agents page repeats the request on every
  refresh and whenever the live agents counter changes (`agents-page.ts:140-150`).
- Consequence: the latency of the filtered list grows linearly with the agent sessions of the range, on a path the
  unfiltered list serves in index order within 50 ms. The design accepts the scan ("bounded by the range and the 300 ms
  budget"), but the range is not bounded for this sort, and the 300 ms figure has no recorded measurement beyond
  scenario S over 2 days: about 20 agent sessions, where a 100-row page holds them all, so the "page examines at most
  the scan" assertion (`:330-342`) and both p95 rows hold trivially. The delta scenario "Origin explain plans" is
  written for scenario M; `operations.md` records no M run.
- Suggested: run the participants plan suite at scenario M over 7 days and record the two origin rows before
  archiving. If the figure does not hold, or to bound the worst case, give the origin filter a range limit like the
  ranked sorts, or take the derived indexed field the design leaves open.

### W2. No test pages through a list filtered by origin

- `dashboard-ce/backend/src/participants/participants-query.ts:169-178`,
  `dashboard-ce/backend/test/unit/participants.test.ts:123-157`,
  `dashboard-ce/backend/test/integration/participants-api.test.ts:441-476`.
- Decision 3 rejects filtering after the fetch because it "breaks paging and `total`", yet every origin test reads one
  page without a cursor: the unit test builds plans without a cursor and the integration tests seed at most five
  sessions.
- The code is correct today: the cursor condition is a `$nor` (`api/cursor.ts:143`) and the origin a `$expr`, so the
  spread `{ ...build(...), ...page.ties }` keeps both, and the ranked pipeline puts its boundary in a separate
  `$match`. But both are top-level operators merged by object spread: a later change that expresses either with the
  other's operator would silently drop the origin on page 2 onwards, and no test would fail.
- Suggested: one integration case with more matching sessions than `limit`, interleaved with sessions of the other
  origin, that follows `nextCursor` and `prevCursor` and checks the items and `total` on the second page, for
  `sort=joinedAt` and for one ranked sort.

## SUGGESTION

### S1. With `store_metadata: true` every list row now reads its whole `attributes` object

- `dashboard-ce/backend/src/participants/participants-query.ts:30-31`, `dashboard-ce/backend/src/api/ranked.ts:53`.
- The projection applies to both lists and both exports and to every kind, not only agents. LiveKit allows 64 KiB of
  attributes per participant by default (`limit.max_attributes_size`), and an export reads up to 10 000 rows in one
  call (`LIST_EXPORT_MAX_ROWS`): up to about 640 MB read into the process for one export in the worst case, where
  nothing was read before this change. A ranked export also carries the objects through its in-memory sort.
- The design lists the risk only for what is returned, not for what is read. Typical attributes are small, so this is
  a note, not a problem seen: if it ever matters, the projection can compute the two values with `$getField` instead
  of returning the object (decision 4 rejected it for typing reasons).

### S2. The two selects of the Agents filter bar show "every value" differently

- `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/agents/agents-page.html:28-29` and `:38-39`.
- Status keeps its `null` option, which `mat-select` treats as a reset and shows as an empty field with its label;
  Origin uses the `'all'` value so the field reads "All", as its scenario asks. Side by side one reads "Status" and
  the other "Origin: All". The Ingress and Participants pages have the same `null` option. Worth a look in the owner's
  review of task 8.1; aligning the others is a change of its own.

### S3. "Shows in the card layout" has no test

- `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/participants/participant-sessions.ts:70`,
  `agents-page.spec.ts:356-377`.
- The requirement "Agent column" says the column shows in the card layout. It has no `card` slot, so it renders in
  the collapsed "More" area of each card; no unit or e2e test opens it on an XSmall viewport. The same holds for a
  `400` on `GET /api/v1/agents/export.csv?origin=livekit`, covered only by the schema unit test of the list query.

### S4. Writer README: `openvidu.agent*` reads as a wider match than the projector makes

- openvidu-livekit `README-openvidu.md:65` (commit `15b31983`).
- The projector keeps `openvidu.agent` and keys that start with `openvidu.agent.`; its test proves `openvidu.agents`
  is dropped. The README says "`lk.agent_name` and `openvidu.agent*`", which includes that key. Suggested wording:
  "`lk.agent_name`, `openvidu.agent` and `openvidu.agent.*`", in the writer commit of task 9.2.

### S5. Writer tests repeated to carry two scenario names

- openvidu-livekit `openvidu/analytics/writer_integration_test.go:935-941` and `:963-978` (commit `e5891220`).
- "Anonymized IP" and "Client address absent by default" have the same body, and "Metadata disabled by default"
  repeats the last assertion of "Metadata enabled"; each creates its own database. The cause is in the specs:
  `data-model` and `server-analytics-writer` state the same rule as separate scenarios. Harmless; if the two specs are
  ever merged on this point, the duplicates can go.

## Traced and found correct

- Mapper and filter agree on the mark: a missing `attributes`, a missing key and an empty value are third-party in
  the query and give no `openvidu` in the item; a session of another kind never gets `agent`.
- No attribute other than the two values reaches a list response or a CSV cell; CSV cells go through the shared
  encoder, which neutralises formula-like text in an agent name.
- `origin` is validated as an enum on the two agents routes only and stripped from the participants queries; the
  `$getField` field name is a constant.
- An exact SID ignores `origin`, as the scenario states; a change of origin drops `cursor` and `page`
  (`QueryStateService.navigate`), and an invalid URL value reads as All without a request parameter.
- The projector keeps the three kinds of key only for kind `AGENT`, overwrites `attributes` with the filtered set on
  every participant event, and leaves raw event payloads without attributes.

## State of the change, not findings

- Tasks 8.1 and 9.1 to 9.3 are open. At `e5891220` the writer's vendored contract still describes `attributes` as
  "Only with store_metadata" and its fixture agent has no attributes, so `contract-check` cannot pass against the
  writer until task 9.1, and the writer's `CHANGELOG-openvidu.md` still reads "metadata only with `store_metadata`"
  until task 9.2.
