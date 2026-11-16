# Proposal

## Why

`participants-api` "Index-backed participant queries" says that no list query sorts in memory, the ranked sorts
aside. That is false for every identity search (`q` as an identity prefix, alone or with `room`) of the participants
and agents lists: a prefix is a range on the identity, so no index returns its matches in `joinedAt` order and the
plan sorts them. The change `agent-origin` states the true behaviour for the agents list in its scenario "Origin
explain plans"; once it is archived, the two scenarios contradict each other in the same spec. The owner chose to
correct the spec, with no production change, and to cover the participants list in the same correction.

## What Changes

Edition: CE. Repository: dashboard (`openvidu/openvidu-dashboard`) only. No production code changes: the change is a
spec correction and the tests that prove it.

Observable behaviour: none. No API, UI, data contract, index, configuration or query changes.

- **Spec**: "Index-backed participant queries" states that two kinds of list query sort in memory, the ranked sorts
  and the identity searches of both lists, names the indexes an identity search may run on and bounds what it
  examines by the sessions joined in the range. Its scenario "Explain plans" says the same.
- **Tests**: the participants query plan suite gets a test titled after each of the three scenarios of that
  requirement ("Explain plans", "Ranked sorts over 24 hours", "Publisher filter"), by retitling and regrouping the
  tests it has. "Explain plans" gains what was never asserted: no in-memory sort outside the ranked sorts and the
  identity searches, and the plans of the identity searches of both lists.
- **Latency report**: the suite reports the p95 of the agents list identity search, as it reports the participants
  one (50 ms, reported and not enforced), and of the ranked sorts of the agents list (300 ms, enforced as the
  participants ones are).
- **Evidence**: the suite runs at scenario S in CI; the orchestrator runs it once at scenario M over 7 days, alone,
  before the archive and records the result and the p95 rows in `operations.md`.

CHANGELOG lines: none. Tests and spec corrections get no line.

Not in scope:

- Any change to a production query: no index hint for the identity searches of either list (declined by the owner;
  with the existing indexes a hint makes a selective search scan every agent session of the range) and no new index.
- The data contract, the writer (openvidu-livekit), openvidu-deployment, the PRO dashboard and the UI.
- "Origin explain plans" and the rest of `agent-origin`: its text stays as that change leaves it, and its open
  findings (the range of the `origin` filter, the scenario M evidence of its own scenario) are settled there.
- The plan scenarios of the rooms, egress and ingress lists: none of them says that name searches sort in index
  order.

Sequencing: the artifacts are written before `agent-origin` is archived; the apply starts after that archive
(`tasks.md`, task 1.1).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `participants-api`: "Index-backed participant queries" allows the in-memory sort of the identity searches of the
  participants and agents lists, with the indexes they may use and the bound on the documents they examine.

## Impact

- `openspec/specs/participants-api/spec.md`, at the archive: one requirement and its scenario "Explain plans".
- `dashboard-ce/backend/test/integration/participants-query-plan.test.ts`: tests retitled after the three scenarios,
  new assertions for the identity searches, three new rows in the p95 report.
- No production code, no dependency, no documentation; `AGENTS.md`, `README.md` and `CHANGELOG.md` do not change.
