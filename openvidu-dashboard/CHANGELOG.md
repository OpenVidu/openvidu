# Changelog

Newest release first. Sections appear in this order, omitting the empty ones: `Upgrade notes`,
`Breaking changes`, `Deprecated`, `Added`, `Improved`, `Fixed`. `Added`, `Improved` and `Fixed` group their
entries under `UI` (what an administrator sees), `Data` (what is stored and how it is queried) and
`Deployment` (running the service). One line per observable change, present tense.

## 3.10.0 (unreleased)

### Upgrade notes

- The first start after the upgrade migrates the existing analytics data in the background; the dashboard shows the
  progress. Legacy `events` is renamed `legacy_events` and expires with its TTL; `active_entities` and `last_alive` are
  removed.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are required: the dashboard no longer starts with built-in credentials.
- `LOG_LEVEL` defaults to `info` instead of `debug`, and `SERVER_PORT` to `5000` (the port every installer sets)
  instead of `3000`.
- The CE image builds from `dashboard-ce/docker/Dockerfile` with `openvidu-dashboard/` as context.
- The image runs as uid 1000: mounted configuration and certificate authority files must be readable by that user.
- Client IP addresses are no longer stored by default; set `openvidu.analytics.anonymize_ip: false` to store them.

### Breaking changes

- The server no longer writes the legacy `stats`, `active_entities` and `last_alive` collections nor events in the
  legacy document shape, and its Redis analytics sink is removed.
- The API moves to `/api/v1`; the unversioned routes and `POST /api/login` are removed.

### Deprecated

- `openvidu.analytics.expiration`: mapped to `retention.events` and `retention.stats`, which replace it.
- `openvidu.analytics.fixer_interval`: replaced by `openvidu.analytics.reconciler.interval`.

### Added

#### UI

- Sessions survive page reloads and expire after 7 days without use; access tokens are never stored in the browser.
- Responsive shell with sidenav, global search, global time range, auto-refresh at every screen size and theme toggle;
  the OpenVidu version, edition badge and documentation links sit at the bottom of the sidenav.
- Server status banners on every page: no analytics data received, schema and migration progress; they follow the
  server even with auto-refresh off, and the connectivity and no-data banners appear only after two bad results in a
  row.
- The LIVE label reads paused while auto-refresh is off and stale when data stops arriving, judged with the writer's
  batch interval, and keeps its width in every state.
- Auto-refresh offers one interval for every live view; a page that cannot refresh now, such as an ended room, shows
  why on the disabled interval control, and Analytics refreshes only on demand.
- Every list, chart and detail view is reproducible from its URL; Back restores filters, sort and page. The time zone
  picked in the range picker or the header zone chip applies to every page of the session.
- The range picker warns while the start of the range predates the retention of the page's data: entities on the
  lists, daily rollups on Analytics.
- Lists share one search box with hints; an exact ID shows its entity whatever the range and filters, and Enter opens
  it. Empty lists offer Clear filters and Widen range, and an unknown ID says so.
- Tables show every selected column and scroll sideways when they do not fit, turn into cards only on phones, keep
  their rows while they refresh and show skeletons only before their first data.
- Enum values read as friendly labels, durations count up live and charts update in place without replaying their
  animation; every time-series chart names its bucket and time zone.
- Info icons next to tiles, cards, charts and columns explain the terms they show, such as participant sessions and
  unique identities; they open on hover, keyboard focus or a tap.
- PRO features appear locked in CE with a short explanation and a link.
- Settings page with viewer preferences (any time zone as the default) and an About tab with the OpenVidu version, the
  migration progress while it runs, the retention per data class and the storage.
- KPI tiles spread evenly over the fewest rows that fit, on every page.
- Light and dark themes meeting WCAG AA, self-hosted fonts and icons.
- Rooms list with status, name or SID and feature filters, sorts by start, end, duration, unique identities and
  active participants, summary tiles and live refresh.
- Participants page with live refresh: active participants, sessions in range and active services; search participant
  sessions by identity or SID, filter by kind (standard participants by default), status, room and publishers, sort
  by join, leave and duration, and see the sources each session published.
- Agents page listing agent sessions with a live counter and the agent sessions of the range, searchable by identity
  and sortable by join, leave and duration.
- Egress list searchable by room name or egress ID, with type, status and room filters, sorts by start, end and
  duration, summary tiles and live refresh.
- Ingress list of the ingresses created, used or publishing in the range, searchable by name or ID, with input type and
  status filters, sorts by creation, total duration, sessions and last session, summary tiles and live refresh.
- Analytics page with rooms, participants, client, data transferred, egress and ingress (with the input type)
  sections over the global range, loaded on demand, with CSV export; every series of a chart has its own colour, and
  a section without data shrinks to its "No data in this range" message.
