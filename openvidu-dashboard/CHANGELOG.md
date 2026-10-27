# Changelog

Newest release first; each release lists its changes against the previous one. Sections appear in this order,
omitting the empty ones: `Upgrade notes`, `Breaking changes`, `Deprecated`, `Added`, `Improved`, `Fixed`. `Added`,
`Improved` and `Fixed` group their entries under `UI` (what an administrator sees), `Data` (what is stored and how it is
queried) and `Deployment` (running the service). One line per observable change, present tense.

## 3.10.0 (unreleased)

### Upgrade notes

- The first start after the upgrade migrates the existing analytics data in the background; the dashboard shows the
  progress. Legacy `events` is renamed `legacy_events` and expires with its TTL; `active_entities` and `last_alive` are
  removed.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are required: the dashboard no longer starts with built-in credentials.
- `LOG_LEVEL` defaults to `info` instead of `debug`, and `SERVER_PORT` to `5000` (the port every installer sets)
  instead of `3000`.
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

- Overview page with live counters of rooms, participants, publishers, egress, ingress and agents linked to their
  lists, today's figures, recent rooms, the data pipeline health (writer and nodes reporting) and stale-data notices.
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
- Server status banners on every page: no analytics data received, schema and migration progress; they follow the
  server even with auto-refresh off, and the connectivity and no-data banners appear only after two bad results in a
  row.
- A LIVE label that reads paused while auto-refresh is off and stale when data stops arriving, judged with the writer's
  batch interval.
- Info icons next to tiles, cards, charts and columns explain the terms they show, such as participant sessions and
  unique identities; they open on hover, keyboard focus or a tap.
- Settings page with viewer preferences (any time zone as the default) and an About tab with the OpenVidu version, the
  migration progress while it runs, the retention per data class and the storage.
- PRO features appear locked in CE with a short explanation and a link.

#### Data

- New analytics data model: one document per room session, participant session, published track, subscription,
  egress, ingress and ingress session, plus raw events, statistics time series and 5-minute, hourly and daily rollups
  (API calls by method, ingress sessions by input type), with a schema version that the server and the dashboard check
  at startup.
- The server writes the analytics model in idempotent per-node batches, with a retention per data class.
- `openvidu.analytics` options `retention` (per data class, in days: `events`, `stats`, `tracks` and `rollups_5min`
  7 days, `entities` 90 days, `rollups_hourly` 400 days and `rollups_daily`, unlimited unless set), `stats_detail`,
  `anonymize_ip`, `store_metadata`, `events.store_types`, `queue` and `validation_action`.
- Legacy analytics data is migrated to the new model automatically.
- Versioned API under `/api/v1`: rooms, participants and agents, egress and ingress lists with their summaries, sorted
  by metrics (durations, end times, counters) within a range limit reported by `GET /api/v1/info`; an exact ID always
  finds its entity whatever the range and filters, and active rooms and participants carry a `stale` flag.
- Analytics API: `/api/v1/analytics/series`, `/breakdowns`, `/summary` and `/export.csv`, read from the rollup
  collections.
- Overview API: `GET /api/v1/overview` with live counters, today's totals and recent rooms.
- Status API: `GET /api/v1/status` with the schema status, migration progress, writer health and the writer's batch
  interval, from which the writer, node and stale-data windows widen for slow batches.
- API reference outside production: an OpenAPI 3.1 document at `/api/v1/docs/openapi.json` and a browsable page at
  `/api/v1/docs`, with operation IDs, described parameters and every error response.

#### Deployment

- The CE dashboard is open source, in `openvidu-dashboard/` of the OpenVidu repository, with its image build and tests.
- `openvidu.analytics.migration.*` settings control the migration.
- Analytics durations accept days (`7d`, `1d12h`), and the server refuses to start on a retention above the MongoDB TTL
  limit, an entity retention under 2 days or a daily rollup retention shorter than the hourly one, naming the key.
- The server logs a warning when a full analytics queue drops entries, at most once per queue and batch interval.
- `DATABASE_TLS_CA_FILE` trusts a private certificate authority for external MongoDB services such as Amazon
  DocumentDB.
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
- Analytics covers any range instead of four fixed periods, loads on demand and exports CSV, with rooms, participants,
  client, data transferred, egress and ingress (with the input type) sections; every series of a chart has its own
  colour, and a section without data shrinks to its "No data in this range" message.
- Auto-refresh offers one interval for every live view; a page that cannot refresh now, such as an ended room, shows
  why on the disabled interval control.
- Tables show every selected column and scroll sideways when they do not fit, turn into cards only on phones, keep
  their rows while they refresh and show skeletons only before their first data.
- Enum values read as friendly labels, durations count up live and charts update in place; every time-series chart
  names its bucket and time zone.
- Light and dark themes meet WCAG AA, with self-hosted fonts and icons.

#### Data

- Participant counts, sessions, minutes, unique identities and client breakdowns count standard participants only;
  egress, ingress, agent and SIP sessions are counted apart, by kind.
- Participants, tracks and subscriptions left by a crashed or stopped server node are closed within 2 minutes, and
  their rooms with the last of their sessions once LiveKit's dead node cleanup released them, with an end time accurate
  to 30 s (`openvidu.analytics.reconciler` options `enabled`, `interval` and `max_closures_per_run`); a recording lost
  with its node is reported as failed.
- Analytics events and statistics queued in a node are written before it stops on a graceful shutdown.
- Credentials are never stored in the analytics database; metadata is stored only with `store_metadata`, and client
  IP addresses are left out unless `anonymize_ip: false`.
