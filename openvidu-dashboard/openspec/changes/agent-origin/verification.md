# Verification report: agent-origin

- Date: 2026-11-16
- Mode: full
- Verified commit: `ff7cd0f23d23f394da86ba0a0fdb1a01c7aa14f9` (`master`; the change is `7d85e6d07..HEAD`, 12 commits, and
  `origin/master` is `7d85e6d07`). Working tree clean before and after the runs, apart from the reviewer's untracked
  `code-review.md`.
- Writer: openvidu-livekit `openvidu/main` at `e5891220` (tests of group 1, local, one commit ahead of
  `origin/openvidu/main`), on top of `15b31983` (behaviour, pushed).

## Conditions of this verification

- Run as a general agent, without the PreToolUse guard of the `spec-verifier` definition. The definition says to stop
  in that case; the orchestrator's prompt and `operations.md` record the owner's consent to go on. The probe was not
  run. Only commands the guard allows were used, with two differences the prompt asked for: `git -C` on the
  openvidu-livekit checkout (read-only), and `dashboard.sh` and `git -C` by absolute path, because the agent's working
  directory is not the workspace. `/proc/loadavg` was read with the Read tool.
- The `openspec` CLI is not on the `PATH` of this shell, so `openspec status` and `openspec instructions apply` of the
  verify skill could not run. The artifacts were read from `openspec/changes/agent-origin/` directly, the task
  progress from `tasks.md`, and `openspec validate --all --strict` ran inside `./dashboard.sh check` (31 passed, the
  change included).

## Summary

| Dimension    | Status                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Completeness | 33/37 tasks; the 4 open ones are groups 8 (owner) and 9 (orchestrator), pending by design. 11/11 added or modified requirements implemented; 1 removal confirmed (restated) |
| Correctness  | 11/11 requirements mapped; 45/45 scenarios have a titled test that passes or, for the 9 writer ones, a test read here and recorded as passing. 1 warning on the scale of one scenario |
| Coherence    | Design followed (decisions 1 to 9 and 11 to 14; decision 10 is group 9). No pattern deviation                |

Open issues: 0 CRITICAL, 1 WARNING, 3 SUGGESTION.

## Commands run

| Command                                                                         | Result                                                                                      | Load average (1 min) |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| `./dashboard.sh check`                                                          | Passed: lint, format, typecheck, spec validation 31/31, tooling 115, typings 110, backend unit 249, frontend 556 + 1 | 1.5 at start |
| `./dashboard.sh scenarios agent-origin /home/pablo/Desktop/FIX-2/openvidu-livekit` | "45 scenarios, 0 without a test"                                                         |                      |
| `./dashboard.sh test-integration`                                               | Passed: 22 files, 255/255 tests, 158 s (projects `integration` and `integration-plans`, scenario S) | 6.0 at start |
| `./dashboard.sh e2e`                                                            | Passed: 125/125 with the mocked API (axe, light and dark), real backend 6/6                  | 5.1 at start, 4 to 5 during |

No test timed out or missed a latency budget in these runs.

Not run here, as recorded in `operations.md` and not checked:

- The writer's Go suite (`go test -tags integration ./openvidu/analytics/...`): `operations.md` records it as passed
  with `e5891220`. The nine writer tests were read in `git show e5891220` and `git show 15b31983`.
- `./dashboard.sh contract-check`, the pushes, both CI runs and the owner demo: groups 8 and 9 and the workflow
  follow-up, all after this verification.

## Completeness

### Tasks

Groups 1 to 7 are all checked (33 tasks). Open: 8.1 (owner demo), 9.1, 9.2 and 9.3 (vendored contract, contract check
and changelog line in the writer, push). They come after the verification by design and are pending, not findings.

State that group 9 will change: the writer's vendored contract
(`openvidu/analytics/schema/contract/schema/participants.schema.json:140` and its `fixtures/participants.json`) still
has the old `attributes` description and no agent attributes, and its `CHANGELOG-openvidu.md:10` still reads
"metadata only with `store_metadata`". Until 9.1 and 9.2, `contract-check` and the CI `contract` job fail on the
vendored copy, so the dashboard must not be pushed before the writer, as `tasks.md` orders.

