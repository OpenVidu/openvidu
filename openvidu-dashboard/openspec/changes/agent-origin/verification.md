# Verification report: agent-origin

- Date: 2026-11-17
- Mode: incremental
- Verified commit: `fddcff58a3da75127672c12da3650bc6a1ff575b` (`master`)
- Starts from: `7393e95927c5d00e7103864a6e92877ecad6ad14`, the commit of the previous (incremental) verification,
  whose report was committed in `f753e0e8d`. Since then: `b84dc3c1d` (the fix of that report's W1 in
  `dashboard-ce/backend/AGENTS.md`), `10125d6b3` (the owner's demo-review revision of the artifacts: design decisions
  15 to 17, new scenarios, tasks 5.6 to 5.8, 6.5, 6.6 and 7.4, recorded in `operations.md`), `46b910eea` (the
  implementation) and `fddcff58a` (its end-to-end tests). Working tree clean before and after the runs.
- This report supersedes the previous `verification.md` and `code-review.md`.

## Conditions of this verification

- Run as a general agent, without the PreToolUse guard of the `spec-verifier` definition, with the owner's consent
  recorded in the orchestrator's prompt. The probe was not run. Only the read-only commands the guard allows were
  used, and this file is the only one written.

## Commands run

| Command                                                                            | Result                                                                                                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `./dashboard.sh check`                                                             | Passed: lint, format, typecheck, `openspec validate --all --strict` (32 items), typings 110, backend unit 249, frontend 563 + 1 |
| `./dashboard.sh scenarios agent-origin /home/pablo/Desktop/FIX-2/openvidu-livekit` | "51 scenarios, 0 without a test" (45 before, plus the 6 new ones of `agents-ui`)                                       |
| `./dashboard.sh e2e`                                                               | Passed: 129/129 with the mocked API (4 more than at `7393e9592`: the tooltip and Name tests, the screen-reader test in both themes), real backend 6/6 |

`check` was run twice (the second time only to read its summary lines); both passed. `test-integration` was not run:
since `7393e9592` no backend source or test changed, only a line of `dashboard-ce/backend/AGENTS.md`; its last run
(259/259 at `7393e9592`) stands. Recorded in `operations.md`, not checked here: the scenario M run and the writer's Go
suite at `e5891220`.

## Status of earlier findings

### Previous verification (`7393e9592`)

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| W1. `dashboard-ce/backend/AGENTS.md:71` told to project the whole `attributes` object | Resolved | `b84dc3c1d`: `dashboard-ce/backend/AGENTS.md:70-72` now reads "project the attributes a list needs with `$getField`/`$setField` (see `PARTICIPANT_LIST_PROJECTION`), never the whole object", which matches `dashboard-ce/backend/src/participants/participants-query.ts:16-45`. |

### Earlier verification and code review (`ff7cd0f23`), carried

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| Verification W1, S1, S2, S3 | Resolved | As in the previous report; nothing in the diff touches them. |
| Review W1 (sparse origin scan), W2 (paging by origin), S1 (whole `attributes` read), S3 (card layout and export 400 tests) | Resolved | As in the previous report; nothing in the diff touches them. |
| Review S2 (two selects show "every value" differently) | Accepted by the owner (not applied) | `operations.md`. |
| Review S4 (writer README `openvidu.agent*`) | Pending, by decision | Task 9.2; group 9 is open by design. |
| Review S5 (writer tests repeated for two scenario names) | Accepted by the owner (not applied) | `operations.md`. |

## Review of the diff since `7393e9592`

### Artifacts (`10125d6b3`)

- The revision is coherent across `proposal.md`, `design.md` (decisions 15 to 17, test-strategy rows, risk note),
  the `agents-ui` and `ui-info-tips` deltas and `tasks.md`. "OpenVidu agent with a name" drops its "has no tooltip"
  clause and the requirement text now says the tag is "explained by its tooltip"; "Agent row" states its viewer has
  not chosen the columns and has no Name cell. `operations.md:34-38` records the owner's approval, tooltip wording
  included. `openspec validate --strict` passes.

### Requirements and scenarios

