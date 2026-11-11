# Design

## Context

See proposal.md for the motivation. Current state:

- **Room participant peaks:** the writer (`openvidu/analytics/projection`) keeps the room's `internal.activeSids`
  (STANDARD only) and `internal.closedSids`.
  - `participants.peakActive` is raised in the event stage of every `PARTICIPANT_ACTIVE` or `PARTICIPANT_RESUMED` of a
    STANDARD session, with `maxOf(peakActive, activeAfter(sid))`.
  - The updates of a batch merge per document by concatenating their stages, so a peak inside a batch is kept.
  - `ROOM_ENDED` moves every active session into `internal.closedSids`, so no late event can raise a closed room's
    counters.
- **Derived room fields:** `deriveRoom` is the last stage of every merged room update (sizes of the id sets,
  `features.*`, durations, `expiresAt`). `roomTouch` adds the base fields to every room update that comes from an
  event. The reconciler's room closure (`projection/closure.go`) builds its own fields and runs `deriveRoom`, without
  `roomTouch`.
- **Track events:**
  - `TRACK_PUBLISHED` carries the current `TrackInfo` with `muted`: the server copies `AddTrackRequest.muted`, and
    livekit-client sends `muted: track.isMuted`. So a track published muted, as OpenVidu Meet publishes a device the
    participant turned off, arrives with `muted: true`.
  - `TRACK_MUTED` and `TRACK_UNMUTED` update the track and only touch the participant.
  - Track events carry the participant SID and identity, not its kind.
- **Egress:** `egressRequest` already derives the output kinds of a request (`file`, `stream`, `segments`, `images`)
  for the sanitized `request.outputs`. The room keeps `internal.egressIds` and `internal.egressByType`.
- **Counting at room close:** `RoomEndedIncrements` adds `rooms.participantsSum` to the hourly and daily documents of
  the end bucket in the server's scopes.
  - It runs after the batch, from `Store.ParticipantSessions(roomSids)`, which reads `participants.sessions` of the
    closed rooms.
  - The reconciler's `closer.apply` does the same for its closures.
  - Idempotence comes from the batch's `rollupsDone` and from the `Reconciled` references, which make a late real
    `ROOM_ENDED` skip its counters.
- **Contract:** `dashboard-ce/typings/contract` builds the validators and is vendored into
  `openvidu/analytics/schema/contract` (`vendor.sh`, `writer-check.sh`). Rollup maps list their keys.
- **Analytics API:**
  - `CE_METRICS` defines each metric by its projected paths and a value function.
  - `egressEnded` is a special case expanded per key of `egress.endedByStatus` in `analytics-service.ts`.
  - Breakdowns sum the map at a dimension's `path`.
  - The summary reads `SUMMARY_FIELDS`.
- **Analytics page:** the Rooms card has two tiles and the pair "Active rooms" / "Rooms created" in an
  `ovd-chart-grid`. Hourly-only charts are requested at `max(effective, 1h)`.
- **Breakdown chart:** `ovd-breakdown-chart` draws one dimension as a donut or horizontal bars sorted by count, folding
  more than eight entries into "Other".

## Goals / Non-Goals

**Goals:**
- The classes and the recorded flag computed where the events are, in one place for the batch and the reconciler.
- Counters that stay exact across replays, late events and reconciler closures, like `rooms.participantsSum`.
- A rate that ignores rooms the writer could not classify, instead of reading them as unrecorded.
- No new index, no schema version change and no backfill.

**Non-Goals:**
- Recomputing a class after the room closed.
- Topology of rooms migrated from legacy events.
- Per-participant roles (publisher, viewer) in the participants list or API.
- A room-level filter or sort by class or recording.

## Decisions

### D1. Topology from concurrent peaks of STANDARD senders (owner, 2026-11-10 and 2026-11-11)

N is the existing `participants.peakActive`, and P is a new peak of the same kind. Sending media is a state a session
enters once one of its tracks is unmuted, and keeps until it leaves.

Rejected alternatives:
- **Lifetime identities instead of peaks.** A room with rotation, such as a support desk, would look larger than it
  ever was.
- **All participant kinds.** The owner kept STANDARD only, consistent with the room size. An agent conversation
  reads Single participant.
- **"Has a published track", even muted.** A Meet meeting in which one person speaks would read N:M. The owner wants
  1:N to mean that the others never sent anything.
- **Tracks unmuted at the same moment.** A disciplined meeting in which people take turns would read 1:N, and the
  class would depend on mute overlaps of seconds.

### D2. Senders as a room id set, the peak in the event stage

- The room keeps `internal.senderSids`. A session SID is added on:
  - a `TRACK_PUBLISHED` with `muted: false`;
  - a `TRACK_UNMUTED`, which now also updates its room through `roomTouch`.
