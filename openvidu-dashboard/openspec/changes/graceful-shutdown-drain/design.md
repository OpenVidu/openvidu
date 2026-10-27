# Design

## Context

- On the first `SIGINT`, `SIGTERM` or `SIGQUIT` the server calls `Stop(false)`: it drains the router and waits, every
  5 s, until it has no participants. A second signal calls `Stop(true)`, which does not wait; the server then closes
  its rooms with `SERVER_SHUTDOWN` and `openvidu.Stop` flushes telemetry and the analytics queues for at most 5 s.
- `docker-compose down` sends one `SIGTERM` and kills the container after its stop grace period.

## Goals / Non-Goals

**Goals:**
- The spec says what a planned stop and a forced stop leave in the store.

**Non-Goals:**
- Closing rooms on the first signal, which would cut the graceful drain of media nodes.

## Decisions

### Describe the drain

The drain is the server's contract with clients and with the scale-in of media nodes; the analytics writer follows it.
The requirement now covers the drain, the second signal and the kill during the drain.

### Data model

- No change.