| Requirement / scenario | Implementation | Tests (titled after the scenario) |
| ---------------------- | -------------- | --------------------------------- |
| Agent column info tip (new text, decision 17) | `dashboard-ce/frontend/projects/dashboard-ui/src/lib/format/info-texts.ts:42-43`, identical to the delta | `dashboard-ce/e2e/tests/info-tips.spec.ts:64-75` asserts the exact text, the kept sort and no Origin info icon |
| Name column of the Agents table: Name hidden by default | `participant-sessions.ts:34,72` (`nameHidden` gives `name` `defaultHidden: true`); `agents-page.ts:75` passes `true` | `agents-page.spec.ts:396` checks the nine headers in the scenario's order and the Columns menu item `aria-checked="false"` |
| Name shown from the Columns menu | Existing `data-table` column toggling and stored preferences | Unit `agents-page.spec.ts:419`: Name between Identity and Room, "Support bot" and "—", still shown after navigating away and back. E2e `agents.spec.ts:102`: no Name header at first, then between Identity and Room |
| Stored column choice kept | Stored hidden list replaces the defaults (`data-table.ts`, `hiddenByUser`, as decision 16 says) | `agents-page.spec.ts:443`: stored `['published']` for `agents`, Name shows and Published does not |
| Name stays on the Participants table | `participants-page.ts:67-71` passes `nameHidden: false` | `participants-page.spec.ts:213`: Name between Identity and Room |
| Agent row (updated) | Same | `agents-page.spec.ts:148`: headers and cells without Name, "Support bot" absent, Joined now `cells[5]` |
| OpenVidu tag tooltip | `participant-sessions-table.html:25-32` (`matTooltip`, `tabindex="0"`), text `OPENVIDU_AGENT_HINT` in `participant-display.ts:65-66` beside `agentLabel` | Unit `agents-page.spec.ts:341` (hover shows the exact text). E2e `agents.spec.ts:78`: hover shows it and leaving hides it; Tab from the SID copy button focuses the tag and shows it; Escape hides it and the focus stays on the tag |
| OpenVidu tag name for screen readers | `[attr.aria-label]="'OpenVidu, ' + openviduAgentHint"` | Unit `agents-page.spec.ts:359` (`tabindex="0"`, exact accessible name, third-party row has no tag). E2e `accessibility.spec.ts:38`, inside the light and dark loop: found by its exact accessible name once, focusable, absent from the third-party row, axe with no violation with the pointer away |

### Accessibility

- Keyboard: the tag is in the tab order (`tabindex="0"`) and the e2e test reaches it with Tab from the SID copy button
  of the same row, gets the tooltip on focus and dismisses it with Escape without losing focus. The global
  `:focus-visible` ring applies.
- Screen readers: the accessible name is "OpenVidu, <explanation>", as `ovd-status-badge`
  (`components/badges/status-badge.ts:90-93`) and `ovd-kind-badge` (`components/badges/kind-badge.ts:24-27`) build
  theirs; the e2e test finds the tag through that name (`getByLabel`).
- axe: no violation in the light and dark themes on the Agents page with the tag (`accessibility.spec.ts:32` and
  `:38`, both inside the theme loop; 4 runs, all passed).
- In the card layout (XSmall) the tag keeps the same attributes, since it is the same cell template in the "More" area.

### Other checks

- Design adherence: decisions 15 to 17 are followed as written (constant beside `agentLabel`, the badge pattern, a
  third option of `injectParticipantSessions` touching only `defaultHidden`, no migration of stored choices). Task 7.4
  asks the implementer to restate the refactor review with three options; three boolean flags remain a small, flat
  options object and no shared form is called for.
- Conventions: `dashboard-ce/frontend/AGENTS.md:43-44` says labels carry no hover text of their own and `:52-54` that
  lists never name a badge in its tooltip. Decision 15 addresses both (the tooltip explains a mark, like the stale hint
  of the status badge in lists, rather than naming what it shows), and the owner asked for it; no finding.
- CHANGELOG: no new line, as the design says (the tag line covers the tooltip; the Agents page and its columns are new
  in 3.10.0). README and the other `AGENTS.md` files need no change.
- Bugs and security: none found. The tooltip text is a constant; no user data reaches `matTooltip` or `aria-label`.

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

None.

## Definition of Done (items the diff affects)

| Item                                                                     | Status                                                                     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| All tasks checked                                                        | Pending: groups 1 to 7 checked (5.6 to 5.8, 6.5, 6.6 and 7.4 included); 8.1 and 9.1 to 9.3 open by design |
| `./dashboard.sh scenarios` finds a passing test for every delta scenario | Met: 51 of 51; the 42 dashboard ones ran green here, 9 writer tests recorded |
| `./dashboard.sh check` passes locally                                    | Met                                                                        |
| CI run of the push is green                                              | Pending: nothing pushed yet                                                |
| Backend changes: `test-integration` passes                               | Met at `7393e9592` (259/259); no backend code changed since                |
| UI changes: `e2e` passes, with axe and both themes                       | Met: 129/129 and 6/6                                                       |
| Data contract changes: `contract-check` passes against the writer        | Pending: task 9.2                                                          |
| Latest verification reports have no CRITICAL                             | Met                                                                        |
| `CHANGELOG.md`, `README.md` and the `AGENTS.md` files reflect the change | Met: W1 resolved in `b84dc3c1d`; the revision needs no CHANGELOG line      |
| Change archived                                                          | Pending                                                                    |

The other items are unchanged from the previous report.

## Final assessment

All checks that ran passed: 0 CRITICAL, 0 WARNING, 0 SUGGESTION. The earlier W1 is resolved, and the demo-review
revision (OpenVidu tag tooltip, reworded Agent info tip, Name hidden by default on the Agents page) is implemented as
specified, with a test titled after each of its scenarios, keyboard and screen-reader reach of the tooltip, and axe
clean in both themes. Not checked here: `test-integration` (not rerun, no backend code changed since its last pass),
the scenario M run and the writer's Go suite (recorded in `operations.md`), and groups 8 and 9, which follow this
verification by design.
