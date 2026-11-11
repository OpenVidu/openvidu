# Spec Delta

## ADDED Requirements

### Requirement: Class counters of reconciled rooms
Edition: CE and PRO servers. A room closed by the reconciler SHALL add to the class, recording and size range counters
of its end bucket exactly as a room closed by its `ROOM_ENDED`, once per closure; a real `ROOM_ENDED` that arrives
later SHALL NOT count it again. A room whose document has no `topology`, written by an earlier writer, SHALL add
nothing to them.

#### Scenario: Room of a dead node
- **GIVEN** a recorded `one_to_many` room with N = 8 on a node that stopped without ending it
- **WHEN** the reconciler closes it at 10:20 UTC
- **THEN** the hourly and daily rollups of its bucket and scopes add 1 to `rooms.byTopology.one_to_many`, 1 to
  `rooms.recorded` and 1 to `rooms.sizeByTopology.one_to_many.6-10`

#### Scenario: Late real end
- **GIVEN** a room closed by the reconciler and already counted
- **WHEN** its real `ROOM_ENDED` is projected later
- **THEN** `rooms.byTopology`, `rooms.recorded` and `rooms.sizeByTopology` are unchanged

#### Scenario: Room of an earlier writer
- **GIVEN** a room document without `topology`, written by an earlier writer on a node that stopped without ending it
- **WHEN** the reconciler closes it
- **THEN** its `rooms.participantsSum` is counted, it gets no `topology`, and nothing is added to `rooms.byTopology`,
  `rooms.recorded` or `rooms.sizeByTopology`
