# Proposal

## Why

Analytics answers "how many rooms and sessions started" but not "how many were running at once". That is the
question about load and capacity, and the one the metrics dashboards of a deployment answer first. The dashboard only
shows the current value (Overview, Rooms page), and nothing keeps its history. Rooms created and ended per bucket is a
weak substitute: it says nothing about rooms that run across buckets.

The rollups cannot count this today. The writer of each server only increments counters for its own events, so no
server sees the rooms and sessions of the others at the same time. The one periodic job that runs on a single node,
the reconciler, exists to close lost entities. It already computes the daily unique identities, which is not its job:
`reconciler.enabled: false` turns them off too.

## What Changes

- **Server, new aggregator job:**
  - A periodic job of its own, separate from the reconciler: one node at a time runs it under the Redis lock
    `analytics-aggregator-lock` (a local mutex without Redis), every minute and once at startup.
  - It runs whenever analytics is enabled, whatever `reconciler.enabled` says. It has no configuration key.
  - Every run samples the rooms with status `active` and the STANDARD participant sessions with status `active` (the
    Overview's live counters). It writes them with `$max` into the bucket of the sample in `analytics_5min`,
    `analytics_hourly` and `analytics_daily`, as `rooms.peakActive` and `participants.peakActive`:
    - in the global scope, `0` included;
    - per media node label, for the labels of the active entities and of the live labelled nodes.
  - It takes over the daily `uniqueIdentities` from the reconciler, unchanged otherwise.
  - Metrics: `openvidu_analytics_aggregator_runs_total` by result and `openvidu_analytics_aggregator_run_duration_seconds`.
- **Reconciler:** it no longer computes unique identities. With `reconciler.enabled: false` they are still computed.
- **Analytics API:**
  - Two new CE metrics, `roomsPeakActive` and `participantsPeakActive`, served at every granularity.
  - A bucket made of several rollup documents takes their maximum, not their sum.
  - A bucket without a sample holds `null`.
- **Analytics page:**
  - The Rooms section draws "Active rooms" (peak per bucket, step line) instead of "Rooms created and ended".
  - The Participants section draws "Active participants" instead of "Participant sessions" (joined and aborted).
    Aborted sessions remain visible through Connection success.
  - Both charts get an info tip. The tiles and the other charts do not change.
  - The CSV of each section follows its charts.
  - A range sampled before the upgrade keeps its tiles and other charts. Its unsampled buckets show as gaps.
- **Data generator:** writes the peaks in the rollups it writes, sampled each minute from the generated rooms and
  sessions.

Scope excludes the following:
- The rest of the metrics dashboards review: published and subscribed tracks, packet loss and bitrate instead of bytes
  stay out.
- Backfilling peaks before the upgrade.
- A peak in the summary tiles or on any other page.
- The average number of rooms or participants active at once.

Edition: CE and PRO.
- Every edition gets the job, the metrics and the charts.
- A node scope gets them through the existing `scope` parameter, with no edition-specific behaviour.

Repositories:
- openvidu-livekit: `openvidu/analytics`, `README-openvidu.md`, `CHANGELOG-openvidu.md`.
- The dashboard: specs, typings and contract, backend, frontend library, data generator, `CHANGELOG.md`.

CHANGELOG lines:
- `CHANGELOG.md`, in the 3.10.0 Analytics line (unreleased, so no line of its own): "with rooms and participants
  (the most active at once in each bucket), client, data transferred, egress and ingress (with the input type)
  sections".
- `CHANGELOG-openvidu.md` (openvidu-livekit):
  - New line, **Analytics aggregator**: "one node at a time samples every minute the rooms and participants active at
    once into the rollups, and computes the daily unique identities whatever `openvidu.analytics.reconciler.enabled`;
    metrics `openvidu_analytics_aggregator_*`."
  - The reconciler line does not mention unique identities; it stays as it is.

## Capabilities

### New Capabilities

- `server-aggregator`: the leader-elected periodic job that writes the values the per-event writer cannot (the peaks
  of active rooms and participants, the daily unique identities), with its lock, schedule, metrics and independence
  from the reconciler.

### Modified Capabilities

- `server-reconciler`: the daily unique identities requirement moves out, and the reconciler switch no longer affects
  them.
- `server-analytics-writer`: the analytics Redis keys include the aggregator lock, and the daily unique identities
  scenario names the aggregator.
- `data-model`: the rollups gain `rooms.peakActive` and `participants.peakActive` in the three collections, and the
  daily `uniqueIdentities` is set by the aggregator.
- `analytics-api`: the catalogue gains the two peak metrics, which fill empty buckets with `null` and take the maximum
  across documents.
- `api-conventions`: the dense series rule names the aggregator for the unique identities not computed yet, and adds
  the `null` of unsampled peaks.
- `analytics-ui`: the Rooms and Participants sections draw the peaks, and the chart notes scenario names the new chart.
- `ui-info-tips`: the Analytics chart tips cover Active rooms and Active participants instead of Participant sessions.

## Impact

- openvidu-livekit `openvidu/analytics`:
  - new aggregator (job, lock, metrics, store queries);
  - reconciler without `dailyUniqueIdentities`;
  - rollup document structs with the peak fields;
  - wiring in `analytics.go`.
- The contract: the rollup schemas gain two optional integer fields. No schema version change: the fields are
  additive, and a dashboard reading an older writer shows gaps.
- Dashboard backend: the analytics catalogue and fold (maximum for peak paths). No new query: peaks come from the
  same `{ scope, bucket }` reads.
- Dashboard frontend library: the Analytics page Rooms and Participants sections, `PAGE_METRICS` and the info texts.
- Data generator and demo: rollups with peaks.
- MongoDB load: one aggregation per minute on active rooms and one on active participants, backed by existing status
  indexes, plus a few upserts per minute.