- Overview page with live counters of rooms, participants, publishers, egress, ingress and agents linked to their
  lists, today's figures, recent rooms, the data pipeline health (writer and nodes reporting) and stale-data notices.

#### Data

- New analytics data model: one document per room session, participant session, published track, subscription,
  egress, ingress and ingress session, plus raw events, statistics time series and 5-minute, hourly and daily
  rollups, with a schema version that the server and the dashboard check at startup.
- The server writes the new analytics model in idempotent per-node batches, with a retention per data class.
- `openvidu.analytics` options `retention` (per data class, in days: `events`, `stats`, `tracks` and `rollups_5min`
  7 days, `entities` 90 days, `rollups_hourly` 400 days and `rollups_daily`, unlimited unless set), `stats_detail`,
  `anonymize_ip`, `store_metadata`, `events.store_types`, `queue` and `validation_action`.
- API calls to the server are counted per method in the hourly and daily rollups.
- Hourly and daily rollups count ingress sessions by input type.
- Each server node records its analytics batch interval with every heartbeat.
- Egress documents carry their room name in lower case, indexed for the room name search; ingress definitions are
  indexed by the start of their last session.
- Participant counts, sessions, minutes, unique identities and client breakdowns count standard participants only;
  egress, ingress, agent and SIP sessions are counted apart, by kind.
- Participants, tracks and subscriptions left by a crashed or stopped server node are closed by the server within 2
  minutes, and their rooms with the last of their sessions once LiveKit's dead node cleanup released them, with an end
  time accurate to 30 s (`openvidu.analytics.reconciler` options `enabled`, `interval` and `max_closures_per_run`).
- A recording lost with its node is reported as failed, never as complete.
- Legacy analytics data is migrated to the v2 model automatically.
- Lists sort by metrics (durations, end times, counters) within a range limit reported by `GET /api/v1/info`, an exact
  ID always finds its entity whatever the range and filters, and active rooms and participants carry a `stale` flag.
- Rooms API: `/api/v1/rooms` and `/rooms/summary`, with rooms sorted by start, end, duration, unique identities and
  active participants.
- Participants API: `/api/v1/participants`, `/participants/summary` and `/api/v1/agents` with search, with sessions
  sorted by join, leave and duration, filtered by publishers and listing their published sources.
- Egress API: `/api/v1/egresses` and `/egresses/summary`, with egresses sorted by start, end and duration and searched
  by their own room name.
- Ingress API: `/api/v1/ingresses` and `/ingresses/summary`, where the range selects the ingresses created, used or
  publishing in it, sorted by creation, total duration, sessions or last session.
- Analytics API: `/api/v1/analytics/series`, `/breakdowns`, `/summary` and `/export.csv`, read from the rollup
  collections, ingress sessions, their durations and their input types included.
- Overview API: `GET /api/v1/overview` with live counters, today's totals and recent rooms.
- Status API: `GET /api/v1/status` with the schema status, migration progress, writer health and the writer's batch
  interval, from which the writer, node and stale-data windows widen for slow batches.

#### Deployment

- `openvidu.analytics.migration.*` settings control the migration.
- Analytics durations accept days (`7d`, `1d12h`), and the server refuses to start on a retention above the MongoDB TTL
  limit, an entity retention under 2 days or a daily rollup retention shorter than the hourly one, naming the key.
- The server logs a warning when a full analytics queue drops entries, at most once per queue and batch interval.
- `DATABASE_TLS_CA_FILE` trusts a private certificate authority for external MongoDB services such as Amazon
  DocumentDB.
- The dashboard refuses to start (exit code 3) against an OpenVidu server whose analytics schema is older than it
  supports, and reports a newer or uninitialized schema in `GET /api/v1/info`.
- The backend entry accepts a `healthcheck` argument for container health checks, and the image declares a Docker
  `HEALTHCHECK` with it.
- `GET /api/v1/health` and `GET /api/v1/ready` probes.
- Login is rate limited per IP (10 failed attempts per 15 minutes).
- Settings `DASHBOARD_JWT_SECRET`, `DASHBOARD_REFRESH_TOKEN_TTL`, `DASHBOARD_COOKIE_SECURE`, `DASHBOARD_TRUST_PROXY`,
  `DASHBOARD_BASE_PATH`, `DASHBOARD_LIST_TOTAL_MAX_RANGE` and `DASHBOARD_ANALYTICS_CACHE_TTL`.

### Improved

#### Data

- Analytics events and statistics queued in a node are written before it stops on a graceful shutdown.
- Credentials are never stored in the analytics database; metadata is stored only with `store_metadata`, and client
  IP addresses are left out unless `anonymize_ip: false`.

#### Deployment

- On `SIGTERM` the dashboard closes its connections and exits within 5 seconds, also while it is still starting.
- Smaller image without time zone data, on `node:24-trixie-slim`.

### Fixed

#### UI

- The node filter of the Rooms list is shown locked in CE instead of hidden.
