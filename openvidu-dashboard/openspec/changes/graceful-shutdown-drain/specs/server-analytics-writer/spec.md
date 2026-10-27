## MODIFIED Requirements

### Requirement: Graceful shutdown
Edition: CE and PRO. On a first `SIGTERM` or `SIGINT` the server drains: it takes no new participants and waits for
the present ones to leave, whose leave events are written as usual; a second signal closes the rooms with
`SERVER_SHUTDOWN`. Once the rooms are closed the server SHALL flush the telemetry stats workers and operation queue
into the writer and write every queued event and stat before exiting, waiting at most 5 s; entries not written in that
window SHALL be counted as dropped. A node killed while it drains writes nothing more and its open sessions are left
to the reconciler.

#### Scenario: Planned restart
- **GIVEN** a node with active rooms and participants
- **WHEN** it receives `SIGTERM` and then a second `SIGTERM`
- **THEN** the database holds the `ROOM_ENDED (ROOM_END_SERVER_SHUTDOWN)` and `PARTICIPANT_LEFT` events and the entities are `closed`/`left` with the final stats flushed

#### Scenario: Killed while draining
- **GIVEN** a node with active participants that receives one `SIGTERM`
- **WHEN** it is killed before they leave, as `docker-compose down` does after its grace period
- **THEN** no end event of those sessions is written and the reconciler closes them as for a crashed node, with `closedBy: "reconciler"`

#### Scenario: Database unavailable at shutdown
- **GIVEN** an unreachable database
- **WHEN** the node receives `SIGTERM`
- **THEN** the process exits within 5 s of the signal and logs the number of dropped entries
