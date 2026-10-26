# auth Specification

## Purpose
Authenticates the single dashboard administrator and keeps the session alive across page reloads and HA replicas
with a short-lived bearer access token and a rotating refresh-token cookie, without storing credentials or tokens in
the browser and without a Redis dependency.

## Requirements

### Requirement: Single administrator credentials

Edition: CE. The dashboard SHALL have exactly one user, whose credentials come from `ADMIN_USERNAME` and
`ADMIN_PASSWORD`; both variables SHALL be required at startup, and credential checks SHALL compare username and
password in constant time so that response timing does not reveal which one is wrong.

#### Scenario: Missing credentials at startup

- **GIVEN** `ADMIN_PASSWORD` is not set
- **WHEN** the server starts
- **THEN** it logs which variable is missing and exits with a non-zero code without listening

#### Scenario: Wrong username and wrong password take the same time

- **WHEN** one login uses an unknown username and another the right username with a wrong password
- **THEN** both answer `401` with code `INVALID_CREDENTIALS` and the same message, with no measurable timing
  difference attributable to the comparison

### Requirement: Login endpoint

Edition: CE. `POST /api/v1/auth/login` SHALL accept `{ username, password }`, SHALL answer `200`
`{ accessToken, expiresAt }` and set the refresh cookie when the credentials match, SHALL answer `401`
`INVALID_CREDENTIALS` otherwise, and SHALL answer `400` `VALIDATION_ERROR` when the body is malformed.

#### Scenario: Successful login

- **WHEN** the client posts the configured username and password
- **THEN** the response is `200` with a JWT in `accessToken`, `expiresAt` 15 minutes ahead, and a `Set-Cookie`
  header carrying the refresh token

#### Scenario: Malformed body

- **WHEN** the client posts `{ "user": "admin" }`
- **THEN** the response is `400` with code `VALIDATION_ERROR` listing `["username"]` and `["password"]` as issues

### Requirement: Login rate limit

Edition: CE. Login SHALL be limited per client IP to 10 failed attempts in a fixed 15-minute window opened by the
first login attempt from that IP; once the limit is reached further login requests from that IP SHALL answer `429`
`RATE_LIMITED` with a `Retry-After` header in seconds until the window ends, successful logins SHALL NOT count, and the
counter SHALL be kept per server replica.

#### Scenario: Eleventh failed attempt

- **GIVEN** an IP has failed 10 logins in its current window
- **WHEN** it posts another login, even with the right credentials
- **THEN** the response is `429` with code `RATE_LIMITED` and a numeric `Retry-After` header

#### Scenario: Window expiry

- **GIVEN** an IP was rate limited
- **WHEN** 15 minutes have passed since the attempt that opened its window
- **THEN** a login with the right credentials succeeds

### Requirement: Trusted proxy

Edition: CE. The client IP (rate limiting) and the request protocol (cookie policy) SHALL be taken from
`X-Forwarded-For` / `X-Forwarded-Proto` only when the request comes from a proxy trusted by `DASHBOARD_TRUST_PROXY`,
whose default trusts loopback, link-local and private networks; the value `true` SHALL be rejected at startup
because it allows header spoofing.

#### Scenario: Accepted values

- **WHEN** `DASHBOARD_TRUST_PROXY` is `false`, a hop count such as `2`, or a comma-separated list of addresses, CIDRs
  or the names `loopback`, `linklocal`, `uniquelocal`
- **THEN** the server starts and applies it; with `true` it logs the reason and exits with a non-zero code

#### Scenario: Behind the deployment proxy

- **GIVEN** the default setting and a request relayed by Caddy from a private network address
- **WHEN** the request carries `X-Forwarded-For: 203.0.113.9`
- **THEN** the rate limiter counts the attempt against `203.0.113.9`

#### Scenario: Spoofed header from an untrusted address

- **GIVEN** the default setting and a request arriving directly from a public address
- **WHEN** it carries `X-Forwarded-For: 10.0.0.1`
- **THEN** the header is ignored and the attempt counts against the connecting address

### Requirement: Access token

