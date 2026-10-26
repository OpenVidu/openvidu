# @openvidu-dashboard/typings

Contracts shared by the dashboard backend and frontend, including the analytics data model that the OpenVidu server
(`openvidu-livekit`, `openvidu/analytics/`) writes and the dashboard reads.

## Analytics data model contract

| Path                          | Content                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `src/schema-version.ts`       | `SCHEMA_VERSION` and `MIN_SUPPORTED_SCHEMA_VERSION`                                     |
| `src/data-model/`             | Document types, enums, collection names, retention defaults                             |
| `schema/*.schema.json`        | One MongoDB `$jsonSchema` validator per collection                                      |
| `schema/indexes.json`         | Every index the writer creates (keys, options, TTL as fixed seconds or retention class) |
| `schema/collections.json`     | Collections in creation order, validator file, retention class, time-series options     |
| `schema/contract_version.txt` | `SCHEMA_VERSION` as text, read by the writer's contract test                            |
| `fixtures/*.json`             | Canonical documents per collection, in Extended JSON with explicit BSON number types    |
| `contract/`                   | Sources of `schema/` and `fixtures/` (schema builder, index list, fixture scenario)     |

`schema/` and `fixtures/` are generated: edit `contract/` and run `pnpm --filter @openvidu-dashboard/typings contract`.
The tests fail when a generated file is out of date.

### Conventions

- Dates are UTC `Date`; durations integer milliseconds (`…Ms`); sizes integer bytes; `jitter` in milliseconds as a
  double; `score` is the LiveKit MOS (1.0–4.5).
- Counters are int32 (int64 accepted); milliseconds and bytes are int64 (int32 accepted); ratios and scores are double.
- An optional field is absent while unknown, never `null`. Exception: `expiresAt` is `null` while an entity is open.
- Rollup counters are created by their first increment: an absent counter is zero.
- Protocol enums keep the protocol name without prefix (`API_DELETE`, `CLIENT_INITIATED`); model statuses are lower
  case. Rollup map keys are enum names or fixed vocabularies, never user input.
- `internal` holds writer bookkeeping (id sets behind counters); the dashboard never reads it.
- Validators reject unknown fields; the writer applies them with `validationAction: warn` in production and `error` in
  tests. Time-series collections do not accept validators, so `track_stats` is validated only in the plain-collection
  fallback.

### Reconciler closures

The writer's reconciler closes rooms, participant sessions, egress and ingress sessions whose end event never arrived
(node crash, unflushed shutdown, lost event):

- Closed documents carry `closedBy: "reconciler"`; entities closed by their own event carry `closedBy: "event"`.
- Rooms get `endReason: "RECONCILED"`, participants `disconnectReason: "RECONCILED"` (`left`, or `aborted` when the
  session never became active), egress `status: "failed"` with `error: "egress lost (reconciled)"`, ingress sessions
  `status: "error"`.
- The end time is estimated from the last signal of the entity, `max(lastStatsAt, lastEventAt)` (at most one stats
  interval early); tracks and subscriptions closed with a participant inherit its end time.
- Every closure has one raw event of the matching close type with `synthetic: true` and `_id: "AE_SYN_<entity id>"`;
  its payload adds `reconciler.reason` (`node-dead`, `absent-live`, `cascade`, `room-closed-node-dead`).
- Counters and rollups count a closure once. A real close event that arrives later replaces the end time, the reason
  and `closedBy`, and is not counted again.
- `schema_meta` `_id: "reconciler"` records the last run.

### When to bump `SCHEMA_VERSION`

Once a version has shipped in a release, bump it in the same coordinated change on both sides when the other side must
know about the change:

- a collection, field or index is added, removed or renamed;
- a field changes type, unit or meaning, or an enum gains or loses a value;
- a retention class or the shape of a `schema_meta` document changes.

Descriptions, fixture values and tests do not need a bump. Until the first release that ships a version, that version
may still change without a bump. Raise `MIN_SUPPORTED_SCHEMA_VERSION` only when the dashboard depends on the new
contract.

### Sharing the contract with the writer

The writer vendors `schema/` and `fixtures/` under `openvidu-livekit/openvidu/analytics/schema/contract/` and fails its
tests when `contract_version.txt` differs from its own schema version constant:

```sh
dashboard-ce/typings/contract/vendor.sh ../openvidu-livekit
```

## Commands

```sh
pnpm --filter @openvidu-dashboard/typings test       # contract tests (Vitest)
pnpm --filter @openvidu-dashboard/typings contract   # regenerate schema/ and fixtures/
```
