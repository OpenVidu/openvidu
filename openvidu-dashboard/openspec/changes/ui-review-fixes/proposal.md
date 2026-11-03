# Proposal

## Why

A review against a real deployment, with OpenVidu Meet rooms, CLI participants, every egress output kind and an RTMP
ingress, found shared UI pieces showing values the data does not hold. Short-range charts repeat their time labels,
count charts tick at half participants and step lines drop their last bucket. Skeletons flash on fast loads, and ended
durations are truncated. About leaves most "oldest" cells empty and has no total. The Analytics room averages blame the
server version when no room has ended yet.

## What Changes

- **Time-series charts:**
  - x-axis ticks are never closer than the unit their labels show (one minute for `HH:mm`, one day for `MM-dd`), so a
    label never repeats;
  - the y-axis ticks at whole numbers when every value of the chart is an integer;
  - a step series holds its last value until the end of the range, so the last bucket is drawn.
- **Skeletons** keep the space of what they replace but stay invisible for their first 300 ms: a fast response shows
  no flash.
- **Durations:** ended durations are rounded to the smallest unit they show (2.7 s reads "3 s"); running durations
  keep counting whole elapsed units.
- **About storage:**
  - a Total row with the documents and size of every listed collection;
  - the oldest document of every collection whose time field leads an index or that holds one document per node:
    participants, egresses, ingress sessions, daily rollups and nodes, besides the ones shown today;
  - `GET /api/v1/info` reports those dates;
  - tracks, subscriptions and stats keep "—" with a tooltip that says why.
- **Footer:** the version is plain text, no longer a link to About.
- **Analytics room averages:** with no room ended in the range, the Average room size and Average room duration tiles
  hint "No room ended in this range". "Not provided by this server version" stays for a range with ended rooms and no
  average.
- **Egress page:** the "Recorded time" tile becomes "Total duration", with an info tip: from each egress request to
  its end, failed ones included.
- **Client labels:**
  - browser keys show friendly labels (Chrome, Firefox, Safari, Edge, Other), and the key `none` reads "No browser";
  - a shared label maps a reported OS to its family label (`linux` reads "Linux") for every page that shows the raw
    value.
- **Global search:** an exact track ID (`TR_` prefix) shows "Open track <ID>" and opens the track route, locked in CE
  like the other detail routes.

Scope excludes the following:
- The writer and contract side (the `none` browser key, the ingress session's room, the egress status history):
  change `writer-review-fixes`.
- Column widths of tables at 1440 px (backlog).
- The Average room size rounding: it stays a whole number of participants.

Edition: CE. Repository: the dashboard (backend info service, UI library, specs).

CHANGELOG lines: none. These views have not shipped in a release, and the 3.10 lines already describe them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-building-blocks`: chart axes and last step, skeleton delay, rounded durations, track IDs in the global search
  and OS and browser labels.
- `settings-about`: the storage table's Total row and its oldest cells.
- `editions-info`: the oldest document of the collections whose time field is indexed.
- `ui-shell`: the footer version is plain text, and the track route is locked in CE.
- `analytics-ui`: the room averages' hint without ended rooms, and the browser donut's labels.
- `egress-ui`: the Total duration tile.

## Impact

- Backend: `info/info-service.ts` (a time field per collection, the `{ scope, bucket }` index of the daily rollups),
  its unit and integration tests.
- UI library:
  - `charts/chart-options.ts`;
  - `components/feedback/skeleton.ts`;
  - `format/formatters.ts` and `components/duration/`;
  - `format/labels.ts` (browser labels, OS label function);
  - the global search, `shell/sidenav-footer.ts`, the About tab, the Analytics page and the Egress page;
  - `routes.ts` (the locked `tracks/:trackSid` route);
  - unit and e2e tests.
- No API shape change: `storage.<collection>.oldest` already exists.
