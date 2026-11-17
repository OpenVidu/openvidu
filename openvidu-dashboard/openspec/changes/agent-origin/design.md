# Design

## Context

See `proposal.md` for the motivation. What shapes the approach:

- The writer (openvidu-livekit `15b31983`, `openvidu/analytics/projection/participant.go`) already stores, in the
  existing `attributes` object of a `participants` document of kind `AGENT`, the keys `lk.agent_name`, `openvidu.agent`
  and `openvidu.agent.*` whatever `store_metadata` says. With `store_metadata: true` every participant keeps every
  attribute, so the presence of `attributes` says nothing: the `openvidu.agent` key does.
- `lk.agent_name` is stamped by the server on every agent a worker dispatches (`pkg/agent/worker.go`), with the empty
  string for automatic dispatch. `openvidu.agent` holds the OpenVidu agent type (`speech-processing`). It is a label an
  agent sets, not a proof.
- The keys contain dots. MongoDB reads `attributes.openvidu.agent` as the nested path `attributes → openvidu → agent`,
  which matches nothing; a key with a dot is read with `$getField`. Checked on the MongoDB 8.0.29 of
  openvidu-local-deployment: the dotted path matches 0 of 8 agent sessions, `$getField` matches the marked one as a
  residual filter on `kind_status_joinedAt_id` (8 keys and 8 documents examined).
- Sessions written before the writer change have no `attributes`. The legacy migration replays through the same
  projector (`migration.go`, `processor.apply`), so a migrated agent can carry `lk.agent_name` and never the mark.
- Everything this change touches in the dashboard (list item shape, CSV header, `SCHEMA_VERSION` 1) is unreleased.
- `./dashboard.sh scenarios` checks every scenario of a delta spec, including those a MODIFIED requirement carries
  from the main spec, and `openspec validate` refuses a MODIFIED requirement that renames or drops a scenario.
- The writer's `TestContractFixtures` replays its contract scenario and compares the result with the vendored
  fixtures, so a fixture document and the scenario that produces it change together.

## Goals / Non-Goals

**Goals:**

- Name each agent and mark OpenVidu agents on the Agents page, and filter by origin, reading only what the writer
  already stores.
- Keep every list query on the indexes it uses today, within the existing budgets.
- Leave the specs of the writer true again.

**Non-Goals:**

- A new field, index or schema version; any writer behaviour.
- A reusable origin component or API for the PRO detail: the PRO change adds what it needs.
- Search or sort by agent name; counters per origin.

## Data model

No collection, field, type, index or retention class changes.

| Collection     | Field        | Type                    | Change                                                                 |
| -------------- | ------------ | ----------------------- | ---------------------------------------------------------------------- |
| `participants` | `attributes` | object, string → string | Description only: "Every attribute with store_metadata; without it, only lk.agent_name, openvidu.agent and openvidu.agent.\* of an AGENT" |

- Keys read by the dashboard: `lk.agent_name` and `openvidu.agent`. `openvidu.agent.*` is stored and not read.
- Indexes: none added. The origin filter is a residual filter (decision 3).
- Retention: unchanged (`entities`).
- Schema version: `SCHEMA_VERSION` stays 1. The typings README asks for a bump only once a version has shipped, and
  not for descriptions or fixture values.
- Fixture: the agent of `contract/fixtures/participants.ts` (`agent-assistant`) gains
  `attributes: { 'lk.agent_name': 'speech-processing', 'openvidu.agent': 'speech-processing' }`. The contract scenario
  runs with the default `store_metadata: false`, so no other fixture participant has `attributes`, and the raw event
  fixtures do not change (raw payloads keep no attributes).
- Migration mapping from legacy events: unchanged. A legacy `PARTICIPANT_JOINED` of an agent goes through the same
  projector, which keeps `lk.agent_name` when the legacy event carries it; no legacy agent carries `openvidu.agent`,
  so migrated agents count as third-party.
- Collection validator: unchanged in what it accepts (`additionalProperties: string`); only its description text.

## API

`ParticipantListItem` (both lists, `components.schemas.ParticipantListItem`) gains:

```yaml
agent:
  type: object
  description: Agent facts of a session of kind AGENT, absent when none is known
  properties:
    name:
      type: string
      description: Name the agent's worker registered (lk.agent_name), absent when empty
    openvidu:
      type: string
      description: OpenVidu agent type (openvidu.agent), present on agents that declare themselves OpenVidu agents
```

