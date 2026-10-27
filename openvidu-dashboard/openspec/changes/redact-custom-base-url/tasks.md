# Tasks

## 1. Writer (openvidu-livekit)

- [x] 1.1 Give `custom_base_url` the `redactURL` rule in `RoomCompositeEgressRequest` and `TemplateSource` of
      `openvidu/analytics/schema/allowlist.go`. Verify with a codec test that encodes both requests with a custom base
      URL carrying a token, and with the codec suite.
- [x] 1.2 Add a custom base URL with a secret to the room composite egress of the writer test builders, so that the
      integration suite's no-secret check covers it. Verify with the analytics integration tests and the lint of the
      fork.

## 2. Docs and CHANGELOG

- [x] 2.1 No CHANGELOG line: the analytics data model has not shipped. No `AGENTS.md` changes. Verify by reading the
      change against both files.

## 3. Integration check

- [x] 3.1 Run the spec validation and the format check of the dashboard. Verify that they pass.
