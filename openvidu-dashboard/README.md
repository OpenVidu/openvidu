# OpenVidu Dashboard

Web application bundled with every OpenVidu deployment that gives administrators live monitoring and usage
analytics of rooms, participants, tracks, egress and ingress. It reads the MongoDB analytics database written
by the OpenVidu server (`openvidu-livekit`).

This workspace holds the Community edition (CE, `dashboard-ce/`). OpenVidu PRO deployments run a commercial edition
built on these packages, whose features CE shows locked.

## Layout

| Path                                | Package                              | Role                                               |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------- |
| `dashboard-ce/typings`              | `@openvidu-dashboard/typings`        | Contracts shared by backend and frontend           |
| `dashboard-ce/backend`              | `@openvidu-dashboard/backend`        | REST API; serves the built single-page application |
| `dashboard-ce/frontend`             | `@openvidu-dashboard/frontend`       | Angular application shell and the UI library       |
| `dashboard-ce/e2e`                  | `@openvidu-dashboard/e2e`            | End-to-end tests (Playwright)                      |
| `dashboard-ce/tools/data-generator` | `@openvidu-dashboard/data-generator` | Analytics data for tests and the local demo        |
| `openspec/`                         |                                      | Specifications and in-progress changes (OpenSpec)  |

## Requirements

- Node.js 24 (see `.node-version`)
- pnpm, enabled through Corepack (`corepack enable`); the version is pinned by `packageManager` in
  `package.json`

## Browser support

Current Chrome, Edge, Firefox and Safari: the theme needs CSS `light-dark()` (Chrome and Edge 123, Firefox 120,
Safari 17.5).

## Commands

All tasks run through `./dashboard.sh`:

```bash
./dashboard.sh install            # install dependencies
./dashboard.sh check              # lint + format check + type check + spec validation + unit tests
./dashboard.sh dev                # frontend dev server, proxying /api to a backend on port 5000
./dashboard.sh demo ce            # local demo on generated data: http://localhost:4200, admin / admin
./dashboard.sh test-integration   # integration tests against MongoDB (Docker required)
./dashboard.sh e2e                # build the application and run the Playwright tests
./dashboard.sh build-image ce     # build openvidu/openvidu-dashboard:dev
./dashboard.sh smoke-image ce     # smoke test and size budget of that image
./dashboard.sh contract-check ../openvidu-livekit   # data model contract check against the writer
./dashboard.sh help               # list every command
```

## Container image

`openvidu/openvidu-dashboard`, built from `dashboard-ce/docker/Dockerfile` on `node:24-trixie-slim`
(`node dist/server.js`).

- The build context is this directory. `IMAGE_TAG` (default `dev`) and `BASE_HREF` (default `/`; deployments use
  `/dashboard/`) apply.
- The image runs as uid 1000 and writes nothing to disk; mounted files (`DASHBOARD_CONFIG_PATH`,
  `DATABASE_TLS_CA_FILE`) must be readable by that user. The container listens on `SERVER_PORT` (5000) and its
  `HEALTHCHECK` requests `GET /api/healthcheck` on that port.
- `./dashboard.sh smoke-image ce` checks `MONGO_ENABLED=false`, health, `GET /api/healthcheck`, `HEAD /`, uid 1000,
  `SERVER_PORT`, `docker stop` and the 300 MB size budget.

## Configuration

Environment variables, optionally loaded from the file at `DASHBOARD_CONFIG_PATH` (the environment wins). New names
start with `DASHBOARD_`, or `DATABASE_` for database connection settings; the others keep their 3.9 meaning.

| Variable                                                                                              | Default               | Meaning                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`                                                                    | required              | Administrator credentials                                                                               |
| `SERVER_PORT`                                                                                         | `5000`                | HTTP port                                                                                               |
| `LOG_LEVEL`                                                                                           | `info`                | `error`, `warn`, `info`, `http`, `verbose`, `debug` or `silly`                                          |
| `DASHBOARD_CONFIG_PATH`                                                                               |                       | `KEY=value` file read at startup; a missing file logs a warning                                         |
| `MONGO_ENABLED`                                                                                       | `true`                | Anything but `true` stops the dashboard with exit code 0                                                |
| `DATABASE_URL`                                                                                        |                       | MongoDB connection string; otherwise composed from the `MONGO_*` variables                              |
| `MONGO_NODES`, `MONGO_PORT`, `MONGO_ADMIN_USERNAME`, `MONGO_ADMIN_PASSWORD`, `MONGO_REPLICA_SET_NAME` |                       | Parts of the composed connection string (`readPreference=primaryPreferred`)                             |
| `DATABASE_NAME`                                                                                       | `openvidu`            | Analytics database                                                                                      |
| `DATABASE_TLS_CA_FILE`                                                                                |                       | PEM file of a private certificate authority; enables TLS                                                |
| `DASHBOARD_JWT_SECRET`                                                                                | generated once        | Signing key of the session tokens, at least 32 bytes                                                    |
| `DASHBOARD_REFRESH_TOKEN_TTL`                                                                         | `604800`              | Session lifetime without use, in seconds                                                                |
| `DASHBOARD_COOKIE_SECURE`                                                                             | `auto`                | `auto`, `true` or `false`                                                                               |
| `DASHBOARD_TRUST_PROXY`                                                                               | private networks      | `false`, a hop count, or addresses, CIDRs, `loopback`, `linklocal` and `uniquelocal`; `true` is refused |
| `DASHBOARD_BASE_PATH`                                                                                 | the SPA `<base href>` | Public path of the dashboard                                                                            |
| `DASHBOARD_LIST_TOTAL_MAX_RANGE`                                                                      | `7d`                  | Longest range for which lists count their total                                                         |
| `DASHBOARD_ANALYTICS_CACHE_TTL`                                                                       | `60`                  | Seconds the analytics folds of completed rollup documents are kept; `0` disables it                     |

## Exit codes

| Code | Meaning                                                                      |
| ---- | ---------------------------------------------------------------------------- |
| 0    | Stopped by a signal, or `MONGO_ENABLED` is not `true`                        |
| 1    | Invalid configuration or MongoDB unreachable                                 |
| 3    | The OpenVidu server's analytics schema is older than this dashboard supports |

## Contributing

Read `AGENTS.md`, and the one of the package you change, before changing anything: they describe the edition model,
conventions and the spec-driven workflow used in this workspace.
