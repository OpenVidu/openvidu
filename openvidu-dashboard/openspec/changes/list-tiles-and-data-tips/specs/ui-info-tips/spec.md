## MODIFIED Requirements

### Requirement: Shared term explanations

Edition: CE. Terms that appear on several pages SHALL use one text each in their info tips, so that the same term never
reads two ways: Participant sessions, Unique identities, Services, Data up / down, Total up, Total down and SDK.

#### Scenario: Participant sessions and unique identities
- **WHEN** the user opens the info tip of a "Participant sessions" or "Unique identities" label on any page
- **THEN** Participant sessions reads "Each time someone joins a room starts a participant session; leaving and joining again starts another. Only regular participants count: egress, ingress and agents are services." and Unique identities reads "Distinct participant identities among those sessions: someone who joined three times counts once."

#### Scenario: Services

- **WHEN** the user opens the info tip of a "Services" label
- **THEN** it reads "Egress, ingress, agent and other non-user sessions. They join rooms as participants but are not
  counted as participants."

#### Scenario: Traffic and network terms

- **WHEN** the user opens the info tip of a "Data up / down" or "SDK" label
- **THEN** they read, in that order, "Up: bytes the participants sent to the server. Down: bytes the server sent to
  the participants." and "Software development kit the client connected with."

#### Scenario: Totals of each direction

- **WHEN** the user opens the info tip of a "Total up" or "Total down" label
- **THEN** they read, in that order, "Bytes the participants sent to the server." and "Bytes the server sent to the
  participants."

### Requirement: Analytics info tips
Edition: CE. The Analytics page SHALL carry info tips on the tiles Participant sessions, Unique identities, Connection
success and Data up / down, on the Total up and Total down tiles of the Data transferred card, and on the charts
Participant sessions, Participant kind, SDK and Data up / down.

#### Scenario: Analytics tiles
- **WHEN** the user opens the info tips of the tiles Participant sessions, Unique identities, Connection success and Data up / down
- **THEN** Participant sessions and Data up / down read the shared texts, Unique identities reads "Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice." and Connection success reads "Share of participant sessions that finished connecting; the rest were aborted before becoming active."

#### Scenario: Data transferred card
- **WHEN** the user opens the info tips of the Total up and Total down tiles and of the Data up / down chart
- **THEN** they read the shared Total up, Total down and Data up / down texts, and the card heading carries no info tip

#### Scenario: Analytics charts
- **WHEN** the user opens the info tips of the charts Participant sessions, Participant kind and SDK
- **THEN** they read "Participant sessions that started in each bucket, and those aborted before becoming active. Only regular participants count.", "Every participant session by kind, services included." and the shared SDK text

### Requirement: Rooms list info tips
Edition: CE. The Rooms page SHALL carry info tips on the Sessions in range tile and on the Unique identities, Active,
Data up / down and Features column headers, in the table and in the cards of the phone layout.

#### Scenario: Rooms tile and columns
- **WHEN** the user opens the info tips of the Sessions in range tile and of the Unique identities, Active, Data up / down and Features headers
- **THEN** the tile reads the shared Participant sessions text, Unique identities and Data up / down read the shared texts, Active reads "Regular participants connected now." and Features reads "Services the room used: E egress, I ingress, A agent."

#### Scenario: Data up / down on a phone
- **GIVEN** a 375 px viewport
- **WHEN** the room cards render
- **THEN** the Data up / down label of each card carries the info tip with the shared text, and, for a room without
  media statistics, the media statistics warning as well

### Requirement: Participants list info tips
Edition: CE. The Participants page SHALL carry info tips on the tiles Services active now and Sessions in range; the
Services active now tile has no tooltip of its own.

#### Scenario: Participants tiles
- **WHEN** the user opens the info tips of Services active now and Sessions in range
- **THEN** they read the shared Services and Participant sessions texts

### Requirement: No info tips on self-explanatory labels
Edition: CE. Labels whose meaning is plain (identifiers, names, times, durations, status, kind, codec, node, totals of
counts), filters, header controls and state cues SHALL carry no info icon; a state stays explained by the tooltip of
its cue.

#### Scenario: Rooms table
- **WHEN** the Rooms table renders
- **THEN** SID, Name, Status, Started, Ended and Duration carry no info icon, and the estimated end keeps its tooltip on the dotted cue
