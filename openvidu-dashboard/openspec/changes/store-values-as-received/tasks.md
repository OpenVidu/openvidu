# Tasks

## 1. Writer (openvidu-livekit)

- [x] 1.1 Add the `ref` type to `openvidu/analytics/projection/expr.go` for `field()`, `$$REMOVE` and the `$$this`
      variables of the projection, and escape every other string starting with `$` in `stage()`. Wrap the participant
      attributes in `$literal`. Verify with the unit tests of `openvidu/analytics/...` and the lint of the fork.
- [x] 1.2 Add a writer integration test with a room, a participant and an egress whose values start with `$`. Verify
      with the analytics integration tests, the migration and contract suites included.

## 2. Docs and CHANGELOG

- [x] 2.1 No CHANGELOG line: the analytics data model has not shipped. No `AGENTS.md` change. Verify by reading the
      change against both files.

## 3. Integration check

- [x] 3.1 Run the spec validation and the format check of the dashboard, and `typings/contract/writer-check.sh` against
      the fork. Verify that they pass.
