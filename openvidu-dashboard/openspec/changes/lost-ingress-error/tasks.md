# Tasks

## 1. Writer and server (openvidu-livekit)

- [x] 1.1 Set `Error: "ingress lost"` on the state reset of `reconcileIngresses`, and project an `INGRESS_ENDED` with an
      inactive state and an error as a session in `error`. Verify with the reconciler unit tests, a writer integration
      test and the lint of the fork.

## 2. Tests

- [ ] 2.1 Run the lost ingress case of the end-to-end reconciler tests on the deployment playground. Verify that it
      passes.

## 3. Docs and CHANGELOG

- [x] 3.1 No CHANGELOG line: unreleased. Verify by reading the change against the CHANGELOG files.

## 4. Integration check

- [x] 4.1 Run the spec validation and the format check of the dashboard. Verify that they pass.
