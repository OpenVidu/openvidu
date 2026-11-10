# Proposal

## Why

Node.js 26 is the active LTS line since 2026-10-28 (26.13.0, "Lithium"), and the whole toolchain supports it: Angular
22.2, ng-packagr and vitest declare `>=26.0.0` in their engines, and the rest of the catalog has no upper bound. Moving
now puts the 3.10 image on the LTS line with the longest support. The rule that tied Node to OpenVidu Meet, which is
still on 24, kept the dashboard on the older line for no technical reason.

## What Changes

- The workspace, CI and image move to Node.js 26:
  - `.node-version` is 26, which CI already reads;
  - the root `engines` becomes `^26.13.0`;
  - the catalog's `@types/node` moves to 26;
  - both `FROM` lines of the image name `node:26.13.0-trixie-slim` in full, with no `ARG`, so Dependabot reads
    them.
- Node 25 and later no longer ship Corepack. The image build installs the `packageManager` pnpm with
  `npm install -g --ignore-scripts` instead of `corepack enable`:
  - safe-chain checks it like any other package;
  - like Corepack, it runs no install scripts (pnpm's only swap in its native binary).
- `dashboard.sh` and the README stop pointing developers to `corepack enable`.
- The packaging and CI requirements name the Node major of `.node-version` instead of 24, so the next major needs no
  spec change.
- Dependabot watches the image's Node.js tag weekly and proposes its minors and patches; Node majors are adopted by
  hand.
- `AGENTS.md` drops "Node stays on 24 until OpenVidu Meet moves to 26". The new rule: a new Node major is adopted once
  it is LTS and the toolchain declares support.

Not in scope:
- TypeScript 7.
- Other dependency majors.
- The Node used by openvidu-livekit or OpenVidu Meet.
- New runtime features of Node 26.

Edition: CE. An edition built on this workspace follows through `.node-version` and the catalog. Repositories:
dashboard only (`openvidu-dashboard/` and `.github/dependabot.yml` of `OpenVidu/openvidu`).

Observable behaviour that changes: the published CE image runs Node.js 26.13.0 instead of 24. The API, UI and
configuration stay the same.

CHANGELOG (`3.10.0`, `Improved` › `Deployment`):
- "The image runs on Node.js 26 (LTS)."

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `packaging`:
  - "Reproducible dependency installation" uses a base image of the `.node-version` major instead of Node 24;
  - "CE runtime is a plain Node image without private dependencies" runs on an official image of that major.
- `ci`: "Dependency update automation" ignores `@types/node` majors while the dashboard runs on the `.node-version`
  major, not Node 24; a new requirement, "Node image updates", has Dependabot watch the image's Node.js tag weekly,
  without Node majors.

## Impact

- **Files:**
  - `.node-version`, `package.json` (`engines`), `pnpm-workspace.yaml` (`@types/node`) and `pnpm-lock.yaml`;
  - `dashboard-ce/docker/Dockerfile` and `dashboard.sh`;
  - `README.md`, `AGENTS.md`, `dashboard-ce/docker/AGENTS.md`, `CHANGELOG.md`;
  - `.github/dependabot.yml`: the `@types/node` comment and the Docker entry of `dashboard-ce/docker`.
- **CI:** no workflow change; `actions/setup-node` reads `.node-version`.
- **Developers:** need Node 26, and pnpm from its standalone installer or `npm install -g` (Corepack is gone from
  Node 26).
- **Verified before proposing, on Node 26.13.0 with the current catalog:**
  - `./dashboard.sh check`, the integration suites (216 tests) and both e2e suites (113 + 6) pass;
  - the CE image built on `node:26.13.0-trixie-slim` passes `./dashboard.sh smoke-image ce` at 278 MB of its
    300 MB budget.
