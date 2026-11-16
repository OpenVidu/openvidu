# Tasks

Paths are relative to `dashboard-ce/` unless they start with `openvidu/analytics/` (the writer checkout,
`/home/pablo/Desktop/FIX-2/openvidu-livekit`, branch `openvidu/main`). `agents/` and `participants/` are
`frontend/projects/dashboard-ui/src/lib/features/agents/` and `…/features/participants/`. A test covers a scenario when
its title is the scenario name, alone or followed by `: <detail>`; a test that exists under another title is retitled,
not duplicated. Decisions are those of `design.md`.

## 1. Writer (openvidu-livekit): privacy tests titled after their scenarios (orchestrator)

Tests only, committed in the writer checkout and not pushed until group 9. It comes first because
`./dashboard.sh scenarios` counts these tests from group 7 on.

- [x] 1.1 In `openvidu/analytics/writer_integration_test.go`, give the default-configuration case two subtests that
      share one helper, `Anonymized IP` and `Client address absent by default`: a `PARTICIPANT_JOINED` with
      `client_info.address` leaves no address in the participant document nor in the raw payload. Split it out of
      `personal data flags`. Covers: Anonymized IP, Client address absent by default. Verify: both subtests pass.
- [x] 1.2 In the same file, rename `IP addresses kept on request` to `IP addresses stored on request` (the document
      has `client.address` with `anonymize_ip: false`) and add `IP addresses kept`, which also finds the address in the
      raw payload. Covers: IP addresses stored on request, IP addresses kept. Verify: both subtests pass.
- [x] 1.3 In the same file, turn the rest of `personal data flags` into `Metadata enabled` (`store_metadata: true`: the
      room's `config.metadata` and a STANDARD participant's `metadata` and `attributes` are stored) and add
      `Metadata disabled by default` (default configuration: none of the three is stored). Covers: Metadata enabled,
      Metadata disabled by default. Verify: both subtests pass.
- [x] 1.4 In `openvidu/analytics/migration_integration_test.go`, add `Migrated legacy session`: with the default
      configuration, a legacy `PARTICIPANT_JOINED` with a client address is replayed and the migrated participant
      document has no `client.address`. Covers: Migrated legacy session. Verify: the subtest passes.
- [x] 1.5 Run `go test -tags integration -count=1 ./openvidu/analytics/...` (Docker) and, from the dashboard
      workspace, `./dashboard.sh scenarios agent-origin /home/pablo/Desktop/FIX-2/openvidu-livekit`. Verify: the Go
      suite passes and the nine writer scenarios of design "Test strategy" each list a `_test.go` line, the two
      `agents keep …` ones included; the dashboard scenarios still read NO TEST at this point.
- [x] 1.6 Commit the test changes in openvidu-livekit (tests only, no behaviour change), without pushing, and record
      the commit in `operations.md`. Verify: `git -C /home/pablo/Desktop/FIX-2/openvidu-livekit show --stat HEAD`
      lists only `_test.go` files.

## 2. Typings and contract (implementer)

- [x] 2.1 In `typings/src/data-model/entities.ts`, export the attribute keys `AGENT_NAME_ATTRIBUTE`
      (`lk.agent_name`) and `OPENVIDU_AGENT_ATTRIBUTE` (`openvidu.agent`); in `typings/src/api/participants.ts`, add
      `AgentOrigin` (`openvidu`, `third-party`), `ParticipantAgent { name?, openvidu? }`, `ParticipantListItem.agent?`
      and `AgentsListQuery.origin?` (decision 6). Verify: `./dashboard.sh typecheck` passes and
      `pnpm --filter @openvidu-dashboard/typings test` passes.
- [x] 2.2 In `typings/contract/schemas.ts`, reword the `attributes` description of `participants` (design, Data
      model); in `typings/contract/fixtures/participants.ts`, give the agent
      `attributes: { 'lk.agent_name': 'speech-processing', 'openvidu.agent': 'speech-processing' }`; regenerate with
      `pnpm --filter @openvidu-dashboard/typings contract`. Verify: `git diff --stat` shows, of the generated files,
      only `schema/participants.schema.json` and `fixtures/participants.json`, and `contract_version.txt` still
      reads 1.
