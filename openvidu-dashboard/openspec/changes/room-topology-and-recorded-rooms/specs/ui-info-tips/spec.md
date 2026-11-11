# Spec Delta

## MODIFIED Requirements

### Requirement: Analytics info tips
Edition: CE. The Analytics page SHALL carry info tips on the tiles Recorded rooms, Participant sessions, Unique
identities, Connection success and Data up / down, on the Total up and Total down tiles of the Data transferred card, and on the charts
Active rooms, Room topology, Recorded rooms, Room size by topology, Active participants, Participant sessions, Active egress, Active ingress, Participant kind, SDK and
Data up / down.

#### Scenario: Analytics tiles
- **WHEN** the user opens the info tips of the tiles Participant sessions, Unique identities, Connection success and Data up / down
- **THEN** Participant sessions and Data up / down read the shared texts, Unique identities reads "Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice." and Connection success reads "Share of participant sessions that finished connecting; the rest were aborted before becoming active."

#### Scenario: Data transferred card
- **WHEN** the user opens the info tips of the Total up and Total down tiles and of the Data up / down chart
- **THEN** they read the shared Total up, Total down and Data up / down texts, and the card heading carries no info tip

#### Scenario: Analytics charts
- **WHEN** the user opens the info tips of the charts Active rooms, Active participants, Participant kind and SDK
- **THEN** they read "The most rooms open at the same time in each bucket, sampled every minute.", "The most participants connected at the same time in each bucket, sampled every minute. Only regular participants count.", "Every participant session by kind, services included." and the shared SDK text

#### Scenario: Volume and egress and ingress peaks
- **WHEN** the user opens the info tips of the charts Participant sessions, Active egress and Active ingress
- **THEN** Participant sessions reads the shared Participant sessions text, Active egress reads "The most egress in progress at the same time in each bucket, sampled every minute." and Active ingress reads "The most ingress sessions publishing at the same time in each bucket, sampled every minute."

#### Scenario: Self-explanatory volume charts
- **WHEN** the charts Rooms created, Egress started and Ingress sessions render
- **THEN** none of them carries an info tip

#### Scenario: Topology and recording
- **WHEN** the user opens the info tips of the Recorded rooms tile and of the charts Room topology, Recorded rooms and Room size by topology
- **THEN** the tile reads "Share of the rooms ended in the range that were recorded: an egress with a file or HLS output started recording. Live streams and images alone do not count.", Room topology reads "Rooms ended in each bucket by their shape, from the most regular participants connected at once (N) and the most of them sending audio or video at once (P): Empty (N = 0), Single participant (N = 1), No publishers (P = 0), 1:1 (N = 2), 1:N (one sender, N ≥ 3) and N:M (several senders, N ≥ 3). A muted track counts once unmuted; agents, ingress and SIP participants do not count.", Recorded rooms reads "Share of the rooms ended in each bucket that were recorded: an egress with a file or HLS output started recording. Live streams and images alone do not count." and Room size by topology reads "Rooms ended in the range with several participants, by the most regular participants connected at once."
