## MODIFIED Requirements

### Requirement: Dependency update automation

Edition: CE. Dependabot SHALL watch the npm ecosystem of `/openvidu-dashboard` weekly, grouping minor and patch
updates and ignoring `@types/node` major updates, whose major follows the Node major of `.node-version`, next to the
weekly `github-actions` entry of the repository.

#### Scenario: Weekly update
- **WHEN** a dependency in the workspace catalog has a new patch version
- **THEN** Dependabot opens a pull request and the pipeline runs on it

#### Scenario: Node types stay on the runtime major
- **GIVEN** `.node-version` holds `26` and the catalog pins `@types/node` 26
- **WHEN** `@types/node` publishes a new major
- **THEN** Dependabot opens no pull request for it