- [x] 2.3 In `typings/test/contract.test.ts`, add `Agent attributes in the contract fixtures`: the agent fixture
      passes the `participants` validator with exactly those two attributes, and no other participant fixture has
      `attributes` or `metadata`. Covers: Agent attributes in the contract fixtures. Verify: the typings tests pass.
- [x] 2.4 In `typings/README.md`, "Conventions", add that `attributes` keys contain dots (`lk.agent_name`,
      `openvidu.agent`), are read with `$getField` and never with a dotted path, and what an agent keeps without
      `store_metadata`. Verify: `./dashboard.sh format-check` passes.

## 3. Data generator (implementer)

- [x] 3.1 In `tools/data-generator/src/model.ts`, add `attributes?` to `ParticipantDoc` and set it on `AGENT` sessions
      from their identity, without drawing from the seeded stream (decision 12); keep it in the stored shape of
      `src/contract.ts`. Verify: task 3.2.
- [x] 3.2 In `backend/test/integration/data-generator.test.ts`, add `Generated agents of both origins` on a scenario S
      dataset of 2 days: every `AGENT` session has `lk.agent_name` and no key other than it and `openvidu.agent`, at
      least one has a non-empty mark and one has none, no other kind has `attributes`, and the collection validator
      accepted every session. Covers: Generated agents of both origins. Verify: the test passes (Docker) and the
      figures the other tests of the file assert are unchanged.
- [x] 3.3 In `tools/data-generator/README.md`, `participants` bullet, add the attributes of the generated agents.
      Verify: `./dashboard.sh format-check` passes.

## 4. Backend (implementer)

- [x] 4.1 In `backend/src/participants/participants-schemas.ts`, add `origin` (the `AgentOrigin` values, optional,
      with its description) to the agents list and agents export queries only. Verify: `backend/test/unit/participants.test.ts`
      shows `origin` parsed on the agents queries and absent from the participants query, and
      `backend/test/integration/openapi-document.test.ts` passes with the parameter described.
- [x] 4.2 In `participants-query.ts`, add `origin?` to `ParticipantsFilter` and the residual `$expr` of decision 3 to
      every branch of `participantsListPlan` (page and ranked, `match` and `countFilter`), and `attributes: 1` to
      `PARTICIPANT_LIST_PROJECTION`; in `participants-service.ts`, pass `origin` from `agents()`. Verify: a unit test
      in `backend/test/unit/participants.test.ts` finds the residual on the `q`, `room`, kind-and-status and ranked
      branches, with the `kind_status_joinedAt_id` hint kept.
- [x] 4.3 In `participants-mappers.ts` and `participants-responses.ts`, derive and declare `agent` (decisions 4 and 5).
      In `backend/test/unit/participants.test.ts`, add `Unmarked agent item`, `Agent item without a name`,
      `Agent item without attributes` and `Marked session of another kind`, each also parsed by the response schema.
      Covers: those four scenarios. Verify: the unit tests pass.
- [x] 4.4 In `participants-csv.ts`, add `agent.name` and `agent.openvidu` after `client.browserVersion`. In
      `backend/test/unit/list-csv.test.ts`, retitle the participant columns test as `Header row` (21 columns, then
      `mediaNode` with `per-node-breakdown`) and add or retitle `Session without client information`,
      `No client address` (no address, device, metadata nor attribute beyond the two `agent.*` columns) and
      `Agent columns`. Covers: Header row, Session without client information, No client address, Agent columns.
      Verify: the unit tests pass.
- [x] 4.5 In `backend/test/integration/participants-api.test.ts`, add `Marked agent item` (both lists),
      `Other attributes stay out`, `OpenVidu agents only`, `Third-party agents only` (an empty mark included),
      `Origin with other filters`, `Unknown origin` and `Exact SID ignores the origin`, seeding agent documents with
      dotted attribute keys. Covers: those seven scenarios. Verify: `./dashboard.sh test-integration` passes (Docker);
      if the seed refuses dotted keys, stop and ask.
