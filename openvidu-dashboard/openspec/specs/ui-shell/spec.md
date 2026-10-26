# ui-shell Specification

## Purpose
The application frame shared by every page of the dashboard: routes and navigation, header controls, URL-driven
state, viewer preferences, session handling in the browser, locked PRO presentation, visual system and the
keyboard, responsive and accessibility rules that every page inherits.

## Requirements

### Requirement: Route configs with navigation metadata
Edition: CE. The UI library SHALL export its routes as route configs whose navigation metadata (label, icon, path,
order, feature key, live-capable, range-scoped, timed, retention) drives the sidenav, the header controls and the
breadcrumbs. A shell composes routes from one or more config arrays; a later array replaces an earlier route with the
same path and keeps the metadata keys it does not set. The shells SHALL contain no page logic.

#### Scenario: CE shell composes the library routes
- **GIVEN** the CE shell provides the library route configs
- **WHEN** the application starts
- **THEN** the sidenav lists Overview, Analytics, Rooms, Participants, Agents, Egress, Ingress and Settings in this order, each with its icon and route

#### Scenario: Later config overrides a route by path
- **GIVEN** a shell composes the CE configs followed by a config that declares `/rooms/:roomSid`
- **WHEN** the user opens `/rooms/RM_ab12cd`
- **THEN** the component of the later config renders and the navigation metadata of the entry is preserved

### Requirement: Sidenav modes by breakpoint
Edition: CE. The sidenav SHALL follow the Material CDK breakpoints: Large and XLarge use side mode expanded to 240 px
with a stored option to pin it as a 72 px rail; Medium uses a 72 px rail with tooltips that the burger expands as an
overlay; Small and XSmall use an over-mode drawer closed by default. The entry of the current section is marked visually
and with `aria-current="page"`, on its list and on every detail page under it, whatever the query parameters.

#### Scenario: Rail pinned on desktop
- **GIVEN** a Large viewport
- **WHEN** the user pins the sidenav as a rail
- **THEN** entries show icons with tooltips, the choice persists across reloads and the sidenav is in side mode

#### Scenario: Drawer on a phone
- **GIVEN** an XSmall viewport
- **WHEN** the user taps the burger
- **THEN** the drawer opens over the content, shows the entries and the sidenav footer, and closes on Escape or on selecting an entry

#### Scenario: Detail page keeps its section
- **GIVEN** the Rooms entry links to `/rooms?from=now-24h&to=now&tz=UTC`
- **WHEN** the user opens `/rooms/RM_ab12cd`, whose URL carries no range
- **THEN** Rooms is marked as the current entry

### Requirement: Header controls

Edition: CE. The header SHALL show, left to right: burger, logo and product name linking to Overview, global search
(≤ 400 px wide), the time range picker on range-scoped routes or the zone chip on other unlocked timed pages, refresh
control (only on live-capable routes whose page registered a refresh scheduler, none on a locked page), theme toggle and
user menu (username, Settings, Sign out), the last three vertically aligned, equally spaced.

#### Scenario: Header on a detail route without range
- **GIVEN** the route metadata is neither range-scoped nor live-capable
- **WHEN** the page renders
- **THEN** the picker and the refresh control are hidden and the other controls are shown

#### Scenario: Header collapses on narrow viewports
- **GIVEN** an XSmall viewport
- **WHEN** the header renders
- **THEN** it shows a brand row (burger, logo, search icon, overflow menu) and a second row with the range preset, or
  the zone chip on a timed page without the picker, and the compact refresh control, with theme and user actions in the
  overflow menu

#### Scenario: Wide header keeps the search compact
- **GIVEN** an XLarge viewport
- **WHEN** the header renders
- **THEN** the search field is at most 400 px wide and the remaining width stays free between it and the controls

#### Scenario: Locked page
- **GIVEN** the CE edition
- **WHEN** `/rooms/RM_ab12cd` renders its full-page lock
- **THEN** the header shows neither the range picker, nor the zone chip, nor a refresh control

