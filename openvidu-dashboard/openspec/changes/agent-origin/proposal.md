# Proposal

## Why

The Agents page cannot tell OpenVidu's own agents from any other LiveKit agent: every row reads identity
`agent-AJ_…`, no name, SDK PYTHON and kind AGENT. The data to tell them apart now exists: the writer keeps, for every
participant of kind `AGENT` and whatever `store_metadata` says, the attributes `lk.agent_name` (the name the agent's
worker registered, stamped by the server) and `openvidu.agent` (the mark OpenVidu agents set since
openvidu-agents `6663bd2`, its value the agent type). The dashboard does not read them yet, and two requirements of the
server-side specs kept here still say that attributes are stored only with `store_metadata`.

## What Changes

Edition: CE (the PRO dashboard takes it by moving `ce.ref` in a change of its own). Repositories: dashboard
(`openvidu/openvidu-dashboard`), and openvidu-livekit for tests, the vendored contract and one changelog line only;
openvidu-deployment is not touched.

Observable behaviour:

- **Agents page**: a new **Agent** column, second after SID, shows the agent name; an OpenVidu agent without a name
  (automatic dispatch registers none) shows its type, and an agent with neither shows "—". Sessions that carry the
  `openvidu.agent` mark get an **OpenVidu** tag beside the name. The column has an info tip and is not sortable.
- **Origin filter** on the Agents page: All / OpenVidu / Third-party, kept in the URL as `origin` and carried by
  "Export CSV". An agent without the mark has no tag and counts as third-party, which includes OpenVidu agent images
  older than 3.10 and sessions stored before the server kept these attributes.
- **API**: list items of kind `AGENT` of `GET /api/v1/participants` and `GET /api/v1/agents` gain an optional
  `agent { name?, openvidu? }`; `GET /api/v1/agents` and `GET /api/v1/agents/export.csv` accept
  `origin=openvidu|third-party`. No other attribute leaves the backend through the lists.
- **CSV**: the participants and agents exports gain the columns `agent.name` and `agent.openvidu` after
  `client.browserVersion` (19 to 21 columns, `mediaNode` still last with `per-node-breakdown`). Nothing released
  has the 19-column header, so this breaks no release.
- **Data contract**: the description of `participants.attributes` states what is stored without `store_metadata`, and
  the fixture agent carries both attributes, so the contract check proves end to end that the writer produces the keys
  the dashboard reads. No field, type or index changes; `SCHEMA_VERSION` stays 1, which no release has shipped.
- **Specs of the writer**: the `data-model` requirement on secrets and personal data and `server-analytics-writer`
  "Personal data flags" state the agent exception that openvidu-livekit `15b31983` already implements. No writer
  behaviour changes.
- **Generated data**: the data generator gives its agents the two attributes, so the demo and the query plan suites
  hold both origins.

CHANGELOG lines (3.10.0, unreleased):

- Added, UI: "The Agents page names each agent, tags the agents that declare themselves OpenVidu agents and filters by
  origin: OpenVidu or third-party."
- Added, Data: "Agent sessions carry their agent name and OpenVidu agent type in the participants and agents lists and
  their CSV exports (`agent.name`, `agent.openvidu`), and `GET /api/v1/agents` filters them with `origin`."

Not in scope:

- The PRO dashboard (`openvidu-pro/openvidu-dashboard`): its participant detail, its specs and the tests that pin the
  list item or the 19-column header are adapted in the PRO change that moves `ce.ref`.
- Any change to the writer's behaviour, to openvidu-agents or to openvidu-deployment; the openvidu.io documentation
  page.
- Search by agent name (`q` stays an identity prefix or a SID), sorting by Agent, tiles or counters per origin, and any
  change to the Participants page, the Overview or the Rooms pages.
- A third "unknown" origin for sessions without stored agent attributes: the owner chose two origins.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agents-ui`: the Agents table gains the Agent column (new requirement for its cell and tag), and the page gains the
  Origin filter, carried by the list request and the CSV export.
- `participants-api`: list items of kind `AGENT` carry `agent { name?, openvidu? }`; the agents list and its export
  accept `origin`; the CSV exports gain two columns.
- `ui-info-tips`: the Agent column of the Agents table carries an info tip.
- `data-model`: "Secrets and personal data" is restated as "Stored secrets and personal data" with the agent
  attributes stored without `store_metadata` (removed and added, since a modified requirement cannot rename the
  scenario it shares by name with `server-analytics-writer`); the data generator gives its agents those attributes.
- `server-analytics-writer`: "Personal data flags" refers to the agent exception, stated in a new requirement whose
  scenarios are the two tests the writer already has.

## Impact

- `dashboard-ce/typings`: API types (`ParticipantListItem.agent`, the origin values, the attribute keys), the
  `attributes` description in `contract/schemas.ts`, the fixture agent, and the regenerated `schema/` and `fixtures/`.
- `dashboard-ce/backend`: the participants slice (schemas, query, mapper, responses, CSV columns) and its unit,
  integration and query plan tests. The origin filter is a residual filter on the index scans the list already uses;
  it needs MongoDB 5.0 or newer (`$getField`), as the bundled 8.0 is.
- `dashboard-ce/frontend`: the Agents page, the shared participant sessions table, labels and info texts.
- `dashboard-ce/e2e`: participant fixtures, the mocked API and the agents and info tips suites.
- `dashboard-ce/tools/data-generator`: agent attributes.
- openvidu-livekit (`openvidu/main`), by the orchestrator: one tests-only commit that titles the writer's privacy
  tests after the scenarios of the two corrected requirements, and a second commit with the vendored contract, the
  agent of the contract scenario carrying the two attributes and one line in `CHANGELOG-openvidu.md` about the
  attributes agents keep without `store_metadata`. Both are pushed before the dashboard, whose CI `contract` job
  diffs the vendored contract of `openvidu/main`.
- No new dependency.
