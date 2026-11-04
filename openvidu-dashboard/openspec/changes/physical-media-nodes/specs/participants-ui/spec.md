## MODIFIED Requirements

### Requirement: Participants table
Edition: CE. The table SHALL show, in order, the columns SID (link to the detail with a copy button), Identity (copy
button), Name, Room (link to the room detail), Kind (kind badge), Status (status badge with the stale cue), Joined,
Left, Duration (live), Published (source icons) and, with `per-node-breakdown` only, Node (`mediaNode`, hidden by
default); the sortable headers are Joined
(`joinedAt`, the default), Left (`leftAt`) and Duration (`duration`); links never trigger on row click.

#### Scenario: Row rendering
- **GIVEN** an active STANDARD session `PA_x1y2` of `alice` in `demo-room` publishing a camera and a microphone
- **WHEN** the row renders
- **THEN** the cells read, in order, `PA_x1y2` once, linking to `/participants/PA_x1y2` with its copy button, `alice` with its copy button, the name, `demo-room` linking to `/rooms/RM_abc`, the Standard kind badge, "active", the join time, "—", a duration counting up live and the camera and microphone source icons

#### Scenario: Sort toggles order
- **GIVEN** the default `joinedAt` descending
- **WHEN** the user activates the Joined header
- **THEN** the URL gets `sort=joinedAt&order=asc` without `cursor`

#### Scenario: Nothing published
- **GIVEN** a session with empty `publishedSources`
- **WHEN** the row renders
- **THEN** the Published cell reads "—"

#### Scenario: Node column
- **GIVEN** `features` with `per-node-breakdown`
- **WHEN** the table renders with the default columns
- **THEN** the Node column is hidden, the Columns menu offers it, and once shown it reads the session's `mediaNode`,
  or "—" without one

#### Scenario: No Node column in CE
- **GIVEN** `features` without `per-node-breakdown`
- **WHEN** the table renders
- **THEN** it has no Node column and the Columns menu does not offer one

