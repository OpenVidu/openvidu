# Spec Delta

## MODIFIED Requirements

### Requirement: API read timeout

Edition: CE. Every API read of the UI except CSV downloads SHALL fail with the error code `TIMEOUT` when the server has
not answered within 30 s; the page or section that sent it keeps its last data under the error notice "The server took
too long to answer; the data shown may be out of date." and a later refresh sends a new request.

#### Scenario: Slow CSV download
- **GIVEN** a Rooms list CSV export that the server needs 45 s to send
- **WHEN** the download completes
- **THEN** the file is saved and no timeout error is shown

#### Scenario: Hung list request

- **GIVEN** a rooms list whose request does not answer
- **WHEN** 30 s elapse
- **THEN** the request is cancelled and the page keeps its last rows under the error notice "The server took too
  long to answer; the data shown may be out of date." with Retry
