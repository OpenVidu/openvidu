# Changelog

Newest release first; each release lists its changes against the previous one. Sections appear in this order,
omitting the empty ones: `Upgrade notes`, `Breaking changes`, `Deprecated`, `Added`, `Improved`, `Fixed`. `Added`,
`Improved` and `Fixed` group their entries under `UI` (what an administrator sees), `Data` (what is stored and how it is
queried) and `Deployment` (running the service). One line per observable change, present tense.

## 3.10.0 (unreleased)

### Upgrade notes

- The dashboard reads the analytics data model that OpenVidu Server 3.10 writes. While the server migrates the data
  of previous versions in the background, the dashboard shows the progress.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are required: the dashboard no longer starts with built-in credentials.
- `LOG_LEVEL` defaults to `info` instead of `debug`, and `SERVER_PORT` to `5000` (the port every installer sets)
  instead of `3000`.
- The image runs as uid 1000: mounted configuration and certificate authority files must be readable by that user.
- The dashboard requires MongoDB: Amazon DocumentDB is not supported.

### Breaking changes

- The API moves to `/api/v1`; the unversioned routes and `POST /api/login` are removed.

### Added

#### UI

- Overview page with live counters of rooms, participants, publishers, egress, ingress and agents linked to their
  lists, today's figures, recent rooms, the data pipeline health (last batch, or when the server stopped) and stale-data
  notices.
- Participants page with live refresh: active participants, sessions in range and active services; search participant
  sessions by identity or SID, filter by kind (standard participants by default), status, room and publishers, sort by
  join, leave and duration, and see the sources each session published.
- Agents page listing agent sessions with a live counter and the agent sessions of the range, searchable by identity
  and sortable by join, leave and duration.
- One time range for every page, with presets, custom ranges and any time zone; the range picker warns while the start
  of the range predates the retention of the page's data.
- Every list, chart and detail view is reproducible from its URL; Back restores filters, sort and page, and the time
  zone picked in the range picker or the header zone chip applies to every page of the session.
- Global search, and one search box with hints on every list: an exact ID shows its entity whatever the range and
  filters, and Enter opens it. Empty lists offer Clear filters and Widen range, and an unknown ID says so.
- Every list exports what it shows as CSV, across all its pages, up to 10,000 rows.
- Server status banners on every page: no analytics data received, schema and migration progress; they follow the
  server even with auto-refresh off, and the connectivity and no-data banners appear only after two bad results in a
  row.
- A LIVE label that reads paused while auto-refresh is off and stale when data stops arriving, judged with the writer's
  batch interval.
- Info icons next to tiles, cards, charts and columns explain the terms they show, such as participant sessions and
  unique identities; they open on hover, keyboard focus or a tap.
- Data that servers running mediasoup do not generate shows a warning icon that explains why. Its tiles and charts stay
  in place, dimmed when the range or entity has no media statistics at all.
- Rooms, participants, egress and ingress sessions that the server closed because their end never arrived read as
  closed with an estimated end time.
- Settings page with viewer preferences (any time zone as the default) and an About tab with the OpenVidu version, the
  migration progress while it runs, the retention per data class and the storage.
- PRO features appear locked in CE with a short explanation and a link.

#### Data

- The dashboard reads the analytics data model of OpenVidu Server 3.10 (rooms, participant sessions, tracks, egress,
  ingress, events, statistics and rollups), whose schema version it checks at startup.
- Versioned API under `/api/v1`: rooms, participants and agents, egress and ingress lists with their summaries and CSV
  exports, sorted by metrics (durations, end times, counters) within a range limit reported by `GET /api/v1/info`; an
  exact ID always finds its entity whatever the range and filters, and active rooms and participants carry a `stale`
  flag.
- Analytics API: `/api/v1/analytics/series`, `/breakdowns`, `/summary` and `/export.csv`, read from the rollup
  collections.
- Overview API: `GET /api/v1/overview` with live counters, today's totals and recent rooms.
- Status API: `GET /api/v1/status` with the schema status, migration progress, writer health and the writer's batch
  interval, from which the writer, node and stale-data windows widen for slow batches.
- API reference outside production: an OpenAPI 3.1 document at `/api/v1/docs/openapi.json` and a browsable page at
  `/api/v1/docs`, with operation IDs, described parameters and every error response.

#### Deployment

- The CE dashboard is open source, in `openvidu-dashboard/` of the OpenVidu repository, with its image build and tests.
- `DATABASE_TLS_CA_FILE` trusts a private certificate authority for external MongoDB services.
- The dashboard refuses to start (exit code 3) against an OpenVidu server whose analytics schema is older than it
  supports, and reports a newer or uninitialized schema in `GET /api/v1/info`.
- The image declares a Docker `HEALTHCHECK`, through the `healthcheck` argument of the backend entry.
- `GET /api/v1/health` and `GET /api/v1/ready` probes.
- Login is rate limited per IP (10 failed attempts per 15 minutes).
- Settings `DASHBOARD_JWT_SECRET`, `DASHBOARD_REFRESH_TOKEN_TTL`, `DASHBOARD_COOKIE_SECURE`, `DASHBOARD_TRUST_PROXY`,
  `DASHBOARD_BASE_PATH`, `DASHBOARD_LIST_TOTAL_MAX_RANGE` and `DASHBOARD_ANALYTICS_CACHE_TTL`.

### Improved

#### UI

- Sign-in sessions survive page reloads and expire after 7 days without use, with no credential or access token
  stored in the browser.
- The shell works at every screen size, with the OpenVidu version, the edition badge and documentation links at the
  bottom of the sidenav.
- The Rooms list covers any range instead of the active rooms and those closed in the last 28 days, with status, name
  or SID and feature filters, sorts by start, end, duration, unique identities and active participants, summary tiles
  and live refresh.
- Egress and ingress get a list each instead of one shared page. Egress: searchable by room name or egress ID, with
  type, status and room filters and sorts by start, end and duration. Ingress: the ingresses created, used or
  publishing in the range, searchable by name or ID, with input type and status filters and sorts by creation, total
  duration, sessions and last session. Both with summary tiles and live refresh.
- Analytics covers any range instead of four fixed periods, loads on demand, exports each section as an Excel workbook
  with a sheet per resolution and per breakdown, with rooms, participants, egress and ingress sections that draw both
  the most active at once and the volume per bucket, the topology of the ended rooms (1:1, 1:N, N:M…), their size and
  the share recorded, client and data transferred sections; every section has its own colour, the charts of a card share
  its rows evenly, unique identities show per UTC day at any granularity, and a section without data shrinks to its
  "No data in this range" message.
- Auto-refresh offers one interval for every live view; a page that cannot refresh now, such as an ended room, shows
  why on the disabled interval control.
- Tables let the viewer choose their columns, scroll sideways when they do not fit, turn into cards on phones, keep
  their rows while they refresh and show skeletons only before their first data.
- Enum values read as friendly labels, durations count up live and charts update in place; every time-series chart
  names its bucket and time zone.
- The kind, type and input tags of the lists carry the colour of their Analytics charts.
- Light and dark themes meet WCAG AA, with self-hosted fonts and icons.
- The list tiles say which figures are current ("active now") and which follow the range ("in range"), current ones
  first.
- Data transferred tiles, chart and column explain what up and down mean.

#### Data

- Participant counts, sessions, minutes, unique identities and client breakdowns count standard participants only;
  egress, ingress, agent and SIP sessions are counted apart, by kind.

#### Deployment

- The image runs on Node.js 26 (LTS).
