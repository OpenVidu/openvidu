# deployment-compatibility Specification

## Purpose
The runtime contract between the dashboard container and the OpenVidu installers, Helm chart, reverse proxy
and health checks: environment variables, HTTP endpoints, startup order, exit codes and shutdown behaviour.

## Requirements

### Requirement: Legacy environment variables are honoured
Both editions. The dashboard SHALL read `SERVER_PORT` (default `5000`), `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
`MONGO_ENABLED` (default `true`), `DATABASE_URL`, `DATABASE_NAME` (default `openvidu`), `MONGO_NODES`,
`MONGO_PORT`, `MONGO_ADMIN_USERNAME`, `MONGO_ADMIN_PASSWORD`, `MONGO_REPLICA_SET_NAME`,
`DASHBOARD_CONFIG_PATH` and `LOG_LEVEL` (default `info`) with the same names and meaning as OpenVidu 3.9.

#### Scenario: Default port
- **GIVEN** `SERVER_PORT` is unset
- **WHEN** the dashboard starts
- **THEN** it listens on port 5000 and logs the port

#### Scenario: Explicit port
- **GIVEN** `SERVER_PORT=6000`
- **WHEN** the dashboard starts
- **THEN** it listens on port 6000

#### Scenario: Log level
- **GIVEN** `LOG_LEVEL=debug`
- **WHEN** the dashboard runs
- **THEN** debug messages are emitted; an unknown value falls back to `info` with a warning

### Requirement: Configuration file loaded at boot
Both editions. When `DASHBOARD_CONFIG_PATH` is set, the dashboard SHALL load that file (`KEY=value` lines)
into its environment before reading any configuration. Variables already present in the process environment
SHALL take precedence over the file. A missing file SHALL be logged as a warning, not an error; a file that exists but
cannot be read (for example, not readable by uid 1000) SHALL be logged with its path and exit with code 1.

#### Scenario: Value from the file
- **GIVEN** `DASHBOARD_CONFIG_PATH=/config/dashboard.env` containing `ADMIN_PASSWORD=secret`
- **WHEN** the dashboard starts
- **THEN** the administrator password is `secret`

#### Scenario: Environment wins over the file
- **GIVEN** the file sets `SERVER_PORT=7000` and the environment sets `SERVER_PORT=5000`
- **WHEN** the dashboard starts
- **THEN** it listens on port 5000

#### Scenario: File missing
- **GIVEN** `DASHBOARD_CONFIG_PATH` points to a non-existent file
- **WHEN** the dashboard starts
- **THEN** it logs a warning naming the path and continues with the environment

#### Scenario: File unreadable
- **GIVEN** `DASHBOARD_CONFIG_PATH` points to a file the dashboard user cannot read
- **WHEN** the dashboard starts
- **THEN** it logs the path and the reason and exits with code 1 without listening

### Requirement: MongoDB connection settings
Both editions. The dashboard SHALL connect with `DATABASE_URL` when set; otherwise it SHALL compose the URL
from `MONGO_NODES` (comma-separated hosts), `MONGO_PORT`, `MONGO_ADMIN_USERNAME`, `MONGO_ADMIN_PASSWORD` and
`MONGO_REPLICA_SET_NAME` with `readPreference=primaryPreferred`. Database name comes from `DATABASE_NAME`.

#### Scenario: Composed URL
- **GIVEN** `DATABASE_URL` unset and `MONGO_NODES=mongo1,mongo2`, `MONGO_PORT=27017`,
  `MONGO_REPLICA_SET_NAME=rs0` plus credentials
- **WHEN** the dashboard starts
- **THEN** it connects to `mongodb://<user>:<pass>@mongo1:27017,mongo2:27017/?replicaSet=rs0&readPreference=primaryPreferred`

#### Scenario: Missing composition variables
- **GIVEN** `DATABASE_URL` unset and `MONGO_PORT` unset
- **WHEN** the dashboard starts
- **THEN** it logs every missing variable name and exits with code 1 without listening