#### Scenario: Analytics
- **WHEN** Analytics renders
- **THEN** the header shows the range picker and a refresh control with only the refresh button and the update time

#### Scenario: Aligned controls
- **GIVEN** a Large viewport on the Rooms page
- **WHEN** the header renders
- **THEN** the refresh button, the interval button, the theme toggle and the user menu button are centred on one line with the same spacing between them

#### Scenario: Overview
- **WHEN** Overview renders
- **THEN** the header shows the zone chip with the session zone and the refresh control, and no range picker

### Requirement: Retention of range-scoped pages
Edition: CE. Every range-scoped route SHALL name in its metadata the retention of its data among those of
`GET /api/v1/info`, and the header SHALL give it to the range picker on every viewport: the entity retention on Rooms,
Participants, Agents, Egress and Ingress, the daily rollup retention on Analytics.

#### Scenario: Lists
- **GIVEN** the default 90-day entity retention and a range starting 120 days ago
- **WHEN** the range picker opens on Rooms, Participants, Agents, Egress or Ingress
- **THEN** it reads "Data older than 90 days is not retained."

#### Scenario: Analytics with daily rollups kept forever
- **GIVEN** the default retentions (hourly rollups 400 days, daily rollups without limit) and a range starting 500
  days ago
- **WHEN** the range picker opens on Analytics
- **THEN** it shows no retention warning, while the page keeps its banner about the hourly retention

#### Scenario: Analytics with a daily rollup retention
- **GIVEN** `GET /api/v1/info` reporting `retention.rollupsDailyMs` of 730 days and a range starting 3 years ago
- **WHEN** the range picker opens on Analytics
- **THEN** it reads "Data older than 730 days is not retained."

#### Scenario: Phone
- **GIVEN** an XSmall viewport on Rooms with a range starting 120 days ago
- **WHEN** the range picker of the range row opens
- **THEN** it reads "Data older than 90 days is not retained."

### Requirement: Theme toggle
Edition: CE. The theme toggle SHALL cycle system → light → dark, store the choice as a viewer preference and apply it
without reload. System mode follows `prefers-color-scheme`; the applied scheme is exposed so charts and icons
re-theme in place.

#### Scenario: Dark theme persists
- **GIVEN** the user selects dark
- **WHEN** the page is reloaded
- **THEN** the dark tokens apply before first paint and the toggle shows the dark state

#### Scenario: System mode follows the OS
- **GIVEN** the preference is system
- **WHEN** the OS switches to dark
- **THEN** the application re-themes without reload

### Requirement: Breadcrumbs from the route tree

Edition: CE. Breadcrumbs SHALL be derived from the activated route tree: an entity page shows two crumbs, the plural
section name linking to its list with the current range parameters, and the entity identifier (room SID, participant
SID, egress ID or ingress ID) as plain text with a copy button labelled by the identifier type; names are not part of
the trail.

#### Scenario: Participant inside a room
- **GIVEN** the route `/participants/PA_x1y2` resolves participant `alice` of room `demo-room`
- **WHEN** breadcrumbs render
- **THEN** they read `Participants / PA_x1y2`, the first links to `/participants` with the current `from`, `to` and `tz`, and the second is text followed by a copy button for `PA_x1y2` labelled "Copy participant SID"

#### Scenario: Egress of a room
- **GIVEN** the route `/egress/EG_ab12` of an egress of room `demo-room`
- **WHEN** breadcrumbs render
- **THEN** they read `Egress / EG_ab12` with one copy button and the identifier appears once

### Requirement: Footer version line
Edition: CE. The bottom of the sidenav SHALL show only the OpenVidu version ("OpenVidu {version}", the dashboard
version, linking to About), the edition badge, a Documentation link and, when the server enables it, an OpenAPI link.
In rail mode the sidenav bottom shows the short edition badge and a documentation icon link with a tooltip.