### Requirements

| Capability                | Requirement                                   | Delta    | Implementation                                                                                                   |
| ------------------------- | --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `agents-ui`               | Agents table                                  | MODIFIED | `participants/participant-sessions.ts:70`, `participant-sessions-table.html:22-29`, `agents/agents-page.ts:75,163-165` |
| `agents-ui`               | Agent column                                  | ADDED    | `participants/participant-display.ts:66-68`, `participant-sessions-table.html:22-29`, `.scss:14-17`                |
| `agents-ui`               | Agent origin filter                           | ADDED    | `agents/agents-page.ts:77-81,91,159-161`, `agents-page.html:36-44`, `participants/participants-data.ts:35-59,75,88` |
| `ui-info-tips`            | Agents list info tips                         | ADDED    | `format/info-texts.ts:42-43`, `participant-sessions.ts:70`                                                         |
| `participants-api`        | Agent facts of a list item                    | ADDED    | `backend/src/participants/participants-mappers.ts:35-48,68`, `participants-responses.ts:21-32,56`, `participants-query.ts:30-31` |
| `participants-api`        | Origin filter of the agents list              | ADDED    | `participants-schemas.ts:61-71,95,102`, `participants-query.ts:93-101,118-121`, `participants-service.ts:132-134`  |
| `participants-api`        | Participants and agents CSV export            | MODIFIED | `participants-csv.ts:24-26`                                                                                        |
| `data-model`              | Stored secrets and personal data              | ADDED    | Writer `openvidu/analytics/projection/participant.go` (`15b31983`); `typings/contract/schemas.ts:199-206`, `contract/fixtures/participants.ts:251` |
| `data-model`              | Generated agent attributes                    | ADDED    | `tools/data-generator/src/model.ts:107-108,887-901,924-926`                                                        |
| `server-analytics-writer` | Personal data flags                           | MODIFIED | Writer, unchanged behaviour; tests retitled in `e5891220`                                                          |
| `server-analytics-writer` | Agent naming attributes                       | ADDED    | Writer `projection/participant.go`, `namesAgent` and `attributesDocument` (`15b31983`)                             |
| `data-model`              | Secrets and personal data                     | REMOVED  | Restated in "Stored secrets and personal data"; see below                                                          |

Frontend paths are under `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/` (or `…/lib/format/`), backend
ones under `dashboard-ce/backend/src/participants/`.

Removal: the baseline (`openspec/specs/data-model/spec.md:411-430`) is the rule that client addresses need
`anonymize_ip: false` and metadata and attributes need `store_metadata`. Every part of it is kept by the added
requirement except one, which is the point of the change: attributes of an `AGENT` are no longer stored only with
`store_metadata`. The writer no longer behaves that way since `15b31983`, and the test
"agents keep the attributes that name them without store_metadata" pins it. Removal confirmed.

## Correctness

### Scenario coverage

Every test below was read against its scenario. "Recorded" means the test is in the writer and its run is the one of
`operations.md`.

