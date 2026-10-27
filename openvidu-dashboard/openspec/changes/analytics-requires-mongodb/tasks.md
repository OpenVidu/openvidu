# Tasks

## 1. Writer (openvidu-livekit)

- [x] 1.1 Add the pipeline update probe (an explain on `schema_meta`) and the unsupported database error to
      `openvidu/analytics`, run it after the connection check, and make `openvidu.Start` log it and start without
      analytics. Verify with unit tests of the error classification, an integration test against MongoDB and the lint
      of the fork.
- [x] 1.2 Start the server image against an Amazon DocumentDB cluster. Verify that it logs the error, serves a room
      and creates no collection in the cluster.

## 2. Docs and CHANGELOG

- [x] 2.1 Add the upgrade note and correct the `DATABASE_TLS_CA_FILE` line of `openvidu-dashboard/CHANGELOG.md`, and add
      the Changed line of `CHANGELOG-openvidu.md`. Verify by reading both against the change.

## 3. Integration check

- [x] 3.1 Run the spec validation and the format check of the dashboard. Verify that they pass.
