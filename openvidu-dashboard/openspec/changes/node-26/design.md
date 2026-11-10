# Design

## Context

The workspace pins Node in five places:
- `.node-version` (24), read by every CI job through `actions/setup-node`;
- the root `engines` (`^24.15.0`);
- the catalog's `@types/node` (24.19.2);
- the Dockerfile's `NODE_VERSION` argument (24.22.2), from which both `FROM` lines built the tag;
- the docs.

The image build enables pnpm with `corepack enable` after `npm safe-chain-verify`, and the runtime stage deletes npm,
npx, corepack and yarn. Node 25 removed Corepack from the distribution, so on Node 26 `corepack enable` fails.

## Goals / Non-Goals

**Goals:**
- One source for each version: Node in `.node-version` (plus the exact tag in the Dockerfile's `FROM` lines), pnpm in
  `packageManager`.
- The next Node major is a version bump with no spec change.

**Non-Goals:**
- Changing how CI installs pnpm: `pnpm/action-setup` reads `packageManager` and does not use Corepack.
- Pinning the Node patch for developers beyond `engines`.

## Decisions

### D1. pnpm in the image: `npm install -g --ignore-scripts` of `packageManager`

The build stage runs the following, after copying `package.json`:

```sh
npm install -g --ignore-scripts "$(node -p "require('./package.json').packageManager")"
```

- `packageManager` is `pnpm@<x.y.z>`, a valid npm spec, so the version stays in one place.
- The install goes through the safe-chain npm shim, so pnpm is checked like every other package; Corepack fetched it
  outside safe-chain.
- `--ignore-scripts` matches Corepack, which runs no lifecycle scripts. pnpm's scripts only replace its bins with the
  native host binary; without them pnpm runs through Node, as it did under Corepack. It also avoids the install-scripts
  warning of npm 11.20.
- Rejected alternatives:
  - `npm install -g corepack@<x> && corepack enable`: adds a pinned tool whose only job is to download pnpm outside
    safe-chain.
  - A `PNPM_VERSION` build argument: a second copy of `packageManager`.
  - pnpm's standalone `curl | sh` installer: not covered by safe-chain.

### D2. `engines` is `^26.13.0`

- 26.13.0 is the first LTS release of the line.
- The caret keeps the declared range to the major the suites run on.
- `>=26` would claim support for 27 untested.

### D3. Version-agnostic requirements

- The packaging and ci requirements name "the major in `.node-version`" instead of a number.
- The exact tag in the Dockerfile's `FROM` lines remains the reproducibility pin required by "Reproducible dependency
  installation".

### D4. `@types/node` 26 and the Dependabot ignore

- The catalog moves to the latest 26.x (26.6.6).
- The ignore of `@types/node` majors stays, so its types never get ahead of the runtime.
- The comment of that ignore names the `.node-version` major.

### D5. The Node rule in `AGENTS.md`

- "Node stays on 24 until OpenVidu Meet moves to 26" becomes: a new Node major is adopted once it is LTS and the
  toolchain (Angular, vitest, testcontainers) declares it in its engines.
- Coupling to another product's schedule held the dashboard back without a technical reason.

### D6. Developer setup without Corepack

- The README and the `dashboard.sh` hint tell developers to install the `packageManager` pnpm themselves, with the
  standalone installer or `npm install -g pnpm@<version>`.
- pnpm then follows `packageManager` on its own.

### D7. The image's Node tag, named in full and watched by Dependabot

- Both `FROM` lines name `node:26.13.0-trixie-slim` literally: Dependabot cannot resolve an `ARG` in a `FROM`, so with
  the old `NODE_VERSION` argument it never saw the image.
- A weekly Docker entry for `dashboard-ce/docker` bumps the minors and patches of both lines in one pull request and
  ignores Node majors, which move by hand with `.node-version`. Dependabot never changes a tag's suffix: the next Debian
  release is also a manual change.
- Rejected: keeping the `ARG` and bumping by hand. Base image patches then lag behind the security fixes.

## Risks / Trade-offs

- [Only `linux/amd64` was built locally] → `node:26.13.0-trixie-slim` publishes `arm64`, and no stage of the CE image
  compiles native code. The release build in openvidu-deployment builds both platforms, and its smoke test runs on the
  result.
- [Node 26 behaviour changes in the runtime (removed or stricter APIs)] → every suite (unit, integration, both e2e) and
  the image smoke test pass on 26.13.0 with the current catalog.
- [A developer still on Node 24] → pnpm does not block on the root `engines`; the README and `.node-version` say 26,
  and CI runs 26.
- [Image size grows with the new Node] → 278 MB measured against the 300 MB budget; the smoke test enforces it.

## Migration Plan

- The image published for 3.10 ships Node 26. There is no data or configuration impact.
- Rollback: revert the commit, and the image builds on 24 again.
