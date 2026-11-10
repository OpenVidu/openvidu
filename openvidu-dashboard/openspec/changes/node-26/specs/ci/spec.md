## MODIFIED Requirements

### Requirement: Dependency update automation

Edition: CE. Dependabot SHALL watch the npm ecosystem of `/openvidu-dashboard` weekly, grouping minor and patch
updates and ignoring `@types/node` majors, whose major follows the Node major of `.node-version`, next to the weekly
`github-actions` entry of the repository.

#### Scenario: Weekly update
- **WHEN** a dependency in the workspace catalog has a new patch version
- **THEN** Dependabot opens a pull request and the pipeline runs on it

#### Scenario: Node types stay on the runtime major
- **GIVEN** `.node-version` holds `26` and the catalog pins `@types/node` 26
- **WHEN** `@types/node` publishes a new major
- **THEN** Dependabot opens no pull request for it

## ADDED Requirements

### Requirement: Node image updates

Edition: CE. Dependabot SHALL watch the Docker ecosystem of `/openvidu-dashboard/dashboard-ce/docker` weekly,
proposing the minor and patch versions of the Node.js image that every `FROM` line names in full, and ignoring Node
majors, which are adopted by hand with `.node-version`.

#### Scenario: Node image patch
- **GIVEN** both `FROM` lines of the Dockerfile name `node:26.13.0-trixie-slim`
- **WHEN** `node:26.13.1-trixie-slim` is published
- **THEN** Dependabot opens one pull request that updates both lines, and the pipeline runs on it

#### Scenario: Node image major
- **WHEN** an image of the next Node major is published
- **THEN** Dependabot opens no pull request for it
