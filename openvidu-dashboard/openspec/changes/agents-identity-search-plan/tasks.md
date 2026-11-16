# Tasks

Paths are relative to `dashboard-ce/`. "The suite" is `backend/test/integration/participants-query-plan.test.ts`
(Vitest project `integration-plans`, Docker). A test covers a scenario when its title is the scenario name, alone or
followed by `: <detail>`; a test that exists under another title is retitled, not duplicated. Decisions are those of
`design.md`. No production file changes in this change: if a task seems to need one, stop and ask.

## 1. Preconditions: after the `agent-origin` archive (orchestrator)

- [ ] 1.1 Do not start the apply until `agent-origin` is archived. Verify: `openspec/changes/agent-origin/` no longer
      exists, `openspec/specs/participants-api/spec.md` holds the scenario "Origin explain plans", and
      `git status --short` is empty in the workspace.
- [ ] 1.2 Re-read what this change builds on, as the archive left it. In the synced
      `openspec/specs/participants-api/spec.md`: "Origin explain plans" still lets the identity searches (`q`, `q` and
      `room`) sort in memory and names indexes inside the set of design decision 5, and "Index-backed participant
      queries" still has exactly the scenarios "Explain plans", "Ranked sorts over 24 hours" and "Publisher filter",
      the last two with the text this delta carries. In the suite: the test `Origin explain plans` and the helpers
      `agentsParams`, `agentsFilter` and `explainFilter` exist. Verify: `openspec validate
      "agents-identity-search-plan" --strict` passes without an "Archive would refuse" note, and the findings are
      recorded in `operations.md`; on any difference, stop and send it to the proposer as a revision before group 2.

## 2. Backend tests: the participants query plan suite (implementer)

- [ ] 2.1 Retitle the index-order tests of the `lists` block after "Explain plans" (design decision 6): `Explain
      plans: no filter on joinedAt_id without a sort`, `Explain plans: room on roomSid_joinedAt_id without a sort`,
      `Explain plans: kind, status and publisher on kind_status_joinedAt_id without a sort, also for the agents list`
      (add the list with `status=active&publisher=true`, bounded by the active sessions of the range) and `Explain
      plans: summary through the status indexes and joinedAt_id`. Each keeps its index assertion and asserts no
      `COLLSCAN` and no `SORT` stage. Covers: Explain plans. Verify: the four tests pass at scenario S.
- [ ] 2.2 Replace `identity prefix: identityLower_joinedAt within the prefix range` with `Explain plans: identity
      searches of both lists` (design decisions 4 to 6). Sorted by `joinedAt`, explain the participants list with `q`,
      `q` and `room`, `q` and `kind`, `q` and `status`, and the agents list (through `agentsFilter`) with `q`, `q` and
      `room`, `q` and `status`. For each plan: no `COLLSCAN`; exactly one index, one of `identityLower_joinedAt`,
      `roomSid_identityLower_joinedAt`, `joinedAt_id`, `kind_status_joinedAt_id` and `roomSid_joinedAt_id`;
      `totalDocsExamined` at most the sessions joined in the range; a `SORT` stage when the index is
      `identityLower_joinedAt` or `roomSid_identityLower_joinedAt`. Label each assertion with its query. Covers:
      Explain plans. Verify: the test passes at scenario S, and fails when the allowed set is emptied in a scratch
      edit that is then reverted.
- [ ] 2.3 Retitle `ranked by %s: …` to `Ranked sorts over 24 hours: by %s` (design decisions 6 and 7): every case
      takes the last 24 hours as its range; the participants cases stay (no filter, `status`, `room`, `q`), the agents
      list stays with `status` and gains `q`; the cases with `q` accept any index of the set of task 2.2 and are
      bounded by the sessions joined in the range, the others keep their pinned index and bound. Covers: Ranked sorts
      over 24 hours. Verify: both parametrized tests pass at scenario S.
- [ ] 2.4 Retitle `publisher: kind_status_joinedAt_id with isPublisher residual` to `Publisher filter:
      kind_status_joinedAt_id with isPublisher residual` and add the assertion that the plan has no `SORT` stage.
      Covers: Publisher filter. Verify: the test passes at scenario S.
- [ ] 2.5 In the `performance budget` block (design decision 8): add `Ranked sorts over 24 hours: p95 of a page`,
      which measures a 100-row page of the participants list and of the agents list ranked by `leftAt` and by
      `duration` over 24 hours, enforces 300 ms through `expectWithinBudgets` and appends its four rows to the suite's
      report; remove the two ranked rows from `reports the p95 of every budgeted query` and add to it the reported row
      "Agents list, identity prefix" (50 ms, `service.agents` with `q: 'agent'`). The report keeps one header
      whichever test runs first. Covers: Ranked sorts over 24 hours. Verify: both tests pass at scenario S and the
      printed report has one header, the four ranked rows and the new agents row.
- [ ] 2.6 Run the suite alone at the default scenario S (`pnpm --filter @openvidu-dashboard/backend exec vitest run
      --project integration-plans test/integration/participants-query-plan.test.ts`, Docker) and
      `./dashboard.sh scenarios agents-identity-search-plan`. Verify: every test of the suite passes, `Origin explain
      plans` among them and unchanged, and each of the three scenarios lists at least one line of the suite, with no
      `NO TEST`.
- [ ] 2.7 Run `./dashboard.sh check` and `./dashboard.sh test-integration` (Docker). Verify: both pass;
      `git status --short` lists only the suite.
- [ ] 2.8 Refactor review: assess whether the suite needs one after the regrouping (shared helpers for the range
      bound and the allowed index set, the report rows). Apply it here if small, otherwise record the proposal.
      Verify: the outcome is written in `operations.md`, and tasks 2.6 and 2.7 pass again if the suite changed.

## 3. Evidence at scenario M (orchestrator)

- [ ] 3.1 After the full verification and before the archive, run the suite once at scenario M over 7 days, alone on
      the machine, with the command of `backend/AGENTS.md`:
      `DASHBOARD_TEST_MONGO_URI=<uri> PARTICIPANTS_PLAN_SCENARIO=M PARTICIPANTS_PLAN_DAYS=7
      PARTICIPANTS_PLAN_REPORT=<file> pnpm --filter @openvidu-dashboard/backend exec vitest run --project
      integration-plans test/integration/participants-query-plan.test.ts`. Covers: Explain plans, Ranked sorts over
      24 hours, Publisher filter. Verify: every test passes and `operations.md` records the date, the load average,
      the MongoDB version and the whole p95 report; if a plan assertion fails or an enforced row exceeds its budget,
      stop and ask the owner instead of changing the test.

## Workflow follow-up

- Push the dashboard to `master`, wait for the `openvidu-dashboard-ci.yml` run and record it.
- Archive the change when the Definition of Done holds; the archive syncs "Index-backed participant queries" into
  `openspec/specs/participants-api/spec.md`.
- Nothing follows in openvidu-livekit, openvidu-deployment or the PRO dashboard.