- [x] 4.6 In `backend/test/integration/list-exports-api.test.ts`, retitle the room ranking test as
      `Sessions of a room by duration` and the agents export test as `Agents: every row is an active agent` (it
      requests `status=active`), and add `OpenVidu agents export`. Covers: Sessions of a room by duration, Agents,
      OpenVidu agents export. Verify: the integration tests pass.
- [ ] 4.7 In `backend/test/integration/participants-query-plan.test.ts`, add `Origin explain plans`: both origins
      alone and with `status`, `q`, `q` and `room`, `room`, and the ranked sorts over 24 hours, each on the index of
      design "API" with no `COLLSCAN`, no `SORT` outside the ranked sorts and `maxDocsExamined` equal to the agent
      sessions the other filters select; add "Agents list, origin openvidu" and "Agents list, origin third-party" to
      the p95 report with a 300 ms budget, enforced like the ranked rows. Covers: Origin explain plans. Verify: the
      `integration-plans` project passes and the report shows both rows.
- [x] 4.8 In `backend/AGENTS.md`, "Rules", add that attribute keys contain dots and are filtered with `$getField`
      inside `$expr`, never with a dotted path; add the Data line of the proposal to `CHANGELOG.md` (3.10.0, Added) in
      the commit of the API change. Verify: `./dashboard.sh check` passes.

## 5. Frontend (implementer)

- [ ] 5.1 Add `AGENT_ORIGIN_LABELS` to `format/labels.ts` and `agentColumn` to `INFO_TEXTS` (`format/info-texts.ts`)
      with the text of the `ui-info-tips` delta; in `participants/participants-data.ts`, add `origin` to
      `AgentsListRequest` and send it from `agents()` and `exportAgents()`. Verify: `./dashboard.sh typecheck` passes.
- [ ] 5.2 Add `agentLabel(item)` to `participants/participant-display.ts`, the `agentColumn` option to
      `injectParticipantSessions` and the `agent` cell with its "OpenVidu" tag to
      `participants/participant-sessions-table/` (decision 8); the Participants page passes `agentColumn: false` and
      keeps its columns. Verify: task 5.4 and `participants/participants-page.spec.ts` still pass.
- [ ] 5.3 In `agents/agents-page.ts` and `.html`, read `origin` from the URL, add the Origin select after Status, send
      `origin` in the list request and the export, and drop it in `clearFilters` (decision 8). Verify: task 5.4.
- [ ] 5.4 In `agents/agents-page.spec.ts`, retitle or add one test per scenario: `Agent row`, `No agents`,
      `Dates as on the other lists`, `Stale agent`, `OpenVidu agent with a name`, `Third-party agent`,
      `OpenVidu agent without a name`, `Agent without agent facts`, `Agent column not sortable`,
      `OpenVidu origin selected`, `Third-party origin from the URL`, `Invalid origin in the URL` and
      `Origin in the CSV export`. Covers: those thirteen scenarios. Verify:
      `pnpm exec ng test dashboard-ui --watch=false --include=**/agents-page.spec.ts` passes from `frontend/`.
- [ ] 5.5 Add the UI line of the proposal to `CHANGELOG.md` (3.10.0, Added, after the Agents page line) in the commit
      of the page change. Verify: `./dashboard.sh check` passes.

## 6. End-to-end tests (implementer)

- [ ] 6.1 In `e2e/fixtures/participants.ts`, give `PA_agent1` `agent: { name: 'speech-processing', openvidu:
      'speech-processing' }` and `PA_agent2` `agent: { name: 'dummy-agent' }`; in `e2e/fixtures/api.ts`, filter the
      `agents` list by `origin`. Verify: the existing e2e suites still pass.
