# Operations

- Owner decisions: unmarked agent sessions count as third-party (two origins); both server-side requirements are
  corrected here, with a tests-only writer commit; the proposal is approved. The `CHANGELOG-openvidu.md` line of the
  writer about the agent exception to `store_metadata` goes into the writer commit of task 9.2.
- Writer behaviour this change documents: openvidu-livekit `15b31983` on `openvidu/main` (pushed), merged into
  openvidu-pro-livekit as `959eabb80` (pushed).
- The session does not start from this workspace: the subagents run as general agents following
  `.claude/agents/<name>.md`, and the verifier and the reviewer run without their guard, with the owner's consent.
- Group 1: openvidu-livekit `e5891220` "Analytics tests: privacy tests named after the dashboard's scenarios", on
  `openvidu/main` after `15b31983`, committed and not pushed (tests only). `go test -tags integration ./openvidu/analytics/...`
  passed; `./dashboard.sh scenarios agent-origin /home/pablo/Desktop/FIX-2/openvidu-livekit` lists a writer test for each
  of the nine writer scenarios.
- Owner decisions during apply: task 4.7 compares each agents plan with and without `origin` instead of pinning
  indexes (option 1), in the proposer's narrower wording; the writer's `CHANGELOG-openvidu.md` line is part of task 9.2.
- Refactor review (task 7.3), from the implementer's report: none needed; `publisher` and `origin` share one residual
  object in `participantsListPlan`, and the two column flags of `injectParticipantSessions` have two literal callers.
- Host load during apply (a game, then an arm64 cross-build under qemu; load average up to about 50) made tests this
  change does not touch time out (the track-mode data generator test, two analytics latency budgets, four frontend unit
  tests, `assets.spec.ts` "the shell is interactive within 2 s"); each passed rerun alone. The group 7 runs of `check`,
  `test-integration` (255/255) and `e2e` (125/125, both themes; real backend 6/6) passed at load average 4 to 12.
