## ADDED Requirements

### Requirement: Database without pipeline updates
Edition: CE and PRO. Before initializing the database, the writer SHALL check, without writing, that it runs updates
with an aggregation pipeline. When it does not, the server SHALL log an error naming the reason and that analytics and
the dashboard require MongoDB, write nothing to that database and start without analytics; any other analytics startup
failure SHALL still stop the server.

#### Scenario: Amazon DocumentDB as external database
- **GIVEN** `openvidu.analytics.enabled: true` and `mongo_url` pointing to an Amazon DocumentDB cluster
- **WHEN** the server starts
- **THEN** it logs an error saying that the database does not support updates with aggregation pipelines and that analytics and the dashboard require MongoDB, accepts participants, and no analytics collection is created in the cluster

#### Scenario: Unreachable MongoDB
- **GIVEN** `mongo_url` pointing to a MongoDB that does not answer
- **WHEN** the server starts
- **THEN** it refuses to start, as before
