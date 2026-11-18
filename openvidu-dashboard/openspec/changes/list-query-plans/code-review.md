# Code review: list-query-plans

- Date: 2026-11-18
- Reviewed commit: `51ad853077d983d2a1c2b612ae4f972f00295db4` (range `origin/master..HEAD`, working tree clean)
- Scope: `participants-query.ts`, `rooms-query.ts`, `rooms-service.ts`, `rooms-repository.ts`, `egress-query.ts`,
  `egress-service.ts`, `egress-repository.ts`, the unit tests `participants.test.ts`, `rooms-query.test.ts`,
  `egress.test.ts`, the four plan suites, `test/support/query-plan.ts` and `CHANGELOG.md`. Commit c71abee98 (generator
  test clock) is outside the change and was only read.

## Summary

CRITICAL: 0 · WARNING: 1 · SUGGESTION: 2

The plans match the design's index table for every branch I traced:

- participants: room, service-kind search, planner search, kind and status, plain;
- rooms: media node, one feature, status, several features, `q` with and without a status;
- egress: room, `q`, status, plain.

Hints on partial indexes are only used when the query implies the partial filter:

- `status_createdAt_id_<feature>` only for a single deduplicated feature, whose branch carries `features.<f>: true`;
- `mediaNode_status_createdAt_id` only with a `mediaNode` equality.

Several features are never hinted. The rows stay the same. The agents search adds `kind` and `status: { $in: ALL }`,
which change nothing because the validator requires `status` to be one of `ParticipantStatus`. Optional hints reach
the driver only when set (`exactOptionalPropertyTypes`-safe spreads in every repository and service). Nothing in PRO
references the changed types or functions.

## WARNING

1. **Nothing tests how the rooms service wires `hint` and `countHint`.**
   - Where: `dashboard-ce/backend/src/rooms/rooms-service.ts:73`, `:80`, `:92`, `:93`.
   - What is untested: the plan suites build their explains from `roomsListPlan(...)` and pass `plan.hint` and
     `plan.countHint` themselves (`rooms-query-plan.test.ts:85`, `:123`). The unit tests check only the plan object.
     No test watches what the service sends to MongoDB.
   - Triggering case: a regression in the service. For example, `count(plan.countFilter, plan.hint)` on the page
     path, or dropping the hint argument of `list`, `count` or `ranked`.
   - Consequence: `GET /api/v1/rooms?q=room&status=closed` would then run `total` unpinned. That reopens the
     `status_endedAt_id` tie the change exists to close (decision 7), and `?status=closed` would rank unpinned again.
     Every unit test and plan suite would still pass. The latency rows run through the service but only time it, and
     the S data in CI does not show the tie as a failure.
   - The egress service's new unhinted `q` path (`egress-service.ts:57`, `:86`) has the same gap, at lower risk.
   - Fix: add a unit test of `RoomsService.list` with a stub `RoomsRepository` (or a spy on its `list`, `count` and
     `ranked`). It should assert the hint of each call for `status=closed`, `features=egress`, `q=room&status=closed`
     (page `undefined`, count `status_createdAt_id`) and several features (no hint).

## SUGGESTION

1. **`countQuery` is not exported through `@openvidu-dashboard/backend/testing`, as design decision 12 says.**
   - Where: `dashboard-ce/backend/test/support/index.ts:12-20` (the helper is at `test/support/query-plan.ts:66`).
   - What happens: the helper is defined, and the three CE suites import it from `../support/query-plan.js`. The
     testing entry point that PRO suites use does not re-export it.
   - Consequence: a PRO plan suite cannot explain a `total` the way `countDocuments` runs it without copying the
     pipeline, and the design no longer describes the code.
   - Fix: add it to the `query-plan.js` export list, or drop the sentence from the design.

2. **Two plan cases assert only "no `COLLSCAN`" where the scenario names the index.**
   - Where: `dashboard-ce/backend/test/integration/egress-query-plan.test.ts:261`, in "Ranked sorts over 7 days:
     egress by %s".
   - What happens: with the selective `roomNameSample.prefix`, the case checks only `collscan` and the in-range
     bound. The scenario says each plan scans the range index of its filters. The selective `duration` plan is pinned
     to `roomNameLower_startedAt` in "Room-name prefix", but `endedAt` is not.
   - Consequence: an `endedAt` plan that switched to another candidate would pass unnoticed. The bound still caps
     the cost, so this does not affect correctness.
   - Fix: assert `expectIndexes(..., ['roomNameLower_startedAt'])` for the selective prefix here, as "Room-name
     prefix" does for `duration`. Alternatively, assert that the indexes belong to `roomNameLower_startedAt`,
     `startedAt_id` and `status_startedAt`.