#### Scenario: Version line reflects the info endpoint
- **GIVEN** `GET /api/v1/info` reports dashboard 3.10.0, edition CE, server 3.10.0, schema 1 and `openapiDocsEnabled: false`
- **WHEN** the shell renders on a Large viewport
- **THEN** the sidenav bottom reads "OpenVidu 3.10.0" with the COMMUNITY badge and a Documentation link, and shows neither "server" nor "schema"

#### Scenario: OpenAPI link in development
- **GIVEN** `openapiDocsEnabled: true`
- **WHEN** the shell renders
- **THEN** an OpenAPI link to `api/v1/docs` follows the Documentation link

### Requirement: Banner slot
Edition: CE. A non-blocking banner slot under the header SHALL show, on every page, migration progress, schema-version
warnings and the silent writer warning reported by `GET /api/v1/status`, and connectivity errors reported by failed
requests; each banner is dismissible except the schema warnings (mismatch and uninitialized database). The banners
follow every response of the server status poll.

#### Scenario: Migration running
- **GIVEN** the status reports a migration in progress
- **WHEN** any page renders
- **THEN** the banner shows "Migration in progress" with processed/total records (events and stats) and refreshes until it completes

#### Scenario: Schema mismatch
- **GIVEN** the writer schema version differs from the dashboard's
- **WHEN** any page renders
- **THEN** a warning banner names both versions and cannot be dismissed

#### Scenario: Schema initialized while the page is open
- **GIVEN** the banner "The OpenVidu server has not initialized the analytics database yet" is shown
- **WHEN** the server initializes the database
- **THEN** the banner disappears within 10 s without a reload

### Requirement: Login page
Edition: CE. `/login` SHALL show username and password (with a show/hide toggle), submit on Enter, show the edition and
version (when the info endpoint exposes them without a session) and a documentation link, and never store
credentials. Errors are inline text: invalid credentials (focus back to username, password cleared), rate limited
(`429` with a countdown), server unreachable (banner with retry).

#### Scenario: Successful sign-in redirects
- **GIVEN** `/login?redirect=/rooms?status=active`
- **WHEN** valid credentials are submitted
- **THEN** the user lands on `/rooms?status=active`

#### Scenario: Rate limited
- **GIVEN** the login endpoint answers `429` with a retry delay
- **WHEN** the response arrives
- **THEN** the form shows "Too many attempts, try again in N s" counting down and re-enables submit at zero

#### Scenario: Already authenticated
- **GIVEN** a valid session
- **WHEN** the user opens `/login`
- **THEN** the application redirects to `redirect` or `/overview`

### Requirement: Session handling in the browser
Edition: CE. The shell SHALL implement the "Frontend session flow" of the `auth` capability
through one HTTP interceptor and the auth service: in-memory token, bearer header, single shared refresh on
`401` with one replay, silent restore on load, redirect to `/login?redirect=` on failure, nothing in browser
storage. In addition, Sign out SHALL call the logout endpoint, clear the in-memory session and navigate to
`/login`.

#### Scenario: Sign out
- **GIVEN** a logged-in session on `/rooms`
- **WHEN** the user chooses Sign out in the user menu
- **THEN** the logout endpoint is called, the token is dropped and the application shows `/login` without `redirect`

#### Scenario: Protected route without a session
- **GIVEN** no session and a failed silent restore
- **WHEN** the user opens `/settings?tab=about`
- **THEN** the application navigates to `/login?redirect=%2Fsettings%3Ftab%3Dabout`

### Requirement: Catch-all route
Edition: CE. Any unknown path SHALL redirect to `/overview` when authenticated and to `/login?redirect=<path>`
otherwise.

#### Scenario: Unknown path while signed out
- **GIVEN** no session
- **WHEN** the user opens `/nowhere`
- **THEN** the application navigates to `/login?redirect=/nowhere`

### Requirement: Locked PRO features in CE
Edition: CE. PRO entries, links and sections SHALL stay visible in CE and render a lock with the feature title, a short
explanation and a "Learn about OpenVidu PRO" link. The lock is decided from the feature flags of `GET /api/v1/info` and
makes no request to the locked endpoint. Full-page locks keep header and breadcrumbs over a dimmed, non-interactive
silhouette of three tiles and one block, with no refresh control in the header; in-card locks size to their message.