- [ ] 6.2 In `e2e/tests/agents.spec.ts`, retitle the locked detail test as `Detail links in CE` (SID and room links)
      and add `OpenVidu agent with a name: …` (the cell text, the tag 24 px high like the status badge of its row, no
      tag on the third-party row) and `OpenVidu origin selected: …` (the URL gets `origin=openvidu` and one row stays).
      Covers: Detail links in CE, OpenVidu agent with a name, OpenVidu origin selected. Verify: `./dashboard.sh e2e`
      passes.
- [ ] 6.3 In `e2e/tests/info-tips.spec.ts`, add `Agent column info tip`: the tip of the Agent header reads the text,
      the URL gets no `sort`, and the Origin select has no info button. Covers: Agent column info tip. Verify: the
      e2e suite passes.
- [ ] 6.4 In `e2e/tests/accessibility.spec.ts`, inside the light and dark loop, add
      `OpenVidu agent with a name: the Agents page passes axe`. Covers: OpenVidu agent with a name. Verify: the e2e
      suite passes in both themes.

## 7. Checks and refactor review (implementer)

- [ ] 7.1 Run `./dashboard.sh scenarios agent-origin /home/pablo/Desktop/FIX-2/openvidu-livekit`. Verify: each of the
      45 scenarios lists a test and none reads NO TEST; `Agents` lists the `Agents: …` test of task 4.6.
- [ ] 7.2 Run `./dashboard.sh check`, `./dashboard.sh test-integration` and `./dashboard.sh e2e`, one at a time.
      Verify: all pass, the e2e with axe and both themes; report any suite that could not run and why.
- [ ] 7.3 Refactor review: assess whether the residual filters of `participantsListPlan` (`publisher`, `origin`) and
      the two column options of `injectParticipantSessions` call for a shared form; apply a small refactor here or
      record that none is needed. Verify: the outcome is written in the implementation report.

## 8. Owner review on the demo (owner)

After the full verification and its fixes, before any push.

- [ ] 8.1 The orchestrator serves the change with `./dashboard.sh dev` against openvidu-local-deployment
      (`http://localhost:4200`); the owner reviews `/agents`: the Agent column, the OpenVidu tag on
      `speech-processing-dev` only, the three Origin options and the CSV export. If the 24 h range no longer holds the
      three agents, they are dispatched again with `lk dispatch create`, by the owner or with the owner's OK. Verify:
      the owner's verdict and any change asked are recorded in `operations.md`.

## 9. Writer (openvidu-livekit): vendored contract and push (orchestrator)

After group 8. The dashboard push follows this group: its CI `contract` job diffs the vendored contract of
`openvidu/main`.

- [ ] 9.1 Run `dashboard-ce/typings/contract/vendor.sh /home/pablo/Desktop/FIX-2/openvidu-livekit` and, in
      `openvidu/analytics/contract_integration_test.go`, give the agent of `scenarioEvents()` the attributes
      `lk.agent_name: speech-processing` and `openvidu.agent: speech-processing` (decision 10). Verify:
      `go test -tags integration -count=1 -run '^TestContractFixtures$' ./openvidu/analytics/` passes.
- [ ] 9.2 Commit the vendored contract and the scenario in openvidu-livekit and run
      `./dashboard.sh contract-check /home/pablo/Desktop/FIX-2/openvidu-livekit`. Verify: it ends with
      "contract check passed"; the result is recorded in `operations.md`.
- [ ] 9.3 With the owner's OK, push openvidu-livekit `openvidu/main` (the commits of 1.6 and 9.2). Verify: its `Test`
      workflow run is green and recorded in `operations.md`.

## Workflow follow-up

- Push the dashboard to `master` after 9.3, wait for the `openvidu-dashboard-ci.yml` run and record it.
- Archive the change when the Definition of Done holds.
- openvidu-pro-livekit takes the writer commits with its next merge of `openvidu/main`; nothing waits for it.
- A separate change in the PRO dashboard workspace moves `ce.ref` and adapts what pins the list item and the CSV
  header there.