| Scenario                                    | Test                                                                 | Run         | Asserts the scenario |
| ------------------------------------------- | -------------------------------------------------------------------- | ----------- | -------------------- |
| Agent row                                   | `agents/agents-page.spec.ts:139`                                     | check       | Yes; see S2          |
| Detail links in CE                          | `e2e/tests/agents.spec.ts:38`                                        | e2e         | Yes                  |
| No agents                                   | `agents/agents-page.spec.ts:216`                                     | check       | Yes                  |
| Dates as on the other lists                 | `agents/agents-page.spec.ts:260`                                     | check       | Yes; the header hint is read from the column model |
| Stale agent                                 | `agents/agents-page.spec.ts:299`                                     | check       | Yes                  |
| OpenVidu agent with a name                  | `agents-page.spec.ts:319`, `e2e/tests/agents.spec.ts:56`, `e2e/tests/accessibility.spec.ts:32` (light and dark) | check, e2e | Yes: text and no tooltip in the unit test, 24 px against the status badge in the e2e |
| Third-party agent                           | `agents/agents-page.spec.ts:335`                                     | check       | Yes                  |
| OpenVidu agent without a name               | `agents/agents-page.spec.ts:342`                                     | check       | Yes                  |
| Agent without agent facts                   | `agents/agents-page.spec.ts:349`                                     | check       | Yes                  |
| Agent column not sortable                   | `agents/agents-page.spec.ts:356`                                     | check       | Yes                  |
| OpenVidu origin selected                    | `agents-page.spec.ts:378`, `e2e/tests/agents.spec.ts:78`             | check, e2e  | Yes                  |
| Third-party origin from the URL             | `agents/agents-page.spec.ts:405`                                     | check       | Yes                  |
| Invalid origin in the URL                   | `agents/agents-page.spec.ts:417`                                     | check       | Yes                  |
| Origin in the CSV export                    | `agents/agents-page.spec.ts:120`                                     | check       | Yes                  |
| Agent column info tip                       | `e2e/tests/info-tips.spec.ts:64`                                     | e2e         | Yes                  |
| Marked agent item                           | `backend/test/integration/participants-api.test.ts:402`              | integration | Yes, both lists      |
| Unmarked agent item                         | `backend/test/unit/participants.test.ts:219`                         | check       | Yes, at the mapper   |
| Agent item without a name                   | `backend/test/unit/participants.test.ts:226`                         | check       | Yes, at the mapper   |
| Agent item without attributes               | `backend/test/unit/participants.test.ts:233`                         | check       | Yes, both cases      |
| Marked session of another kind              | `backend/test/unit/participants.test.ts:238`                         | check       | Yes, at the mapper   |
| Other attributes stay out                   | `backend/test/integration/participants-api.test.ts:421`              | integration | Yes, on the raw body of both lists |
| OpenVidu agents only                        | `backend/test/integration/participants-api.test.ts:441`              | integration | Yes                  |
| Third-party agents only                     | `backend/test/integration/participants-api.test.ts:450`              | integration | Yes, the empty mark included |
| Origin with other filters                   | `backend/test/integration/participants-api.test.ts:459`              | integration | Yes                  |
| Unknown origin                              | `backend/test/integration/participants-api.test.ts:476`              | integration | Yes                  |
| Exact SID ignores the origin                | `backend/test/integration/participants-api.test.ts:484`              | integration | Yes                  |
| Origin explain plans                        | `backend/test/integration/participants-query-plan.test.ts:254`, p95 rows at `:405-410` | integration | At scenario S only; see W1 |
| Header row                                  | `backend/test/unit/list-csv.test.ts:79`                              | check       | Yes; the agents export header is compared in `list-exports-api.test.ts:188` |
| Sessions of a room by duration              | `backend/test/integration/list-exports-api.test.ts:159`              | integration | Yes                  |
| Agents                                      | `backend/test/integration/list-exports-api.test.ts:188`              | integration | Yes (the other lines the script lists for "Agents" are stray `'Agents'` strings) |
| Session without client information          | `backend/test/unit/list-csv.test.ts:85`                              | check       | Yes                  |
| No client address                           | `backend/test/unit/list-csv.test.ts:93`                              | check       | Through the literal that "Header row" pins; see S1 |
| Agent columns                               | `backend/test/unit/list-csv.test.ts:101`                             | check       | Yes                  |
| OpenVidu agents export                      | `backend/test/integration/list-exports-api.test.ts:222`              | integration | Yes                  |
| Agent attributes in the contract fixtures   | `typings/test/contract.test.ts:269`                                  | check       | Yes                  |
| Generated agents of both origins            | `backend/test/integration/data-generator.test.ts:608`                | integration | Yes                  |
| Client address absent by default            | writer `writer_integration_test.go:939`                              | Recorded    | Yes                  |
| IP addresses stored on request              | writer `writer_integration_test.go:943`                              | Recorded    | Yes                  |
| Metadata disabled by default                | writer `writer_integration_test.go:976`                              | Recorded    | Yes                  |
| Anonymized IP                               | writer `writer_integration_test.go:935`                              | Recorded    | Yes                  |
| IP addresses kept                           | writer `writer_integration_test.go:948`                              | Recorded    | Yes                  |
| Migrated legacy session                     | writer `migration_integration_test.go:522`                           | Recorded    | Yes                  |
| Metadata enabled                            | writer `writer_integration_test.go:963`                              | Recorded    | Yes, both configurations |
| agents keep the attributes that name them without store_metadata | writer `writer_integration_test.go:422`         | Recorded    | Yes                  |
| agents keep every attribute with store_metadata | writer `writer_integration_test.go:455`                          | Recorded    | Yes                  |

