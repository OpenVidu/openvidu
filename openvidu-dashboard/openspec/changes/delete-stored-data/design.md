# Design

## Context

See proposal.md for the motivation. Facts that shape the approach:

- The dashboard backend connects with the MongoDB credentials of the deployment (the admin user with the installers,
  `mongo/mongo-client.ts`) and today writes only its own collections (`auth/collections.ts`).
- The writer (openvidu-livekit) writes entities, events and rollups with upserts by `_id`
  (`openvidu/analytics/store/store.go`), counters at the event's own time into the 5-minute, hourly and daily documents
  independently (`projection/rollup.go`), peaks every minute (`aggregator.go`) and daily unique identities from the
  participant sessions, from 00:05 UTC, on existing daily documents only (`store/aggregator.go`). A late write to a
  deleted document recreates it partially: the 5-minute grace and the kept rollup buckets exist for that.
- Open entities have `expiresAt: null`; every entity collection has the `expiresAt_ttl` index; `events` and
  `track_stats` have `ts_ttl`; the rollups have `bucket_ttl` and their scope indexes (`typings/contract/indexes.ts`).
- `schema_meta` `_id: "dashboard"` is reserved for the dashboard and its validator accepts any field
  (`typings/contract/schemas.ts`); the writer never touches it. `GET /status` (every page, 30 s or 10 s) and `GET /info`
  read the whole `schema_meta` on every call.
- In High Availability four dashboards share the database behind a round-robin proxy; each keeps its own 60 s storage
  cache and Analytics cache.
- The Analytics planner reads the hourly rollups for ranges up to 90 days, the daily ones beyond and for UTC daily
  series and unique identities, the 5-minute ones for ranges up to one day; Overview "Today" and the list summaries
  read the hourly rollups (`analytics/analytics-planner.ts`, `overview/overview-repository.ts`).
- `$collStats` reports `freeStorageSize` and `indexFreeStorageSize` (MongoDB 4.4+), unused today.

## Goals / Non-Goals

**Goals:**
- One background deletion job at a time across instances, resumable by running it again, with the outcome visible to
  every session and recorded for extending editions.
- Data in progress and recent data never deleted, so the writer's late writes recreate nothing.
- No change to the writer, the data contract or its schema version.

**Non-Goals:**
- Cancelling a job, resuming it automatically on another instance, a percentage of progress.
- Running `compact`, changing retention, deleting the dashboard's own collections or `nodes`.
- The PRO notice on detail pages (a later PRO change on `deletions` of the info document).

## Decisions

### Owner decisions

| Topic | Decision |
| --- | --- |
| Who deletes | The dashboard backend, directly in MongoDB. No writer change. |
| Edition | CE, so PRO alike. |
| Buttons | One per class row (7), one on Total (all 7 classes, Analytics history included), one on the Legacy data row only while it reads "Kept until <date> for rollback". Nowhere else. |
| How much | Everything not in progress. |
| Kept | Rooms in progress with all their data; open egresses, ingress sessions and ingress definitions not deleted; `nodes` always; everything recorded or ended in the 5 minutes before the cutoff. |
| Cutoff | The moment the request is accepted, even for long jobs; what starts or ends after it is never touched. |
| Entities | Cascade to the events, stats, tracks and subscriptions of what it deletes. |
| Detail classes | Leave the entities; Tracks and subscriptions also delete the stats written per track (with a track id), whatever the stats detail or edition; stats per participant stay. |
| Rollups | Only by their own buttons or Total; keep the current and previous bucket of each granularity; Hourly and Daily independent, each dialog naming what goes empty. |
| Unique identities | A lower count for the deletion day, and for the previous day before 00:05 UTC, is accepted. |
| Legacy | Dropped (`legacy_events`, `stats`), disk freed at once, only while kept for rollback; also from the Total dialog's unchecked checkbox. |
| Job | Background job, progress on the Data tab and a banner on every page, one at a time with a lock in the database, no cancel. |
| Interruption | 60 s without heartbeat reads `interrupted`, frees the lock; a restarted instance marks its own job at once; relaunch takes a new cutoff. |
| Pace | 5,000 documents per batch, 100 ms pause. |
| Progress | "Deleting <class>: <n> documents deleted · collection <i> of <total>", no percentage. |
| Outcome | Toast at the end in sessions with Data open; notice for interrupted or failed until the next deletion; no toast at the start. |
| Last deletion | Muted "Deleted <date>" under the class name; warning line "Deletion interrupted/failed <date> (incomplete)"; Total stamps each class; Legacy none. |
| Caches | Dropped on every instance at its next status or info read when a class completes. |
| Size | Size keeps the disk size; "<X> free for new data" under it; the estimate uses only the space in use. No permanent hint under the table. |
| Dialogs | Cancel and a red Delete; no count; the approved texts (specs of `settings-about`). |
| API | `POST /api/v1/deletions`, `202`, `409 CONFLICT`; `deletion` in the status, `deletions` in the info; no cancel endpoint. |
| Audit | One log line at start and end; the last deletion per class on the Data tab. |
| Docs | `### Deleting analytics data` with `#### Freeing disk space` after `### Retention` in PR #160; every deployment type; `track_stats` and `dryRun` covered; `autoCompact` not mentioned; link through `latest`. |

