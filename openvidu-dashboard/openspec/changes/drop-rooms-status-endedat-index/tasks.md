# Tasks

Checkouts: the **CE workspace** is `openvidu-dashboard/` of the openvidu repository (the standalone checkout, never the
copy an extending workspace keeps); the **writer checkout** is the sibling openvidu-livekit checkout on
`openvidu/main`, never the `openvidu-livekit` submodule of the openvidu repository. Suites that need Docker run one at a
time, when the orchestrator schedules them.

## 1. Typings: contract without the index (implementer)

- [x] 1.1 In the CE workspace, remove the `status_endedAt_id` entry from `INDEXES` in
      `dashboard-ce/typings/contract/indexes.ts` and run `pnpm --filter @openvidu-dashboard/typings contract`. Verify:
      `git diff --stat` lists `contract/indexes.ts` and `schema/indexes.json` only under `dashboard-ce/typings`
      (fixtures, `contract_version.txt` and `src/schema-version.ts` untouched; the version stays 2).
- [x] 1.2 In the CE workspace, add the test `No rooms index on endedAt` to the `index definitions` suite of
      `dashboard-ce/typings/test/contract.test.ts`: no `rooms` entry of `schema/indexes.json` has `endedAt` in its key
      or is named `status_endedAt_id`. Covers "No rooms index on endedAt". Verify:
      `pnpm --filter @openvidu-dashboard/typings test` passes, and fails with the entry of 1.1 restored.

## 2. Backend: rooms plans without the index (implementer)

- [x] 2.1 In the CE workspace, rewrite the doc comment of `roomsListPlan` in
      `dashboard-ce/backend/src/rooms/rooms-query.ts` so the pin of a name prefix with a status no longer cites
      `status_endedAt_id`: it keeps the ranked sorts and `total` on the status index of the range, which guards a
      database whose server has not dropped the index yet and keeps the plan deterministic. No code change. Verify:
      `./dashboard.sh check` passes.
- [x] 2.2 In the CE workspace, in `dashboard-ce/backend/test/integration/rooms-query-plan.test.ts`: retitle the broad
      prefix test `Broad room name prefix: a range index within two pages, the status index with a status`, keep its
      `COLLSCAN` assertion and drop the `status_endedAt_id` one; drop `status_endedAt_id` from the indexes the rooms
      summary count of active rooms may use. Covers "Hinted room filters", "Several features", "Selective room name
      prefix" and "Broad room name prefix" (the first three tests keep their titles). Verify: the rooms plan suite
      passes (`pnpm --filter @openvidu-dashboard/backend exec vitest run --project integration-plans
      test/integration/rooms-query-plan.test.ts`, Docker), then `./dashboard.sh test-integration` passes.

## 3. Writer: vendored contract and the drop step (implementer)

- [x] 3.1 From the CE workspace, run `dashboard-ce/typings/contract/vendor.sh <writer checkout>`. Verify: in the writer
      checkout, `git diff --stat` lists only `openvidu/analytics/schema/contract/schema/indexes.json`, and
      `go test ./openvidu/analytics/schema/` passes.
- [x] 3.2 In the writer checkout, add the drop step as a function of its own at the end of
      `openvidu/analytics/schema/upgrade.go`, with the retired list (`rooms`: `status_endedAt_id`) beside it: it lists
      the indexes of `rooms`, drops `status_endedAt_id` when listed, treats `IndexNotFound` (code 27, another node
      dropped it first) as done, and appends `rooms.status_endedAt_id` to `InitResult.DroppedIndexes` only when its drop
      succeeded. Call it from `Initialize` (`initialize.go`) as one statement right after the loop over `ensureIndexes`
      and before `upgradeDocuments`, and widen the doc comment of `DroppedIndexes` to the retired indexes. Leave
      `upgradeDocuments`, `removeTrackFrames` and `writeSchemaMeta` untouched: a separate fix edits them. Verify:
      `go build ./openvidu/...` and the lint of `buildtest.yaml` with the Go version of the `Dockerfile`
      (`GOTOOLCHAIN=go$(.github/scripts/go-version.sh Dockerfile) go run
      github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.14.0 run --build-tags integration ./openvidu/...`) pass.
- [x] 3.3 In the writer checkout, add the subtests `Retired rooms index dropped` and `Nodes dropping the retired index
      together` to `TestInitialize` in `openvidu/analytics/schema/initialize_integration_test.go`. The first creates
      `status_endedAt_id` `{ status: 1, endedAt: -1, _id: -1 }` and `operator_custom` on an initialized database, then
      checks the first `Initialize` (dropped list, no created index, `operator_custom` kept, version 2) and a second one
      (nothing dropped). The second runs several `Initialize` calls concurrently on one database holding the index and
      checks that all return without error and the index is gone. Covers both writer scenarios. Verify:
      `go test -race -tags integration ./openvidu/analytics/schema/...` passes (Docker), and the first subtest fails
      without the call of 3.2.
- [x] 3.4 In the writer checkout, commit 3.1 to 3.3 on `openvidu/main` without pushing. Verify:
      `go test -race -tags integration ./openvidu/analytics/...` passes (Docker), as the `Analytics integration tests`
      step of `buildtest.yaml` runs it.

## 4. Refactor review (implementer)

- [x] 4.1 Review the diff of both checkouts for a needed refactor; apply a small one here, record a larger one as a
      proposed change. Confirm that no `AGENTS.md`, README or `CHANGELOG.md` needs a line (no command, layout or
      convention changes, and the index never shipped). Verify: in the CE workspace, `./dashboard.sh check` passes and
      `./dashboard.sh scenarios drop-rooms-status-endedat-index <writer checkout>` finds a test for every scenario.

## 5. Contract check (orchestrator)

- [ ] 5.1 In the CE workspace, run `./dashboard.sh contract-check <writer checkout>` (Docker). Verify: it ends with
      "contract check passed", with writer and dashboard at schema version 2.

## 6. Publish (orchestrator)

After the full verification.

- [ ] 6.1 Push the writer checkout's `openvidu/main` and the CE workspace's `master` together: the CE CI `contract` job
      builds the writer's `openvidu/main`. Verify: the writer's `Test` workflow run and the CE
      `openvidu-dashboard-ci.yml` run, `contract` job included, are green.
- [ ] 6.2 Merge `openvidu/main` of openvidu-livekit into openvidu-pro-livekit and push it. Verify: its CI run is green
      and its vendored `indexes.json` has no `status_endedAt_id`.
- [ ] 6.3 Move the PRO dashboard to the CE commit of 6.1, as for any CE commit that needs no PRO change. Verify: its
      checks, e2e and CI run are green.

## Workflow follow-up

- Archive once the Definition of Done holds; the archive syncs `server-analytics-writer`, `data-model` and `rooms-api`.
