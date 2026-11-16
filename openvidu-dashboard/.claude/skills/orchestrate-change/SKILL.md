---
name: orchestrate-change
description: How the main session runs an OpenSpec change of OpenVidu Dashboard through its subagents, from proposal to archive. Load it before starting or continuing a change, including when an OpenSpec propose, apply, verify or archive command is requested.
---

A conversation runs one change or several, each in one OpenSpec root. The main session orchestrates: it delegates
proposing, implementing and verifying to the subagents of `.claude/agents/` and never does them in its own context. It
keeps for itself the questions to the owner, everything that leaves the working tree (pushes, CI, image builds, the
contract check against the writer, other workspaces), the records of those actions and the archive.

| Phase              | Subagent                                     | Model and effort                                       |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| Propose, revise    | `change-proposer`                            | Fable 5.2, `high`; `xhigh` for data contract design    |
| Apply, fix         | `change-implementer`                         | Opus 5.5, `medium`; `high` for aggregations or queries |
| Full verify        | `spec-verifier` and `code-reviewer`, at once | Fable 5.2, `high`                                      |
| Incremental verify | `spec-verifier`, passed `opus` and `medium`  | Opus 5.5, `medium`                                     |

Each subagent's model and effort come from its definition; pass another only where the table says so.

## Steps

1. Propose. Launch `change-proposer` with the change name, the request and any planning notes the owner points to.
   It answers with its research and open questions and writes nothing. Ask the owner, then send the answers to the
   same agent, which writes the artifacts and replies with the owner summary. Relay that summary to the owner as it
   is: the owner approves from it and does not read the artifacts. Revisions go to the same agent.
2. Apply. Once the owner approves, launch one `change-implementer` and keep it for the whole change: send it each
   `implementer` task group in order, and later the findings to fix, as messages to the same agent. Start a new one
   only when its reports degrade after a long run. Its questions go to the owner and the answers back to it.
3. Groups marked `orchestrator` or `owner` in `tasks.md` are not delegated. Run the `orchestrator` ones yourself, ask
   the owner for the `owner` ones, write the outcome in `openspec/changes/<change>/operations.md` and check the tasks.
4. Full verify, once every task that does not publish is checked and before any push: `spec-verifier` and
   `code-reviewer` in parallel, each a new agent passed the change name.
5. Fix. Send the findings to the implementer. Fix every CRITICAL, review every WARNING, and take the SUGGESTIONs to
   the owner in one batch right away, before pushing.
6. Incremental verify, after fixes that touch code, tests or specs: a new `spec-verifier` passed the change name and
   the commit of the last report. Fixes to documentation alone need no new verify; fixes that rework a large part of
   the change need a full one. Commit each report as the verifier left it.
7. Publish. With no CRITICAL in the latest reports, run what the change needs and record each result in
   `operations.md`: `./dashboard.sh contract-check <openvidu-livekit>` when the data contract changed,
   `./dashboard.sh build-image` and `smoke-image` when the image or its dependencies changed, the push of a writer
   change before the dashboard's. Then check `git status` and `git diff origin/master`, push to `master`, wait for the
   `openvidu-dashboard-ci.yml` run (`gh run watch`) and record it. A red run is fixed through step 5.
8. Archive when the Definition of Done of `AGENTS.md` holds: sync the delta specs into `openspec/specs`
   (`openspec-sync-specs` skill), delete the change folder, run `./dashboard.sh check` and commit
   `openvidu-dashboard: archive <name>, keep only the specs`, with the verified commit and the CI run in the body.
   Push it.

## Rules

- Every verifier and reviewer starts with an empty context; never resume one. `verification.md` carries what the next
  one needs.
- One agent runs workspace suites at a time: never start the implementer while a verifier runs, nor a suite of your
  own while either does.
- `operations.md` holds what only the orchestrator can know: contract checks, image builds, pushes, CI runs, changes
  in other repositories, the owner's decisions. Current facts only. It and the reports are committed in the change
  folder and leave the tree with it at the archive; git history keeps them.
- A feature that also needs a change in a workspace that extends this one is two changes: this one first, pushed and
  green, then the other, with its subagents working in that workspace. The `AGENTS.md` of that workspace adds its own
  steps.
- Several changes: each has its own subagents and its own change folder. Their proposers may run at once. Apply,
  verify, publish and archive go one change at a time, each change archived before the next one that touches the same
  specs or files is applied; a proposal written before another change was archived is revised against the new specs
  first.
- When the session does not list the subagents (it was not started from the workspace), launch a general agent in
  their place, told to follow the definition in `.claude/agents/<name>.md` of the workspace it works in, with the model
  and effort of the table. Such a verifier or reviewer has no guard: tell the owner before the first verification.
- Questions to the owner are closed, with concrete figures in the options, the recommendation first and at most four
  per round.
- Before the first question of a change, tell the owner the stop points the proposer listed.
- The final summary of the change gives the duration and tokens of each subagent, and any failure of this flow.
