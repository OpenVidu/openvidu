## MODIFIED Requirements

### Requirement: Reproducible dependency installation
Edition: CE. The image build SHALL install dependencies with pnpm from the committed lockfile in frozen mode
and SHALL use a Node base image of the major in `.node-version`, pinned to an exact version tag.

#### Scenario: Lockfile out of date
- **GIVEN** a `package.json` change not reflected in `pnpm-lock.yaml`
- **WHEN** the image is built
- **THEN** the build fails at the install step instead of resolving new versions

#### Scenario: Node major of the workspace
- **GIVEN** `.node-version` holds `26`
- **WHEN** the image is built and `node --version` runs in it
- **THEN** it reports the exact `26.x.y` version the Dockerfile pins

### Requirement: CE runtime is a plain Node image without private dependencies

Edition: CE. The CE image SHALL run the built backend (which serves the SPA) on an official Node image of the major in
`.node-version`, with only production dependencies and no private package; npm, npx, corepack and yarn SHALL be absent
from the runtime image.

#### Scenario: CE build needs no private access
- **GIVEN** no build secret and no credentials for private repositories
- **WHEN** the CE image is built
- **THEN** the build succeeds

#### Scenario: CE image carries no private package

- **WHEN** the CE image filesystem is searched for packages of private repositories
- **THEN** nothing is found
