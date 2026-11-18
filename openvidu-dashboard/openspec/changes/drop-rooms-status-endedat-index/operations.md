# Operations

- Owner decisions (2026-11-18): lite track, chosen by the owner over full although the change touches the shared data
  contract and two repositories; the contract stays at version 2; proposal approved as summarized.
- Applied on top of the direct fixes to contract version 2, pushed before it: writer `3a697751` (the frames upgrade
  repeats no work and never lowers the recorded version) and CE `f291c5dde`, `986c362f2`, `e498ae2c7`; CI green (writer
  Test 44413406018, CE 44413418295, PRO 44413425308).
- Contract check, 2026-11-18, CE `8c9d08405` against writer `0ecee9d2` (local, not pushed): passed, writer and
  dashboard at schema version 2.
