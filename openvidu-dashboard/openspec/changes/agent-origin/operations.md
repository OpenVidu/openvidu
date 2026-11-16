# Operations

- Owner decisions: unmarked agent sessions count as third-party (two origins); both server-side requirements are
  corrected here, with a tests-only writer commit; the proposal is approved. The `CHANGELOG-openvidu.md` line of the
  writer about the agent exception to `store_metadata` goes into the writer commit of task 9.2.
- Writer behaviour this change documents: openvidu-livekit `15b31983` on `openvidu/main` (pushed), merged into
  openvidu-pro-livekit as `959eabb80` (pushed).
- The session does not start from this workspace: the subagents run as general agents following
  `.claude/agents/<name>.md`, and the verifier and the reviewer run without their guard, with the owner's consent.
