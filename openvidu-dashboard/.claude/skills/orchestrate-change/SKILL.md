---
name: orchestrate-change
description: How the main session runs work on OpenVidu Dashboard through its subagents, from a direct fix to a full OpenSpec change, in one checkout or several. Load it before starting or continuing a change, including when an OpenSpec propose, apply, verify or archive command is requested.
---

The main session orchestrates: it delegates proposing, implementing and verifying to the subagents of
`.claude/agents/` and never does them in its own context. It keeps for itself the questions to the owner, everything
that leaves the working tree (pushes, CI, image builds, the contract check against the writer, other repositories),
the records of those actions and the archive. A conversation may run several pieces of work, in one checkout or in
several.

| Phase              | Subagent                                     | Model and effort                                       |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| Propose, revise    | `change-proposer`                            | Opus 5.5, `high`; `xhigh` for data contract design     |
| Apply, fix         | `change-implementer`                         | Opus 5.5, `medium`; `high` for aggregations or queries |
| Full verify        | `spec-verifier` and `code-reviewer`, at once | Opus 5.5, `high`                                       |
| Lite or re-verify  | `spec-verifier`, passed `medium`             | Opus 5.5, `medium`                                     |

Each subagent's model and effort come from its definition; pass another only where the table says so. Fable 5.2 costs
several times as much and only the owner chooses it, for a proposal alone: when a change's design looks hard enough to
need it, recommend it in a closed question before launching the proposer, and pass `fable` only on the owner's yes.
Implementing and verifying never run on Fable.

## Tracks

Before starting, propose the track with its reason in the first question to the owner, who may change it. A change
moves up a track as soon as the research or the work shows it no longer fits.

- **Direct**, no OpenSpec change: tooling, documentation, refactors without behaviour change, a bug where the code
  contradicts what the specs already state, and wording or style that no spec names. One `change-implementer` with the
  fix and the test that would have caught it, `./dashboard.sh check` and the suites the fix touches, then the push and
  CI. No proposal and no verifier; the owner sees the diff summary.
- **Lite**: a behaviour change within one capability, one edition and one repository, with no API, data contract,
  configuration or dependency change and about five scenarios at most. The proposer researches and writes in one round
  when it raises no question (`design.md` only when a decision needs recording); its questions and the approval of
  its summary go to the owner in one dialog. One implementer run takes every group. One `spec-verifier` at `medium`
  checks scenarios, specs and code, and is the only verification; then publish and archive as in the full track.
- **Full**: everything else, through the steps below.

## Steps (full track)

1. Propose. Launch `change-proposer` with the change name, the request and any planning notes the owner points to.
   It answers with its research and open questions and writes nothing. Ask the owner, then send the answers to the
   same agent, which writes the artifacts and replies with the owner summary. Relay that summary to the owner complete
   and unedited, translated to the owner's language: the owner approves from it and does not read the artifacts.
   Revisions go to the same agent.
2. Apply. Once the owner approves, launch one `change-implementer` and keep it for the whole change: send it each
   `implementer` task group in order, small consecutive groups together, and later the findings to fix, as messages to
   the same agent. Start a new one only when its reports degrade after a long run. Its questions go to the owner and
   the answers back to it.
3. Groups marked `orchestrator` or `owner` in `tasks.md` are not delegated. Run the `orchestrator` ones yourself, ask
   the owner for the `owner` ones, write the outcome in `openspec/changes/<change>/operations.md` and check the tasks.
4. Full verify, once every task that does not publish is checked and before any push: `spec-verifier` and
   `code-reviewer` in parallel, each a new agent passed the change name. Before every verify, send the proposer the
   deviations from the design that the implementer reported, in one message, so that `design.md` states what was
   built.
5. Fix. Fix every CRITICAL, review every WARNING, and take the SUGGESTIONs that change what users see to the owner in
   one batch right away, before pushing; the others (tests, comments, names, internal structure) are applied without
   asking and reported. A finding that changes a spec or the design goes first to the proposer, which updates the
   artifacts and adds the tasks, with the owner's decision when it changes behaviour; the rest go straight to the
   implementer.
6. Incremental verify, after fixes that change production code or specs: a new `spec-verifier` passed the change name
   and the commit of the last report. Fixes to tests, comments or documentation alone rely on the implementer's suites
   and CI; fixes that rework a large part of the change need a full verify. Commit each report as the verifier left
   it.
7. Publish. With no CRITICAL in the latest reports, run what the change needs and record each result in
   `operations.md`: `./dashboard.sh contract-check <openvidu-livekit>` when the data contract changed,
   `./dashboard.sh build-image` and `smoke-image` when the image or its dependencies changed, the push of a writer
   change before the dashboard's. Then check `git status` and `git diff origin/master`, push to `master`, wait for the
   `openvidu-dashboard-ci.yml` run (`gh run watch`), read the conclusion of every job and record it. A red run is
   fixed through step 5.
8. Archive only once that run is green: sync the delta specs into `openspec/specs` (`openspec-sync-specs` skill),
   delete the change folder, run `./dashboard.sh check` and commit
   `openvidu-dashboard: archive <name>, keep only the specs`, with the verified commit and the CI run in the body.
   Push it.

## Several checkouts

A feature may span the writer (`openvidu-livekit`), this workspace and a workspace that extends it. Start the session
in the workspace whose `.claude/` and `AGENTS.md` should load, which in a VS Code multi-root workspace is its first
folder; its `agent-roots.json` lists the other checkouts the verifier may work in.

- One change per checkout and OpenSpec root, applied in dependency order: the writer, then this workspace, pushed and
  green, then the extending one. The `AGENTS.md` of each workspace adds its own steps.
- Tell every subagent the checkout it works in. The implementer runs its commands there with `cd <checkout> && …`;
  the verifiers reach a listed checkout through the forms their guard allows.
- Never work on this workspace through a copy of it inside another repository: use its own checkout.

## Rules

- Never run the proposer and the implementer at once: they share the working tree. Proposers of different changes may
  run at once.
- Every verifier and reviewer starts with an empty context; never resume one. `verification.md` carries what the next
  one needs.
- One agent runs workspace suites at a time: never start the implementer while a verifier runs, nor a suite of your
  own while either does. A test with a wall-clock budget runs alone, outside the parallel test run.
- `operations.md` holds what only the orchestrator can know: contract checks, image builds, pushes, CI runs, changes in
  other repositories, the owner's decisions. Current facts only. It and the reports are committed in the change folder
  and leave the tree with it at the archive; git history keeps them.
- Several changes: each has its own subagents and its own change folder. Apply, verify, publish and archive go one
  change at a time, each change archived before the next one that touches the same specs or files is applied; a
  proposal written before another change was archived is revised against the new specs first.
- When the session does not list the subagents (it did not start in the workspace), launch a general agent in their
  place, told to follow the definition in `.claude/agents/<name>.md` of the workspace it works in, with the model and
  effort of the table. Such a verifier or reviewer has no guard: tell the owner before the first verification.
- Everything addressed to the owner is in the language the owner writes in; tracked files stay in English.
- Questions to the owner go through the question dialog, closed, with concrete figures in the options, the
  recommendation first and at most four per round. Each one says in product terms when the case arises and what the
  answer changes; code and field names are not context.
- A decision a subagent takes beyond the owner's answers is asked to the owner as a question, not only mentioned, when
  it changes what users see.
- Before the first question of a change, tell the owner the stop points the proposer listed.
- The final summary of the work gives the duration and tokens of each subagent, and any failure of this flow.