Edition: CE. The access token SHALL be a JWT signed with HS256 and the dashboard signing key, valid for 15 minutes,
with claims `sub` (username), `iat`, `exp` and `edition` (`ce` or `pro`); the server SHALL verify signature,
algorithm and expiry on every protected request and SHALL NOT keep a revocation list for access tokens.

#### Scenario: Claims

- **WHEN** a login succeeds on the CE edition at 2026-10-13T12:00:00Z
- **THEN** the decoded token has `sub: "<username>"`, `iat: 1791892800`, `exp: 1791893700` and `edition: "ce"`

#### Scenario: Token signed with another key

- **WHEN** a request carries a token signed with a different secret or with `alg: none`
- **THEN** the response is `401` with code `UNAUTHORIZED` and `details.reason: "invalid"`

### Requirement: Protected routes

Edition: CE. Every `/api/v1` route SHALL require `Authorization: Bearer <accessToken>` except the auth endpoints
`login`, `refresh` and `logout`, `health`, `ready`, the public subset of `info` and the development-only docs;
`GET /api/healthcheck` and the SPA assets SHALL also be public. A missing, malformed, invalid or expired token SHALL
answer `401` `UNAUTHORIZED` with `details.reason` `missing`, `invalid` or `expired` and `WWW-Authenticate: Bearer`.

#### Scenario: Missing token

- **WHEN** the client requests `GET /api/v1/rooms` without an `Authorization` header
- **THEN** the response is `401` with code `UNAUTHORIZED`, `details.reason: "missing"` and `WWW-Authenticate: Bearer`

#### Scenario: Expired token

- **GIVEN** an access token issued 16 minutes ago
- **WHEN** the client requests `GET /api/v1/info` with it
- **THEN** the response is `401` with `details.reason: "expired"`

#### Scenario: Public routes

- **WHEN** the client requests `GET /api/v1/health`, `GET /api/v1/ready` or `GET /api/healthcheck` without a token
- **THEN** the responses are not `401`

### Requirement: Refresh token cookie

Edition: CE. On login and on refresh the server SHALL set the refresh token in a cookie named
`ov_dashboard_refresh` with `HttpOnly`, `SameSite=Strict`, `Path=<basePath>api/v1/auth`, `Max-Age` equal to
`DASHBOARD_REFRESH_TOKEN_TTL` (positive integer seconds, default `604800`) and the `Secure` flag per the cookie
security policy; the token SHALL be an opaque random value of at least 256 bits, never a JWT, and SHALL never appear
in a response body.

#### Scenario: Cookie attributes behind the deployment proxy

- **GIVEN** the dashboard is published under `/dashboard/` over HTTPS
- **WHEN** a login succeeds
- **THEN** the `Set-Cookie` header is `ov_dashboard_refresh=<token>; Path=/dashboard/api/v1/auth; Max-Age=604800;
  HttpOnly; Secure; SameSite=Strict`

#### Scenario: Custom lifetime

- **GIVEN** `DASHBOARD_REFRESH_TOKEN_TTL=43200`
- **WHEN** a login succeeds
- **THEN** the cookie has `Max-Age=43200` and the stored session expires 12 hours later

#### Scenario: Invalid lifetime

- **GIVEN** `DASHBOARD_REFRESH_TOKEN_TTL=soon`
- **WHEN** the server starts
- **THEN** it logs the invalid value and exits with a non-zero code

### Requirement: Public base path

Edition: CE. The cookie path SHALL be built from the dashboard's public base path, taken from `DASHBOARD_BASE_PATH`
when set and otherwise from the `<base href>` of the built SPA (`/dashboard/` in release images, `/` locally), so
that the browser sends the cookie to the auth endpoints and to nothing else on the same origin.

#### Scenario: Default base path from the SPA

- **GIVEN** `DASHBOARD_BASE_PATH` is not set and the SPA was built with `BASE_HREF=/dashboard/`
- **WHEN** a login succeeds
- **THEN** the cookie `Path` is `/dashboard/api/v1/auth`

#### Scenario: Explicit base path

- **GIVEN** `DASHBOARD_BASE_PATH=/admin/`
- **WHEN** a login succeeds
- **THEN** the cookie `Path` is `/admin/api/v1/auth`

