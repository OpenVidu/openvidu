# Spec Delta

## ADDED Requirements

### Requirement: Agents list info tips
Edition: CE. The Agent column of the Agents table SHALL carry an info tip with the text "Name the agent registered
with; an OpenVidu agent without one shows its type. The OpenVidu tag marks agents that declare themselves, as OpenVidu
agents do from 3.10; every other agent counts as third-party." The Origin filter carries no info icon.

#### Scenario: Agent column info tip
- **WHEN** the user opens the info tip of the Agent header on the Agents page
- **THEN** it reads "Name the agent registered with; an OpenVidu agent without one shows its type. The OpenVidu tag marks agents that declare themselves, as OpenVidu agents do from 3.10; every other agent counts as third-party.", the table keeps its sort, and the Origin select has no info icon
