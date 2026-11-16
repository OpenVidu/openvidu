# Proposal

## Why

The About tab of Settings repeats the version and edition the sidenav footer already shows, and splits what an
administrator needs to size the analytics database over two tables: the retention per data class and the storage per
collection, which do not map one to one. Nothing tells whether a class has reached its retention yet, how large it
gets when it does, or where the retention is changed.

## What Changes

Edition: CE. Repository: dashboard (`OpenVidu/openvidu`, `openvidu-dashboard/`) only; openvidu-livekit and
openvidu-deployment are untouched.

- The tab is named "Data" and selected by `tab=data`. `tab=about` is not kept as an alias: it shows Preferences like
  any unknown value (3.10.0 is unreleased, so no published link uses it).
- The version line and the edition badge leave the tab; the sidenav footer keeps showing both.
- The migration section, the "Server info unavailable" notice and the loading skeleton behave as before.
- One "Storage" table replaces the retention table and the storage table: one row per data class (Events, Stats,
  Tracks and subscriptions, Entities, 5-minute, hourly and daily rollups) with its retention, the documents and the
  size summed over its collections, and a Total row. The retention column is titled "Retention". `schema_meta`
  belongs to no class and is neither shown nor counted.
- A class whose data spans less than its retention carries an info tip after its retention, "12 of 90 days so far",
  with a linear estimate of its size at full retention when it holds a day of data: "· ≈ 4.2 GB at full retention
  (estimate)". Daily rollups without a limit read "Grows without limit · ≈ 1.3 MB per year (estimate)".
- Each class is judged by its own oldest data; Stats and Tracks and subscriptions, which the info endpoint does not
  date, by the oldest data of the deployment. The Entities clock ignores `nodes` and `ingresses`.
- Each class row expands to the collections behind it (collection, documents, size, oldest), collapsed by default.
  The owner reviews it on the demo and may drop it, so it is specified and built as a removable unit.
- A message under the table tells where the retention is changed (`openvidu.analytics.retention` of `livekit.yaml`,
  its seven keys, applied when the server restarts), links the documentation and states what the estimates assume.
- The "Storage and retention" link of the Overview's Data pipeline card targets `/settings?tab=data`.

Known limit, accepted by the owner: a class judged by its own oldest data reads as still filling after an idle
period (an idle weekend gives "5 of 7 days so far" on the 7-day classes), because the oldest surviving document is
then younger than the retention. Stats and Tracks and subscriptions do not show a retention raised on a deployment
older than the new value.

Not in scope:

- Any button or API that deletes data.
- The backend, `GET /api/v1/info`, the data contract and the writer: everything is computed in the UI from the
  `storage` and `retention` the endpoint already reports.
- The legacy collections kept for rollback after an upgrade (`legacy_events`, `stats`), which the info endpoint does
  not report and the table therefore does not count: a later change.
- An estimate in the Total row.
- The live tiles of the Overview, which the archived change `overview-live-tiles` settled.
- The PRO workspace, which adapts in a later PRO change: it moves `ce.ref`, drops the PRO badge on About from its
  `settings-about` spec and updates what opens `/settings?tab=about`.
- Renaming the capability folder `settings-about`.

CHANGELOG (3.10.0, `Added` → `UI`): the existing Settings line is rewritten, since the About tab never shipped:

- Settings page with viewer preferences (any time zone as the default) and a Data tab with the retention and the
  storage of each class of data and of its collections, an estimate of the size of the classes that have not reached
  their retention yet, where the retention is configured and the migration progress while it runs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `settings-about`: the tabs are Preferences and Data (`tab=data`); the version requirement and the two-table
  retention and storage requirement are removed; the storage table per data class, the retention progress and its
  clocks, the size estimate, the access to the tips, the collection breakdown and the retention message are added;
  the migration, unavailable and loading requirements name the Data tab.
- `overview-ui`: the "Storage and retention" link of the Data pipeline card targets `/settings?tab=data`.
- `ui-shell`: the info re-read when a migration ends names the Data tab and what it shows.

## Impact

- UI library (`dashboard-ce/frontend/projects/dashboard-ui`): `features/settings/` (the About tab becomes the Data tab,
  with the class computation and the collection breakdown beside it), one query parameter in
  `features/overview/overview-page.html`, and their unit tests.
- End-to-end tests (`dashboard-ce/e2e`): `settings`, `accessibility`, `auth` and `assets` suites, the backend
  session suite and the info document of the API mock.
- `CHANGELOG.md`. No `README.md` or `AGENTS.md` text names the tab.
- No new or upgraded dependency, no API, schema or configuration change, no upgrade step.
- Documentation, in `openvidu.io` (pull request of the 3.10 dashboard page): the Settings section, its two
  screenshots and the Retention section.
