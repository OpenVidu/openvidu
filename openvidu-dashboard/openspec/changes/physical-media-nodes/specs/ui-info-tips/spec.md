## MODIFIED Requirements

### Requirement: Overview info tips
Edition: CE. The Overview SHALL carry info tips on the live tiles Participants, Publishers and Agents, the Today tiles
Participants and Minutes, the Data pipeline card and the Unique identities column of Recent rooms, and on no other tile,
card or column of its own.

#### Scenario: Live tiles
- **WHEN** the user opens the info tips of the live tiles Participants, Publishers and Agents
- **THEN** they read "Regular participants connected now. Egress, ingress and agents are not counted.", "Participants connected now that publish at least one track: camera, microphone or screen." and "Agent sessions connected now. Agents join rooms as participants of kind Agent but are not counted as participants."

#### Scenario: Today tiles
- **WHEN** the user opens the info tips of the Today tiles Participants and Minutes
- **THEN** they read "Participant sessions that started today. Only regular participants count." and "Minutes of the participant sessions that ended today."

#### Scenario: Data pipeline and recent rooms
- **WHEN** the user opens the info tips of the Data pipeline card and of the Recent rooms "Unique identities" header
- **THEN** the card's reads "The OpenVidu server writes analytics in batches. This card shows when the last batch arrived." and the header's reads the shared Unique identities text
