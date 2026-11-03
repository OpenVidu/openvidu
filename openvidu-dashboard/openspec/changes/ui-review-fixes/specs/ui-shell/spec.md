## MODIFIED Requirements

### Requirement: Footer version line
Edition: CE. The bottom of the sidenav SHALL show only the OpenVidu version ("OpenVidu {version}", the dashboard
version, as plain text), the edition badge, a Documentation link and, when the server enables it, an OpenAPI link.
In rail mode the sidenav bottom shows the short edition badge and a documentation icon link with a tooltip.

#### Scenario: Version line reflects the info endpoint
- **GIVEN** `GET /api/v1/info` reports dashboard 3.10.0, edition CE, server 3.10.0, schema 1 and `openapiDocsEnabled: false`
- **WHEN** the shell renders on a Large viewport
- **THEN** the sidenav bottom reads "OpenVidu 3.10.0", not a link, with the COMMUNITY badge and a Documentation link, and shows neither "server" nor "schema"

#### Scenario: OpenAPI link in development
- **GIVEN** `openapiDocsEnabled: true`
- **WHEN** the shell renders
- **THEN** an OpenAPI link to `api/v1/docs` follows the Documentation link

### Requirement: Locked PRO features in CE
Edition: CE. PRO entries, links and sections SHALL stay visible in CE and render a lock with the feature title, a short
explanation and a "Learn about OpenVidu PRO" link. The lock is decided from the feature flags of `GET /api/v1/info` and
makes no request to the locked endpoint. Full-page locks keep header and breadcrumbs over a dimmed, non-interactive
silhouette of three tiles and one block, with no refresh control in the header; in-card locks size to their message.

#### Scenario: Room detail in CE
- **GIVEN** the info endpoint does not report the feature `room-detail`
- **WHEN** the user follows a room SID link of the Rooms list
- **THEN** `/rooms/RM_ab12cd` shows the room header from the list data and the full-page lock, and no detail request is sent

#### Scenario: Track route in CE
- **GIVEN** the info endpoint does not report the feature `participant-detail`
- **WHEN** the user opens `/tracks/TR_a2b3`, as the global search does for an exact track ID
- **THEN** the page shows the full-page lock titled `TR_a2b3`, and no request about the track is sent

#### Scenario: Locked sidenav entry
- **GIVEN** a sidenav entry whose route declares a feature that `GET /api/v1/info` does not report
- **WHEN** the sidenav renders
- **THEN** the entry shows a lock icon with a tooltip and opens the full-page lock; no sidenav entry of the CE routes declares a feature, so the CE sidenav shows no lock

#### Scenario: Compact in-card lock
- **GIVEN** the CE Analytics page
- **WHEN** its PRO cards render
- **THEN** each locked card is as tall as its lock message, not as the chart it replaces