### Requirement: Cookie security policy

Edition: CE. The `Secure` flag of the refresh cookie SHALL follow `DASHBOARD_COOKIE_SECURE`: `auto` (default) sets it
when the request was received over HTTPS, directly or through a trusted proxy reporting `X-Forwarded-Proto: https`;
`true` always sets it; `false` never sets it.

#### Scenario: Plain HTTP local deployment

- **GIVEN** the default `auto` and a request received over plain HTTP without a forwarded protocol
- **WHEN** a login succeeds
- **THEN** the cookie is set without `Secure` and the subsequent refresh works

#### Scenario: HTTPS terminated at the proxy

- **GIVEN** the default `auto` and a trusted proxy sending `X-Forwarded-Proto: https`
- **WHEN** a login succeeds
- **THEN** the cookie is set with `Secure`

#### Scenario: Forced on

- **GIVEN** `DASHBOARD_COOKIE_SECURE=true` and a plain HTTP request
- **WHEN** a login succeeds
- **THEN** the cookie is set with `Secure` (the browser will drop it; the setting is for deployments that always
  terminate TLS but do not forward the protocol)

### Requirement: Refresh rotation

Edition: CE. `POST /api/v1/auth/refresh` SHALL read the refresh cookie, SHALL answer `200` `{ accessToken, expiresAt }`
with a new refresh cookie of the same family when the token is live (not rotated, revoked or expired), SHALL mark the
presented token as rotated, and SHALL answer `401` `UNAUTHORIZED` and clear the cookie when it is missing, unknown,
expired or belongs to a revoked family.

#### Scenario: Rotation

- **GIVEN** a live refresh token
- **WHEN** the client posts to refresh with it
- **THEN** the response is `200` with a new access token and a different refresh cookie, and the presented token is
  no longer live

#### Scenario: No cookie

- **WHEN** the client posts to refresh without the cookie
- **THEN** the response is `401` with code `UNAUTHORIZED` and `details.reason: "missing"`

#### Scenario: Expired token

- **GIVEN** a refresh token whose lifetime has passed
- **WHEN** the client posts to refresh with it
- **THEN** the response is `401` with `details.reason: "expired"` and a `Set-Cookie` that clears the cookie

### Requirement: Reuse detection

Edition: CE. When a refresh token that was already rotated is presented again, the server SHALL revoke its whole
family and answer `401`, unless the token was rotated less than 10 seconds earlier, in which case the request SHALL
be treated as a concurrent refresh and rotated normally; every revocation SHALL be logged at warning level with the
family id.

#### Scenario: Replay after the grace period

- **GIVEN** a refresh token rotated 5 minutes ago
- **WHEN** it is presented again
- **THEN** the response is `401`, the cookie is cleared, every token of the family is revoked and the successor token
  issued 5 minutes ago no longer works

#### Scenario: Two tabs refreshing at once

- **GIVEN** two browser tabs sharing the cookie whose access tokens expired together
- **WHEN** both post to refresh within one second with the same token
- **THEN** both receive `200`, both of the issued tokens work and the family stays live

### Requirement: Logout

Edition: CE. `POST /api/v1/auth/logout` SHALL revoke the family of the refresh token in the cookie, clear the cookie
and answer `204`, SHALL answer `204` also when no valid cookie is present, and SHALL NOT invalidate access tokens
already issued, which expire on their own within 15 minutes.

#### Scenario: Logout

- **GIVEN** a logged-in session
- **WHEN** the client posts to logout
- **THEN** the response is `204` with a clearing `Set-Cookie`, and a refresh with the old cookie answers `401`

#### Scenario: Logout without session

- **WHEN** the client posts to logout without a cookie
- **THEN** the response is `204`

### Requirement: Current session

Edition: CE. `GET /api/v1/auth/me` SHALL answer `200` `{ username, edition, expiresAt }` for a valid access token,
where `expiresAt` is the token's expiry.

#### Scenario: Me

- **WHEN** the client requests `GET /api/v1/auth/me` with a valid token
- **THEN** the response is `200` with the configured username, the edition and the token expiry as ISO 8601

