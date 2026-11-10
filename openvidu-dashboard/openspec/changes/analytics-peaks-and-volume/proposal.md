# Proposal

## Why

The owner's review of the Analytics page after `active-peaks` found five problems:

- **Peaks replaced volume.** The Rooms and Participants sections only draw the peak of active entities. That answers
  "how much capacity is needed", but with 6-hour or daily buckets it hides "how much the platform is used". Over 30
  days the demo peaks at 12 to 21 rooms a day while about 200 rooms are created each day. Egress and ingress have the
  opposite gap: they show starts per bucket but never how many run at once, although egress is the heaviest load of a
  deployment.
- **The step chart reads as blocks.** With 6-hour and daily buckets the step line looks blocky, and as the only chart
  of the Rooms card it fills the whole card width.
- **One colour everywhere.** Almost every single-series chart is teal, the primary colour. Active rooms, Active
  participants, Connection success, Egress started and Ingress sessions all use the same palette slot, and so does
  the largest slice of almost every donut.
- **Unbalanced grids.** With `auto-fit` and 420 px columns, a 1920 px screen fits three charts per row, so the cards
  with four charts show three and then one. The unique identities hint takes a whole empty cell, and unique
  identities need a switch to `1d` although the hourly-only charts show up at any granularity.
- **Egress and ingress attributed to the wrong node.** The writer counts egress and ingress in the node scope of
  the server that writes their events, which is not necessarily the media node that runs them. So a node scope shows
  egress and ingress figures that may belong to another node.

## What Changes

- **Server aggregator (openvidu-livekit):**
  - Every run also counts:
    - the egresses with status `starting`, `active` or `ending`;
    - the ingress sessions with status `buffering` or `publishing`.
  - It writes them with `$max`, in the global scope only, as `egress.peakActive` and `ingress.peakActive`:
    - `egress.peakActive` in the 5-minute, hourly and daily rollups;
    - `ingress.peakActive` in the hourly and daily rollups only, like every ingress counter.
- **Writer (openvidu-livekit):** the egress and ingress counters of the 5-minute, hourly and daily rollups go to the
  global scope only, never to a `node:<label>` scope.
- **Analytics API:**
  - Two new CE metrics:
    - `egressPeakActive`, served at every granularity;
    - `ingressPeakActive`, hourly-only.
  - Both are combined by maximum and hold `null` in a bucket without a sample, like the existing peaks.
  - With a node scope, the series, breakdowns and CSV endpoints reject the egress and ingress metrics and dimensions
    with `400`, and the summary leaves out their fields.
- **Analytics page:**
  - Every entity section starts with a pair in its section colour: the peak as an area chart ("Active …") and the
    volume per bucket as bars:
    - Rooms: "Active rooms" and "Rooms created".
    - Participants: "Active participants" and "Participant sessions".
    - Egress: "Active egress" and "Egress started".
    - Ingress: "Active ingress" and "Ingress sessions".
  - Then come the other charts of each section:
    - Participants: Connection success, Participant kind and Unique identities.
    - Egress: Egress ended by status and Egress type.
    - Ingress: Ingress input type.
  - Unique identities are always drawn per UTC day, requested at `1d` whatever the page granularity, as the
    hourly-only charts are requested at `1h`. The "Switch to 1 d" hint goes.
  - Section colours:
    - Rooms teal, Participants violet, Egress orange, Ingress blue.
    - Connection success is green. Failures stay red.
    - In the donuts, the slice of the section's main kind takes the section colour: Standard (participant kind),
      Room composite (egress type), RTMP (ingress input type). The kinds Egress and Ingress take their sections'
      colours.
  - The charts of a card use the fewest rows in which each chart is at least 420 px wide, spread evenly (four charts:
    4, 2 + 2 or 1 per row; three: 3, or 2 with the third spanning the row below). Every card with several charts uses
    this grid, PRO cards included.
  - With a node scope, the Egress and Ingress tiles and sections are shown unavailable, like the data a mediasoup
    node does not report. They carry a warning telling the user to select All nodes in Scope, and nothing of them is
    requested.
  - Connection success: the y-axis is fitted to the data instead of 0–100 %.
  - Every section's CSV exports its charts' series.
  - Info tips on Participant sessions, Active egress and Active ingress.
- **UI building blocks:** an unavailable state for breakdown charts.
- **Data generator:** writes the egress and ingress peaks, and keeps every egress and ingress counter and peak in the
  global scope.

Not in scope:
- Rooms ended per bucket and participant sessions aborted per bucket. Over a bucket, ended mirrors created, and the
  peak already shows what is open. Aborted sessions remain in Connection success.
