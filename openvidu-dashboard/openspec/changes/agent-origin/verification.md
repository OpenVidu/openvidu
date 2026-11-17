# Verification report: agent-origin

- Date: 2026-11-17
- Mode: incremental
- Verified commit: `7393e95927c5d00e7103864a6e92877ecad6ad14` (`master`)
- Starts from: `ff7cd0f23d23f394da86ba0a0fdb1a01c7aa14f9`, the commit of the previous (full) verification. Since then:
  `689b241bb` (the two reports), `bb73f4fc2` (proposal of the follow-up change `agents-identity-search-plan`),
  `04bb8d5c2` (`operations.md`: fix decisions and the scenario M run) and `7393e9592` (the fixes). Working tree clean
  before and after the runs.
- This report supersedes the previous `verification.md` and `code-review.md`.

## Conditions of this verification

- Run as a general agent, without the PreToolUse guard of the `spec-verifier` definition, with the owner's consent
  recorded in the orchestrator's prompt and `operations.md`. The probe was not run. Only the read-only commands the
  guard allows were used, and this file is the only one written. `/proc/loadavg` was read with the Read tool.

## Commands run

| Command                                                                            | Result                                                                                                  | Load average (1 min) |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| `./dashboard.sh check`                                                             | Passed: lint, format, typecheck, `openspec validate --all --strict` (both changes and every spec), backend unit 249, frontend 557 + 1 |                      |
| `./dashboard.sh scenarios agent-origin /home/pablo/Desktop/FIX-2/openvidu-livekit` | "45 scenarios, 0 without a test"                                                                        |                      |
| `./dashboard.sh test-integration`                                                  | Passed: 22 files, 259/259 (4 more than at `ff7cd0f23`: the three new participants API tests and the agents export 400), 186 s | 5.5 during           |
| `./dashboard.sh e2e`                                                               | Passed: 125/125 with the mocked API, real backend 6/6                                                   |                      |

Recorded in `operations.md`, not checked here: the scenario M run over 7 days of `participants-query-plan.test.ts`
(714 agent sessions in range; origin p95 12.4 ms and 18.3 ms against 300 ms) and the writer's Go suite at `e5891220`.

## Status of earlier findings

### Previous verification (`ff7cd0f23`)

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| W1. "Origin explain plans" evidenced at scenario S only | Resolved | `operations.md:407-413` records the scenario M run over 7 days with "Origin explain plans" passing and both origin rows under budget; the plan report now names the agent sessions in range (`dashboard-ce/backend/test/integration/participants-query-plan.test.ts:56-57,168-170,176-179`). The participants ranked-sort overrun at M is accepted by the owner as a gap that predates this change. |
| S1. "No client address" asserted on the test's own literal | Resolved | `dashboard-ce/backend/test/unit/list-csv.test.ts:93-114` now runs `columnsCsv(participantCsvColumns(true), [leaky])` on an item carrying an address, a device model, metadata and attributes, checks the real header and that none of those values reaches the row. |
| S2. "Agent row" left the Joined cell unasserted | Resolved | `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/agents/agents-page.spec.ts:195-201` asserts `cells[6]`: its `<time datetime>` and the text of the shared formatter. |
| S3. Follow-up recorded only where archiving deletes it | Resolved | The follow-up is its own change, `openspec/changes/agents-identity-search-plan/` (`bb73f4fc2`), which survives this archive; `operations.md:404-406` says so. |

### Previous code review (`code-review.md`, `ff7cd0f23`)

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| W1. A sparse origin scans every agent session of the range | Resolved | Same evidence as verification W1: measured at scenario M over 7 days with 714 agent sessions in range, 12.4 ms and 18.3 ms p95. A derived indexed field stays open, as the design says. |
| W2. No test pages through a list filtered by origin | Resolved | `dashboard-ce/backend/test/integration/participants-api.test.ts:442-516`: 14 interleaved agents, `limit=3`, three pages for `origin=openvidu` on the default `joinedAt` order and for `origin=third-party` on the ranked `duration` sort; every page keeps the origin, the pages hold all 7 matches, `total` is 7 on page 2 and `prevCursor` returns page 1. Passed in this run. |
| S1. With `store_metadata` every row read its whole `attributes` | Resolved | `dashboard-ce/backend/src/participants/participants-query.ts:16-45`: the projection builds `attributes` with `$setField`/`$getField` from the two agent keys only, an absent key removed with `$$REMOVE`. Applies to `find` (`participants-service.ts:174,221`) and to the ranked pipeline's `$project` (`api/ranked.ts:53`). `participants-api.test.ts:518-544` reads documents through the projection: both keys, one key, none (`{}`). This is the accepted deviation from task 4.2 (`attributes: 1`). |
| S2. The two selects of the filter bar show "every value" differently | Accepted by the owner (not applied) | `operations.md:402-404`. |
| S3. "Shows in the card layout" and the export 400 had no test | Resolved | Card layout: `agents-page.spec.ts:370-393` (XSmall breakpoint, opens "More", finds the Agent fact with its info tip and "speech-processing OpenVidu"). Export 400: `dashboard-ce/backend/test/integration/list-exports-api.test.ts:222-228`. |
| S4. Writer README reads `openvidu.agent*` | Pending, by decision | Goes into the writer commit of task 9.2 (`operations.md:403-404`); group 9 is open by design. |
| S5. Writer tests repeated to carry two scenario names | Accepted by the owner (not applied) | `operations.md:404`. |

