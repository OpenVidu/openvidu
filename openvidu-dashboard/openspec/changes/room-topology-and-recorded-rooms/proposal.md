# Proposal

## Why

The Analytics page counts rooms but does not say how they are used. It cannot tell one-to-one calls from broadcasts or
meetings, how big each kind gets, or how many rooms are recorded. These questions come up when sizing a deployment, a
media node or the storage for recordings. The writer already sees everything needed: who connects, which tracks are
unmuted, and which egress writes files.

## What Changes

- **Room topology:** every room gets a class from two concurrent peaks of its STANDARD sessions.
  - **N** is the most STANDARD sessions active at once, the existing `participants.peakActive`.
  - **P** is the most of them active at once that have sent media, the new `participants.peakPublishers`.
    - A session has sent media once one of its tracks (microphone, camera, screen share or its audio) has been
      unmuted: published unmuted, or unmuted later.
    - From then on it counts until it leaves.
    - A track published muted and never unmuted does not count. OpenVidu Meet, for instance, publishes the microphone
      and camera muted when a participant turns them off.
  - The six classes cover every room:

    | Class              | Rule              |
    | ------------------ | ----------------- |
    | Empty              | N = 0             |
    | Single participant | N = 1             |
    | No publishers      | N ≥ 2 and P = 0   |
    | 1:1                | N = 2 and P ≥ 1   |
    | 1:N                | N ≥ 3 and P = 1   |
    | N:M                | N ≥ 3 and P ≥ 2   |

  - Agents, ingress, SIP and egress participants never count.
- **Recorded rooms:** a room is recorded when one of its egresses with a `file` or `segments` (HLS) output reaches
  `active`. Stream outputs (RTMP, SRT) and image outputs alone do not make a room recorded.
- **Writer (openvidu-livekit):**
  - The room document gains:
    - `participants.peakPublishers`;
    - `topology` (provisional while the room is active);
    - `features.recording`.
  - When a room closes, through its `ROOM_ENDED` or the reconciler, the hourly and daily rollups of its end bucket, in
    both scopes, gain three counters:
    - `rooms.byTopology.<class>` (+1);
    - `rooms.recorded` (+1 when recorded);
    - for No publishers, 1:N and N:M, `rooms.sizeByTopology.<class>.<range>` (+1). The range of N is one of `2-5`,
      `6-10`, `11-25`, `26-50`, `51-100` and `101+`.
  - A room written by an earlier writer has no class and is left out of these counters.
- **Analytics API:**
  - Two new hourly-only CE metrics:
    - `roomsByTopology`, which expands into one series per stored class, as `egressEnded` does;
    - `recordedRoomsRate`: recorded rooms over classified rooms, as a percentage.
  - Three new CE dimensions: `roomSizeNoPublishers`, `roomSizeOneToMany` and `roomSizeManyToMany`.
  - The summary gains `roomsRecorded` and `recordedRoomsRate`. Both are left out when no room of the range has a class.
  - All of them are allowed in a node scope, like the other room counters.
- **Analytics page, Rooms section:**
  - The tile "Recorded rooms" joins Average room size and Average room duration.
  - Three charts follow "Active rooms" and "Rooms created", in a grid of five:
    - "Room topology": rooms ended per bucket, stacked by class;
    - "Recorded rooms": the recorded share per bucket, as a percentage line;
    - "Room size by topology": rooms ended in the range per size range, stacked by No publishers, 1:N and N:M.
  - "Room topology" and "Recorded rooms" are requested at `1h` while the page granularity is finer.
  - The section's CSV adds the two new series.
  - Info tips explain the classes and what counts as recorded.
- **UI building blocks:**
  - a stacked category chart: bars over a fixed key order, one stacked segment per breakdown;
  - fixed colour slots for the topology classes.
- **Data generator:** rooms of every class in a realistic mix, recording egresses, and the room fields and rollup
  counters written as the writer writes them.

Not in scope:
- The rooms list: no column, filter or sort.
- The Analytics KPI row.
- The PRO room detail, a separate PRO change.
- Backfilling classes or recordings for rooms ended before the upgrade, and computing them in the legacy migration.
- Topology in the 5-minute rollups.
- Recording time or storage used.

Edition:
- The writer and the data model serve both editions.
- The metrics, dimensions, summary values and the Rooms section are CE.
- PRO node scopes get them per media node with no extra work.

Repositories:
- openvidu-livekit: `openvidu/analytics` and `CHANGELOG-openvidu.md`.
- Dashboard CE: specs, typings and contract, backend, frontend library, data generator, `CHANGELOG.md`.
- Dashboard PRO: `ce.ref` move. The room detail is a later PRO change.

CHANGELOG lines:
- `CHANGELOG.md`, 3.10.0 Analytics line (unreleased): "… with rooms, participants, egress and ingress sections that
  draw both the most active at once and the volume per bucket, the topology of the ended rooms (1:1, 1:N, N:M…), their
  size and the share recorded, client and data transferred sections; …". It replaces "with rooms, participants,
  egress and ingress sections that draw both the most active at once and the volume per bucket, client and data
  transferred sections".
- `CHANGELOG-openvidu.md`, the **New analytics data model** line gains: "a room records its topology, from the most
  participants and the most media senders connected at once, and whether it was recorded; both are counted in the
  hourly and daily rollups when it ends".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-model`:
  - the room document gains `participants.peakPublishers`, `topology` and `features.recording`;
  - the hourly and daily rollups gain `rooms.byTopology`, `rooms.recorded` and `rooms.sizeByTopology`;
  - new requirements define the topology classes and size ranges, recorded rooms, and the generated topologies and
    recordings.
- `server-analytics-writer`: the writer evaluates the publisher peak and the recording flag from events, and counts
  the class, size range and recording of a room when it ends.
- `server-reconciler`: a room the reconciler closes is counted in the class and recording counters once, as its
  `participantsSum` is.
- `analytics-api`:
  - the catalogue gains `roomsByTopology` (expanded per class) and `recordedRoomsRate`, now 24 CE metrics, both
    hourly-only;
  - three room size dimensions;
  - two summary values.
- `analytics-ui`:
  - the Rooms section gains the Recorded rooms tile and the three charts;
  - its CSV export follows the new series.
- `ui-building-blocks`:
  - the stacked category chart;
  - the topology classes in the chart palette.
- `ui-info-tips`: the Analytics tips add Room topology, Recorded rooms (tile and chart) and Room size by topology.

## Impact

- **openvidu-livekit `openvidu/analytics`:**
  - two new room id sets: sessions that have sent media, and recording egresses;
  - the publisher peak on the participant and track events;
  - `topology` and `features.recording` in the room derive stage;
  - the room-close read (today `participantsSum` only) also returns the class, N and the recording flag, for the
    batch and for the reconciler;
  - the rollup document structs.
- **Contract:**
  - optional fields only: no schema version change and no new index;
  - a dashboard reading an older writer shows "Not provided by this server version" for the new values.
- **Dashboard backend:**
  - catalogue entries;
  - the expansion of `egressEnded` generalised to map metrics;
  - the three dimensions and the two summary values.
- **Dashboard frontend library:**
  - the Rooms section template and plan;
  - series labels and colours;
  - the stacked category chart;
  - the info texts;
  - the CSV export.
- **Data generator and demo:** topology mix, recording egresses, room fields and rollup counters.
- **MongoDB load:** room documents only grow by two id sets bounded by their sessions and egresses. Each closing room
  adds up to three counters to rollups that the closure already updates. The room-close read projects three more
  fields from the same documents.