`GET /api/v1/agents` and `GET /api/v1/agents/export.csv` gain one query parameter:

```yaml
- name: origin
  in: query
  required: false
  schema: { type: string, enum: [openvidu, third-party] }
  description: >-
    openvidu keeps the agents that declare themselves OpenVidu agents, third-party the others; absent means every
    agent
```

Responses are unchanged in shape: `200` with the list envelope (or the CSV), `400` `VALIDATION_ERROR` with
`details.issues[0].path: ["origin"]` for any other value. `GET /api/v1/participants` does not declare `origin` and
ignores it, as it ignores any unknown parameter today.

CSV: `agent.name` and `agent.openvidu` after `client.browserVersion` in the one column list both exports share.

Index backing each query of the agents list, with `origin` and without it: `origin` is residual and changes neither
the index nor the scan. The table states what the planner does today, measured with `explain()` on generated data;
this change alters no production query.

| Other filters             | Index                                                                                          | Sort                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| none, `status`            | `kind_status_joinedAt_id` (hint)                                                               | index order, merged over the statuses |
| `q`                       | no hint, chosen by the planner: `kind_status_joinedAt_id` on generated data, or `identityLower_joinedAt` | in memory                   |
| `q` and `room`            | no hint, chosen by the planner: `roomSid_identityLower_joinedAt` or `roomSid_joinedAt_id`      | in memory                             |
| `room`                    | `roomSid_joinedAt_id`                                                                          | index order                           |
| `sort=leftAt`, `duration` | the index of the filters above                                                                 | ranked in memory over the range scan  |
| exact `PA_` SID           | `_id`                                                                                          | point lookup, `origin` ignored        |

An identity search sorts in memory with either index (measured on scenario S over 2 days, task 4.7): a prefix is a
range on `identityLower`, so the identity indexes never return its matches in `joinedAt` order, and the agents list
has never hinted an index for it.

## Performance budget

- The origin filter adds no index scan: a page examines at most the documents of the scan that the same query reads
  without `origin`, and stops at the page size when matches are dense. `total` counts over the same scan and is computed only
  within `DASHBOARD_LIST_TOTAL_MAX_RANGE` (7 days), as today.
- Budget: p95 of a 100-row page of the agents list with `origin=openvidu` and with `origin=third-party` within 300 ms,
  the budget of the ranked sorts, since a sparse origin scans the agent sessions of the range. The unfiltered agents
  list keeps its 50 ms.
- Verification: `backend/test/integration/participants-query-plan.test.ts` explains each combination of the table
  above three times, without `origin` and with each origin, and compares them (decision 14): same index, one of the
  four of the table; no `COLLSCAN`; the same `totalDocsExamined` with the page limit above the sessions in range; a
  100-row page with `origin` examines at most that figure; no `SORT` stage outside the ranked sorts and the identity
  searches. It adds the two rows to its p95 report. It runs at scenario S by default and at scenario M over 7 days
  for the design figures (backend `AGENTS.md`).

## Decisions

