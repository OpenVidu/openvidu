# Proposal

## Why

The analytics data only shrinks when its retention expires, so an administrator whose MongoDB disk fills up, or who
wants to start the history again, has no way to remove data short of running database commands by hand. The Data tab
of Settings already shows how much each class of data takes; it is the natural single place to delete it, provided the
administrator learns there that MongoDB keeps the freed disk space and how to return it to the system.

## What Changes

- **Delete buttons in the Storage table** of Settings → Data: one per class row (Events, Stats, Tracks and
  subscriptions, Entities, 5-minute, hourly and daily rollups), one on the Total row (every class, Analytics history
  included) and one on the "Legacy data (before 3.10)" row while it reads "Kept until <date> for rollback". Nowhere
  else: lists and detail pages get no delete action.
- **A confirmation dialog** per button (Cancel and a red Delete) that says what goes, what is kept and that it cannot
  be undone, and, except for the Legacy data, that MongoDB keeps the disk space, with a "How to free disk space" link to
  the documentation. The Total dialog has an unchecked "Also delete the data before 3.10" checkbox while the Legacy data
  is kept for rollback.
- **What a deletion keeps**: rooms in progress with all their data, open egresses, ingress sessions and ingress
  definitions not deleted, media node records, everything recorded in the 5 minutes before the confirmation and
  everything that starts or ends after it, and the current and previous bucket of each rollup granularity. Deleting
  Entities also deletes the events, stats, tracks and subscriptions of what it deletes; deleting Tracks and
  subscriptions also deletes the stats stored per track.
- **A background deletion job**, one at a time across every dashboard instance, deleting 5,000 documents at a time with
  a 100 ms pause: progress on the Data tab ("Deleting Events: 1,234,000 documents deleted · collection 2 of 5"), a
  banner on every page, delete buttons disabled while it runs, a toast and a refreshed table when it ends, a notice when
  it is interrupted (its dashboard instance stopped) or fails, and "Deleted <date>" under each class name.
- **Free space**: each deleted class shows the space MongoDB keeps free for new data, and the size estimate at full retention
  uses only the space in use, so a deletion no longer inflates it.
- **API**: `POST /api/v1/deletions` starts a job (`202`, `409 CONFLICT` while one runs or for Legacy data outside its
  rollback window); `GET /api/v1/status` reports the job (`deletion`), `GET /api/v1/info` the last deletion of each
  class (`deletions`) and the free space of each collection (`storage.<collection>.freeBytes`). No cancel.
- **Records**: the job, its lock and the last deletion of each class live in the dashboard's reserved `schema_meta`
  document (`_id: "dashboard"`), whose validator already accepts them; one server log line per deletion.
- **Documentation** (OpenVidu/openvidu.io, committed on `next`, where PR #160 was merged): a "Deleting analytics
  data" section with "Freeing disk space" (why MongoDB keeps the space, `compact` per deployment type), the target of
  the dialog link, and new Settings → Data screenshots.

No breaking change: the API only gains a route and response fields, the data contract and its schema version are
unchanged, and the writer (openvidu-livekit) is not touched.

CHANGELOG line (`Added`, `UI`; the 3.10 CHANGELOG is written against 3.9, so no API line and no line for the size
estimate, an intermediate step):
- Deletion of stored analytics data from the Data tab of Settings: one class, every class or the data before 3.10, after a confirmation, as a background job with its progress, a banner on every page and a notice at its end. Data in progress is kept, and each deleted class shows when it was deleted and the space MongoDB keeps free for new data, with how to free that disk space.

Edition: CE, and PRO through the CE packages. Repositories: this one (OpenVidu/openvidu, `openvidu-dashboard/`) and
the documentation PR in OpenVidu/openvidu.io. Track: full (new API, several capabilities, background job, other
repository for the docs).

Non-scope: deleting from lists or detail pages; running `compact` from the dashboard; cancelling a running deletion;
changing retention; the dashboard's own collections. The PRO notice on detail pages for deleted data is a later PRO
change that builds on `deletions` of the info document.

## Capabilities

### New Capabilities

- `deletions-api`: the deletion job: its start, the single-job lock, what each class deletes and keeps, its pace,
  progress, interruption and failure, the record of the last deletion of each class and the cache refresh.

### Modified Capabilities

- `settings-about`: delete buttons, dialogs, progress and outcome on the Data tab, last deletion and free space per
  class, the estimate from the space in use.
- `ui-building-blocks`: a confirmation dialog.
- `ui-shell`: the deletion banner, the status cadence and the info re-read while a deletion runs.
- `editions-info`: `deletions` and `storage.<collection>.freeBytes` in the info document; storage figures refreshed
  after a deletion.
- `status-api`: `deletion` in the status.
- `api-conventions`: the `deletions` resource.
- `data-model`: the deletion records of the dashboard document of `schema_meta`.

## Impact

- `dashboard-ce/typings`: API types of the deletion job, `deletion`, `deletions` and `freeBytes`; the dashboard
  document type. No change to `contract/` or the generated `schema/`.
- `dashboard-ce/backend`: a `deletions/` slice (route, job runner, lock, filters per class), status and info fields,
  cache invalidation, log line; exports for an extending edition.
- `dashboard-ce/frontend/projects/dashboard-ui`: confirmation dialog, Data tab, banner, status cadence, links.
- `dashboard-ce/e2e`: Data tab deletion flows with axe and both themes.
- `CHANGELOG.md`, `AGENTS.md` of the backend and the library.
- openvidu.io `next`: the documentation section and the Settings → Data screenshots.
