## MODIFIED Requirements

### Requirement: Summary tiles

Edition: CE. The Rooms page SHALL show four KPI tiles from the summary endpoint above the filters, in this order:
Active now (active rooms), Participants active now, Rooms in range and Sessions in range (participant sessions, with
the shared Participant sessions info tip); approximate values carry a tooltip saying the range exceeds the exact-count
limit, and the tiles keep their last value while refreshing.

#### Scenario: Tiles after load

- **GIVEN** the summary answers `{ activeRooms: 7, roomsInRange: 120, participantSessions: 900, activeParticipants: 31, approximate: false }`
- **WHEN** the page renders
- **THEN** the tiles read "Active now 7", "Participants active now 31", "Rooms in range 120" and "Sessions in range
  900" with tabular figures and no approximation hint

#### Scenario: Approximate counts

- **GIVEN** a 30-day range and `approximate: true`
- **WHEN** the tiles render
- **THEN** Rooms in range and Sessions in range show a "≈" prefix and the tooltip explains the counts are hour-aligned
  rollup sums, and the two active tiles show none
