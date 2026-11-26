# Operations of live-demo-writer

What only the orchestrator knows: the owner's decisions, the rebase onto other work and, later, the push and its CI.

## Owner's decisions

- Track: full.
- Proposal approved as summarised, with rolling server operations, the Single Node restart at 04:00 UTC, common
  short-lived states and the restart on kept data treated as an outage. `frozen` is the default of
  `DASHBOARD_DEMO_DATA` and means today's keep-alive.
- Live egress and ingress shares: 50 % and 10 % of the rooms created after the generation instant; the generation keeps
  30 % and 2 %.
- A frozen run restarted live on kept data closes the rooms it kept open as an outage at its last heartbeat.
- A track still published and muted at the generation instant may have one more `TRACK_MUTED` than `TRACK_UNMUTED`
  (generator test adjusted).
- Slow connections: half of the live STANDARD sessions, about one room in eleven in progress holding a connecting
  session, instead of the one in seven first planned.
- The live writer tests run in their own suite, `./dashboard.sh test-live`, out of `test-integration` and out of CI.
- In the owner review of the live demo, rooms in progress at the generation instant went on for hours with one
  participant, as decision 1 drew 10 minutes to 5 hours. Their last participant now stays 10 to 30 minutes after the
  instant; the other sessions keep their drawn lengths, so such a room closes when its last session leaves, as any room.

## Rebase

- The change's commits were rebased, without conflicts, onto `origin/master` `fc0ffeff4` (shorter 3.10 changelog, with
  the internal changes apart). The change adds no CHANGELOG line: the demo data generator is internal and already has
  its Internal line.

## Live writer suite

- The verifier's guard comes from the PRO workspace's `ce.ref`, which predates `./dashboard.sh test-live`, so the
  verifier cannot run that suite. The implementer ran it at `b7acfd554`, the last code commit: 30 tests passed in
  16 min. `./dashboard.sh check` passed at that commit, run by the orchestrator.

## Demo review (5.1)

- The owner handed the review to the orchestrator, which toured every sidebar section of the CE demo with no console
  or API error.
- The first live run, from 08:58 to 12:17 UTC, showed the rooms in progress at generation going on for hours with one
  participant. That led to task 1.4.
- Live, at `dc1b052e5`, from 14:12 UTC:
  - the 14 rooms in progress at generation closed 4 to 32 minutes after it;
  - 45 minutes later, 10 rooms were active and 17 new ones had been created;
  - stats, egress, ingress and agents moved.
- Frozen, at the same commit: 14 rooms in progress, no room created after generation, and stats kept fresh.

## CE push

- Rebased without conflicts onto `origin/master` `eb61adfbf` (third-party versions in `openvidu-deployment` only) and
  pushed as `c6b963cbaeff03cdc982e57ca8f274c83d7503ff`.
- OpenVidu Dashboard CI run 45845146799 is green: checks, unit, integration, contract and e2e.
