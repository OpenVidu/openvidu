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

### Added

#### UI

- Overview page with live counters of rooms, participants, publishers, egress, ingress and agents linked to their
  lists, today's figures, recent rooms and the health of the data pipeline (last batch, or when the server stopped).
- Participants page with live refresh: active participants, sessions in range and active services; search participant
  sessions by identity or SID, filter by kind (standard participants by default), status, room and publishers, sort by
  join, leave and duration, and see the sources each session published.
- Agents page with live refresh: agent sessions with their agent name, a tag on the agents of the official OpenVidu
  collection and a filter by origin (OpenVidu or third-party), searchable by identity or SID and sortable by join,
  leave and duration.
- One time range for every page, with presets, custom ranges and any time zone; the range picker warns while the start
  of the range predates the retention of the page's data.
- Every list, chart and detail view is reproducible from its URL, and Back restores filters, sort and page.
- Global search, and a search box on every list: an exact ID shows its entity whatever the range and filters, and
  Enter opens it. Empty lists offer Clear filters and Widen range.
- Every list exports what it shows as CSV, across all its pages, up to 10,000 rows.
- Banners on every page when no analytics data arrives, when the server's data is of another schema version and
  while a data migration runs, with its progress.
- A LIVE label on live pages, which reads paused while auto-refresh is off and stale when data stops arriving.
- Rooms, participants, egress and ingress sessions that the server closed because their end never arrived read as
  closed with an estimated end time.
- Settings page with the viewer's preferences (theme, time zone, time range, rows per page and auto-refresh) and a
  Data tab: the retention and storage of each class of data and of its collections, an estimate of the size of the
  classes that have not reached their retention yet, the migration progress, and the analytics data of versions before
  3.10 with the date until which the server keeps it for a rollback.
- Deletion of stored analytics data from the Data tab of Settings: one class, every class or the data before 3.10,
  after a confirmation, as a background job with its progress, a banner on every page and a notice at its end. Data in
  progress is kept, and each deleted class shows when it was deleted and the space MongoDB keeps free for new data,
  with how to free that disk space.
- PRO features appear locked in CE with a short explanation and a link.

#### Data

- The dashboard reads the analytics data model of OpenVidu Server 3.10 (rooms, participant sessions, tracks, egress,
  ingress, events, statistics and rollups) instead of the stored events of previous versions.

#### Deployment

- The CE dashboard is open source, in `openvidu-dashboard/` of the OpenVidu repository, with its image build and tests.
- `DATABASE_TLS_CA_FILE` trusts a private certificate authority for external MongoDB services.
- The dashboard refuses to start (exit code 3) against an OpenVidu server whose analytics schema is older than it
  supports.
- The image declares a Docker `HEALTHCHECK`.
- Login is rate limited per IP (10 failed attempts per 15 minutes).
- Settings `DASHBOARD_JWT_SECRET`, `DASHBOARD_REFRESH_TOKEN_TTL`, `DASHBOARD_COOKIE_SECURE`, `DASHBOARD_TRUST_PROXY`,
  `DASHBOARD_BASE_PATH`, `DASHBOARD_LIST_TOTAL_MAX_RANGE` and `DASHBOARD_ANALYTICS_CACHE_TTL`.

### Improved

#### UI

- Sign-in sessions survive page reloads and expire after 7 days without use, with no credential or access token
  stored in the browser.
- The shell works at every screen size, with the OpenVidu version, the edition badge and a documentation link at the
  bottom of the sidenav.
- The Rooms list covers any range instead of the active rooms and those closed in the last 28 days, with status, name
  or SID and feature filters, sorts by start, end, duration, unique identities and active participants, summary tiles
  and live refresh.
- Egress and ingress get a list each instead of one shared page, both with summary tiles and live refresh. Egress:
  searchable by room name or egress ID, with type, status and room filters and sorts by start, end and duration.
  Ingress: the ingresses created, used or publishing in the range, searchable by name or ID, with input type and status
  filters and sorts by creation, total duration, sessions and last session.
- Analytics covers any range instead of four fixed periods, at a granularity from 5 minutes to 1 day, with rooms,
  participants, client, data transferred, egress and ingress sections: the most active at once and the volume over
  time, the topology of the ended rooms (1:1, 1:N, N:M…), their size and the share recorded. Each section exports as
  an Excel workbook.
- Auto-refresh offers one interval for every live view; a page that cannot refresh, such as an ended room, says why.
- Tables let the viewer choose their columns, scroll sideways when they do not fit, turn into cards on phones and
  keep their rows while they refresh.
- Enum values read as friendly labels, durations count up live, charts update in place and every time-series chart
  names its bucket and time zone.
- Light and dark themes meet WCAG AA, with self-hosted fonts and icons.

#### Data

- Participant counts, sessions, minutes, unique identities and client breakdowns count standard participants only;
  egress, ingress, agent and SIP sessions are counted apart, by kind.

#### Deployment

- The image runs on Node.js 26 (LTS).
