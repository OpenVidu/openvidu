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
- Demo review (task 8.1), first round: the owner asked for a tooltip on the OpenVidu tag ("This agent belongs to the
  official collection of OpenVidu agents"), an Agent column info tip that names the dispatch name apart from the
  participant name, and the Name column hidden by default on the Agents page only. The proposer folded them into the
  artifacts (new tasks 5.6 to 5.8, 6.5, 6.6 and 7.4); the owner approved the revision as it stands, tooltip wording
  included. Task 8.1 stays open until the owner reviews them on the demo.
- Demo review (task 8.1), second round, on `./dashboard.sh dev` at ports 4300 and 5100 (the owner's PRO development
  servers held 4200 and 5000) against openvidu-local-deployment with three dispatched agents: `speech-processing-dev`
  (the agent with the mark, `openvidu-agents` `6663bd2`), the published `speech-processing` image (no mark) and a plain
  livekit-agents `dummy-agent`. The owner approved the demo with the tooltip, the Agent tip and the Name default.
- Group 1's `e5891220` reached `origin/openvidu/main` of openvidu-livekit with the owner's push of `682e41ca`.
- Tasks 9.1 and 9.2: openvidu-livekit `05459651` "Analytics: vendored dashboard contract with the agent attributes", on
  `682e41ca`, not pushed. Besides the vendored contract, the scenario and the `CHANGELOG-openvidu.md` line, it carries the
  `README-openvidu.md` wording of review S4 (owner's decision). `TestContractFixtures` passed;
  `./dashboard.sh contract-check /home/pablo/Desktop/FIX-2/openvidu-livekit` ended with "contract check passed".
- Rebase before the push: `origin/master` had moved past the base `7d85e6d07` with the archives of
  `overview-live-tiles` and `settings-data-tab`; the change's commits were rebased onto `0127ecc01` with no conflict.
  Upstream changed the `ui-info-tips` requirement "Overview info tips" only, which this change does not modify. On the
  rebased tree `check`, `test-integration` (259/259), `e2e` (135, both themes; real backend 6/6) and `scenarios` (51, none
  without a test) passed. The verification reports refer to the commits before the rebase; the change's own content is
  the same.
- Task 9.3: with the owner's OK, openvidu-livekit `openvidu/main` pushed (`682e41ca..05459651`); its `Test` run
  44071926509 is green.
- Dashboard push: with the owner's OK, `master` pushed (`0127ecc01..5b174058a`); `openvidu-dashboard-ci.yml` run
  44074047154 is green (contract with the writer, unit, checks, integration, end-to-end).