### Requirement: MongoDB disabled
Both editions. When `MONGO_ENABLED` is set to any value other than `true` (case-insensitive), the dashboard SHALL log
that MongoDB is disabled and exit with code 0 before connecting to anything; unset means enabled.

#### Scenario: MONGO_ENABLED=false
- **GIVEN** `MONGO_ENABLED=false`
- **WHEN** the container starts
- **THEN** it logs `MongoDB is disabled. Stopping application.` and exits with code 0

#### Scenario: Value other than true
- **GIVEN** `MONGO_ENABLED=no`
- **WHEN** the container starts
- **THEN** it logs `MongoDB is disabled. Stopping application.` and exits with code 0

#### Scenario: Case-insensitive true
- **GIVEN** `MONGO_ENABLED=TRUE`
- **WHEN** the container starts
- **THEN** it connects to MongoDB

### Requirement: TLS certificate authority for external MongoDB
Both editions. When `DATABASE_TLS_CA_FILE` is set, the dashboard SHALL connect with TLS and trust the PEM
bundle at that path (for services such as Amazon DocumentDB).

#### Scenario: Private CA accepted
- **GIVEN** a MongoDB server presenting a certificate signed by a private CA and `DATABASE_TLS_CA_FILE`
  pointing to that CA
- **WHEN** the dashboard starts
- **THEN** the connection succeeds

#### Scenario: Unreadable CA file
- **GIVEN** `DATABASE_TLS_CA_FILE` pointing to a missing or unreadable file
- **WHEN** the dashboard starts
- **THEN** it logs the path and exits with code 1

### Requirement: Administrator credentials are required
Both editions. `ADMIN_USERNAME` and `ADMIN_PASSWORD` SHALL be set and non-empty; the dashboard SHALL NOT
fall back to built-in credentials.

#### Scenario: Missing credentials
- **GIVEN** `ADMIN_PASSWORD` unset or empty
- **WHEN** the dashboard starts
- **THEN** it logs which variable is missing and exits with code 1

### Requirement: Session variables with the DASHBOARD_ prefix
Both editions. The dashboard SHALL accept `DASHBOARD_JWT_SECRET` (optional signing key; when unset a key is
generated and shared through the database), `DASHBOARD_REFRESH_TOKEN_TTL` (refresh session lifetime in
seconds, default `604800`) and `DASHBOARD_COOKIE_SECURE` (`auto` | `true` | `false`, default `auto`, semantics
owned by the `auth` capability).

#### Scenario: Invalid refresh TTL
- **GIVEN** `DASHBOARD_REFRESH_TOKEN_TTL=soon`
- **WHEN** the dashboard starts
- **THEN** it logs the invalid value and exits with code 1

#### Scenario: Automatic Secure flag
- **GIVEN** the default `DASHBOARD_COOKIE_SECURE=auto`
- **WHEN** an administrator logs in through a proxy that sets `X-Forwarded-Proto: https`
- **THEN** the refresh cookie carries the `Secure` attribute

#### Scenario: Insecure cookie for plain HTTP
- **GIVEN** `DASHBOARD_COOKIE_SECURE=false`
- **WHEN** an administrator logs in over plain HTTP
- **THEN** the refresh cookie is set without the `Secure` attribute and the session works

### Requirement: Cache variables with the DASHBOARD_ prefix

Edition: CE. The dashboard SHALL accept `DASHBOARD_ANALYTICS_CACHE_TTL` (seconds the analytics folds of completed
rollup documents are kept, non-negative integer, default `60`, `0` disables the cache); an invalid value SHALL be logged
and exit with code 1.

#### Scenario: Invalid cache lifetime
- **GIVEN** `DASHBOARD_ANALYTICS_CACHE_TTL=-5`
- **WHEN** the dashboard starts
- **THEN** it logs the invalid value and exits with code 1 without listening

