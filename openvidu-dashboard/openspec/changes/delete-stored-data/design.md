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
  (`typings/contract/schemas.ts`); the writer never touches it. `GET /status` (every page, 30 s, 10 s or 2 s) and `GET /info`
  read the whole `schema_meta` on every call.
- In High Availability four dashboards share the database behind a round-robin proxy; each keeps its own 60 s storage
  cache and Analytics cache.
- The Analytics planner reads the hourly rollups for ranges up to 90 days, the daily ones beyond and for UTC daily
  series and unique identities, the 5-minute ones for ranges up to one day; Overview "Today" and the list summaries
  read the hourly rollups (`analytics/analytics-planner.ts`, `overview/overview-repository.ts`).
- On MongoDB 8.0 (measured on the demo, 8.0.29) `$collStats` `storageStats` reports `freeStorageSize` for the data
  file only; it has no `indexFreeStorageSize` (that exists only in `dbStats` with `freeStorage: 1`, database-wide).
  The reusable bytes of each index are in `storageStats.indexDetails[<index>]["block-manager"]["file bytes available
  for reuse"]`. Example, `events` after deleting everything: data 36.2 MB with 16.0 MB free, indexes 35.4 MB with
  12.8 MB free.
- WiredTiger releases freed blocks at its checkpoints (every 60 s): 5 minutes after the deletions the free data of
  `events` went from 16.0 to 17.2 MB, the others unchanged. The rest stays reserved until `compact`.

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
| Docs | `### Deleting analytics data` with `#### Freeing disk space` after `### Retention` on the dashboard page (committed on `next` of openvidu.io, where PR #160 was merged); every deployment type; `track_stats` and `dryRun` covered; `autoCompact` not mentioned; link through `latest`. |

### Owner decisions on the details

| Topic | Decision |
| --- | --- |
| Free space line | Muted, under the Size, only from 1 MB, and (demo review, 2026-11-20, option b, confirmed by the dashboard's author on Slack at 16:13) only on a class row with a completed deletion record. The Total sums the rows that show one, under the same 1 MB rule; the Legacy data row never shows one; a class whose only deletion is incomplete shows none. The figure is unchanged and still includes the WiredTiger fragmentation that existed before any deletion (copy-on-write at checkpoints, page splits of non-sequential indexes; a fresh demo database showed 14.1 MB free for `events`): MongoDB cannot tell it apart, accepted. |
| During the 3.9 migration | Every delete button disabled with the tooltip "Available once the migration ends". |
| Empty class | A row with 0 documents keeps its button enabled. |
| Banner | Dismissible like the migration banner; not shown on the Data tab. |
| Progress count | The whole job's, naming the class being deleted. |
| Wording | Banner, end toasts and interrupted and failed notices as in the scenarios of `ui-shell` and `settings-about`. |
| Entities stamps | An Entities deletion stamps Entities, Events, Stats and Tracks and subscriptions. |
| Progress section | An indeterminate (animated) bar above the line; replaced in the demo review (2026-11-20) by a small indeterminate spinner beside the line, named "Deletion progress". |
| Pending notice and second read after a reload (demo review, 2026-11-20) | Never on a reload or an opening of the tab: only when the open tab sees, through the status poll, a job it had seen in another state, or another job, reach completed; the first status only sets the baseline. |
| MongoDB before 7.0 | A time-series `track_stats` cannot be deleted by filter: the job fails with "A database error stopped it" and the documentation names MongoDB 7.0 as the minimum for deleting stats. |
| Records | The job, lock and last deletions in the reserved `schema_meta` `_id: "dashboard"` document. |
| Stuck jobs | Judged by the MongoDB clock (`$$NOW`). |
| Errors | Three retries per batch; missing delete rights read "The database user cannot delete data", any other error "A database error stopped it", the cause in the log. |
| Legacy flag | `includeLegacy` with a class other than `all` is a `400` validation error. |
| Free bytes | `freeBytes` is 0 when MongoDB does not report free space. |
| Storage re-reads (demo review, 2026-11-20) | The Data tab re-reads the info document each time it opens, when a deletion ends and once more about 60 s after it ends, when MongoDB has released the space at its checkpoint; no continuous polling. |
| Free space of the indexes | `freeBytes` adds the reusable bytes of every index to those of the data, so the line covers everything a deletion left reusable (`events` after deleting everything: 28.8 MB instead of 16.0 MB). Decided by the dashboard's author on the owner's delegation (Slack, 2026-11-20 12:28); the data-only alternative would have needed wording saying so. |
| Free space tip (demo review, 2026-11-20) | An info icon after each free line: "MongoDB reuses this space for new data. The rest of the space the deleted data used stays reserved until the collection is compacted; see Freeing disk space.", the last words linking to `#freeing-disk-space`. |
| Free space pending (demo review, 2026-11-20) | Right after a deletion the freed space is not reported yet (MongoDB reports it after its next checkpoint, and the size can even grow, e.g. Events 46.3 → 70.3 MB), so the classes the job completed show "Free space updates in about a minute" until the second read. |
| Status poll during a deletion (demo review, 2026-11-20) | Every 2 s while a deletion runs, wherever the status poll runs; the migration and the uninitialized schema keep 10 s. |

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
    currentClass?: DeletionStep;   // a class key, or 'legacy' while the legacy collections are dropped
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

- **Lock**, in two steps under the MongoDB clock (`$$NOW`), so instance clocks do not matter:
  1. a conditional update marks a `running` job whose `heartbeatAt` is older than 60 s `interrupted` (with its
     `deletions` entries);
  2. the lock is taken only if there is no `running` job, with upsert when the document does not exist (a duplicate-key
     error on that race reads as "already running").

  Between the two steps another request can take the lock; the loser answers `409` and a retry succeeds once that job
  ends. The owner accepted that rare window.
- **Stale job**: the status and the info judge `running` with `heartbeatAt` older than 60 s as `interrupted`. An
  instance at startup marks `interrupted` a running job whose `instance` has its host name, unless that `instance` is
  this very process.
- **Takeover**: the runner checks before each batch that the record is still its own running job; when it is not (a
  stale judgement let another instance take the lock), it stops and logs "Deletion <id> stopped: another instance took
  over its record" (approved by the owner).
- **`deletions`**: a class gets `completed` (and loses `incomplete`) when its last collection is done. When a job ends
  interrupted or failed, every class of the job whose `completed.cutoff` is not the job's cutoff gets `incomplete`, at
  the last heartbeat when interrupted (also the job's `finishedAt`) and at the failure time when failed. Entities also
  writes `events`, `stats` and `tracks`, completed or incomplete alike; Total writes each class. A failure that cannot
  be recorded logs "Cannot record the failed deletion".

### API

- `POST /api/v1/deletions` (`operationId: startDeletion`, tag `Deletions`, bearer), body
  `{ class: DeletionClass, includeLegacy?: boolean }` (strict; `includeLegacy` only with `all`, else `400`).
  `202` → `DeletionJob` (the `deletion` shape, `id` included, without `instance`, `heartbeatAt`, `deletedBy`,
  `requestId`). `409`
  `CONFLICT` → "A deletion is already running" with `details.job`, or "The data before 3.10 is not kept for rollback".
- `GET /api/v1/status` adds `deletion?: DeletionJob`; `GET /api/v1/info` adds `deletions` (`{}` when none, dates as ISO
  strings, `endedBefore` = cutoff − 5 min for extending editions) and `storage.<collection>.freeBytes`
  (`storageStats.freeStorageSize` plus, for every entry of `storageStats.indexDetails`, its `["block-manager"]["file
  bytes available for reuse"]`, each missing value counted as 0; decided by the dashboard's author, see Decisions).
- No index is needed for these reads (one document). The info makes one extra `hello` command per call.

### What each class deletes

T = cutoff − 5 min. At job start the runner snapshots the kept sets: rooms in progress at the cutoff plus rooms closed
with `endedAt ≥ T` (`rooms` has no `endedAt` index, so they are found through `expiresAt_ttl` with the current entities
retention, `expiresAt ≥ T + retention.entities`; see Risks), open egresses and egresses ended at or after T (found the
same way, through `expiresAt_ttl` with the current entities retention), and the kept ingress ids: the ingress
definitions not deleted plus the `ingressId` of the open ingress sessions. Anything created after the cutoff ends after
T and is excluded by the time filters, so the snapshot does not need refreshing.

| Class | Collections in order | Filter of a deletable document | Index |
| --- | --- | --- | --- |
| Events | `events` | `ts < T`, `roomSid`, `egressId`, `ingressId` not in the kept sets | `ts_ttl` |
| Stats | `track_stats` | `ts < T`, `meta.roomSid` not kept | time series: the buckets' clustered index, no hint; plain fallback: `ts_ttl` |
| Tracks and subscriptions | `track_stats` (with `meta.trackSid`), `track_subscriptions`, `tracks` | stats as above with `meta.trackSid` present; subscriptions with `unsubscribedAt < T`, or without it `expiresAt < T + retention.tracks`; tracks with `unpublishedAt < T`; both closed (`expiresAt` a date) and `roomSid` not kept | as Stats, `expiresAt_ttl` |
| Entities | `events`, `track_stats`, `track_subscriptions`, `tracks`, `ingress_sessions`, `egresses`, `participants`, `ingresses`, `rooms` | detail collections as above; entities closed with their end field (`endedAt`, `leftAt`, egress `endedAt` else `updatedAt`, ingress session `endedAt` else `startedAt`, ingress `deletedAt`) before T and `roomSid`/`_id` not kept | `expiresAt_ttl` |
| 5-minute | `analytics_5min` | `bucket < floor5(cutoff) − 5 min` | `bucket_ttl` |
| Hourly | `analytics_hourly` | `bucket < floorHour(cutoff) − 1 h` | `bucket_ttl` |
| Daily | `analytics_daily` | `bucket < floorUtcDay(cutoff) − 1 day` | the scope-leading index, reading every daily document (a small collection; no TTL index when unlimited) |
| Legacy | `legacy_events`, `stats` | dropped | — |

Progress steps, counted from 1 in `collection { index, total }`: one per collection of each class (Events 1, Stats 1,
Tracks and subscriptions 3, Entities 9, each rollup class 1, Legacy 2), so Total has 17, or 19 with the legacy data. A
dropped legacy collection adds its `estimatedDocumentCount` to `deleted`.

Total runs Events, Stats, Tracks, Entities (its detail collections are then empty), 5-minute, hourly, daily, then
Legacy with `includeLegacy`. Defining the cascade as "not belonging to what is kept" makes every class rerunnable.
Rejected: drop and recreate collections (owned by the writer, and active documents must stay); deleting by
`expiresAt` ranges (wrong after a retention change).

### Job runner

- Runs in the accepting instance, outside the request, until done. Per collection: `find(filter).hint(index)
  .project({_id:1}).limit(5000)`, `deleteMany({ _id: { $in } })`, add to `deleted`, update the progress, wait 100 ms;
  stop when a batch is empty. A heartbeat timer writes `heartbeatAt` every 10 s.
- A time-series `track_stats` is batched by time instead (decided by the dashboard's author as the most efficient
  option): each batch reads the `ts` of the 5,000th deletable document sorted by `ts`, without a hint (the buckets'
  clustered index serves it), and runs `deleteMany(class filter + ts ≤ that bound)`. `≤` makes every batch progress; a
  batch can exceed 5,000 documents when several share the bound's timestamp. The plain fallback collection keeps the
  `_id` batches with the `ts_ttl` hint.
- A batch error is retried three times with 1 s between tries; an authorization error (code 13) fails at once with
  "The database user cannot delete data"; any other final error with "A database error stopped it". The cause goes to
  the log, never to the API.
- Logs: one start line and one end line (`deletions` logger) with class, `includeLegacy`, cutoff, state, `deletedBy`
  and the request id.
- Rejected: an automatic takeover by another instance (a watchdog on every instance, for a rare case the admin
  resolves with one click).

### Caches

Every instance keeps the `finishedAt` of the newest completed class it has seen, and of the newest completed job; when
a status or info read finds a newer one in `deletions` or in `deletion` it clears its storage cache and its
`AnalyticsCache` before answering. The job's `finishedAt` covers a Legacy deletion, which records no class. An extending edition
can register more caches to clear (an exported hook), which the later PRO change uses for its series memo.

The storage cache also has a second boundary, so that the Data tab's read about 60 s after a deletion gets the space
released at the checkpoint: a cached value read before `finishedAt + 60 s` is not served once that moment has passed
(compared with the backend clock against the newest completion `finishedAt`, a MongoDB time; the UI reads at 65 s to
absorb the status poll's delay and small clock differences). Chosen over a cache bypass parameter, which would add an
API input any client could use to skip the cache, and over shortening the cache, which would cost every read. As built,
the storage cache records a value with the time its read started, `InfoService` reads the dashboard clock
(`TOKENS.Clock`), and `FigureCaches` exposes `newestCompletion`, checked against `CHECKPOINT_MS` (60 s).

### UI

- `dashboard-ui`: a `ConfirmDialog` building block (Material dialog with its default `aria-modal`, kept with the
  owner's confirmation; title, a body template with a `bodyContext` so one template serves the ten dialogs, optional
  checkbox, Cancel focused first and closing with no result, confirm in the error colour), opened through a small
  service; the first dialog of the library.
- Data tab: last column of icon buttons; dialogs per class with the approved texts (`features/settings/
  deletion-texts.ts`, class labels in `format/deletions.ts`) and `EXTERNAL_LINKS.freeingDiskSpace`; progress section;
  outcome notice; toast at the end; "Deleted …" lines; free space lines; estimate from `storage − free`.
- Any failed `POST /deletions` shows one dismissible error notice above "Storage", cleared at the next request: the
  message of a `409`, or "The deletion did not start: <message of the error> Request <id>" for any other failure (owner
  decision; requirement "Confirming a deletion", scenario "Deletion not started").
- `ServerStatusService`: 2 s cadence while `deletion.state` is `running` (a new constant beside `STATUS_POLL_FAST_MS`,
  which keeps 10 s for the migration and the uninitialized schema; the shortest applies when both hold), back to the
  normal cadence when the job ends; `pollNow()` polls at once after an accepted
  request and `attachPoller()` lets the Data tab follow the polls. The info re-read keys on the deletion job id and
  state as of the last info read, the first status setting the baseline.
- Banner slot: the deletion banner, hidden on the Data tab.
- Data tab storage re-reads: an info read when the tab opens (navigation or tab switch), the shell's read when a
  deletion ends, and one timer of 65 s from that end report; no periodic read. A read at opening can serve a storage
  value cached up to 60 s. As built, both are driven by an `active` input that `SettingsPage` sets
  (`[active]="tab() === 'data'"`), not by the component's creation and destruction, because the Material tab group keeps
  the Data tab component alive across tab switches: becoming active reads the info document, becoming inactive or being
  destroyed cancels the timer. The timer starts on any change of the deletion job or state to an ended state seen while
  the tab is open, a job the tab never saw running included; the tab's first status only sets the baseline.
- Free space line: shown on a class row only when `deletions.<class>.completed` exists (an earlier completed record
  keeps it after a later incomplete one) and the class's `freeBytes` reaches 1 MB; the Total sums the free figures of
  the rows that show one and applies the same 1 MB rule; the Legacy data row never shows one. `freeBytes` stays in the
  info document for every collection: only what the Data tab shows changes.
- Baseline after a load (demo review, 2026-11-20): the Data tab keeps the deletion job id and state it last saw; the
  first status after a load or an opening of the tab only records it, so neither the pending notice nor the 65 s second
  read follows a reload. The bug found in the demo was a baseline taken from the empty state before the first status
  (`none`), which made a job completed hours earlier count as a change.
- Free space pending: when the Data tab sees a job complete, the classes it completed (Entities also its detail classes,
  Total all seven) and the Total show "Free space updates in about a minute" in the free line's place, muted and
  without a tip, until the 65 s read; then the normal free line, or nothing under 1 MB. Becoming inactive drops the
  notice with the timer, so a return shows the open read's figures. A Legacy job completes no class, so no notice. The
  Total shows it after any job that completed a class, since its free figure sums them (decided under the owner's
  delegation of style and consistency).
- Progress (demo review, 2026-11-20): no progress bar, which looked like loading with nothing filling. A small
  indeterminate Material progress spinner (about 20 px, style decided under the owner's delegation) sits beside the
  progress line, aligned with it, named "Deletion progress" with the `progressbar` role; with the 2 s poll the
  document counter and "collection X of Y" show the progress.
- Total dialog scroll (demo review, 2026-11-20): with the "Also delete the data before 3.10" checkbox the dialog content
  showed a vertical scrollbar at desktop sizes, probably the checkbox touch target or ripple overflowing the dialog
  content; the fix keeps the content from scrolling at normal desktop sizes while it can still scroll on a short
  viewport. As built, the checkbox has `margin-block: 4px 12px`, so its 48 px touch target fits inside the content at
  any zoom (measured at DPR 1–1.5, from 1067 × 600 to 1920 × 1080).
- Free space tip: the shared info tip gains an optional link; with one, the icon toggles a small non-modal panel (CDK
  overlay) with the text and a focusable link instead of a tooltip, because a tooltip cannot hold a reachable link, and
  shows no tooltip on hover. Escape, a click outside or a second activation closes it and focus returns to the icon.
  Keyboard flow as if the panel were inline (owner confirmed, 2026-11-20): Tab from the icon moves to the link,
  Shift+Tab from the link returns to the icon, Tab from the link closes the panel and continues after the icon
  (`ui-building-blocks`, "Info tip with a link").
- Style, chosen by the implementer under the owner's delegation and reviewed in the demo: a filled Delete button in the
  error colour; the "How to free disk space" link on its own line; the `delete` icon in the default colour, its tooltip
  being its name; the delete column `position: sticky` at the end of the table so the buttons stay visible at 375 px,
  with a visually empty header holding a hidden "Delete"; the second lines in body-small on-surface-variant, the
  incomplete ones in the warning colour; the progress section styled like the migration one, with a spinner instead of
  a bar since the demo review; the interrupted and failed warning notice without dismiss and the refused error notice with dismiss, both at
  most 72 characters wide; the banner in the info style with the `delete` icon.
- Storage table layout (style, under the owner's delegation): `.table-wrap` has `overflow-y: hidden` beside
  `overflow-x: auto`, and the Total row cells have 10 px of bottom padding, because the touch target of the Total's free
  space tip (`::after`, inset −10 px) overflowed by 4 px and made the wrap scroll vertically. From 1280 px wide the
  table uses `table-layout: fixed`, 59.25rem wide, with columns of 17 / 14 / 6.5 / 15 / 2.5 rem (Data, Retention,
  Documents, Size, delete), so the columns stay put when the Legacy row, the "Deleted …" lines, the pending notice or
  the free lines come and go; below 1280 px it keeps the automatic layout with sideways scroll and the sticky delete
  column.
- Status poll cadence, as built: the refresh scheduler's `delay()` gives the interval actually polled (2 s while a
  deletion runs), separate from `interval()`, the user's refresh preference shown in the header.

### Documentation (openvidu.io, branch `next`)

PR #160 is merged into `next` (merge commit 75e6aa101) and the dashboard's author has changed the page since, so the
orchestrator pulls `next` fresh, reads the whole current page first, commits directly on `next` (no branch, no PR,
owner's decision of 2026-11-20) and pushes after warning the owner and the manager session. The Settings → Data
screenshots (`settings-data-light.png`, `settings-data-dark.png`) are taken again with the delete buttons and the new
UI, at the same size and framing and with the same demo data style.

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

- Every batch query is index-backed: `expectIndexBacked` for the find of each class (no `COLLSCAN`,
  `totalDocsExamined` bounded by the batch plus the kept documents met), in `deletions-query-plan.test.ts` on a
  scenario S dataset by default and on scenario M with `DELETIONS_PLAN_SCENARIO=M`. The time-series `track_stats` find
  runs without a hint on the buckets' clustered index.
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
| Batches of a large collection | `backend/test/unit/deletion-runner.test.ts` | unit |
| Status of a running job, Status without any job, Instance gone mid-job, Instance restarted mid-job, Database user without delete rights | `backend/test/integration/deletions-jobs.test.ts` | integration |
| Running deletion in the status, Stale deletion in the status | `backend/test/integration/status-api.test.ts` | integration |
| Completed Events deletion in info, Interrupted Total in info, Entities records its details, Storage refreshed on another instance, Log lines of a deletion | `backend/test/integration/deletions-jobs.test.ts` | integration |
| Deletions before any deletion, Free space after deleting documents (and the modified info scenarios) | `backend/test/integration/api.test.ts` | integration |
| Records accepted by the validator, Contract unchanged | `backend/test/integration/deletions-jobs.test.ts`, `typings` contract test | integration, unit |
| Sub-resource path, Unknown API path (unchanged) | existing tests | — |
| Estimate after a deletion, Free space after a deletion, Little free space | `dashboard-ui/.../settings/storage-classes.spec.ts` | unit |
| Buttons of the table, Legacy row without a button, Buttons while a deletion runs, Buttons while the migration runs, Empty class deletable, the four detail dialogs, the three rollup dialogs, Total dialog, Total with the legacy checkbox, Total with the checkbox left unchecked, Legacy dialog, Deletion confirmed, Deletion refused, Deletion not started, Deletion cancelled in the dialog, Progress of an Entities deletion, Progress follows the status, Deletion completed while watching, Interrupted deletion notice, Failed deletion notice, Class deleted, Class left incomplete | `dashboard-ui/.../settings/settings-page.spec.ts` | unit |
| Keyboard confirmation, Escape cancels | `dashboard-ui/.../components/confirm-dialog/confirm-dialog.spec.ts` | unit |
| Link tip by keyboard | `dashboard-ui/.../components/info-tip/info-tip.spec.ts` | unit |
| Free space tip of a class, Free space tip of the Total, Data tab opened, Second read after a deletion, No further reads, Free space pending after an Events deletion, Free space after the second read, Free space pending after a Total deletion, Free space pending dropped on return, No pending notice after a reload, No free line before any deletion, Total sums the rows with a free line, Free line after an incomplete deletion, Legacy row without a free line | `dashboard-ui/.../settings/settings-page.spec.ts` | unit |
| Storage read again after the release, Free space of the indexes | `backend/test/integration/api.test.ts` (clock injected for the first) | integration |
| Link tip on a phone | `e2e/tests/settings.spec.ts` | e2e |
| Banner of a running deletion, Banner of a Total deletion, No banner on the Data tab, Banner ends with the job, Dismissed banner and a new job | `dashboard-ui/.../shell/banner-slot.spec.ts` | unit |
| Deletion cadence, Status right after starting a deletion, Deletion during the migration, Deletion ends | `dashboard-ui/.../core/refresh/server-status.spec.ts` | unit |
| Delete buttons on a phone, Dialog on a phone, Events dialog: flow with axe in both themes | `e2e/tests/settings.spec.ts` | e2e |
| Events deletion accepted: against the real backend | `e2e/tests-backend/deletions.spec.ts` | e2e (backend) |

The e2e suites cannot run on the owner's machine (Ubuntu 20.04: Playwright 1.65 ships no Chromium for it); they are
validated by the `e2e` job of CI. No baseline screenshot of the Data tab existed, so none was added.

CHANGELOG lines were written in the commit of each observable change (owner decision), not in a final group.

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