1. **Origin is the `openvidu.agent` key, non-empty, on a session of kind `AGENT`.** Two origins, as the owner chose:
   everything without the mark is third-party, including older OpenVidu agent images and sessions stored before the
   writer change. Rejected: a third "unknown" origin for sessions without `lk.agent_name` (owner's answer 1); the agent
   name as the signal (users choose it, and automatic dispatch has none).

2. **Read the existing `attributes`; no derived field.** The writer change is shipped and the contract already has the
   field. Rejected: a top-level `agent` field with an index written by the projector (a writer and contract change for
   a filter that a residual serves within budget); a dotted-path filter (matches nothing).

3. **`origin` is a residual `$expr` on every branch of `participantsListPlan`, as `publisher` is.** One helper in
   `participants-query.ts` builds it:
   `{ $expr: { <op>: [{ $ifNull: [{ $getField: { field: 'openvidu.agent', input: '$attributes' } }, ''] }, ''] } }`
   with `$gt` for `openvidu` and `$eq` for `third-party`, so a missing `attributes`, a missing key and an empty value
   all count as third-party. `ParticipantsFilter` gains `origin?`; only `agents()` and the agents export pass it. The
   `kind_status_joinedAt_id` hint stays. Rejected: filtering in the service after the fetch (breaks paging and
   `total`); `$objectToArray` (same cost, harder to read).

4. **The mapper derives `agent`; attributes never leave the backend.** `PARTICIPANT_LIST_PROJECTION` gains
   `attributes: 1` (a dotted key cannot be projected by path) and `toParticipantListItem` builds
   `agent { name, openvidu }` through `compact`, only for kind `AGENT`, omitting empty values and the object when
   empty. With `store_metadata: true` the other attributes are read and dropped. Rejected: computed fields in the
   `find` projection (the documents would stop being `ParticipantDocument`s in the mapper and the ranked pipeline).

5. **`agent` is an object on the shared list item.** `participantListFields` gains it, so the PRO session detail that
   extends those fields and `GET /participants?kind=AGENT` carry it too. Rejected: two flat fields (`agentName`,
   `openviduAgent`), which name the same thing twice; exposing `attributes` in the list (personal data with
   `store_metadata`).

6. **Typings own the vocabulary.** `src/data-model/entities.ts` exports the attribute keys (`AGENT_NAME_ATTRIBUTE`,
   `OPENVIDU_AGENT_ATTRIBUTE`); `src/api/participants.ts` exports `AgentOrigin` (`openvidu`, `third-party`),
   `ParticipantAgent`, `ParticipantListItem.agent` and `AgentsListQuery.origin`. Backend schemas, the frontend and the
   data generator import them.

7. **One CSV column list.** `participants-csv.ts` gains the two columns for both exports, which keep one header
   (19 → 21). Rejected: columns only in the agents export (two column lists and a header that depends on the route).

8. **UI in the pieces the page already has.**
   - `injectParticipantSessions` takes `agentColumn: boolean` beside `kindColumn` and inserts
     `{ key: 'agent', header: 'Agent', info: INFO_TEXTS.agentColumn }` after SID: not sortable, hideable, no `card`
     slot (it shows in the "More" area of the card layout, so the three metric slots keep Room, Duration and
     Published). A third option hides Name by default (decision 16).
   - `participant-sessions-table.html` gains the `agent` cell: the text from a pure `agentLabel(item)` in
     `participant-display.ts` (`agent.name ?? agent.openvidu`, "—" when undefined) and, with `agent.openvidu`,
     `<span class="origin ovd-tag">OpenVidu</span>`, outlined with `--mat-sys-outline-variant` like the kind badge,
     without dot. The text is the cue; colour carries nothing. Its tooltip is decision 15.
   - `agents-page.ts` reads `origin` with `query.value('origin')`, accepting only the `AgentOrigin` values (anything
     else is `null`, All), adds it to the request and to `clearFilters`, and the template adds the Origin `mat-select`
     after Status with labels from a new `AGENT_ORIGIN_LABELS` in `format/labels.ts` ("OpenVidu", "Third-party").
   - `participants-data.ts`: `AgentsListRequest` gains `origin`; `agents()` and `exportAgents()` send it. The
     Participants page is untouched.

   Rejected: a new `ovd-origin-tag` component (one use; the PRO change can ask for it); showing the tag on the
   Participants page (not requested); the agent type inside the tag (the name column already falls back to it).

9. **Empty agent name.** An OpenVidu agent in automatic dispatch has `lk.agent_name: ""`: the cell shows its type,
   which is what the default manual configuration registers as name anyway. Any other agent without a name shows "—".

10. **Contract fixture and the writer's scenario change together.** The fixture agent gets the two attributes
    (Data model). The orchestrator vendors the contract and, in the same writer commit, gives the agent of
    `scenarioEvents()` in `contract_integration_test.go` the same attributes (an `attributes` field on `scPerson`
    carried into its `ParticipantInfo`), so `TestContractFixtures` reproduces the fixture. This makes
    `contract-check` prove that the writer produces the dotted keys the dashboard reads. The same commit adds one
    line to the writer's `CHANGELOG-openvidu.md`, under `[Unreleased]`: agents keep `lk.agent_name`, `openvidu.agent`
    and `openvidu.agent.*` whatever `store_metadata` says (owner's decision; `15b31983` shipped the behaviour without
    it, and the changelog still reads "metadata only with `store_metadata`"). Rejected: a description-only contract
    change, which needs no writer test edit but leaves the keys checked on each side separately.

11. **Delta spec shape.** New behaviour is ADDED wherever the existing text stays true (agent facts, both origin
    filters, the Agent cell, the info tip, the writer's agent rule). MODIFIED only where the text becomes false:
    `agents-ui` "Agents table", `participants-api` "Participants and agents CSV export" and `server-analytics-writer`
    "Personal data flags". `data-model` "Secrets and personal data" is REMOVED and restated as "Stored secrets and
    personal data": its scenario "Anonymized IP" has the same name as one of "Personal data flags", scenario names must
    be unique within the change, and a MODIFIED requirement cannot rename a scenario. The carried scenarios (5 of
    "Agents table", 5 of the CSV export, 4 of "Personal data flags" and the 3 restated in `data-model`) get a titled
    test in this change. The CSV scenario "Agents" keeps its name; its test is titled `Agents: …` so the title, not a
    stray `'Agents'` string, covers it. The two scenarios of "Agent naming attributes" are named after the two
    subtests the writer already has.

12. **Generated agents take their attributes from their identity**, without drawing from the seeded stream, so the
    scenario figures stay as they are: `agent-transcriber` → `{ lk.agent_name: speech-processing, openvidu.agent:
    speech-processing }`, `agent-assistant` → `{ lk.agent_name: assistant }`, `agent-recorder` →
    `{ lk.agent_name: '', openvidu.agent: speech-processing }` (the automatic dispatch case).

13. **CHANGELOG.** Two new lines under 3.10.0, Added (UI and Data), as the proposal words them, each in the commit of
    its change (frontend page, backend API).

14. **The plan test compares each query with the same query without `origin`.** What the filter must not do is
    change the index or widen the scan, and that holds whatever index the planner picks. The documents examined are
    compared with the page limit above the sessions in range: an index-ordered page stops at its size, so with a
    filter that rejects rows it reads further into the same scan (on the 8 agent sessions of openvidu-local-deployment,
    a 2-row page examines 2 documents without `origin` and 8 with `origin=openvidu`; with the limit lifted, 8 in every
    case). At scenario S over 2 days the agent sessions (about 20) fit in one page; at scenario M over 7 days (about
    700) they do not. Rejected: one pinned index per combination (the planner is free on the identity searches and
    was seen to pick either index of `q` and `room`); "no in-memory sort" for every combination (false for the
    identity searches today, with `origin` or without it); a hint for the agents identity search (a production query
    change, declined by the owner for this change).

15. **The OpenVidu tag has a tooltip, reachable as the other tags with one are.** Asked by the owner at the demo
    review, with its exact text: "This agent belongs to the official collection of OpenVidu agents" (it replaces the
    earlier "no tooltip"). The text is a constant beside `agentLabel` in `participant-display.ts`. The tag follows
    `ovd-status-badge` and `ovd-kind-badge`, the two tags of the library that carry a tooltip: `matTooltip`,
    `tabindex="0"` so keyboard focus shows it under the global `:focus-visible` ring, and
    `aria-label="OpenVidu, <text>"` so a screen reader reads the label and the explanation. axe-core 4.14 reports
    `aria-label` on a span that has text and no role as "needs review", not a violation, as it does for those badges;
    the e2e axe checks fail on violations only. The rule that lists give badges no tooltip is about tooltips that name
    what a badge shows (`subject`); this one explains a mark, like the stale hint of the status badge in lists. The
    info tip of the Agent column and the CHANGELOG line of the tag stay as they are. Rejected: a hover-only tooltip
    (keyboard and screen reader users would miss it); `role="img"` as the source icon has (the tag is text); an
    `ovd-info-tip` beside every tag (a second icon per row for one sentence).

16. **Name is hidden by default on the Agents page only.** Asked by the owner at the demo review: an empty Name
    column beside Agent reads as a missing agent name. `injectParticipantSessions` takes `nameHidden: boolean` and
    gives the `name` column `defaultHidden: true` with it; the Agents page passes `true`, the Participants page
    `false`. Nothing else changes: the column keeps its key, place and cell. The table already handles the rest
    (`data-table.ts`, `hiddenByUser`): defaults apply only while the viewer has no stored choice for the table id
    (`agents`); the first toggle in the Columns menu stores the whole hidden list in the viewer's preferences
    (browser storage, per table id) and from then on defaults are ignored. So a viewer who already toggled any column
    of the Agents table keeps seeing Name until hiding it by hand, and everyone else gets the new default. No
    migration of stored choices: 3.10.0 is unreleased, so only development and demo browsers hold one, and a stored
    choice is the viewer's. In the card layout (XSmall) a hidden column is left out too, and cards have no Columns
    button. No CHANGELOG line: the page is new in 3.10.0. Rejected: removing Name from the Agents page (agents can
    set a participant name); renaming the header to "Participant name" (the Participants page shares it); rewriting
    stored preferences.

17. **The info tip of the Agent column says which name it is.** Text of the `ui-info-tips` delta: the agent name the
    agent's worker registered with the server (its dispatch name), not its participant name; the rest as before.
    `INFO_TEXTS.agentColumn` and the e2e test that reads it change together.

## Test strategy

Levels: unit (Vitest), integration (Vitest against MongoDB, Docker), e2e (Playwright, mocked API), writer (Go,
`-tags integration`, openvidu-livekit). Paths are relative to `dashboard-ce/`; `agents/` is
`frontend/projects/dashboard-ui/src/lib/features/agents/`.

| Scenario                                                          | Test file                                                       | Level       |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | ----------- |
| Agent row                                                         | `agents/agents-page.spec.ts`                                    | unit        |
| Detail links in CE                                                | `e2e/tests/agents.spec.ts`                                      | e2e         |
| No agents                                                         | `agents/agents-page.spec.ts`                                    | unit        |
| Dates as on the other lists                                       | `agents/agents-page.spec.ts`                                    | unit        |
| Stale agent                                                       | `agents/agents-page.spec.ts`                                    | unit        |
| OpenVidu agent with a name                                        | `agents/agents-page.spec.ts`, `e2e/tests/agents.spec.ts`, `e2e/tests/accessibility.spec.ts` (both themes) | unit, e2e |
| Third-party agent                                                 | `agents/agents-page.spec.ts`                                    | unit        |
| OpenVidu agent without a name                                     | `agents/agents-page.spec.ts`                                    | unit        |
| Agent without agent facts                                         | `agents/agents-page.spec.ts`                                    | unit        |
| Agent column not sortable                                         | `agents/agents-page.spec.ts`                                    | unit        |
| Name hidden by default                                            | `agents/agents-page.spec.ts`                                    | unit        |
| Name shown from the Columns menu                                  | `agents/agents-page.spec.ts`, `e2e/tests/agents.spec.ts`        | unit, e2e   |
| Stored column choice kept                                         | `agents/agents-page.spec.ts`                                    | unit        |
| Name stays on the Participants table                              | `participants/participants-page.spec.ts`                        | unit        |
| OpenVidu tag tooltip                                              | `agents/agents-page.spec.ts`, `e2e/tests/agents.spec.ts`        | unit, e2e   |
| OpenVidu tag name for screen readers                              | `agents/agents-page.spec.ts`, `e2e/tests/accessibility.spec.ts` (both themes) | unit, e2e |
| OpenVidu origin selected                                          | `agents/agents-page.spec.ts`, `e2e/tests/agents.spec.ts`        | unit, e2e   |
| Third-party origin from the URL                                   | `agents/agents-page.spec.ts`                                    | unit        |
| Invalid origin in the URL                                         | `agents/agents-page.spec.ts`                                    | unit        |
| Origin in the CSV export                                          | `agents/agents-page.spec.ts`                                    | unit        |
| Agent column info tip                                             | `e2e/tests/info-tips.spec.ts`                                   | e2e         |
| Marked agent item                                                 | `backend/test/integration/participants-api.test.ts`             | integration |
| Unmarked agent item                                               | `backend/test/unit/participants.test.ts`                        | unit        |
| Agent item without a name                                         | `backend/test/unit/participants.test.ts`                        | unit        |
| Agent item without attributes                                     | `backend/test/unit/participants.test.ts`                        | unit        |
| Marked session of another kind                                    | `backend/test/unit/participants.test.ts`                        | unit        |
| Other attributes stay out                                         | `backend/test/integration/participants-api.test.ts`             | integration |
| OpenVidu agents only                                              | `backend/test/integration/participants-api.test.ts`             | integration |
| Third-party agents only                                           | `backend/test/integration/participants-api.test.ts`             | integration |
| Origin with other filters                                         | `backend/test/integration/participants-api.test.ts`             | integration |
| Unknown origin                                                    | `backend/test/integration/participants-api.test.ts`             | integration |
| Exact SID ignores the origin                                      | `backend/test/integration/participants-api.test.ts`             | integration |
| Origin explain plans                                              | `backend/test/integration/participants-query-plan.test.ts`      | integration |
| Header row                                                        | `backend/test/unit/list-csv.test.ts`                            | unit        |
| Sessions of a room by duration                                    | `backend/test/integration/list-exports-api.test.ts`             | integration |
| Agents                                                            | `backend/test/integration/list-exports-api.test.ts`             | integration |
| Session without client information                                | `backend/test/unit/list-csv.test.ts`                            | unit        |
| No client address                                                 | `backend/test/unit/list-csv.test.ts`                            | unit        |
| Agent columns                                                     | `backend/test/unit/list-csv.test.ts`                            | unit        |
| OpenVidu agents export                                            | `backend/test/integration/list-exports-api.test.ts`             | integration |
| Agent attributes in the contract fixtures                         | `typings/test/contract.test.ts`                                 | unit        |
| Generated agents of both origins                                  | `backend/test/integration/data-generator.test.ts`               | integration |
| Client address absent by default                                  | openvidu-livekit `openvidu/analytics/writer_integration_test.go` | writer      |
| IP addresses stored on request                                    | openvidu-livekit `openvidu/analytics/writer_integration_test.go` | writer      |
| Metadata disabled by default                                      | openvidu-livekit `openvidu/analytics/writer_integration_test.go` | writer      |
| Anonymized IP                                                     | openvidu-livekit `openvidu/analytics/writer_integration_test.go` | writer      |
| IP addresses kept                                                 | openvidu-livekit `openvidu/analytics/writer_integration_test.go` | writer      |
| Migrated legacy session                                           | openvidu-livekit `openvidu/analytics/migration_integration_test.go` | writer   |
| Metadata enabled                                                  | openvidu-livekit `openvidu/analytics/writer_integration_test.go` | writer      |
| agents keep the attributes that name them without store_metadata  | openvidu-livekit `openvidu/analytics/writer_integration_test.go` (exists) | writer |
| agents keep every attribute with store_metadata                   | openvidu-livekit `openvidu/analytics/writer_integration_test.go` (exists) | writer |

Tests that exist under another title are retitled, not duplicated: the Agents page unit tests, the two agents e2e
tests, the participant CSV unit test and the two participants export integration tests on the dashboard side;
`IP addresses kept on request` and `personal data flags` in the writer.

## Risks / Trade-offs

- [An unmarked OpenVidu agent reads as third-party: images older than 3.10, pre-upgrade sessions] → Accepted by the
  owner; the info tip of the Agent column says that agents are marked only when they declare themselves.
- [Any agent can set `openvidu.agent`] → It is a label for telling agents apart in a list, not an authorization
  input; nothing else in the dashboard depends on it. The tooltip of the tag states the membership as a fact, in the
  owner's words, although the dashboard only reads the label.
- [`$getField` needs MongoDB 5.0] → The deployments bundle 8.0. An older external MongoDB answers the origin filter
  with a server error; the unfiltered list works.
- [The planner is free on the identity searches, so the three variants of one combination could get different
  indexes in a run] → Not seen on scenario S over 2 days. If it happens, stop and ask instead of loosening the
  comparison.
- [`participants-api` "Explain plans" in the main spec still says that no list query sorts in memory, which the
  identity searches of the agents list do] → Not this change's to correct: it alters no production query. A later
  change corrects the scenario or adds the hint.
- [A sparse origin scans every agent session of the range] → Bounded by the range and the 300 ms budget, reported by
  the plan suite; a derived indexed field stays possible later without changing the API.
- [With `store_metadata: true` the list reads whole `attributes` objects] → Only the two derived values are returned;
  the scenario "Other attributes stay out" pins it.
- [Dotted keys in fixtures and seeds] → The writer's Go driver stores them on the bundled MongoDB; whether the Node
  driver and `mongosh` insert them is proved by the tests that seed the fixture (backend integration, `contract-check`).
  If a seed refuses them, stop and ask instead of renaming the keys.
- [The PRO workspace pins the 19-column header and the list item] → Its tests fail when `ce.ref` moves; the PRO change
  adapts them. Nothing breaks until then.

## Migration Plan

1. Writer tests titled after their scenarios, committed in the openvidu-livekit checkout (no push).
2. Dashboard implementation and full verification.
3. Owner review on `./dashboard.sh dev` against openvidu-local-deployment.
4. Vendored contract, contract scenario and the changelog line committed in openvidu-livekit; `contract-check`; push
   of openvidu-livekit `openvidu/main`; then the dashboard push, whose CI `contract` job diffs the vendored contract of
   `openvidu/main`.
5. Rollback: revert the dashboard commits; the writer commits are tests, vendored files and a changelog line that
   describes behaviour the writer already has, and can stay. No stored data changes in either direction.