### Requirement: Session storage

Edition: CE. Refresh tokens SHALL be stored in the `dashboard_sessions` collection, one document per token with its
family id, a SHA-256 hash of the token (never the token), creation, expiry, rotation and revocation timestamps and
the client address and user agent that created it; expired documents SHALL be removed automatically by a TTL index
on `expiresAt`.

#### Scenario: Only hashes at rest

- **WHEN** the collection is inspected after a login
- **THEN** no document contains the cookie value and each holds `tokenHash`, `familyId`, `createdAt` and `expiresAt`

#### Scenario: Automatic expiry

- **GIVEN** a session document whose `expiresAt` passed
- **WHEN** the MongoDB TTL monitor runs
- **THEN** the document is deleted without dashboard intervention

### Requirement: Signing key provisioning

Edition: CE. At startup the server SHALL use `DASHBOARD_JWT_SECRET` (at least 32 bytes) when set; otherwise it SHALL
read the key from `dashboard_settings` `{ _id: 'signing-key' }`, generating 32 random bytes and inserting them atomically
when the document is absent, so that concurrent replicas converge on one key; a `DASHBOARD_JWT_SECRET` shorter than
32 bytes SHALL abort startup.

#### Scenario: First start

- **GIVEN** no `signing-key` document exists in `dashboard_settings`
- **WHEN** the server starts
- **THEN** it inserts `{ _id: 'signing-key', key, createdAt }` and signs tokens with that key

#### Scenario: Two replicas starting together

- **WHEN** two replicas start concurrently against the same database
- **THEN** exactly one insert succeeds, the other replica reads the stored key, and a token issued by either replica
  verifies on the other

#### Scenario: Override

- **GIVEN** `DASHBOARD_JWT_SECRET` is set to a 48-character value
- **WHEN** the server starts
- **THEN** tokens are signed with that secret and the stored key is ignored

#### Scenario: Short override

- **GIVEN** `DASHBOARD_JWT_SECRET=short`
- **WHEN** the server starts
- **THEN** it logs that the secret must be at least 32 bytes and exits with a non-zero code

### Requirement: Frontend session flow

Edition: CE. The SPA SHALL keep the access token in memory only, SHALL attach it as a bearer to every API request,
SHALL restore the session on load by calling refresh, SHALL on a `401` from a protected request run one refresh
(shared by concurrent requests) and replay the request once, SHALL redirect to `/login?redirect=<current path>` when
the refresh fails, and SHALL store no credential or token in `localStorage`, `sessionStorage` or IndexedDB.

#### Scenario: Bearer attached

- **GIVEN** a logged-in session
- **WHEN** the UI requests `api/v1/rooms`
- **THEN** the request carries `Authorization: Bearer <accessToken>`

#### Scenario: Silent refresh and replay

- **GIVEN** three list requests in flight fail with `401`
- **WHEN** the interceptor handles them
- **THEN** exactly one refresh request is sent, and the three requests are replayed once with the new token

#### Scenario: Refresh fails

- **GIVEN** the user is on `/rooms?status=active`
- **WHEN** the silent refresh answers `401`
- **THEN** the in-memory token is cleared and the UI navigates to `/login?redirect=%2Frooms%3Fstatus%3Dactive`

#### Scenario: Page reload

- **GIVEN** a logged-in session and a page reload
- **WHEN** the SPA starts
- **THEN** it calls refresh, obtains a new access token and renders the requested route without showing the login

#### Scenario: Login endpoints are never retried

- **WHEN** `POST api/v1/auth/login` or `POST api/v1/auth/refresh` answers `401`
- **THEN** the interceptor does not trigger another refresh

#### Scenario: Nothing in browser storage

- **WHEN** the browser storage is inspected after login
- **THEN** no key of `localStorage`, `sessionStorage` or IndexedDB holds a token, username or password

#### Scenario: Redirect target is validated

- **GIVEN** a login page opened with `redirect=https://evil.example/`
- **WHEN** the login succeeds
- **THEN** the UI navigates to `/overview` instead of the external URL