#### Scenario: Room detail in CE
- **GIVEN** the info endpoint does not report the feature `room-detail`
- **WHEN** the user follows a room SID link of the Rooms list
- **THEN** `/rooms/RM_ab12cd` shows the room header from the list data and the full-page lock, and no detail request is sent

#### Scenario: Locked sidenav entry
- **GIVEN** a sidenav entry whose route declares a feature that `GET /api/v1/info` does not report
- **WHEN** the sidenav renders
- **THEN** the entry shows a lock icon with a tooltip and opens the full-page lock; no sidenav entry of the CE routes declares a feature, so the CE sidenav shows no lock

#### Scenario: Compact in-card lock
- **GIVEN** the CE Analytics page
- **WHEN** its PRO cards render
- **THEN** each locked card is as tall as its lock message, not as the chart it replaces

### Requirement: 403 PRO_FEATURE response
Edition: CE. When a request returns `403` with code `PRO_FEATURE`, the UI SHALL render the lock for that feature instead
of an error banner and refresh its cached feature flags.

#### Scenario: Stale feature flags
- **GIVEN** the cached flags enable a feature that the server reports as PRO-only
- **WHEN** the request returns `403 PRO_FEATURE`
- **THEN** the page shows the lock and the info endpoint is re-read

### Requirement: URL query parameters as the single source of truth

Edition: CE. List and chart state SHALL live only in the query parameters `from`, `to`, `tz`, `granularity`, `scope`,
`status`, `kind`, `publisher`, `features`, `nodeId`, `room`, `type`, `inputType`, `q`, `sort`, `order`, `limit`,
`cursor` and `page`, read by components as signals with no parallel state. Invalid values fall back to defaults
silently. Every change is a new history entry merged into the current parameters; changing a filter, sort, range or
`limit` removes `cursor` and `page`.

#### Scenario: Link reproduces a view
- **GIVEN** `/rooms?from=now-7d&to=now&tz=UTC&status=active&sort=uniqueIdentities&order=desc&limit=50`
- **WHEN** the URL is opened in a new browser
- **THEN** the page shows the same range, filter, sort and page size

#### Scenario: Invalid value falls back
- **GIVEN** `?limit=7&order=sideways`
- **WHEN** the page parses the parameters
- **THEN** it uses the stored page size and `desc`, without an error page

#### Scenario: Filter change drops the cursor
- **GIVEN** a list on its third page
- **WHEN** the status filter changes
- **THEN** the new URL has the new status, no `cursor` and no `page`, and Back returns to the third page

### Requirement: Relative range serialisation
Edition: CE. Presets SHALL be serialised as relative expressions and kept relative in the URL: `now`, `now-<n><unit>`
(`m`, `h`, `d`) and `now/M` (start of the current month in `tz`). Absolute values are ISO 8601. The UI
resolves relative values to absolute instants at request time so bookmarks stay fresh.

#### Scenario: Preset bookmark
- **GIVEN** `from=now-24h&to=now`
- **WHEN** the page loads a day later
- **THEN** the request covers the 24 hours before the current instant and the URL is unchanged

#### Scenario: This month
- **GIVEN** `from=now/M&to=now&tz=Europe/Madrid`
- **WHEN** the range resolves
- **THEN** `from` is the first day of the current month at 00:00 in Europe/Madrid

### Requirement: Global range carried across pages
Edition: CE. The last range (`from`, `to`) SHALL be kept in memory for the session; sidenav and breadcrumb links to
range-scoped routes append it, and a range-scoped route opened without range parameters uses it, or the stored
default preset (initially last 24 h). Routes not marked range-scoped ignore `from` and `to`. The zone is not part of
this memory: it follows the session zone of the Timezone requirement.