Dashboard paths are under `dashboard-ce/`; `agents/` is
`frontend/projects/dashboard-ui/src/lib/features/agents/`.

### Conformance with the specs and the `AGENTS.md` files

- Edition seams: the Agent column is an option of the shared `injectParticipantSessions`, the cell lives in the shared
  sessions table and the Participants page passes `agentColumn: false`; `agent` is in `participantListFields`, which
  the PRO session detail extends. Nothing was added to the application shell.
- Data contract: no field, type or index changes; `contract_version.txt` is untouched and only
  `schema/participants.schema.json` and `fixtures/participants.json` changed among the generated files, with the
  typings tests (which fail on stale generated files) passing.
- Secrets and personal data: the list projection reads the whole `attributes` object and the mapper returns two
  derived values only for kind `AGENT`; "Other attributes stay out" checks the raw response bodies.
- Language, comments and commit messages: English, comments state constraints only.
- CHANGELOG: the two lines of the proposal are in `CHANGELOG.md:36-37` (Added, UI) and `CHANGELOG.md:68-69` (Added,
  Data), each in the commit of its change (`d3eac30fa`, `f1d35c62f`).
- Docs: `dashboard-ce/backend/AGENTS.md:70-71`, `dashboard-ce/typings/README.md:32-34` and
  `dashboard-ce/tools/data-generator/README.md:73-76` state the new rules. The root `README.md` describes nothing this
  change alters.

## Coherence

Design adherence, decision by decision: 1 (origin is the non-empty `openvidu.agent` key), 2 (no derived field), 3
(one `originFilter` helper, residual on every branch, hint kept; `participants-query.ts:93-152`), 4 (mapper derives
`agent`, projection gains `attributes: 1`), 5 (`agent` object on the shared fields), 6 (keys and `AgentOrigin` in
typings, imported by backend, frontend and generator), 7 (one CSV column list), 8 (the UI pieces, as written), 9
(empty name falls back to the type), 11 (delta shape; `openspec validate --strict` passes), 12 (generator attributes
from the identity), 13 (CHANGELOG) and 14 (plans compared with the query without `origin`) are followed. Decision 10
is group 9, pending.

Task 3.1 mentions the stored shape of `tools/data-generator/src/contract.ts`; that file needed no edit, since it
conforms documents to the contract schema, which accepts `attributes`, and "Generated agents of both origins" proves
the attributes are stored.

Code pattern consistency: the new code follows the slice layout of the backend (`*-schemas`, `*-query`, `*-mappers`,
`*-responses`, `*-csv`), the label and info text files of the library and the existing test files. No deviation.

## Issues

### CRITICAL

None.

### WARNING

- **W1. "Origin explain plans" is evidenced at scenario S only.** The scenario
  (`openspec/changes/agent-origin/specs/participants-api/spec.md:71-74`) is given "a database generated at scenario
  M", and the design asks for scenario M over 7 days for the design figures (`design.md:127-128`). The test
  (`dashboard-ce/backend/test/integration/participants-query-plan.test.ts:254`) and the two p95 rows (`:405-410`) ran
  here, and in the run commit `2f2999e8b` records, at the default scenario S over 2 days. The design itself says that
  at S the agent sessions (about 20) fit in one page (`design.md:223-224`), so at that size the page of 100 never cuts
  a scan short, the 300 ms budget measures a scan of about 20 documents, and the risk it names for the identity
  searches (the planner choosing a different index for one of the three variants, `design.md:295-297`) was only "not
  seen on scenario S". No scenario M figure is recorded in `operations.md`. The guard does not let this verifier set
  the environment of that run.
  Recommendation: the orchestrator runs the suite once at scenario M over 7 days, alone, with the command of
  `dashboard-ce/backend/AGENTS.md` and the `PARTICIPANTS_PLAN_` prefix
  (`DASHBOARD_TEST_MONGO_URI=<uri> PARTICIPANTS_PLAN_SCENARIO=M PARTICIPANTS_PLAN_DAYS=7 PARTICIPANTS_PLAN_REPORT=<file> pnpm --filter @openvidu-dashboard/backend exec vitest run --project integration-plans test/integration/participants-query-plan.test.ts`),
  and records in `operations.md` that "Origin explain plans" passes and the p95 of the two origin rows; or the owner
  accepts scenario S as the evidence and that is recorded.