- `participants.peakPublishers` is raised in the event stage, exactly where `peakActive` is. The expression is
  `maxOf(peakPublishers, size(difference(intersection(activeSids′, senderSids′), closedSids)))`:
  - `activeSids′` includes the SID on a STANDARD `PARTICIPANT_ACTIVE` or `PARTICIPANT_RESUMED`;
  - `senderSids′` includes it on a sender event.
- Both kinds of event evaluate the peak, so the order of `PARTICIPANT_ACTIVE` and the first unmute does not matter.
- Intersecting with the STANDARD-only active set filters out agents and ingress, whose kind the track events do not
  carry.

Rejected alternatives:
- **Evaluating the peak in `deriveRoom`.** It sees only the batch's final sets, so a sender that leaves within the
  batch would be missed.
- **Deriving P at close from the `tracks` collection.** Tracks keep only their last `muted`, not the history.

### D3. `topology` and `features.recording` in `deriveRoom`, gated by a marker

- `deriveRoom` sets `topology` from `participants.peakActive` and `participants.peakPublishers` with a `$switch` on
  the rules of the "Room topology class" requirement. It does so only when `participants.peakPublishers` exists.
- `roomTouch` sets `participants.peakPublishers: keep(0)`, so every room the new writer projects an event for has it.
- A room written only by an earlier writer and closed by the reconciler never goes through `roomTouch`, so it gets no
  class instead of a wrong one with P = 0.
- `features.recording` is `size(internal.recordingEgressIds) > 0`. It is set on every room, with the default `false`.

Rejected alternatives:
- **Gating on `schemaVersion`.** It does not change in this change.
- **Classifying every room with P = 0.** Rooms killed by an upgrade would inflate No publishers and Single
  participant.

### D4. A recording is a file or segments output that reached `active`

- The egress projection adds the egress ID to the room's `internal.recordingEgressIds` when:
  - the request's output kinds include `file` or `segments`;
  - and the event's status is `active`, `ending`, `complete` or `limit_reached`.
- The output kinds come from the same helper as `request.outputs`, which is factored out of `egressRequest`.

Rejected alternatives:
- **Any egress.** That is `features.egress` already, and a live stream is not a recording.
- **The file results at the end.** They arrive only at the end, and a recording that fails after writing part of a
  file still counts.
- **EgressInfo `started_at`.** Its meaning across egress versions is not specified by the protocol. The statuses
  are.

### D5. Counting at room close through the existing room-close read

- `Store.ParticipantSessions` becomes `Store.ClosedRooms(ctx, roomSids) map[string]projection.ClosedRoom`. It reads
  `participants.sessions`, `participants.peakActive`, `topology` and `features.recording` with one projection.
- `RoomEndedIncrements(mediaNode, mediaStats, endedAt, room ClosedRoom)` adds, to the hourly and daily documents of
  the server's scopes:
  - `rooms.participantsSum`;
  - and, when `topology` is set:
    - `rooms.byTopology.<class>: 1`;
    - `rooms.recorded: 1` when recorded;
    - `rooms.sizeByTopology.<class>.<range>: 1` for the three classes with a range.
- `batch.go` and `reconciler_close.go` call it unchanged otherwise, so replays and late real ends inherit the
  existing idempotence.
- The range comes from a small Go function with the bounds 5, 10, 25, 50 and 100.

Rejected alternatives:
- **Incrementing in the `ROOM_ENDED` projection.** The pure projection does not know the room's peaks or egresses.
- **A leader job that classifies rooms that closed.** It would be a third periodic job with its own marker and
  delay, for something the close path already reads.

### D6. Hourly and daily only

The new counters go only to `analytics_hourly` and `analytics_daily`, like `rooms.participantsSum`:
- the 5-minute rollups hold only what the default view draws per five minutes;
- a topology or a recorded share per five minutes is mostly empty buckets and 0 % / 100 % noise.

The two metrics are hourly-only, and the page requests their charts at `1h` with the note "Hourly", as it does for
`egressEnded`.

### D7. The rate over classified rooms

The denominator of `recordedRoomsRate` is the sum of `rooms.byTopology` of the bucket or range, not `rooms.ended`:
- a range before the upgrade reads `null` / n/a, not 0 %;
- an hour or a day mixing writers, including during a rolling upgrade of an elastic deployment, divides the recorded
  rooms by the rooms that could be recorded as such.

The metric projects `rooms.recorded` and the six `rooms.byTopology.<class>` paths, and its value function adds the
classes up. The summary adds the same paths to `SUMMARY_FIELDS`.

Rejected alternative: a `rooms.classified` counter, which would be redundant with the sum of the classes.

