# Changelog

Newest release first; each release lists its changes against the previous one. Sections, in this order and omitting
the empty ones: `Upgrade notes`, `Breaking changes`, `Deprecated`, `Added`, `Improved`, `Fixed` (what an
administrator notices) and `Internal` (what they do not).

## 3.10.0 (unreleased)

### Upgrade notes

- The dashboard reads the analytics data model of OpenVidu Server 3.10 and shows the progress while the server
  migrates the data of previous versions.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are required: there are no built-in credentials.
- `LOG_LEVEL` defaults to `info` (was `debug`) and `SERVER_PORT` to `5000` (was `3000`).
- The image runs as uid 1000: mounted configuration and certificate authority files must be readable by that user.
- MongoDB is required: Amazon DocumentDB is not supported.

### Added

- Overview page: live counters of rooms, participants, publishers, egress, ingress and agents, today's figures, recent
  rooms and the health of the data pipeline.
- Participants and Agents pages, live, searchable by identity or SID, with filters and sorts. Agents of the official
  OpenVidu collection are tagged.
- One time range for every page, with presets, custom ranges and any time zone; it warns when it starts before the
  retention of the page's data.
- Every list, chart and detail view is reproducible from its URL, and Back restores filters, sort and page.
- Global search and a search box on every list: an exact ID opens its entity whatever the range and filters.
- CSV export of every list, up to 10,000 rows.
- Banners when no analytics data arrives, when the server's schema version differs and while a data migration runs.
  Live pages carry a LIVE label that reads paused or stale.
- Rooms and sessions that the server closed without receiving their end read as closed, with an estimated end time.
- Settings page: the viewer's preferences (theme, time zone, time range, rows per page, auto-refresh) and a Data tab
  with the retention and size of each class of data, the migration progress and the pre-3.10 data kept for a
  rollback.
- Settings → Data deletes stored analytics data (one class, all of them or the pre-3.10 data) in the background, with
  its progress on every page. Data in progress is kept.
- PRO features appear locked in CE, with a short explanation and a link.
- Settings `DASHBOARD_CONFIG_PATH` (a `KEY=value` file read at startup; the environment wins),
  `DATABASE_TLS_CA_FILE` (a private certificate authority for external MongoDB), `DASHBOARD_JWT_SECRET`,
  `DASHBOARD_REFRESH_TOKEN_TTL`, `DASHBOARD_COOKIE_SECURE`, `DASHBOARD_TRUST_PROXY`, `DASHBOARD_BASE_PATH`,
  `DASHBOARD_LIST_TOTAL_MAX_RANGE` and `DASHBOARD_ANALYTICS_CACHE_TTL`.
- The dashboard refuses to start (exit code 3) against a server whose analytics schema is older than it supports.
- Login is rate limited to 10 failed attempts per IP every 15 minutes.
- The image declares a Docker `HEALTHCHECK`.

### Improved

- Sign-in sessions survive page reloads and expire after 7 days without use; the browser stores no credential or
  access token.
- The layout works at every screen size, with the version, the edition and a documentation link in the sidenav.
- Rooms list: any range (it showed the active rooms and those closed in the last 28 days), filters, sorts, summary
  tiles and live refresh.
- Egress and ingress get a list each instead of a shared page, with search, filters, sorts, summary tiles and live
  refresh.
- Analytics: any range instead of four fixed periods, at a granularity from 5 minutes to 1 day, with rooms,
  participants, client, data transferred, egress and ingress sections, the topology of the ended rooms (1:1, 1:N,
  N:M…) and an Excel export per section.
- Tables let the viewer choose columns, scroll sideways, turn into cards on phones and keep their rows while they
  refresh. Values read as friendly labels, durations count up live and charts update in place.
- Participant counts and minutes cover standard participants only; egress, ingress, agent and SIP sessions are counted
  apart.
- Light and dark themes meet WCAG AA, with self-hosted fonts and icons.

### Internal

- The dashboard is rewritten: the CE edition is open source, in `openvidu-dashboard/` of the OpenVidu repository, and
  the PRO edition builds on it.
- Node.js 26 (LTS), Angular 22 and ECharts 6.
- CI runs unit, integration, image and end-to-end tests (with accessibility checks in both themes), and checks the
  data model contract against the server that writes the analytics data.
- A demo data generator writes realistic single node and multi-node data.
