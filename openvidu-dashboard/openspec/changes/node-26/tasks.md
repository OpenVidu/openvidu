# Tasks

## 1. Workspace versions

- [x] 1.1 Set `.node-version` to `26` and the root `engines.node` to `^26.13.0`. Verify: `node --version` under the
      CI setup reports 26.13.x, and `./dashboard.sh check` passes on Node 26.
- [x] 1.2 Move the catalog's `@types/node` to 26.6.6 (latest 26.x on npm) and refresh `pnpm-lock.yaml` with
      `pnpm install`. Verify: `./dashboard.sh typecheck` passes and `pnpm install --frozen-lockfile` reports the
      lockfile up to date.

## 2. Image

- [x] 2.1 In `dashboard-ce/docker/Dockerfile`:
      - set `NODE_VERSION=26.13.0`;
      - replace `corepack enable` with `npm install -g --ignore-scripts` of `packageManager`, after `package.json` is
        copied (design D1).
      Verify: `./dashboard.sh build-image ce` succeeds; the safe-chain step runs before any install;
      `docker run --rm --entrypoint node openvidu/openvidu-dashboard:dev --version` prints `v26.13.0`.
- [x] 2.2 Run `./dashboard.sh smoke-image ce`. Verify: the health, port, uid, `docker stop` and size checks pass, and
      the size stays within 300 MB.

## 3. Tooling and docs

- [x] 3.1 `dashboard.sh`: the "pnpm not found" hint names the `packageManager` version and how to install it without
      Corepack (design D6). Verify: running a command with pnpm absent from `PATH` prints the new hint.
- [x] 3.2 `README.md`:
      - Requirements: Node.js 26, and pnpm from its standalone installer or `npm install -g`;
      - Image: the base image is `node:26-trixie-slim`.
      Verify: `./dashboard.sh format-check` passes and no "Corepack" or "Node.js 24" remains in the README.
- [x] 3.3 `AGENTS.md`: replace the Node 24 / OpenVidu Meet rule with the LTS-and-toolchain rule (design D5). Update
      `dashboard-ce/docker/AGENTS.md`: runtime on `node:<26.x.y>-trixie-slim`, and pnpm installed from
      `packageManager` through safe-chain.
      Verify: `rg -n "Node 24|corepack enable" AGENTS.md dashboard-ce/docker/AGENTS.md` finds nothing outdated.
- [x] 3.4 `.github/dependabot.yml`: the comment on the `@types/node` ignore names the `.node-version` major instead of
      "Node.js 24 until 26 is LTS". Verify: the YAML parses (`python3 -c 'import yaml…'`), and the ignore rule itself is
      unchanged in `git diff`.

## 4. CHANGELOG

- [x] 4.1 `CHANGELOG.md`, `3.10.0` › `Improved` › `Deployment`: "The image runs on Node.js 26 (LTS)." Verify:
      `./dashboard.sh format-check` passes.

## 5. Verification on Node 26

- [x] 5.1 Run `./dashboard.sh check`, `./dashboard.sh test-integration` and `./dashboard.sh e2e` on Node 26.13.0.
      Verify: all pass, with no Node deprecation warning in their output.
- [x] 5.2 Run `./dashboard.sh spec-validate`, which runs `openspec validate --all --strict`. Verify: the change and the
      packaging and ci specs validate.

## Workflow follow-up

- Archive when the owner asks: merge the packaging and ci deltas into the main specs, delete the change folder, and
  commit "openvidu-dashboard: archive node-26, keep only the specs".
- Editions built on this workspace pick up `.node-version` and the catalog when they move to the commit that lands
  this change.