### Owner decisions on the details

| Topic | Decision |
| --- | --- |
| Free space line | Muted, under the Size of each class and of the Total, only from 1 MB. |
| During the 3.9 migration | Every delete button disabled with the tooltip "Available once the migration ends". |
| Empty class | A row with 0 documents keeps its button enabled. |
| Banner | Dismissible like the migration banner; not shown on the Data tab. |
| Progress count | The whole job's, naming the class being deleted. |
| Wording | Banner, end toasts and interrupted and failed notices as in the scenarios of `ui-shell` and `settings-about`. |
| Entities stamps | An Entities deletion stamps Entities, Events, Stats and Tracks and subscriptions. |
| Progress section | An indeterminate (animated) bar above the line. |
| MongoDB before 7.0 | A time-series `track_stats` cannot be deleted by filter: the job fails with "A database error stopped it" and the documentation names MongoDB 7.0 as the minimum for deleting stats. |
| Records | The job, lock and last deletions in the reserved `schema_meta` `_id: "dashboard"` document. |
| Stuck jobs | Judged by the MongoDB clock (`$$NOW`). |
| Errors | Three retries per batch; missing delete rights read "The database user cannot delete data", any other error "A database error stopped it", the cause in the log. |
| Legacy flag | `includeLegacy` with a class other than `all` is a `400` validation error. |
| Free bytes | `freeBytes` is 0 when MongoDB does not report free space. |

### Records in `schema_meta` `_id: "dashboard"`

Chosen over a dashboard collection because the status and the info already read `schema_meta` whole, so every instance
sees a job and a completion at its next read without another query, and `Cheap status reads` stays true. The validator
of that document already accepts any field, so `contract/`, `schema/`, the schema version and the writer stay
unchanged; only `SchemaMetaDashboard` in typings gains the fields.

```ts
interface SchemaMetaDashboard {
  _id: 'dashboard';
  deletion?: {
    id: string;                 // UUID
    class: DeletionClass;       // 'events' | 'stats' | 'tracks' | 'entities' | 'rollups-5min' | 'rollups-hourly' | 'rollups-daily' | 'all' | 'legacy'
    includeLegacy: boolean;
    state: 'running' | 'completed' | 'interrupted' | 'failed';
    cutoff: Date;               // MongoDB clock at acceptance
    startedAt: Date;
    heartbeatAt: Date;          // $$NOW every 10 s
    finishedAt?: Date;
    instance: string;           // host name + process start, to recognise its own job after a restart
    currentClass?: DeletionClassKey;
    collection: { index: number; total: number };
    deleted: number;            // whole job
    deletedBy: Record<string, number>;  // per collection, for the log
    requestId: string;
    error?: string;
  };
  deletions?: Partial<Record<DeletionClassKey, {   // the seven classes
    completed?: { cutoff: Date; endedBefore: Date; finishedAt: Date };
    incomplete?: { state: 'interrupted' | 'failed'; at: Date };
  }>>;
}
```

