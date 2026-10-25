# Images

- `dashboard-ce/docker/Dockerfile` builds `openvidu/openvidu-dashboard` with `openvidu-dashboard/` as context
  (`.dockerignore` at its root). These rules also apply to images built on these packages.
- Images run Aikido safe-chain for every package manager call, install with `--frozen-lockfile` and a `--filter`, build
  the SPA on `$BUILDPLATFORM` with `--base-href "$BASE_HREF"` (default `/`, deployments use `/dashboard/`), purge
  tzdata, run as uid 1000 and declare a `HEALTHCHECK` through the entry's `healthcheck` argument, which uses
  `node:http` because `fetch` refuses ports such as 6000.
- Runtime: `pnpm deploy --prod` of the backend on `node:<24.x.y>-trixie-slim`, without npm, npx and corepack.
- `smoke-test.sh <image> <budget-mb> [docker run options...]` (`./dashboard.sh smoke-image ce`, 300 MB) checks
  `MONGO_ENABLED=false`, health, `GET /api/healthcheck`, `HEAD /`, uid 1000, `SERVER_PORT`, `docker stop` and the
  uncompressed size budget; the options reach every container, e.g. what an image built on this one needs to start.