#### Scenario: Caches disabled

- **GIVEN** `DASHBOARD_ANALYTICS_CACHE_TTL=0`
- **WHEN** an analytics request is repeated
- **THEN** each request aggregates from MongoDB and returns the same body as with the cache enabled

### Requirement: Naming rule for dashboard variables
Both editions. Every configuration variable that OpenVidu 3.9 does not read SHALL be prefixed `DASHBOARD_`, except
database connection variables, which SHALL be prefixed `DATABASE_`.

#### Scenario: Configuration schema audit
- **WHEN** the set of variable names read by the configuration is listed
- **THEN** every name is read by OpenVidu 3.9, starts with `DASHBOARD_` or starts with `DATABASE_`

### Requirement: HTTP contract owned by the API conventions
Both editions. The health endpoint (`GET /api/healthcheck`), `HEAD /`, the SPA fallback (including the unstripped
`/dashboard/api/healthcheck` used by the HA proxy health check), the JSON 404 for unknown `/api` paths and the
relative API URLs behind a stripped `/dashboard/` prefix SHALL behave as specified by the `api-conventions`
capability; this capability adds no second definition.

#### Scenario: Behind strip_path_prefix
- **GIVEN** an image built with `BASE_HREF=/dashboard/` behind a proxy that strips `/dashboard`
- **WHEN** an administrator logs in and opens the rooms list through the proxy
- **THEN** every request the SPA issues starts with `/dashboard/` and the pages load

### Requirement: Startup order

Edition: CE. Startup SHALL proceed in this order: load configuration, ping MongoDB, check the writer schema version,
provision the signing key and the session indexes, listen. A failure at any step SHALL exit without listening and log
its cause; the exit code is 3 for a writer schema older than the dashboard's minimum and 1 for any other failure.

#### Scenario: MongoDB unreachable

- **GIVEN** MongoDB does not answer
- **WHEN** the dashboard starts
- **THEN** it logs the connection error and exits with code 1 without listening

### Requirement: Writer schema version gate
Both editions. If `schema_meta` reports a writer schema version lower than the dashboard's minimum, the
dashboard SHALL log both versions with an upgrade instruction and exit with code 3. If the writer is newer,
it SHALL start, log a warning and expose the mismatch in `GET /api/v1/info` so the UI shows a banner. If
`schema_meta` is absent, it SHALL start and report `uninitialized` in the same field.

#### Scenario: Writer too old
- **GIVEN** `schema_meta.version` is lower than the dashboard's minimum
- **WHEN** the dashboard starts
- **THEN** it logs `Analytics schema version <w> is older than the minimum <m> supported by this dashboard;
  upgrade the OpenVidu server` and exits with code 3

#### Scenario: Writer newer
- **GIVEN** `schema_meta.version` is higher than the dashboard's version
- **WHEN** the dashboard starts
- **THEN** it listens, logs a warning and `GET /api/v1/info` reports `schema.status = "newer"`

#### Scenario: Schema not initialized
- **GIVEN** no `schema_meta` document
- **WHEN** the dashboard starts
- **THEN** it listens and `GET /api/v1/info` reports `schema.status = "uninitialized"` until the document
  appears

### Requirement: Graceful shutdown
Both editions. On `SIGTERM` or `SIGINT` the dashboard SHALL stop accepting connections, close idle
connections, close the MongoDB client and exit within 5 seconds (under the 10 s container stop timeout). A
signal-initiated shutdown exits with code 0; a repeated signal does not restart the sequence; a signal during
startup exits promptly.

#### Scenario: Stop under load
- **GIVEN** a running dashboard with idle keep-alive connections from a browser
- **WHEN** `SIGTERM` is received
- **THEN** the process exits with code 0 in less than 5 seconds

#### Scenario: Stop during startup
- **GIVEN** the dashboard is still pinging MongoDB
- **WHEN** `SIGTERM` is received
- **THEN** the process exits with code 0 without listening