- **Lock**: `findOneAndUpdate({ _id: 'dashboard', $or: [ { deletion: { $exists: false } }, { 'deletion.state': { $ne:
  'running' } }, { $expr: { $lt: ['$deletion.heartbeatAt', { $subtract: ['$$NOW', 60000] }] } } ] }, pipeline
  setting the new `deletion`)`, with upsert when the document does not exist (a duplicate-key error on that race reads
  as "already running"). Times use the MongoDB clock (`$$NOW`) so instance clocks do not matter.
- **Stale job**: the status and the info judge `running` with `heartbeatAt` older than 60 s as `interrupted`; the next
  lock acquisition writes it so (and its `deletions` entries); an instance at startup marks a running job whose
  `instance` is its own host name `interrupted`.
- **`deletions`**: a class gets `completed` (and loses `incomplete`) when its last collection is done; when a job ends
  interrupted or failed, every class of the job not completed gets `incomplete`. Entities also writes `events`,
  `stats` and `tracks`; Total writes each class.

### API

- `POST /api/v1/deletions` (`operationId: startDeletion`, tag `Deletions`, bearer), body
  `{ class: DeletionClass, includeLegacy?: boolean }` (strict; `includeLegacy` only with `all`, else `400`).
  `202` → `DeletionJob` (the `deletion` shape without `instance`, `heartbeatAt`, `deletedBy`, `requestId`). `409`
  `CONFLICT` → "A deletion is already running" with `details.job`, or "The data before 3.10 is not kept for rollback".
- `GET /api/v1/status` adds `deletion?: DeletionJob`; `GET /api/v1/info` adds `deletions` (`{}` when none, dates as ISO
  strings, `endedBefore` = cutoff − 5 min for extending editions) and `storage.<collection>.freeBytes`
  (`freeStorageSize + indexFreeStorageSize`, 0 when absent).
- No index is needed for these reads (one document).

### What each class deletes

T = cutoff − 5 min. At job start the runner snapshots the kept sets: rooms in progress at the cutoff plus rooms closed
with `endedAt ≥ T` (`rooms` has no `endedAt` index, so they are found through `expiresAt_ttl` with the current entities
retention, `expiresAt ≥ T + retention.entities`; see Risks), open egresses and egresses
ended at or after T, open ingress sessions, ingress definitions not deleted. Anything created after the cutoff ends
after T and is excluded by the time filters, so the snapshot does not need refreshing.

| Class | Collections in order | Filter of a deletable document | Index |
| --- | --- | --- | --- |
| Events | `events` | `ts < T`, `roomSid`, `egressId`, `ingressId` not in the kept sets | `ts_ttl` |
| Stats | `track_stats` | `ts < T`, `meta.roomSid` not kept | `ts_ttl` (time series) |
| Tracks and subscriptions | `track_stats` (with `meta.trackSid`), `track_subscriptions`, `tracks` | stats as above with `meta.trackSid` present; closed (`expiresAt` a date), `roomSid` not kept | `ts_ttl`, `expiresAt_ttl` |
| Entities | `events`, `track_stats`, `track_subscriptions`, `tracks`, `ingress_sessions`, `egresses`, `participants`, `ingresses`, `rooms` | detail collections as above; entities closed with their end field (`endedAt`, `leftAt`, egress `endedAt` else `updatedAt`, ingress session `endedAt` else `startedAt`, ingress `deletedAt`) before T and `roomSid`/`_id` not kept | `expiresAt_ttl` |
| 5-minute | `analytics_5min` | `bucket < floor5(cutoff) − 5 min` | `bucket_ttl` or the scope index |
| Hourly | `analytics_hourly` | `bucket < floorHour(cutoff) − 1 h` | idem |
| Daily | `analytics_daily` | `bucket < floorUtcDay(cutoff) − 1 day` | the scope index (no TTL index when unlimited) |
| Legacy | `legacy_events`, `stats` | dropped | — |

