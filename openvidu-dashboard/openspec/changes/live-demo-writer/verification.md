# Verification Report: live-demo-writer

- Date: 2026-11-25
- Mode: full
- Verified commit: `3a5bc0670e3915f6455e847d227fd440973d2108` (`master` of `OpenVidu/openvidu`, 22 local commits on top of
  `origin/master` `fc0ffeff4`, not pushed); working tree clean.
- Session: started from the PRO workspace, change verified in the standalone CE checkout listed in its
  `agent-roots.json`.

## Summary

| Dimension    | Status |
| ------------ | ------ |
| Completeness | 14/14 implementer tasks checked (groups 1 to 4); 5.1 (owner), 6.1, 7.1 and 7.2 (orchestrator) come after the verification and are pending. 9/9 ADDED requirements implemented. |
| Correctness  | 9/9 requirements mapped to code; 25/25 scenarios have a test that `./dashboard.sh scenarios` finds. 2 scenarios run and pass (`test/demo-data-mode.test.mjs`, part of `check`). The other 23 live in `integration-live`: read and judged, but **not verified as passing** (`test-live` could not run, see below). 1 scenario's test is looser than its wording (W1). |
| Coherence    | Design followed (decisions 1 to 11 checked against the code). 2 suggestions. |

## Commands run

| Command | Result |
| --- | --- |
| `./dashboard.sh check` | Passed: lint, format check, typecheck, `openspec validate --all --strict` (32 items, `change/live-demo-writer` included), tooling tests (141, the three demo data mode tests included), unit tests (typings 112, backend 283 with `data-generator-cut.test.ts`, frontend 704 + 1). |
| `./dashboard.sh scenarios live-demo-writer` | 25 scenarios, 0 without a test. |
| `./dashboard.sh test-integration` | Passed: 26 files, 372 tests, 394 s (`data-generator.test.ts` with the owner-approved O1 adjustment and every CE query-plan suite). |
| `./dashboard.sh test-live` | **Not verified.** The verifier guard of this session blocked it. The session runs the guard the PRO workspace derives from CE at its current `ce.ref`, which predates this change and so does not allow `test-live` yet. This change adds `test-live` to the CE guard (`.claude/hooks/spec-verifier-guard.mjs:8`), but a PRO-started verifier only gets it once `ce.ref` moves. |
| `./dashboard.sh e2e` | Not applicable: no frontend or e2e change. |

Recorded by the orchestrator in `operations.md`, not checked here: the owner's decisions (track, shares 50 %/10 %, O1,
O2, O3, the frozen-to-live restart) and the rebase onto `fc0ffeff4`. The CE push and its CI (task 6.1) are not recorded
yet.

## Completeness

- Tasks: 1.1 to 4.6 checked. 5.1 (owner review), 6.1 (CE push), 7.1 and 7.2 (PRO follow-up) belong to groups marked
  `(owner)` and `(orchestrator)` that come after the verification: pending, not findings.
- Requirements (all ADDED, `specs/data-model/spec.md`):
  - Demo data modes: `dashboard-ce/tools/demo-lib.sh` (`demo_data_mode`, run when sourced and in `prepare_data`;
    `start_live_generation`; `live` with kept data; keep-alive only in `frozen`).
  - Live rooms and sessions: `src/live.ts` (`LiveWriter.tick`), `src/cut.ts` (`cutRoom`), `src/model.ts`
    (`generateRoom`, rooms planned active end 10 min to 5 h after the instant).
  - Live room floor: `src/live.ts` (`plan`, `fillFloor`, `floorAt`), `src/operations.ts` (`floorWaivers`), and
    `src/restart.ts` for the 10-minute waiver after a restart.
  - Live stats: `src/live.ts` (`deriveStats` from `before.statsUntil`), `src/samples.ts`.
  - Live rollups: `src/live.ts` (`liveRollupIncrement`, `writePeaks` with `$max`, `writeUniqueIdentities` after
    00:05 UTC).
  - Live egress and ingress shares: `src/model.ts:517-518`, `src/live.ts:36-37`.
  - Live short-lived states: `src/model.ts` (`SLOW_CONNECTIONS`, the stale room, `closureAt` 3 to 4 min after the
    signal), `src/cut.ts` (`reportedUntil`).
  - Live server operations: `src/operations.ts` (`ServerSchedule`).
  - Live restart on kept data: `src/restart.ts` (`restartLive`), `src/live-cli.ts`.
  - Live writing and deletions: `src/live.ts` (`entityUpdate`, which upserts only on first write; closed rooms dropped
    from the live set).
  - Live data is deterministic: `src/live.ts` (rooms keyed by seed, world start and number; state from `cutRoom` only),
    `src/random.ts` (`hashId` for event ids).

## Correctness: scenario coverage

I read every test that `scenarios` lists against its scenario.

