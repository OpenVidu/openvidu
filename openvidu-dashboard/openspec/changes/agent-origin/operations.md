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
- Verification fixes: the owner chose to apply review W2 (paging with `origin`), review S1 (the list reads only the two
  agent attributes) and the missing tests (review S3, verification S1 and S2); the writer README wording (review S4) goes
  into task 9.2; review S2 and S5 are not applied. The contradiction of the main-spec "Explain plans" scenario
  (verification S3) is the follow-up change `agents-identity-search-plan`, proposed and approved (`bb73f4fc2`), applied
  after this archive.
- Scenario M over 7 days (verification W1, review W1), `participants-query-plan.test.ts` run alone against a separate
  MongoDB (`DASHBOARD_TEST_MONGO_URI`; the 2 GB test container lost its MongoDB during generation), load average 2.3 to
  12.1, 714 agent sessions in range: "Origin explain plans" and the other plan tests passed. p95: agents list origin
  openvidu 12.4 ms and third-party 18.3 ms (budget 300 ms), agents list 12.8 ms, exports 743.6 ms and 1840.4 ms (2 s).
  The participants list's ranked sorts over 24 hours exceeded their 300 ms budget (leftAt 783.7 ms, duration
  1031.1 ms): they rank about 20,500 sessions in memory, exceed it without this change's projection, and vary up to
  about 5x between runs. The owner accepts it as a gap that predates this change and is outside its scope.