### D8. Map metrics generalised

The `egressEnded` special case becomes a table of expanded metrics: `{ egressEnded: 'egress.endedByStatus',
roomsByTopology: 'rooms.byTopology' }`.
- `metricFields`, the series expansion and the CSV columns read the table.
- `AnalyticsCatalogue.metrics` excludes both keys.
- The OpenAPI description of a series name lists both forms.

### D9. Three size dimensions, not a composite key

`roomSizeNoPublishers`, `roomSizeOneToMany` and `roomSizeManyToMany` are ordinary dimensions over the nested paths
`rooms.sizeByTopology.<class>`. The chart requests the three in one breakdowns call, and the CSV exports them as three
breakdowns.

Rejected alternatives:
- **One `roomSize` dimension with keys such as `one_to_many:6-10`.** The keys would no longer be the stored keys.
- **A class parameter on breakdowns.** That would be a new API shape for one chart.

### D10. A stacked category chart, separate from the breakdown chart

`ovd-stacked-category-chart` (ECharts `bar` with a category x-axis and `stack`) takes:
- `keys`: the fixed order of the x-axis;
- `series`: name, entity and value per key.

It follows the time-series chart's accessibility summary, data table toggle and empty state.

Rejected alternative: extending `ovd-breakdown-chart`. Its contract (one dimension, sorted by count, folding into
"Other", donut or horizontal bars) does not fit several breakdowns over an ordered axis.

### D11. Vocabulary, labels and colours

- **Class keys:** `empty`, `single_participant`, `no_publishers`, `one_to_one`, `one_to_many`, `many_to_many`.
  - In typings, they are a `RoomTopology` enum.
  - In Go, they are constants in `projection/vocabulary.go`.
  - In the UI, they are labelled through the shared enum labels: Empty, Single participant, No publishers, 1:1, 1:N,
    N:M.
- **Size range keys:** `2-5`, `6-10`, `11-25`, `26-50`, `51-100`, `101+`. Valid MongoDB field names.
- **Colours:** `ENTITY_SLOTS` gains `topology_<class>`, following the egress-status precedent:

  | Class              | Slot | Colour               |
  | ------------------ | ---- | -------------------- |
  | many_to_many       | 1    | teal, the Rooms colour |
  | one_to_many        | 6    | blue                 |
  | one_to_one         | 7    | violet               |
  | no_publishers      | 4    | yellow               |
  | single_participant | 5    | pink                 |
  | empty              | 2    | orange               |

  Red (8) stays for failures. "Recorded rooms" uses the `rooms` entity.

### D12. Data generator

- The size of a room still follows from its generated sessions, so the classes follow from N, as in real use:
  - about 3 % of the closed rooms are created and never joined (Empty);
  - the others keep the identities, reconnects and overlaps the generator already draws.
- A separate seeded stream then picks the senders, so that the other generated data do not depend on these draws:
  - a room with N ≤ 1: its first publishing participant sends in 85 % of the rooms;
  - N = 2: no sender in 5 % of the rooms, otherwise the first sends and the other in 70 %;
  - N ≥ 3: no sender in 5 %, only the first in 7 %, otherwise the first and each other in 70 %.
- A sender publishes at least one unmuted track; any other participant publishes nothing or tracks muted for good
  (`muted: true` in the track and its `TRACK_PUBLISHED`), as Meet does.
- `participants.peakPublishers`, `topology` and `features.recording` follow the writer's rules, from the generated
  overlaps and egresses.
- 30 % of the rooms get an egress, instead of 10 %; with the existing output mix (70 % file, 10 % segments), about a
  quarter of the rooms are recorded.
- With `--room-sums`, the class, recording and size range counters are added at each room's end bucket, in its scopes,
  as the room sums are: without it the generator writes rollups as a writer that does not classify rooms.
- Scenario `S` over 7 days gives about 61 % N:M, 14 % 1:1, 9 % Single participant, 8 % 1:N, 5 % No publishers and 3 %
  Empty.

## Data model

| Collection                  | Field                                    | Type                                | Notes                                    |
| --------------------------- | ---------------------------------------- | ----------------------------------- | ---------------------------------------- |
| `rooms`                     | `participants.peakPublishers`            | int32                               | optional (absent from earlier writers)   |
| `rooms`                     | `topology`                               | string enum (D11)                   | optional (absent from earlier writers)   |
| `rooms`                     | `features.recording`                     | bool                                | optional (absent from earlier writers)   |
| `rooms`                     | `internal.senderSids`                    | string[]                            | writer bookkeeping                       |
| `rooms`                     | `internal.recordingEgressIds`            | string[]                            | writer bookkeeping                       |
| `analytics_hourly`, `_daily`| `rooms.byTopology.<class>`               | int32 per class                     | map of the six class keys                |
| `analytics_hourly`, `_daily`| `rooms.recorded`                         | int32                               |                                          |
| `analytics_hourly`, `_daily`| `rooms.sizeByTopology.<class>.<range>`   | int32                               | classes `no_publishers`, `one_to_many`, `many_to_many` |