- **Demo data mode selection** (`test/demo-data-mode.test.mjs:80`): CE and PRO Elastic options, frozen runs `generate`
  then `keep-alive`, live runs `generate --live`, kept live runs `live`, all with the stats mode and generator options.
  Passed in `check`.
- **Unknown demo data mode** (`test/demo-data-mode.test.mjs:107`): non-zero exit, message naming both values, no
  `docker run` or dev server. Passed in `check`.
- **Frozen keep-alive writes nothing new** (`:997`) and **Frozen restart on kept live data** (`:1040`): full collection
  snapshots minus the two moving fields, plus counts of what moved. Match the scenarios.
- **Live room lifecycle** (`:178`): checks the closed rooms' fields, events dated at the instants, joins and leaves
  within the room, and `participants.active` against the active STANDARD sessions of every room. It ticks every 60 s,
  not 10 s. Design decision 10 accepts that, and the cadence scenario (`:768`) shows the data is the same at 10 s and
  60 s.
- **Rooms in progress at generation end** (`:243`), **Nothing written ahead of time** (`:260`), **Live room floor**
  (`:271`, `:621`, with and without media nodes, waiver 04:00 to 04:13), **Live daily curve** (`:278`), **Live egress
  and ingress shares** (`:287`), **Live rollups match the entities** (`:309`), **Live active peaks** (`:354`), **Live
  unique identities at day close** (`:376`), **Live connecting participants** (`:391`), **Live egress and ingress
  transitions** (`:413`), **Live rolling restart** (`:477`), **Live lost server** (`:498`), **Live servers of the
  generation instant** (`:539`), **Live single node restart** (`:626`), **Live stats per mode** (`:658`), **Same live
  data at any tick cadence** (`:768`), **Live writing after a deletion** (`:803`, real `DeletionRunner` then removal
  of the buckets up to the cutoff), **Live restart after a stop** (`:893`, live and frozen previous runs): each asserts
  what its scenario states.
- **Live stale room** (`:454`): closure seen 3 to 5 minutes after the signal, because the samples are taken at 60 s
  ticks. The 3-to-4-minute delay itself is drawn at `src/model.ts:810`. Acceptable.
- **No live stats while muted or after leaving** (`:553`): weaker than its scenario, see W1.

(Line numbers without a file are in `dashboard-ce/backend/test/integration/data-generator-live.test.ts`.)

All 23 `integration-live` tests are "Not verified" as passing in this report: `test-live` did not run.

## Coherence

- Decision 1 (complete lives, cut at an instant): `generate()` writes `cutRoom(life, now)`
  (`src/generator.ts:493-494`). `LiveWriter` cuts at the tick and diffs against what it last wrote (`src/live.ts:157`,
  `:173-200`). Unit tests: `dashboard-ce/backend/test/unit/data-generator-cut.test.ts`.
- Decision 2: live room streams keyed by (seed, start, index) (`src/live.ts:356-360`). Event `_id` values hashed with
  SHA-256 (`src/derive.ts:99-105`, `src/random.ts` `hashId`). New package exports present.
- Decisions 3, 4, 5, 6, 7, 8 and 9: implemented as written (see the requirement mapping above). `generate --live` and
  `live` share `CLI_OPTIONS` and `writeLive` (`src/cli.ts`), which stop on `SIGINT`/`SIGTERM`.
- Decision 10: separate vitest project `integration-live` (`dashboard-ce/backend/vitest.config.ts`), excluded from
  `integration`. `test:live` scripts and the `./dashboard.sh test-live` command added. Root `AGENTS.md` Definition of
  Done, implementer and verifier definitions and the guard updated; the guard test is extended. No CI or `ci` spec
  change.
- Decision 11 and the measurements are in the generator README.
- Edition seams: CE tooling only, nothing PRO. Data contract: unchanged; the only `contract.ts` change marks the
  model-only `publishedAt` of ingress sessions. No secrets.
- Language: English. Commits: `openvidu-dashboard: <present tense>, change live-demo-writer`, no AI attribution lines.
- CHANGELOG: no line, justified (tooling; the existing Internal line "A demo data generator…" covers it).
- README, `AGENTS.md`, `dashboard-ce/backend/AGENTS.md`, `dashboard.sh help`, `demo-lib.sh`, `demo.sh` and the generator
  README document `DASHBOARD_DEMO_DATA`, `test-live` and the live writer.

### Refactor review (task 4.6)

I checked the implementer's account against the code and it holds:

- `cutRoom` is the only source of entity state for `generate()` (`cutRoom(life, now)`, `src/generator.ts:494`) and for
  `LiveWriter`, which cuts at the previous tick and at `t` and diffs the two (`src/live.ts:116`, `:157`, `:173`).
