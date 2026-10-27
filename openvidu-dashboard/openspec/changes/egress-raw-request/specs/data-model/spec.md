## MODIFIED Requirements

### Requirement: Egress document
Edition: CE and PRO. An `egresses` document SHALL describe one egress: room reference, type, source,
lifecycle status with history, timestamps, error, a sanitized request summary, the request in raw payload encoding and
its outputs, with the field list of the shared contract. `roomNameLower` SHALL be the lower-cased `roomName`, written
together with it. `rawRequest` SHALL hold the request as the raw events of the egress store `egress.request`: the
member of the request oneof that is set, under its protocol name, through the secrets allow-list.

#### Scenario: Fields of an egress document
- **WHEN** an egress document is read
- **THEN** it has `roomSid`, `roomName`, `roomNameLower`, `type` (`room_composite` | `web` | `participant` | `track_composite` | `track`), `sourceType`, `status` (`starting` | `active` | `ending` | `complete` | `failed` | `aborted` | `limit_reached`), `closedBy`, `startedAt`, `updatedAt`, `endedAt`, `durationMs`, `error`, `errorCode`, `request` (sanitized), `rawRequest?`, `outputs[] { kind, name or url, location, size, durationMs, status, error, startedAt, endedAt }`, `statusHistory[]` with at most 50 entries, `retryCount`, `backupStorageUsed`, `schemaVersion`, `expiresAt`

#### Scenario: Egress completes
- **GIVEN** `EGRESS_STARTED`, two `EGRESS_UPDATED` and `EGRESS_ENDED` with status COMPLETE and one file result
- **WHEN** all are processed
- **THEN** the document has `status: "complete"`, one output of kind `file` with its filename, location, size and duration, and four `statusHistory` entries

#### Scenario: Credentials are never stored
- **GIVEN** an egress request with S3 credentials and a stream URL containing a key
- **WHEN** the egress is projected
- **THEN** neither `request` nor `rawRequest` contains a credential field, and the stream output URL has its key redacted

#### Scenario: Raw request
- **GIVEN** a room composite egress of room `Demo-Room` with layout `grid`, preset `H264_720P_30`, an MP4 file output with path `recordings/demo.mp4` uploaded to S3 with credentials, and a stream output to `rtmps://live.example.com/app/live_123?token=abc`
- **WHEN** its `EGRESS_STARTED` event is processed
- **THEN** `rawRequest` is `{ room_composite: { room_name: "Demo-Room", layout: "grid", options: { preset: "H264_720P_30" }, file_outputs: [{ file_type: "MP4", filepath: "recordings/demo.mp4" }], stream_outputs: [{ urls: ["rtmps://live.example.com/app/***"] }] } }`, the value of `payload.egress.request` in the stored event

#### Scenario: Room name search field
- **GIVEN** an egress of room `Demo-Room`
- **WHEN** its document is read
- **THEN** it has `roomName: "Demo-Room"` and `roomNameLower: "demo-room"`

#### Scenario: Web egress without room
- **GIVEN** a web egress, which has no room
- **WHEN** its document is read
- **THEN** it has neither `roomName` nor `roomNameLower`