### SUGGESTION

- **S1. "No client address" asserts on the test's own header literal.**
  `dashboard-ce/backend/test/unit/list-csv.test.ts:93-99` splits `PARTICIPANT_HEADER`, a constant of the test file, and
  runs no product code. It holds only because "Header row" (`:79-83`) pins the real header to that constant.
  Recommendation: read the headers from `lines(columnsCsv(participantCsvColumns(false), []))[0]` in that test, so it
  covers its scenario alone.
- **S2. "Agent row" leaves the join time cell unasserted.**
  `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/agents/agents-page.spec.ts:172-190` checks the first
  six cells in order, the "Not left" mark, the live duration and the source icon, but not the Joined cell that the
  scenario lists between "active" and "—". Recommendation: assert `cells[6]` against the formatted join time, as
  "Dates as on the other lists" does.
- **S3. A follow-up is recorded only where archiving deletes it.** After the archive, `participants-api` will hold
  "Explain plans" (`openspec/specs/participants-api/spec.md:151-156`: no agents list query sorts in memory, the ranked
  sorts aside) beside "Origin explain plans" (the identity searches of the agents list do). The design accepts this
  and leaves the correction to a later change (`design.md:298-300`), but `design.md` goes with the change folder and
  "Workflow follow-up" in `tasks.md:190-196` does not list it. Recommendation: before archiving, record that follow-up
  where it survives (the owner's backlog or an issue), with the two options the design names: correct the scenario or
  hint the agents identity search.

### Observations, not findings of this change

- `ng build frontend` warns that the initial bundle is 1.24 MB raw against Angular's 1.20 MB warning budget. It is a
  warning, the gzip budget the workspace enforces passes (310.2 kB of 400 kB), and this change adds two labels and one
  info text to the initial chunk, far less than the 39 kB of the overrun.

## Definition of Done

| Item                                                                                     | Status                                                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| All tasks checked                                                                        | Pending: groups 1 to 7 checked; 8.1 and 9.1 to 9.3 come after this verification                    |
| `./dashboard.sh scenarios` finds a passing test for every delta scenario                 | Met: 45 of 45, 36 run here and 9 writer tests recorded as passing                                  |
| `./dashboard.sh check` passes locally                                                    | Met                                                                                                |
| CI run of the push is green                                                              | Pending: nothing is pushed yet                                                                     |
| Backend changes: `test-integration` passes                                               | Met: 255/255                                                                                       |
| UI changes: `e2e` passes, with axe and both themes                                       | Met: 125/125 and 6/6; the Agents page passes axe in the light and dark themes                      |
| Data contract changes: `contract-check` passes against the writer                        | Pending: task 9.2, after the writer vendors the contract (9.1)                                     |
| Image or runtime dependency changes: `build-image` and `smoke-image`                     | Not applicable: no dependency, image or runtime change                                             |
| Latest verification reports have no CRITICAL                                             | Met for this report; `code-review.md` is the reviewer's and was not read here                      |
| Refactor review applied or recorded                                                      | Met: recorded in `operations.md` (none needed)                                                     |
| `CHANGELOG.md`, `README.md` and the `AGENTS.md` files reflect the change                 | Met                                                                                                |
| Change archived                                                                          | Pending                                                                                            |

## Final assessment

No critical issues. 1 warning to consider (W1: scenario M evidence for "Origin explain plans") and 3 suggestions. The
checks of the verify skill all ran, from the artifact files instead of the `openspec` CLI. Not checked here, by design
of the change: the writer's Go suite (recorded as passed), and groups 8 and 9 with the contract check, the pushes, CI
and the archive, which follow this verification.
