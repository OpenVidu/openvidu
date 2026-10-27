## MODIFIED Requirements

### Requirement: Base path and resource naming

Edition: CE. Every dashboard API route SHALL live under `/api/v1`, use lower-case plural nouns for resources
(`rooms`, `participants`, `agents`, `tracks`, `egresses`, `ingresses`, `analytics`, `overview`, `status`, `auth`,
`info`), nest
sub-resources at most one level under the parent identifier, and answer every unknown `/api` path with a JSON
`404` instead of the SPA fallback.

#### Scenario: Sub-resource path

- **GIVEN** a room with SID `RM_abc`
- **WHEN** the client requests its participants
- **THEN** the path is `GET /api/v1/rooms/RM_abc/participants`

#### Scenario: Unknown API path

- **WHEN** the client requests `GET /api/v1/does-not-exist` or `GET /api/anything`
- **THEN** the response is `404` with body `{ error: { code: 'NOT_FOUND', message } }` and
  `Content-Type: application/json`, never the SPA `index.html`, and the message names the full path, such as
  `No API route for GET /api/v1/does-not-exist`

## ADDED Requirements

### Requirement: OpenAPI document metadata

Edition: CE. The OpenAPI document SHALL carry the following:
- an `info.description` of the API conventions;
- `info.license`: Apache 2.0 unless the edition provides another;
- one `servers` entry with the dashboard's public base path;
- a `tags` list with a description per tag, holding only the tags of the listed operations.

#### Scenario: Behind a base path

- **GIVEN** the server runs with `DASHBOARD_BASE_PATH=/dashboard/` and `NODE_ENV=development`
- **WHEN** the client reads the document
- **THEN** `servers[0].url` is `/dashboard`, and the paths start with `/api/v1`

#### Scenario: Conventions described

- **WHEN** the client reads `info.description`
- **THEN** it explains the following:
  - the bearer access token and the refresh cookie;
  - the `from`, `to` and `tz` time expressions;
  - cursor pagination with `limit` and `total`;
  - the `ApiError` envelope;
  - `ETag` and `If-None-Match`;
  - the `X-Request-Id` header;
  - the versioning policy.

#### Scenario: Tags

- **WHEN** the client reads `tags`
- **THEN** every operation's tags are listed there with a description, and no listed tag lacks an operation

### Requirement: OpenAPI operations

Edition: CE. Every operation of the OpenAPI document SHALL have the following:
- a unique `operationId`, a summary and tags;
- a description for every parameter, with comma-separated list parameters as arrays of their allowed values
  (`style: form`, `explode: false`);
- an `If-None-Match` header parameter when it can answer `304`;
- on the auth routes, the refresh cookie as a cookie security scheme, and the `Set-Cookie` header of the responses that
  set or clear it.

#### Scenario: Operation identifiers

- **WHEN** the client reads every operation of the document
- **THEN** each has an `operationId` that no other operation shares, such as `listRooms` for `GET /api/v1/rooms`

#### Scenario: List parameter

- **WHEN** the client reads the `kind` parameter of `GET /api/v1/participants`
- **THEN** it has a description, `style: form`, `explode: false`, and an array schema whose items enumerate the
  participant kinds

#### Scenario: Conditional request

- **WHEN** the client reads `GET /api/v1/overview`
- **THEN** it declares the `If-None-Match` header parameter, the `ETag` header of its `200`, and its `304`

#### Scenario: Refresh cookie

- **WHEN** the client reads `POST /api/v1/auth/refresh`
- **THEN** its security names the refresh cookie scheme (`in: cookie`, `name: ov_dashboard_refresh`), and its `200` and
  `401` declare `Set-Cookie`

### Requirement: OpenAPI error responses

Edition: CE. Every error response an operation can answer SHALL be declared with the `ApiError` schema. This means
`400` only for operations that take parameters or a body, `401` for operations that need or accept a token, and the
route's own errors such as `404`, `429` and `503`. A response that only one edition answers SHALL appear only in that
edition's document.

#### Scenario: Operation without input

- **WHEN** the client reads `GET /api/v1/health`
- **THEN** it declares no `400`

#### Scenario: Error body

- **WHEN** the client reads the `429` of `POST /api/v1/auth/login`
- **THEN** its content is `application/json` with the `ApiError` schema

#### Scenario: Edition-specific error

- **WHEN** the client reads `GET /api/v1/analytics/series` in the CE document
- **THEN** it declares the `403` of a PRO metric, dimension or node scope; and no CE operation declares a `403`
  `PRO_FEATURE` for being a PRO route
