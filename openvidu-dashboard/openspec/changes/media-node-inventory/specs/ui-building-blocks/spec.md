## ADDED Requirements

### Requirement: Media node links
Edition: CE. The Node cells of the Rooms, Participants and Agents tables SHALL render the `mediaNode` label as a link
to the target the edition provides for that label, and as plain monospace text when the edition provides none, as
CE does; a row without `mediaNode` reads "—" either way.

#### Scenario: Edition with media node links
- **GIVEN** `features` with `per-node-breakdown`, an edition that links a media node to `/extra/<label>`, and a room
  item with `mediaNode: "mn-a"`
- **WHEN** the user shows the Node column of the Rooms table
- **THEN** its cell is a monospace link to `/extra/mn-a`

#### Scenario: Edition without media node links
- **GIVEN** `features` with `per-node-breakdown` and no link provided for media nodes
- **WHEN** the Node column of the Participants table renders a session with `mediaNode: "mn-a"`
- **THEN** its cell reads `mn-a` in monospace, not as a link
