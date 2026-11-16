# Spec Delta

## MODIFIED Requirements

### Requirement: Participants filters and room chip
Edition: CE. The page SHALL offer a multi-select kind filter (Standard, Ingress, Egress, Agent; clearing it selects
every kind), a status select (All, Joining, Active, Left, Aborted), the global range from the header, the shared room
chip "Room: <name>" (the SID until the name is known) with a link to the room and a remove button that clears `room`,
and the removable chip "Publishers" while `publisher=true`. SIP, CONNECTOR and BRIDGE SHALL not be offered.

#### Scenario: Arriving from a room
- **GIVEN** `/participants?room=RM_abc`
- **WHEN** the page loads
- **THEN** a chip reads "Room: demo-room" with a link to `/rooms/RM_abc` and a remove button, and removing it drops `room` and reloads the list

#### Scenario: Clearing the kind filter
- **GIVEN** the kind filter shows Standard
- **WHEN** the user deselects it
- **THEN** the URL reads `kind=all` and the filter shows "All kinds"

#### Scenario: Publishers chip
- **GIVEN** `/participants?status=active&publisher=true` opened from the Overview Active publishers tile
- **WHEN** the page loads
- **THEN** a chip reads "Publishers" with a remove button, the list request carries `publisher=true`, and removing the chip drops `publisher` and `cursor` and reloads the list