- **Indexes:** none new. The rollups are read through `{ scope, bucket }` as today; no query filters rooms on the new
  fields.
- **Retention:** unchanged. The room fields follow the entity TTL, and the counters follow the rollup classes.
- **Schema version:** unchanged. The fields are optional in the contract. An older dashboard ignores them, and this
  dashboard shows n/a or gaps without them.
- **Legacy migration:** no mapping. Migrated rooms get no `topology` and stay out of the counters and of the rate's
  denominator.
- **Contract:**
  - the room schema gains the three optional fields;
  - the hourly and daily rollup schemas gain the maps with listed keys;
  - the vendored copy in the writer is refreshed, and `writer-check.sh` passes.

## API

- `GET /api/v1/analytics/series`:
  - `metrics` accepts `roomsByTopology` and `recordedRoomsRate`, both hourly-only;
  - series names include `roomsByTopology.<class>`;
  - `recordedRoomsRate` is a percent, `null` when empty;
  - `roomsByTopology.<class>` is a count, `0` when empty.
- `GET /api/v1/analytics/breakdowns`: `dimensions` accepts `roomSizeNoPublishers`, `roomSizeOneToMany` and
  `roomSizeManyToMany`. The response shape is unchanged, with keys among the six ranges.
- `GET /api/v1/analytics/summary`: optional `roomsRecorded` (integer) and `recordedRoomsRate` (number, one decimal).
  Both are absent when no room of the range has a class.
- `GET /api/v1/analytics/export.csv`: the same parameters. Series columns are named as the series, for example
  `roomsByTopology.one_to_one`.
- **Index backing:** the existing `{ scope, bucket }` index scans of `analytics_hourly` and `analytics_daily`. The
  new paths are extra projected fields of the same documents.
- **Typings:**
  - `AnalyticsMetric` and `AnalyticsDimension` gain the new members;
  - `ANALYTICS_METRIC_INFO` gains `roomsByTopology` (`count`, `0`, `hourlyOnly`) and `recordedRoomsRate` (`percent`,
    `null`, `hourlyOnly`);
  - `ANALYTICS_CE_METRICS` and `ANALYTICS_CE_DIMENSIONS` grow;
  - the summary type gains the two optional values;
  - nothing is global-only.

## Performance

- **Writer:**
  - Every `TRACK_UNMUTED` now also updates its room: one more stage on a room document that the batch usually
    touches anyway.
  - The two id sets are bounded by the room's sessions and egresses, like the existing ones.
  - Verify with `TestBatchPerformanceBudget` (`bench_integration_test.go`), whose benchmark batch gains unmute events
    and recording egresses: its round trips stay the same and its p95 stays within `benchMaxP95`.
- **Room-close read:** the same `find` by `_id` with three more projected fields, in the same round trip.
- **Dashboard:**
  - The same rollup documents are read, plus at most 25 projected keys per document.
  - Verify with the existing explain assertions of "Index-backed analytics queries" on the scenario `M` database,
    extended to the new metrics and dimensions: no `COLLSCAN`, the `{ scope, bucket }` index, and keys examined at most
    the buckets in range plus one.

## Risks / Trade-offs

- **[A client that publishes muted without sending `muted`]** It would count as a sender until its first mute.
  → livekit-client sends it, and the other LiveKit SDKs send the same `AddTrackRequest` field. Accepted. The info tip
  states the rule.
- **[A participant who unmutes by accident for a second]** That participant counts as a sender. → This is the owner's
  chosen semantics: "has sent media".
- **[Lost track events]** A dropped `TRACK_UNMUTED` underestimates P. → The same exposure as every event-driven
  counter. The bounded queues report drops in metrics.
- **[Topology chart below "Rooms created" right after an upgrade]** Only classified rooms are stacked. → The info tip
  says "rooms ended", and the gap closes once every node runs the new writer.
- **[Class of a room as counted versus as stored]** The rollup counts what the room reads after its closing batch.
  Peaks cannot rise after close (D2), so both agree.

## Migration Plan

1. Merge and release the writer in openvidu-livekit, then in openvidu-pro-livekit.
2. Release the dashboard. Either order works: an older writer leaves the new values absent (n/a, gaps), and an older
   dashboard ignores the new fields.
3. Rollback: an older writer stops writing the fields, and the dashboard shows gaps from then on. No data migration
   is needed in either direction.

