## MODIFIED Requirements

### Requirement: Media node label
Edition: CE and PRO. A server edition MAY give the writer, before the analytics start, a media node label: a name of
the machine that stays the same across restarts. With a label the writer SHALL stamp it as `mediaNode` on the rooms and
participant sessions it hosts, following their `nodeId` as `mediaStats` does, and key the node scope of its rollups by
it, egress and ingress counters excepted; without one it SHALL write no `mediaNode` and no node scope. The CE server
sets no label.

#### Scenario: Room created on a labelled node
- **GIVEN** a server with the media node label `mn-a`
- **WHEN** it writes `ROOM_CREATED` and `PARTICIPANT_JOINED` of a new room
- **THEN** the room and the participant session have its `nodeId` and `mediaNode: "mn-a"`, and the hourly rollup of
  the bucket has the `global` and `node:mn-a` documents with `rooms.created` incremented

#### Scenario: Server without a label
- **GIVEN** a CE server
- **WHEN** it writes `ROOM_CREATED`
- **THEN** the room has no `mediaNode` field and the rollups of the bucket get only the `global` document

#### Scenario: Restart keeps the label
- **GIVEN** a server with the label `mn-a` that restarts and gets a new node id
- **WHEN** it writes a new room
- **THEN** the room has the new `nodeId` and `mediaNode: "mn-a"`, and its rollups go to `node:mn-a`

#### Scenario: Room touched first by another node
- **GIVEN** a room document created by an egress event written by a server with the label `mn-b`
- **WHEN** the server with the label `mn-a` that hosts the room writes its `ROOM_CREATED`
- **THEN** the room has that server's `nodeId` and `mediaNode: "mn-a"`

#### Scenario: Egress counted globally
- **GIVEN** a server with the label `mn-a`
- **WHEN** it writes `EGRESS_STARTED` and `EGRESS_ENDED` of a room composite egress within one hour
- **THEN** the `global` documents of the 5-minute, hourly and daily rollups count it (`egress.started`,
  `egress.byType`, `egress.endedByStatus`, `egress.durationMs` and the 5-minute `egress.started` and `egress.ended`),
  the `node:mn-a` documents have no `egress` field, and the egress document has no `mediaNode` field

#### Scenario: Ingress counted globally
- **GIVEN** a server with the label `mn-a`
- **WHEN** it writes `INGRESS_STARTED` and `INGRESS_ENDED` of an RTMP ingress session within one hour
- **THEN** the `global` hourly and daily documents count it (`ingress.sessionsStarted`, `ingress.sessionsEnded`,
  `ingress.byInputType`, `ingress.durationMs`), the `node:mn-a` documents have no `ingress` field, and the ingress
  session has no `mediaNode` field