- Ingress in the 5-minute rollups. It stays hourly-only, as decided for every ingress counter.
- Attributing egress and ingress to the media node that runs them.
- Backfilling peaks before the upgrade.
- Charts of other pages, such as the PRO room page. They keep their colours, apart from the new fixed slots of
  participant kinds, egress types and ingress input types, which follow the entity everywhere.
- The bandwidth and client breakdown charts, apart from the grid.

Edition: CE and PRO.
- Every edition gets the aggregator counts, the metrics and the page.
- PRO node scopes show Egress and Ingress as unavailable.
- PRO cards with several charts use the shared balanced grid.

Repositories:
- openvidu-livekit: `openvidu/analytics`, `README-openvidu.md` and `CHANGELOG-openvidu.md`.
- Dashboard CE: specs, typings and contract, backend, frontend library, data generator, `CHANGELOG.md`.
- Dashboard PRO: `ce.ref` move, the balanced grid in the PRO cards, and the node-scope e2e check.

CHANGELOG lines:
- `CHANGELOG.md`, 3.10.0 Analytics line (unreleased): "… with rooms, participants, egress and ingress sections that
  draw both the most active at once and the volume per bucket, client and data transferred sections; every section
  has its own colour, the charts of a card share its rows evenly, and unique identities show per UTC day at any
  granularity; egress and ingress are counted for the whole deployment only, …". It replaces "with rooms and
  participants (the most active at once in each bucket), client, data transferred, egress and ingress (with the input
  type) sections; every series of a chart has its own colour".
- `CHANGELOG-openvidu.md`:
  - the **Analytics aggregator** line becomes: "one node at a time samples every minute the rooms, participants,
    egress and ingress sessions active at once into the rollups, and computes the daily unique identities whatever
    `openvidu.analytics.reconciler.enabled`; metrics `openvidu_analytics_aggregator_*`."
  - the **New analytics data model** line gains: "egress and ingress are counted in the global rollups only".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-aggregator`: the active peaks also cover egress and ingress sessions, in the global scope only.
- `server-analytics-writer`: the node scope of a labelled server excludes the egress and ingress counters.
- `data-model`:
  - the rollups gain `egress.peakActive` (5-minute, hourly and daily) and `ingress.peakActive` (hourly and daily);
  - egress and ingress rollups exist in the global scope only;
  - the generated peaks cover egress and ingress, and the generated node scopes carry no egress or ingress.
- `analytics-api`:
  - the catalogue gains `egressPeakActive` and `ingressPeakActive`, now 22 CE metrics;
  - the hourly-only metrics include `ingressPeakActive`;
  - egress and ingress metrics, dimensions and summary values are global-only.
- `analytics-ui`:
  - the Rooms, Participants, Egress and Ingress sections draw the peak and volume pair;
  - the Participants section is replaced by one that always shows unique identities per UTC day;
  - the per-section CSV follows the charts, and the chart notes scenario names the new charts;
  - new requirements cover the section colours, the balanced chart grid and egress and ingress in a node scope.
- `ui-building-blocks`:
  - the chart palette gives the section entities and the main kinds their fixed slots;
  - a new balanced chart grid component;
  - fitted y-axis support for percentage charts;
  - an unavailable state for breakdown charts.
- `ui-info-tips`: the Analytics chart tips add Participant sessions, Active egress and Active ingress.

## Impact

- **openvidu-livekit `openvidu/analytics`:**
  - two more store counts in the aggregator, backed by the existing `egresses.status_startedAt` and
    `ingress_sessions.status` indexes;
  - `PeakIncrements` with the egress and ingress counts, global only;
  - egress and ingress rollup increments in the global scope only;
  - the rollup document structs.
- **Contract:**
  - optional fields only: `egress.peakActive` and `ingress.peakActive` in the rollups;
  - no schema version change: a dashboard reading an older writer shows gaps;
  - no new index.
- **Dashboard backend:**
  - two catalogue entries;
  - the node-scope validation of egress and ingress metrics and dimensions;
  - the summary without egress and ingress in a node scope.
- **Dashboard frontend library:**
  - the Analytics page template, plan, series labels and CSV exports;
  - the node-scope state of the Egress and Ingress tiles and sections;
  - the chart palette slots;
  - a new chart grid component;
  - the y-axis fit of percentage charts;
  - the unavailable breakdown chart;
  - the info texts.
- **PRO frontend:** its multi-chart cards adopt the chart grid. No PRO backend change.
- **Data generator and demo:** egress and ingress peaks, with node scopes free of egress and ingress.
- **MongoDB load:** two more indexed counts per minute over the open egresses and ingress sessions only, plus the
  same upserts per minute.