#### Scenario: Range follows navigation
- **GIVEN** Analytics shows `from=now-7d`
- **WHEN** the user clicks Rooms in the sidenav
- **THEN** the rooms list opens with `from=now-7d&to=now` and the same `tz`

#### Scenario: Default preset
- **GIVEN** a fresh session with no stored default
- **WHEN** `/rooms` opens without parameters
- **THEN** the URL becomes `/rooms?from=now-24h&to=now&tz=<browser zone>`

#### Scenario: Range memory after a reload of a detail
- **GIVEN** the rooms list on `from=now-7d&to=now&tz=UTC`, then a room detail reloaded in the browser
- **WHEN** the user clicks Participants in the sidenav
- **THEN** the participants list opens with the default preset and `tz=UTC`, the zone kept by the detail's URL

### Requirement: Back navigation restores list state
Edition: CE. Navigating from a list to a detail and back SHALL restore the list's URL state, including `cursor`, `page`
and `limit`, so the same page, rows and "Showing x–y" range are shown; reloading the URL shows the same.

#### Scenario: Detail and back
- **GIVEN** `/egress?cursor=abc&page=3&limit=25`
- **WHEN** the user opens an egress detail and presses Back
- **THEN** the list shows the page for `cursor=abc` with 25 rows and reads "Showing 51–75"

### Requirement: Page size preference
Edition: CE. `limit` SHALL accept 10, 25, 50 or 100; the URL value wins, otherwise the stored preference (default 25)
applies. Changing the page size writes both the URL and the preference and drops the cursor.

#### Scenario: Preference applied
- **GIVEN** the stored page size is 50
- **WHEN** `/rooms` opens without `limit`
- **THEN** the list requests 50 rows and the paginator shows 50

### Requirement: Timezone

Edition: CE. Every timed page (lists, Overview, Analytics; not Settings) SHALL show times in the session zone and
keep it in its URL as `tz`: a page without a valid `tz` receives the session zone through a URL replacement, and a
valid `tz` in a URL becomes the session zone, which starts as the stored default zone. The range picker and the zone
chip change it; it shows in them, in chart notes and in the header tooltip of timestamp columns.

#### Scenario: UTC toggle
- **GIVEN** `tz=Europe/Madrid`
- **WHEN** the user enables UTC
- **THEN** the URL has `tz=UTC`, timestamps and charts re-render in UTC with a `UTC` suffix on timestamps and in the
  chart notes, and the cursor is dropped

#### Scenario: Invalid zone
- **GIVEN** a session in UTC
- **WHEN** `/overview?tz=Mars/Base` is opened
- **THEN** the URL is replaced with `tz=UTC` and no error is shown

#### Scenario: Settings is not a timed page
- **WHEN** Settings opens from a page in UTC
- **THEN** its URL carries no `tz`, About shows its timestamps in UTC, and the next timed page opens with `tz=UTC`

### Requirement: Auto-refresh policy

Edition: CE. Live-capable routes other than Analytics SHALL offer intervals off/10 s/30 s/1 min/5 min, default 10 s,
stored as one viewer preference for all live views, never in the URL. Analytics has no auto-refresh: it loads when
opened, on each URL state change and on the manual refresh button. A live view paused with a reason keeps the stored
preference.

#### Scenario: Hidden tab
- **GIVEN** a list refreshing every 10 s
- **WHEN** the tab is hidden for a minute and shown again
- **THEN** no request is made while hidden and one request fires immediately on return

#### Scenario: Slow request
- **GIVEN** a refresh request taking 15 s
- **WHEN** the next tick arrives
- **THEN** no second request starts until the first completes

#### Scenario: Interval preference
- **GIVEN** the user sets 30 s on the rooms list
- **WHEN** the overview opens
- **THEN** it refreshes every 30 s, like every other live view

#### Scenario: Hung request
- **GIVEN** a 10 s interval and a list request that does not answer
- **WHEN** 30 s elapse
- **THEN** the request is cancelled, the page keeps its last data under the refresh error, and a later tick sends a new request