Total runs Events, Stats, Tracks, Entities (its detail collections are then empty), 5-minute, hourly, daily, then
Legacy with `includeLegacy`. Defining the cascade as "not belonging to what is kept" makes every class rerunnable.
Rejected: drop and recreate collections (owned by the writer, and active documents must stay); deleting by
`expiresAt` ranges (wrong after a retention change).

### Job runner

- Runs in the accepting instance, outside the request, until done. Per collection: `find(filter).hint(index)
  .project({_id:1}).limit(5000)`, `deleteMany({ _id: { $in } })`, add to `deleted`, update the progress, wait 100 ms;
  stop when a batch is empty. A heartbeat timer writes `heartbeatAt` every 10 s.
- A batch error is retried three times with 1 s between tries; an authorization error (code 13) fails at once with
  "The database user cannot delete data"; any other final error with "A database error stopped it". The cause goes to
  the log, never to the API.
- Logs: one start line and one end line (`deletions` logger) with class, `includeLegacy`, cutoff, state, `deletedBy`
  and the request id.
- Rejected: an automatic takeover by another instance (a watchdog on every instance, for a rare case the admin
  resolves with one click).

### Caches

Every instance keeps the `finishedAt` of the newest completed class it has seen; when a status or info read finds a
newer one in `deletions` it clears its storage cache and its `AnalyticsCache` before answering. An extending edition
can register more caches to clear (an exported hook), which the later PRO change uses for its series memo.

### UI

- `dashboard-ui`: a `ConfirmDialog` building block (Material dialog; title, projected body, optional checkbox, Cancel
  focused first, confirm in the error colour), opened through a small service; the first dialog of the library.
- Data tab: last column of icon buttons; dialogs per class with the approved texts and `EXTERNAL_LINKS.freeingDiskSpace`;
  progress section; outcome notice; toast at the end; "Deleted …" lines; free space lines; estimate from
  `storage − free`.
- `ServerStatusService`: 10 s cadence while `deletion.state` is `running`, an immediate poll after an accepted request;
  the info re-read also compares the deletion job id and state.
- Banner slot: the deletion banner, hidden on the Data tab.

### Documentation (PR #160)

`openvidu-dashboard.md`: one line in "Settings" about the delete buttons; in "Analytics data", one line in the legacy
paragraph ("You can also drop them from the **Data** tab of Settings."); after "Retention", `### Deleting analytics
data` (what each button deletes and keeps, the job, Legacy) and `#### Freeing disk space`: why WiredTiger keeps freed
pages for the same collection, `dryRun` to estimate, `compact` per collection including `track_stats`, for Single
Node, Elastic (master node) and High Availability (each member, secondaries first, `rs.stepDown()`, then the former
primary), with the credentials paragraph pattern of the page; external MongoDB → its provider's procedure; MongoDB 7.0
as the minimum for deleting stats stored as a time series. The exact
`compact` form for a time-series collection on MongoDB 8.0 is checked before writing. `ovweb lint` and
`mkdocs build --strict` pass.

### Performance budget

- Every batch query is index-backed: `expectIndexBacked` on a scenario M dataset for the find of each class (no
  `COLLSCAN`, `totalDocsExamined` bounded by the batch plus the kept documents met).
- Pace: unit test of the runner with a fake clock (batches ≤ 5,000, ≥ 100 ms apart).
- The status keeps its command budget (`find` on `schema_meta` and `nodes` only), checked by the existing command
  monitoring test extended with a running job.

### Test strategy

