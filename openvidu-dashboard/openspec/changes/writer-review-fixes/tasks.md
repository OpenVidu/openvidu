# Tasks

## 1. Typings

- [x] 1.1 Add `NONE: 'none'` to `BrowserFamily`, regenerate `schema/` and `fixtures/`, and vendor the contract into
      `openvidu/analytics/schema/contract/` with `contract/vendor.sh`. Verify with the typings contract tests and
      `./dashboard.sh contract-check ../openvidu-livekit`.

## 2. Server and writer (openvidu-livekit)

- [x] 2.1 Fill the empty `room_id` of an ingress state from the room of its room name in `UpdateIngressState` (OPENVIDU
      block). Verify with a unit test of `IOInfoService` with an active room, a missing room and a state that names its
      room.
- [x] 2.2 Keep one `statusHistory` entry per egress status at its earliest `at`. Verify with projection unit tests and a
      writer integration test of "Status reported twice" in both orders.
- [x] 2.3 Map an empty browser to `none` in `browserFamily()`. Verify with a vocabulary unit test and a writer
      integration test of "Session without a browser".
- [x] 2.4 Lint the fork with the Dockerfile Go toolchain and run its unit and integration tests. Verify that both pass.

## 3. Integration check

- [x] 3.1 Run `./dashboard.sh check` and `./dashboard.sh contract-check ../openvidu-livekit`. Verify that both pass.
- [ ] 3.2 On a local deployment with the nightly server image, publish an RTMP ingress into an active room and start a
      room composite egress with a file and a stream output. Verify that the session has `roomSid` while it publishes,
      the room counts it, the egress history reads starting, active, ending, complete, and a Go SDK session is counted
      under `byBrowser.none`.