#### Scenario: Analytics refreshes on demand
- **GIVEN** the auto-refresh preference at 10 s and Analytics open on `from=now-24h&to=now`
- **WHEN** a minute passes
- **THEN** Analytics sent its requests once, and sends them again only when the user presses refresh or changes its URL state

#### Scenario: Polling rules
- **GIVEN** a live view refreshing automatically
- **WHEN** it polls
- **THEN** a tick is skipped while a request is in flight, a request unanswered after 30 s fails, failures back off 10 →
  20 → 40 s up to 5 min and show the banner once, and refresh pauses while the tab is hidden, resumes with an immediate
  fetch, and stops on route leave or while the page is paused with a reason

### Requirement: API read timeout

Edition: CE. Every API read of the UI except CSV downloads SHALL fail with the error code `TIMEOUT` when the server has
not answered within 30 s; the page or section that sent it keeps its last data under the error notice "The server took
too long to answer; the data shown may be out of date." and a later refresh sends a new request.

#### Scenario: Slow CSV download
- **GIVEN** an Analytics CSV export that the server needs 45 s to send
- **WHEN** the download completes
- **THEN** the file is saved and no timeout error is shown

#### Scenario: Hung list request

- **GIVEN** a rooms list whose request does not answer
- **WHEN** 30 s elapse
- **THEN** the request is cancelled and the page keeps its last rows under the error notice "The server took too
  long to answer; the data shown may be out of date." with Retry

### Requirement: M3 theme tokens
Edition: CE. The theme SHALL derive from the OpenVidu palette (seed `#0088aa`, accent `#00c8f7`) with the light and dark
token values: `primary` `#006b86` / `#5fd4fb`, `tertiary` `#00677f` / `#00c8f7`, surfaces
`#f8fafb` / `#0f1416`, `on-surface` `#171c1e` / `#dfe3e6`, error `#ba1a1a` / `#ffb4ab`. Every text pair meets
4.5:1 and UI pairs 3:1; `#00c8f7` is never text on light surfaces; the seed is used only for non-text accents.

#### Scenario: Primary text contrast
- **GIVEN** the light theme
- **WHEN** a link renders on `surface`
- **THEN** its colour is `#006b86` with contrast ≥ 4.5:1

### Requirement: Typography, density and icons
Edition: CE. Fonts SHALL be Inter (variable, tabular numerals for figures) and JetBrains Mono for SIDs and other
identifiers, served from the application bundle. Icons are Material Symbols Rounded served as a local SVG subset. No
asset loads from a CDN. Density is -1 on fine pointers and 0 on coarse pointers; minimum text size 12 px.

#### Scenario: Offline deployment
- **GIVEN** a deployment with no outbound internet access
- **WHEN** the dashboard loads
- **THEN** fonts and icons render and no request leaves the origin

#### Scenario: Icon-only buttons
- **GIVEN** any icon-only button
- **WHEN** it renders
- **THEN** it has an `aria-label` and a tooltip

### Requirement: English interface
Edition: CE. The UI SHALL be in English only, whatever the browser language, with no language setting; numbers use
English formatting, and enum values and event types read their labels from one shared label table.

#### Scenario: Browser in another language
- **GIVEN** a browser whose language is Spanish
- **WHEN** any page renders
- **THEN** its texts are in English and a count of 1203 reads "1,203"

### Requirement: Keyboard navigation and focus order
Edition: CE. Focus order SHALL be skip link → header → sidenav → breadcrumb → page actions → content. `/` focuses the
global search; Escape closes drawers and menus and returns focus to the trigger; a route change moves focus to the page
`h1` and announces its title. Every interactive element shows a 2 px primary focus ring with 2 px offset; chart
canvases are focusable with a text summary.

#### Scenario: Slash focuses search
- **GIVEN** focus is in the content area
- **WHEN** the user presses `/`
- **THEN** the global search field receives focus

#### Scenario: Route change announces the title
- **GIVEN** the user activates a sidenav entry with the keyboard
- **WHEN** the new page renders
- **THEN** focus lands on its `h1` and the title is announced