| Scenarios | Test file | Level |
| --- | --- | --- |
| Events deletion accepted, Legacy flag outside Total, Deletion without a token, Second deletion refused, Refused on another instance | `backend/test/integration/deletions-api.test.ts` | integration |
| Legacy dropped during the rollback window, Legacy refused while the migration runs, Legacy refused after its window, Total without legacy, Total with legacy | `backend/test/integration/deletions-api.test.ts` | integration |
| Room in progress kept whole, Recent data kept, Open entities without a room kept, Nodes never deleted, Room ending during the job, Data after the cutoff untouched | `backend/test/integration/deletions-rules.test.ts` | integration |
| Events deletion leaves entities, Per-track stats go with the tracks, Entities with their data, Entities deletion run again, Rollup buckets kept at 10:07, Entities deletion keeps rollups | `backend/test/integration/deletions-rules.test.ts` | integration |
| Batches of a large collection | `backend/src/deletions/deletion-runner.test.ts` | unit |
| Status of a running job, Status without any job, Instance gone mid-job, Instance restarted mid-job, Database user without delete rights | `backend/test/integration/deletions-jobs.test.ts` | integration |
| Running deletion in the status, Stale deletion in the status | `backend/test/integration/status-api.test.ts` | integration |
| Completed Events deletion in info, Interrupted Total in info, Entities records its details, Storage refreshed on another instance, Log lines of a deletion | `backend/test/integration/deletions-jobs.test.ts` | integration |
| Deletions before any deletion, Free space after deleting documents (and the modified info scenarios) | `backend/test/integration/api.test.ts` | integration |
| Records accepted by the validator, Contract unchanged | `backend/test/integration/deletions-jobs.test.ts`, `typings` contract test | integration, unit |
| Sub-resource path, Unknown API path (unchanged) | existing tests | — |
| Estimate after a deletion, Free space after a deletion, Little free space | `dashboard-ui/.../settings/storage-classes.spec.ts` | unit |
| Buttons of the table, Legacy row without a button, Buttons while a deletion runs, Buttons while the migration runs, Empty class deletable, the four detail dialogs, the three rollup dialogs, Total dialog, Total with the legacy checkbox, Total with the checkbox left unchecked, Legacy dialog, Deletion confirmed, Deletion refused, Deletion cancelled in the dialog, Progress of an Entities deletion, Progress follows the status, Deletion completed while watching, Interrupted deletion notice, Failed deletion notice, Class deleted, Class left incomplete | `dashboard-ui/.../settings/settings-page.spec.ts` | unit |
| Keyboard confirmation, Escape cancels | `dashboard-ui/.../components/confirm-dialog/confirm-dialog.spec.ts` | unit |
| Banner of a running deletion, Banner of a Total deletion, No banner on the Data tab, Banner ends with the job, Dismissed banner and a new job | `dashboard-ui/.../shell/banner-slot.spec.ts` | unit |
| Deletion cadence, Status right after starting a deletion, Deletion ends | `dashboard-ui/.../core/refresh/server-status.spec.ts` | unit |
| Delete buttons on a phone, Dialog on a phone, Events dialog: flow with axe in both themes | `e2e/tests/settings.spec.ts` | e2e |
| Events deletion accepted: against the real backend | `e2e/tests-backend/deletions.spec.ts` | e2e (backend) |

The e2e suites cannot run on the owner's machine (Ubuntu 20.04: Playwright 1.65 ships no Chromium for it); they are
validated by the `e2e` job of CI.

## Risks / Trade-offs

- [Late writes after a deletion recreate a partial document] → 5-minute grace, kept rollup buckets; a reconciler
  closure of a crashed node's room older than ~10 minutes can still bring back a small 5-minute document (accepted).
- [Rooms ended in the 5-minute grace window are found through `expiresAt` with the current entities retention] → if
  the writer restarted with a new entities retention within those same 5 minutes, one recently ended room, with its
  data, can be kept or deleted wrongly. Accepted by the dashboard's author, to whom the owner delegated the decision
  (Slack, 2026-11-19 15:31); the alternative, an index on the end time of rooms, would contradict "Rooms end time not
  indexed" and change the contract.
- [A large deletion loads MongoDB and the replica set] → batches with pauses; documented.
- [Deleted space is not returned to the system] → said in every dialog and documented with `compact`.
- [Unique identities of the deletion day undercounted] → accepted by the owner.
- [A crashed instance leaves the lock up to 60 s] → stale lock judged by the MongoDB clock.

## Migration Plan

Nothing to migrate: the dashboard document gains fields on the first deletion. Rolling back to a dashboard without the
feature leaves those fields unread. The writer and the contract are untouched, so no contract-check is needed.
