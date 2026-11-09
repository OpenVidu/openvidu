## MODIFIED Requirements

### Requirement: Analytics info tips
Edition: CE. The Analytics page SHALL carry info tips on the tiles Participant sessions, Unique identities, Connection
success and Data up / down, on the Total up and Total down tiles of the Data transferred card, and on the charts
Active rooms, Active participants, Participant kind, SDK and Data up / down.

#### Scenario: Analytics tiles
- **WHEN** the user opens the info tips of the tiles Participant sessions, Unique identities, Connection success and Data up / down
- **THEN** Participant sessions and Data up / down read the shared texts, Unique identities reads "Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice." and Connection success reads "Share of participant sessions that finished connecting; the rest were aborted before becoming active."

#### Scenario: Data transferred card
- **WHEN** the user opens the info tips of the Total up and Total down tiles and of the Data up / down chart
- **THEN** they read the shared Total up, Total down and Data up / down texts, and the card heading carries no info tip

#### Scenario: Analytics charts
- **WHEN** the user opens the info tips of the charts Active rooms, Active participants, Participant kind and SDK
- **THEN** they read "The most rooms open at the same time in each bucket, sampled every minute.", "The most participants connected at the same time in each bucket, sampled every minute. Only regular participants count.", "Every participant session by kind, services included." and the shared SDK text