- Exception: `restartLive()` (`src/restart.ts`) builds its closures from the stored documents, because the data may
  come from a frozen run or another world.
  - Its synthetic event payloads and ids come from the same builders as `deriveEvents`: `syntheticEventId`,
    `reconciledRoomEnded`, `reconciledParticipantClosed`, `reconciledEgressEnded`, `reconciledIngressEnded`,
    `RECONCILED`, `NODE_DEAD` (`src/restart.ts:3-13`).
  - Its rollup increments go through `Rollups.counters()` and `liveRollupIncrement` (`src/restart.ts:411-454`,
    `:457-479`).
  - The entity field closures (status, `leftAt`, `expiresAt`…) are still written separately
    (`src/restart.ts:162-236`). Sharing them would need a stored-document version of the model types: not a small
    change, so it is recorded here and left as is.
- `generate()` and `LiveWriter` share the server timeline (`serverTimeline` + `ServerSchedule`),
  `generateRoom`/`roomLife`/`cutRoom`, `deriveEvents`/`deriveStats`/`Rollups`, `HOUR_WEIGHTS` and `takesRooms`
  (`src/live.ts:3-18`). Their room planners differ by design (decision 4).
- `keepLive()` is untouched: `keep-alive.ts` is not in the diff. The only change in `schema.ts` exports
  `ALIVE_NODE_MS` for `restartLive()`.

## Issues by priority

### CRITICAL

None.

### WARNING

- **W1. Scenario "No live stats while muted or after leaving": the test does not assert what the scenario states.**
  - The scenario (`openspec/changes/live-demo-writer/specs/data-model/spec.md:96`) says no upstream document of the
    camera is dated between M and U.
  - The test only counts documents dated after M + 30 s
    (`dashboard-ce/backend/test/integration/data-generator-live.test.ts:578-585`).
  - The implementation does emit one flush dated in (M, M + 30 s]: it carries the bytes sent before the mute
    (`dashboard-ce/tools/data-generator/src/samples.ts:148-162`). That is how a periodic flush behaves, so the code is
    right and the scenario wording is stricter than the behaviour.
  - Recommendation: reword the THEN in `spec.md:96`, for example "no upstream document of the camera is dated after
    the first flush following M and up to U". The test then covers it as written.

### SUGGESTION

- **S1. Live room streams are seeded with a 32-bit hash.**
  - `LiveWriter.context()` seeds every stream of a live room with `hashRng()`, FNV-1a to a 32-bit mulberry32 state
    (`dashboard-ce/tools/data-generator/src/live.ts:359-360`, `src/random.ts` `hashRng`). The room `_id`
    (`src/model.ts:510`) and every entity id of the room come from those streams.
  - Two room numbers whose keys collide draw identical ids. By the birthday bound, that has about a 25 % chance over
    the ~48 000 rooms of 90 days of continuous live writing at scenario S.
  - The first write of an entity is an upsert with `$set` (`src/live.ts:583`), so a colliding room would silently
    overwrite the older room's documents instead of failing.
  - Design decision 2 already rejects this hash for event ids for the same reason.
  - Recommendation: seed the live room streams from a SHA-256 digest (as `hashId` does), or draw the room id with
    `hashId`.
- **S2. Lines over the 120-column wrap in the edited Markdown.**
  - Prettier (prose preserved) does not flag them: `AGENTS.md:50` runs to about 150 columns, `AGENTS.md:78-87` breaks
    unevenly, `.claude/agents/spec-verifier.md:33` runs past 120, and `.claude/agents/change-implementer.md:25-27`
    breaks unevenly.
  - Recommendation: re-wrap those paragraphs to 120 columns like the rest of each file.

## Definition of Done (CE `AGENTS.md`)

| Item | Status |
| --- | --- |
| All tasks checked | Met for groups 1 to 4. 5.1, 6.1, 7.1 and 7.2 are pending (owner and orchestrator, after verification). |
| `scenarios` finds a passing test for every delta scenario | Partly met: 25/25 have a test. 2 run and pass; 23 not verified as passing (`test-live` blocked). |
| `./dashboard.sh check` passes locally | Met. |
| CI run of the push is green | Pending (task 6.1; not pushed). |
| Backend changes: `test-integration` passes | Met (372 tests). |
| Data generator changes: `test-live` passes | Not verified: the guard of a PRO-started session does not allow it until `ce.ref` moves. |
| UI changes: `e2e` | Not applicable. |
| Data contract changes: `contract-check` | Not applicable (no contract change). |
| Image or runtime dependency changes: `build-image`, `smoke-image` | Not applicable. |
| Latest verification report has no CRITICAL; refactor review applied or recorded | Met: no CRITICAL; refactor review recorded above. |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` files reflect the change | Met (no CHANGELOG line, justified). |
| Change archived | Pending. |

## Final assessment

No critical issues found in the checks that ran. 1 warning and 2 suggestions.

Not verified: `./dashboard.sh test-live`, and with it 23 of the 25 scenarios as passing. The verifier guard of this
PRO-started session predates this change and blocks the command. Before archiving, run `./dashboard.sh test-live` in
the CE checkout from a CE-started session, or have the orchestrator run it and record it in `operations.md`.
