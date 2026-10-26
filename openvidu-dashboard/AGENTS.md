# OpenVidu Dashboard

Admin web application bundled with every OpenVidu deployment: live monitoring and usage analytics of rooms,
participants, tracks, egress and ingress, read from the MongoDB analytics database written by the OpenVidu server
(`openvidu-livekit`, `openvidu/analytics/`). This workspace is the Community edition (**CE**, `dashboard-ce/`); the
commercial PRO edition extends its packages from a workspace of its own. `README.md` covers commands, the image,
configuration variables and exit codes.

## Working rules

1. Code, comments, specs, README, CHANGELOG and commit messages are in English. Comments only for non-obvious
   constraints; never narrate history or the conversation in code or docs.
2. Before adding or upgrading a library, check its latest stable version on npm (`npm view <pkg> version`) and its
   current API through Context7. Versions are pinned exactly; a dependency used by several packages goes once in the
   `catalog` of `pnpm-workspace.yaml`; install scripts stay disabled except those listed in `allowBuilds`.
3. When something is ambiguous, infeasible or unexpected, stop and ask the owner instead of deciding.
4. Run `./dashboard.sh check` before reporting work as done. Suites that need Docker cannot run from a bare checkout:
   say so instead of reporting a pass.
5. Keep the `AGENTS.md` files current in the same change as the command, path or convention they describe. Each
   `CLAUDE.md` is a symlink to the `AGENTS.md` beside it.

## Spec-driven workflow (OpenSpec)

- `openspec/specs/<capability>/spec.md` describe the current behaviour and are its source of truth; project context and
  per-artifact rules live in `openspec/config.yaml`.
- `/opsx:propose <name>` → owner review → `/opsx:apply` → `/opsx:archive`; no implementation without an approved
  change. Decisions go to the change's `design.md`, project-wide ones also to the `context` of `openspec/config.yaml`.
- Archiving syncs the delta specs into `openspec/specs` and deletes the change folder (no archive copy), in a commit
  "openvidu-dashboard: archive <name>, keep only the specs". `./dashboard.sh spec-validate` must pass.
- Start Claude Code sessions from this directory so the OpenSpec skills and `/opsx:*` commands load.

## Layout

| Path                                | Contents                                                                     | Agent notes |
| ----------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| `dashboard-ce/typings`              | Contract shared by backend, frontend and the writer; API types               | `README.md` |
| `dashboard-ce/backend`              | Express 5 REST API; serves the built SPA                                     | `AGENTS.md` |
| `dashboard-ce/frontend`             | Thin CE application and, in `projects/dashboard-ui`, the library with all UI | `AGENTS.md` |
| `dashboard-ce/e2e`                  | Playwright tests against the built applications                              | `AGENTS.md` |
| `dashboard-ce/docker`               | Image and its smoke test                                                     | `AGENTS.md` |
| `dashboard-ce/tools/data-generator` | Contract-valid analytics data for tests and the local demo                   | `README.md` |
| `openspec/`                         | Specs and in-progress changes                                                |             |

Build order: `typings` → `backend` → `dashboard-ui` → `frontend`. Workspace packages are consumed from their TypeScript
sources through the `source` export condition, so type checking, linting and tests need no build; the runtime uses
`dist`.

## Commands

Everything runs through `./dashboard.sh` (what CI calls; `help` lists every command, any accepts `--skip-install`):
`check` (lint, format check, typecheck, spec validation, unit tests), `test-integration` (Docker), `e2e`,
`contract-check <openvidu-livekit>`, `build-image ce`, `smoke-image ce`, `dev` (backend and frontend development
servers against openvidu-local-deployment; README "Development") and `demo ce`: a local demo on generated data
(http://localhost:4200, `admin` / `admin`; MongoDB container `openvidu-dashboard-demo-mongo` on port 27018;
`DASHBOARD_DEMO_KEEP_DATA=true` reuses the data of a running container).

Node 24 and pnpm through Corepack. Node stays on 24 until OpenVidu Meet moves to 26; TypeScript stays on 6 until the
Angular toolchain supports 7. Prettier: tabs, width 120, single quotes, no trailing commas; ESLint fails on warnings.

CI (`.github/workflows/openvidu-dashboard-ci.yml` of the `openvidu` repository, jobs `checks`, `unit`, `integration`,
`contract`, `e2e`) runs every job on `ubuntu-latest`, with actions pinned to commit SHAs. The image is built and
published by `docker-release.yaml` in openvidu-deployment.

## Edition model

- Backend: CE exports `startDashboard(options)`; an extending edition calls it with a `configure(container)` that
  rebinds DI tokens and registers its routes over the CE locks, and with `startupHooks` that run before it listens.
- UI: every CE page and building block lives in the `dashboard-ui` library; the applications only compose routes. An
  extending edition adds its pages over locked CE routes and fills explicit seams (see the library README). Keep seams
  open in CE (injectable services, route configs, content projection) and never put logic in the shells.
- `GET /api/v1/info` reports the edition and its features. CE shows PRO features locked, never hidden; PRO API routes
  answer `403 PRO_FEATURE` in CE.

## Data contract

- The contract lives in `dashboard-ce/typings` (see its README): sources in `contract/`, generated `schema/` and
  `fixtures/` (never edited by hand), vendored by the writer, schema version checked by both sides at startup.
- Adding or changing a field is one change covering the writer projector, typings, the legacy migration mapping, the
  collection validator and tests on both sides; `./dashboard.sh contract-check` verifies it end to end.
- No secrets in the analytics database. Participant counters count STANDARD sessions; the other kinds are services.

## CHANGELOG

`CHANGELOG.md`, newest release first, sections `Upgrade notes → Breaking changes → Deprecated → Added → Improved →
Fixed`; `Added`, `Improved` and `Fixed` group entries under `UI`, `Data` and `Deployment`. One present-tense line per
observable change, written in the same commit as the change; refactors, tests and docs get none.

## Pointers

- Writer: `openvidu-livekit/openvidu/analytics/` (branch `openvidu/main`; also the `openvidu-livekit` submodule of this
  repository).
- Deployment: `openvidu-deployment` (installer templates, Helm chart, `docker-release.yaml`).
- Documentation page: `openvidu.io/docs/docs/self-hosting/production-ready/observability/openvidu-dashboard.md`.
