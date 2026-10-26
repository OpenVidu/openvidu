# ui-info-tips Specification

## Purpose
Which headings, labels and columns of each page carry an info tip, and the text each tip shows, so that a newcomer
can learn the terms the dashboard uses (participant sessions, unique identities, services and others) without leaving
the page.

## Requirements

### Requirement: Shared term explanations

Edition: CE. Terms that appear on several pages SHALL use one text each in their info tips, so that the same term never
reads two ways: Participant sessions, Unique identities, Services, Data up / down and SDK.

#### Scenario: Participant sessions and unique identities
- **WHEN** the user opens the info tip of a "Participant sessions" or "Unique identities" label on any page
- **THEN** Participant sessions reads "Each time someone joins a room starts a participant session; leaving and joining again starts another. Only regular participants count: egress, ingress and agents are services." and Unique identities reads "Distinct participant identities among those sessions: someone who joined three times counts once."

#### Scenario: Services and quality

- **WHEN** the user opens the info tip of a "Services" label
- **THEN** it reads "Egress, ingress, agent and other non-user sessions. They join rooms as participants but are not
  counted as participants."

#### Scenario: Traffic and network terms

- **WHEN** the user opens the info tip of a "Data up / down" or "SDK" label
- **THEN** they read, in that order, "Up: bytes the participants sent to the server. Down: bytes the server sent to
  the participants." and "Software development kit the client connected with."

### Requirement: Overview info tips
Edition: CE. The Overview SHALL carry info tips on the live tiles Participants, Publishers and Agents, the Today tiles
Participants and Minutes, the Data pipeline card and the Unique identities column of Recent rooms, and on no other tile,
card or column.

#### Scenario: Live tiles
- **WHEN** the user opens the info tips of the live tiles Participants, Publishers and Agents
- **THEN** they read "Regular participants connected now. Egress, ingress and agents are not counted.", "Participants connected now that publish at least one track: camera, microphone or screen." and "Agent sessions connected now. Agents join rooms as participants of kind Agent but are not counted as participants."

#### Scenario: Today tiles
- **WHEN** the user opens the info tips of the Today tiles Participants and Minutes
- **THEN** they read "Participant sessions that started today. Only regular participants count." and "Minutes of the participant sessions that ended today."

#### Scenario: Data pipeline and recent rooms
- **WHEN** the user opens the info tips of the Data pipeline card and of the Recent rooms "Unique identities" header
- **THEN** the card's reads "The OpenVidu server writes analytics in batches. This card shows when the last batch arrived and how many nodes are reporting." and the header's reads the shared Unique identities text

### Requirement: Analytics info tips
Edition: CE. The Analytics page SHALL carry info tips on the tiles Participant sessions, Unique identities, Connection
success and Data up / down and on the charts Participant sessions, Participant kind and SDK.

#### Scenario: Analytics tiles
- **WHEN** the user opens the info tips of the tiles Participant sessions, Unique identities, Connection success and Data up / down
- **THEN** Participant sessions and Data up / down read the shared texts, Unique identities reads "Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice." and Connection success reads "Share of participant sessions that finished connecting; the rest were aborted before becoming active."

#### Scenario: Analytics charts
- **WHEN** the user opens the info tips of the charts Participant sessions, Participant kind and SDK
- **THEN** they read "Participant sessions that started in each bucket, and those aborted before becoming active. Only regular participants count.", "Every participant session by kind, services included." and the shared SDK text

### Requirement: Rooms list info tips
Edition: CE. The Rooms page SHALL carry info tips on the Participant sessions tile and on the Unique identities, Active
and Features column headers, in the table and in the cards of the phone layout.

#### Scenario: Rooms tile and columns
- **WHEN** the user opens the info tips of the Participant sessions tile and of the Unique identities, Active and Features headers
- **THEN** the tile and Unique identities read the shared texts, Active reads "Regular participants connected now." and Features reads "Services the room used: E egress, I ingress, A agent."

### Requirement: Participants list info tips
Edition: CE. The Participants page SHALL carry info tips on the tiles Sessions in range and Services now; the Services
now tile has no tooltip of its own.

#### Scenario: Participants tiles
- **WHEN** the user opens the info tips of Sessions in range and Services now
- **THEN** they read the shared Participant sessions and Services texts

### Requirement: Ingress info tips
Edition: CE. The Ingress page SHALL carry an info tip on the Sessions in range tile, with the text "An ingress is a
reusable input; each stream published to it is one session."

#### Scenario: Ingress list tile
- **WHEN** the user opens the info tip of Sessions in range on the Ingress page
- **THEN** it reads "An ingress is a reusable input; each stream published to it is one session."

### Requirement: No info tips on self-explanatory labels
Edition: CE. Labels whose meaning is plain (identifiers, names, times, durations, status, kind, codec, node, totals),
filters, header controls and state cues SHALL carry no info icon; a state stays explained by the tooltip of its cue.

#### Scenario: Rooms table
- **WHEN** the Rooms table renders
- **THEN** SID, Name, Status, Started, Ended and Duration carry no info icon, and the estimated end keeps its tooltip on the dotted cue