### Requirement: Landmarks and reduced motion
Edition: CE. Each page SHALL expose `banner`, `navigation` and `main` landmarks and exactly one `h1`;
toasts and refresh updates use polite live regions. With `prefers-reduced-motion`, pulsing live dots, chart
animations and value highlights are disabled.

#### Scenario: Reduced motion
- **GIVEN** the OS requests reduced motion
- **WHEN** a live view refreshes
- **THEN** the live dot does not pulse and tiles update without highlight animation

### Requirement: Responsive content rules

Edition: CE. Content SHALL be a single column on an 8 px grid with 24 px gutters (16 px below Small), max width 1600 px,
no horizontal page scroll at 320 px and 200 % zoom. KPI tiles follow the balanced tile rows, each at least 150 px wide,
so two fit per row on a phone; filters stay inline in the filter bar and wrap onto more lines at any width; tables
scroll sideways inside their card and become cards on XSmall; touch targets are ≥ 44 × 44 px; the header sticks to the
top.

#### Scenario: Phone width
- **GIVEN** a 320 px viewport
- **WHEN** a list page renders
- **THEN** there is no horizontal page scroll, the filters wrap inside the filter bar and the rows render as cards

#### Scenario: Charts below Medium
- **WHEN** time-series charts render below Medium
- **THEN** they span the full width at their 280 px height

### Requirement: Server status poll
Edition: CE. While signed in, the shell SHALL request `GET /api/v1/status` at once and then every 30 s, or every 10 s
while the migration runs or the schema is uninitialized, on every page and whatever the auto-refresh preference. The
poll pauses while the tab is hidden and fetches at once on return, backs off on failures like the page refresh, and does
not appear in the refresh control.

#### Scenario: Auto-refresh off
- **GIVEN** the auto-refresh set to Off on the Rooms page
- **WHEN** two minutes pass with the tab visible
- **THEN** the Rooms list sends no request and `GET /api/v1/status` requests keep going out 30 s apart

#### Scenario: Migration cadence
- **GIVEN** a status reporting a running migration
- **WHEN** the next polls run
- **THEN** they are 10 s apart until a status reports the migration ended, and 30 s apart after it

#### Scenario: Hidden tab
- **GIVEN** the tab hidden for two minutes
- **WHEN** it is shown again
- **THEN** no status request was sent while hidden and one is sent at once

#### Scenario: Signed out
- **WHEN** the user signs out
- **THEN** no further status request is sent

### Requirement: Info re-read on server changes
Edition: CE. The shell SHALL read `GET /api/v1/info` at start and after sign-in, and read it again once when a status
reports a schema status or a migration state different from the last info document; it SHALL NOT poll the info endpoint.

#### Scenario: Migration ends
- **GIVEN** an info document with a running migration
- **WHEN** a status reports the migration `completed`
- **THEN** `GET /api/v1/info` is requested once and About shows the server version and retention of the new document

#### Scenario: Steady server
- **GIVEN** an info document and status responses with the same schema status and migration state
- **WHEN** ten minutes pass
- **THEN** `GET /api/v1/info` is not requested again

### Requirement: Silent writer banner

Edition: CE. When two consecutive statuses found `generatedAt − writer.lastSeenAt` above the silent window of the writer
freshness windows, or no batch with a schema other than `uninitialized`, and no running migration, the shell SHALL show
on every page a dismissible warning "No analytics data received for N min" (N from the last status, at least 1) or "No
analytics data received from the OpenVidu server".

#### Scenario: Writer down on another page
- **GIVEN** the Rooms page open and two consecutive statuses whose writer batch is 3 minutes before their `generatedAt`
- **WHEN** the banner slot renders
- **THEN** one banner reads "No analytics data received for 3 min"

#### Scenario: Long interval
- **GIVEN** the auto-refresh at 5 min and a writer batching every 10 s
- **WHEN** ten minutes pass on the Overview
- **THEN** no silent writer banner is shown