## Review of the diff since `ff7cd0f23`

- Specs and design: the projection change keeps the response and CSV output identical (the mapper still reads the two
  keys from `attributes`, and only for kind `AGENT`); "Other attributes stay out" still passes on the raw bodies. It
  departs from decision 4 of `design.md:149-153` (`attributes: 1`, computed fields rejected) and from the risk at
  `design.md:303`; the owner accepted that deviation, and `design.md` goes with the change folder at archive. The
  documents keep the `ParticipantDocument` shape the decision wanted to preserve (`attributes` is still an object).
- `$setField` and `$getField` need MongoDB 5.0; deployments and tests run `openvidu/mongodb:8.0.29-r1`, and
  `$getField` was already used by the origin filter.
- Bugs and security: none found. The projection removes absent keys rather than writing `null`, so the mapper's
  "omit empty values" holds; a document without `attributes` projects `{}`, which the mapper treats as no facts.
- Tests: every new test is titled with a scenario name and a detail, and all ran green here. The card-layout test is
  titled after "Agent column not sortable" because the card layout is stated in the requirement text, not in a
  scenario; acceptable.
- Docs: `dashboard-ce/backend/AGENTS.md:70-71` still tells to "project the whole `attributes` object", which is what the
  fix replaced (W1 below).
- CHANGELOG: no line needed; the fix changes no observable behaviour.
- `bb73f4fc2` and `04bb8d5c2` touch only another change's folder and `operations.md`; `openspec validate --strict`
  passes on both changes.

## Issues

### CRITICAL

None.

### WARNING

- **W1. `dashboard-ce/backend/AGENTS.md:71` contradicts the new projection.** The rule reads "filter them with
  `$getField` inside `$expr`, never with a dotted path, which MongoDB reads as nested fields; project the whole
  `attributes` object". Since `7393e9592` the list projection deliberately reads only the two agent keys
  (`dashboard-ce/backend/src/participants/participants-query.ts:16-45`), so the next agent following the rule would
  reintroduce what code-review S1 removed. Working rule 6 and the Definition of Done ask the `AGENTS.md` files to
  reflect the change.
  Recommendation: replace the last clause with "project them with `$getField`/`$setField` (see
  `PARTICIPANT_LIST_PROJECTION`), never the whole object".

### SUGGESTION

None.

## Definition of Done (items the diff affects)

| Item                                                                     | Status                                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| All tasks checked                                                        | Pending: groups 1 to 7 checked; 8.1 and 9.1 to 9.3 open by design      |
| `./dashboard.sh scenarios` finds a passing test for every delta scenario | Met: 45 of 45; the 36 dashboard ones ran green here, 9 writer tests recorded |
| `./dashboard.sh check` passes locally                                    | Met                                                                    |
| CI run of the push is green                                              | Pending: nothing pushed yet                                            |
| Backend changes: `test-integration` passes                               | Met: 259/259                                                           |
| UI changes: `e2e` passes, with axe and both themes                       | Met: 125/125 and 6/6                                                   |
| Data contract changes: `contract-check` passes against the writer        | Pending: task 9.2                                                      |
| Latest verification reports have no CRITICAL                             | Met                                                                    |
| `CHANGELOG.md`, `README.md` and the `AGENTS.md` files reflect the change | Not met: `dashboard-ce/backend/AGENTS.md:71` (W1)                      |
| Change archived                                                          | Pending                                                                |

The other items are unchanged from the previous report.

## Final assessment

No critical issues. 1 warning to consider (W1: stale rule in `dashboard-ce/backend/AGENTS.md:71`), 0 suggestions.
Every finding of the previous verification and code review is resolved, accepted by the owner (review S2, S5) or
pending by decision in task 9.2 (review S4). Not checked here: the scenario M run and the writer's Go suite (recorded
in `operations.md`), and groups 8 and 9, which follow this verification.
