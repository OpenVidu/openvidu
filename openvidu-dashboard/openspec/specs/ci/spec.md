# ci Specification

## Purpose
The GitHub Actions pipeline of the dashboard workspace in the `openvidu` repository: which checks gate every
change of the dashboard, where they run, how they are pinned and cached, and how dependencies are kept
current. The image is built and published by the release workflow of `openvidu-deployment`, not here.

## Requirements

### Requirement: Triggers and path filters
Edition: CE. The workflow `openvidu-dashboard-ci.yml` SHALL run on pushes to `master`, on pull requests to `master`
and on `workflow_dispatch`, only when files under `openvidu-dashboard/**` or the workflow itself change. Runs on the
same ref SHALL cancel in-progress runs.

#### Scenario: Unrelated change
- **WHEN** a pull request changes only files outside `openvidu-dashboard/` and the workflow file
- **THEN** the workflow does not run

#### Scenario: Superseded run
- **GIVEN** a run in progress for a branch
- **WHEN** a new push to the same branch arrives
- **THEN** the earlier run is cancelled

#### Scenario: Merge to master
- **WHEN** a pull request that changes `openvidu-dashboard/` is merged into `master`
- **THEN** the workflow runs on the resulting push to `master`

### Requirement: GitHub-hosted runners
Edition: CE. Every job SHALL run on `ubuntu-latest` and use no secret, so pull requests from forks run the same jobs.

#### Scenario: Default run
- **WHEN** the workflow runs on a pull request
- **THEN** every job executes on `ubuntu-latest`

### Requirement: Actions pinned by commit SHA
Edition: CE. Every `uses:` reference SHALL point to a full 40-character commit SHA with the version as a
trailing comment.

#### Scenario: Workflow audit
- **WHEN** the workflow file is inspected
- **THEN** no `uses:` references a tag or branch

### Requirement: Static checks job
Edition: CE. A job SHALL run `./dashboard.sh lint`, `format-check`, `typecheck` and `spec-validate` with
`--skip-install` after a frozen-lockfile install; any warning fails the job.

#### Scenario: Lint warning
- **GIVEN** a change that introduces an ESLint warning
- **WHEN** the checks job runs
- **THEN** it fails

### Requirement: Unit test job
Edition: CE. A job SHALL run `./dashboard.sh test-unit` (Vitest in every package) and fail on any failing
test.

#### Scenario: Failing unit test
- **GIVEN** a failing Vitest test in any package
- **WHEN** the unit job runs
- **THEN** it fails and the report names the test

### Requirement: Integration test job with a real MongoDB
Edition: CE. A job SHALL run `./dashboard.sh test-integration`, which starts a MongoDB 8 replica set with
Testcontainers. The job SHALL fail, not skip, when Docker is unavailable on the runner.

#### Scenario: Docker available
- **GIVEN** a runner with a working Docker daemon
- **WHEN** the integration job runs
- **THEN** repository tests execute against a MongoDB 8 replica set and pass

#### Scenario: Docker unavailable
- **GIVEN** a runner without Docker
- **WHEN** the integration job runs
- **THEN** it fails with a message stating that Docker is required

### Requirement: End-to-end job

Edition: CE. A job SHALL run `./dashboard.sh e2e`: build the application, seed a MongoDB with fixtures, run the
Playwright suites against it, and upload the Playwright reports and test results as one artifact on failure.

#### Scenario: Report on failure
- **GIVEN** a failing Playwright test
- **WHEN** the e2e job finishes
- **THEN** it fails and an `openvidu-dashboard-playwright-report` artifact is attached to the run

### Requirement: Writer contract job

Edition: CE. A job SHALL check out `openvidu-livekit` at `openvidu/main` and run
`./dashboard.sh contract-check` against it, after installing only the backend and its workspace dependencies.
The job fails when the writer does not vendor this contract, its structs do not produce the fixtures, its server
rejects a fixture or the schema versions differ.

#### Scenario: Contract drift
- **GIVEN** a contract change in `dashboard-ce/typings` that the writer branch has not vendored
- **WHEN** the contract job runs
- **THEN** it fails

### Requirement: Dependency update automation

Edition: CE. Dependabot SHALL watch the npm ecosystem of `/openvidu-dashboard` weekly, grouping minor and patch
updates and ignoring `@types/node` major updates while the dashboard runs on Node.js 24, in addition to the existing
`github-actions` entry.

#### Scenario: Weekly update
- **WHEN** a dependency in the workspace catalog has a new patch version
- **THEN** Dependabot opens a pull request and the pipeline runs on it

### Requirement: Caching
Edition: CE. Jobs that install the workspace SHALL cache the pnpm store keyed by `pnpm-lock.yaml`.

#### Scenario: Unchanged lockfile
- **GIVEN** a previous run with the same `pnpm-lock.yaml`
- **WHEN** a job installs dependencies
- **THEN** the pnpm store is restored from cache
