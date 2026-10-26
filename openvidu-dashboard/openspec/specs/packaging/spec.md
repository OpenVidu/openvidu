# packaging Specification

## Purpose
Defines how the dashboard is built into its container image and what the image guarantees to whoever runs it:
location of the Dockerfile, build arguments, base images, user, ports, health check, architectures and size budget.

## Requirements

### Requirement: One Dockerfile per edition inside its package

Edition: CE. The CE edition SHALL be built from `dashboard-ce/docker/Dockerfile`, with the workspace root
(`openvidu-dashboard/`) as build context, so one `docker build` sees the lockfile and every package.

#### Scenario: CE image built from the workspace root
- **GIVEN** a checkout of the workspace
- **WHEN** `docker build -f dashboard-ce/docker/Dockerfile .` runs from `openvidu-dashboard/`
- **THEN** it produces a runnable CE image without any other input

### Requirement: Base href build argument
Edition: CE. The Dockerfile SHALL accept the build argument `BASE_HREF` (default `/`) and build the SPA
with it, so the application can be served under a path prefix such as `/dashboard/`.

#### Scenario: Prefixed base href
- **WHEN** the image is built with `--build-arg BASE_HREF=/dashboard/`
- **THEN** the served `index.html` declares `<base href="/dashboard/">` and its assets resolve under that prefix

#### Scenario: Default base href
- **WHEN** the image is built without `BASE_HREF`
- **THEN** the served `index.html` declares `<base href="/">`

### Requirement: Reproducible dependency installation
Edition: CE. The image build SHALL install dependencies with pnpm from the committed lockfile in frozen mode
and SHALL use a Node 24 base image pinned to an exact version tag.

#### Scenario: Lockfile out of date
- **GIVEN** a `package.json` change not reflected in `pnpm-lock.yaml`
- **WHEN** the image is built
- **THEN** the build fails at the install step instead of resolving new versions

### Requirement: CE runtime is a plain Node image without private dependencies

CE edition. The CE image SHALL run the built backend (which serves the SPA) on an official Node 24 image with only
production dependencies and no private package; npm, npx and corepack SHALL be absent from the runtime image.

#### Scenario: CE build needs no private access
- **GIVEN** no build secret and no credentials for private repositories
- **WHEN** the CE image is built
- **THEN** the build succeeds

#### Scenario: CE image carries no licensing package

- **WHEN** the CE image filesystem is searched for packages of private repositories
- **THEN** nothing is found

### Requirement: Non-root runtime user
Edition: CE. The main process of the image SHALL run as a non-root user with uid 1000 and gid 1000.

#### Scenario: Process identity
- **WHEN** a container of the image is running
- **THEN** its main process reports uid 1000 and the application files are readable by that user

### Requirement: Exposed port and container health check
Edition: CE. The image SHALL declare `EXPOSE 5000` and a `HEALTHCHECK` that requests
`GET /api/healthcheck` on `127.0.0.1:${SERVER_PORT}` (default 5000) without external tools.

#### Scenario: Healthy container
- **GIVEN** a container that has started listening
- **WHEN** Docker evaluates the health check
- **THEN** the container becomes `healthy` within the start period

#### Scenario: Custom port
- **GIVEN** a container started with `SERVER_PORT=6000`
- **WHEN** Docker evaluates the health check
- **THEN** the check targets port 6000 and the container becomes `healthy`

### Requirement: Multi-architecture images

Edition: CE. The Dockerfile SHALL build for `linux/amd64` and `linux/arm64` the way OpenVidu Meet does: the
platform-independent build stage runs once on `$BUILDPLATFORM` and only the final stage runs per target
platform (buildx with QEMU on the self-hosted runner, no native arm64 runner).

#### Scenario: Multi-platform build
- **WHEN** the image is built with `--platform linux/amd64,linux/arm64`
- **THEN** the resulting manifest list contains both platforms and each variant starts on its architecture

### Requirement: No timezone database in the images
Edition: CE. The image SHALL NOT install `tzdata`; timestamps are stored and logged in UTC and time zone
conversion for bucketing uses the data bundled with Node.

#### Scenario: Time zone conversion without tzdata
- **GIVEN** a container with `TZ` unset and no `/usr/share/zoneinfo`
- **WHEN** a time-series request specifies `tz=Europe/Madrid`
- **THEN** buckets are aligned to that zone and log timestamps are UTC

### Requirement: Signal delivery to the application process
Edition: CE. The image `CMD` SHALL use exec form so the application process is PID 1 and receives `SIGTERM`
directly.

#### Scenario: docker stop
- **GIVEN** a running container of the image
- **WHEN** `docker stop` is issued with the default 10 s timeout
- **THEN** the container exits with code 0 before the timeout, without being killed

### Requirement: Image names and build wrapper

Edition: CE. The image SHALL keep the name `openvidu/openvidu-dashboard`. `./dashboard.sh build-image ce` SHALL build
it honouring
`IMAGE_TAG` (default `dev`) and `BASE_HREF` (default `/`).

#### Scenario: Wrapper builds CE
- **WHEN** `./dashboard.sh build-image ce` runs
- **THEN** the image `openvidu/openvidu-dashboard:dev` exists locally

### Requirement: Image size budget

Edition: CE. The uncompressed `linux/amd64` CE image SHALL NOT exceed 300 MB; the image smoke test
(`./dashboard.sh smoke-image ce`) enforces the budget.

#### Scenario: Budget exceeded
- **WHEN** a built image is larger than its budget
- **THEN** the smoke test fails and reports the measured size

### Requirement: Supply-chain verification inside the image build
Edition: CE. The Dockerfile SHALL install Aikido safe-chain in the build stage and run `npm safe-chain-verify`
(with `SAFE_CHAIN_MINIMUM_PACKAGE_AGE_HOURS=0`, as the previous images did) before installing dependencies, so the
verification runs wherever the image is built.

#### Scenario: Build with a flagged package
- **GIVEN** a lockfile that resolves a package flagged as malicious by safe-chain
- **WHEN** the image is built
- **THEN** the build fails in the verification step before any dependency is installed