#### Scenario: Migration in progress
- **GIVEN** a running migration and no writer batch yet
- **WHEN** any page renders
- **THEN** only the migration banner is shown

#### Scenario: Dismissed and back
- **GIVEN** the user dismissed the banner
- **WHEN** a status reports a fresh batch and the next two report the writer silent again
- **THEN** the banner is shown again

#### Scenario: Slow writer
- **GIVEN** statuses with `writer.batchIntervalMs` 60000 whose writer batch is 100 s before their `generatedAt`
- **WHEN** several of them arrive in a row
- **THEN** no silent writer banner is shown, since the silent window for a 60 s batch interval is 135 s

#### Scenario: One silent status
- **GIVEN** a status that finds the writer silent
- **WHEN** the next status finds a batch within the silent window
- **THEN** no silent writer banner has been shown

#### Scenario: Cleared by a recent batch
- **GIVEN** the silent writer banner is shown or was dismissed
- **WHEN** the first status with a batch within the silent window arrives
- **THEN** the banner is hidden, and once dismissed it returns only after it has cleared

### Requirement: Freshness judged at response time

Edition: CE. Every "stale", "fresh" or "alive" judgment SHALL be made at the time of the last response for that data
(`304` included), on the server clock when the response carries `generatedAt`, and SHALL NOT change until the next
response. An entity is stale when its last response marks it `stale`, as judged on the server clock, never by comparing
the browser clock with `lastStatsAt`; the writer is fresh or silent by the windows of the last status.

#### Scenario: Long interval list
- **GIVEN** the Rooms auto-refresh at 5 min and an active room whose `lastStatsAt` was 5 s old when the list arrived
- **WHEN** three minutes pass
- **THEN** the row shows no stale cue

#### Scenario: Browser clock ahead
- **GIVEN** a browser clock two minutes ahead of the server and an active room whose list item has no `stale` flag
- **WHEN** the Rooms list renders
- **THEN** the row shows no stale cue

#### Scenario: Between responses
- **GIVEN** no new response since the last one
- **WHEN** time passes in the browser
- **THEN** the browser clock only advances durations, and ages that would grow between responses are shown as clock
  times

### Requirement: Writer freshness windows
Edition: CE. The shell SHALL judge the writer by the `writer.batchIntervalMs` of the last status, I, read as 10 s when
absent: the writer is fresh while its last batch is at most max(30 s, 1.5 × I + 5 s) old (the fresh window) and
silent once it is older than max(60 s, 2 × I + 15 s) (the silent window), both measured at the status's `generatedAt`.

#### Scenario: Interval absent
- **GIVEN** a status without `writer.batchIntervalMs`
- **WHEN** the shell judges the writer
- **THEN** the fresh window is 30 s and the silent window 60 s

#### Scenario: Slow writer
- **GIVEN** a status with `writer.batchIntervalMs` 60000
- **WHEN** the shell judges the writer
- **THEN** the fresh window is 95 s and the silent window 135 s

#### Scenario: Fast writer
- **GIVEN** a status with `writer.batchIntervalMs` 1000
- **WHEN** the shell judges the writer
- **THEN** the fresh window is 30 s and the silent window 60 s

### Requirement: Banner hysteresis
Edition: CE. The connectivity banner and the silent writer banner SHALL appear only after two consecutive bad results
(two API requests that do not reach the server, or two statuses that find the writer silent) and disappear on the
first good one.

#### Scenario: One failed request
- **GIVEN** a page refreshing every 10 s
- **WHEN** one request does not reach the server and the next one does
- **THEN** the connectivity banner is never shown

#### Scenario: Server unreachable
- **GIVEN** a page refreshing every 10 s
- **WHEN** two consecutive requests do not reach the server
- **THEN** the banner "The dashboard server is unreachable." is shown

#### Scenario: Recovery
- **GIVEN** the connectivity banner shown
- **WHEN** the next request reaches the server
- **THEN** the banner disappears
