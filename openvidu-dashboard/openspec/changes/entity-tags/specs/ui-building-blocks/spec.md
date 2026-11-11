# Spec Delta

## MODIFIED Requirements

### Requirement: Status badge
Edition: CE. The status badge SHALL render icon + label for a status within a domain (room, participant, egress,
ingress) using container/text pairs that meet 4.5:1 in both themes: active/live green, closed/complete neutral, failed
red, aborted orange, starting/pending blue, idle neutral. The label keeps the lowercase words of the status. An
`estimated` flag adds a dotted outline and the tooltip "Closed by the reconciler: the end time is estimated". Colour is
never the only cue. A page MAY name what the badge shows: its tooltip then starts with that name, followed by the
estimate or the hint after " · " when there is one. A page MAY give a status its own icon where its meaning depends on
the entity. The neutral container SHALL stand apart from the grey of a hovered list row in both themes.

#### Scenario: Reconciler-closed room
- **GIVEN** a room with status closed and `closedBy=reconciler`
- **WHEN** the badge renders
- **THEN** it shows the check icon, "closed", a dotted outline and the tooltip "Closed by the reconciler: the end time is estimated"

#### Scenario: Idle ingress
- **GIVEN** an ingress with status `inactive`
- **WHEN** the badge renders
- **THEN** it reads "idle" in the neutral colours

#### Scenario: Closed room on a hovered row
- **GIVEN** a closed room in the Rooms list, in the light theme
- **WHEN** the user hovers its row
- **THEN** the status badge keeps a container darker than the row

#### Scenario: Named status
- **GIVEN** a badge of an active room named "Room status", without hint
- **WHEN** the user hovers or focuses it
- **THEN** the tooltip reads "Room status"

#### Scenario: Named estimated status
- **GIVEN** a badge named "Room status" of a room closed by the reconciler
- **WHEN** the user hovers or focuses it
- **THEN** the tooltip reads "Room status · Closed by the reconciler: the end time is estimated"

#### Scenario: Icon given by the page
- **GIVEN** a status badge whose page gives it the icon `mic_off`
- **WHEN** it renders
- **THEN** it shows `mic_off` in the colours of its status

### Requirement: Kind badge
Edition: CE. The kind badge SHALL render participant kinds, egress types and ingress input types as outlined tags with
no fill, a dot in the value's colour of the Analytics charts and the label in text: the value's friendly label, such as "Agent", "Room
composite" or "RTMP", or the raw value when the dashboard has no label for it. Colour is never the only cue. A page MAY
give it a more precise label of the same value and a tooltip naming what it shows; lists give neither.

#### Scenario: Agent participant
- **GIVEN** a participant of kind `AGENT`
- **WHEN** the badge renders
- **THEN** it reads "Agent" with a dot in the colour of Agent in the Participant kind chart

#### Scenario: Main kinds
- **GIVEN** a `STANDARD` participant, a `room_composite` egress and an `rtmp` ingress in their lists
- **WHEN** their badges render
- **THEN** their dots take the Participants, Egress and Ingress section colours, and none of them has a tooltip

#### Scenario: Kind on a hovered row
- **GIVEN** an egress row of the Egress list with the type Room composite
- **WHEN** the user hovers the row
- **THEN** the type badge keeps its outline over the row's hover colour

#### Scenario: Unknown kind
- **GIVEN** an egress type `new_type` the dashboard has no label for
- **WHEN** the badge renders
- **THEN** it reads `new_type` with a dot in a palette colour

#### Scenario: Named kind
- **GIVEN** a kind badge of an `AGENT` participant named "Participant kind"
- **WHEN** the user hovers or focuses it
- **THEN** the tooltip reads "Participant kind"

#### Scenario: Label given by the page
- **GIVEN** a kind badge of a `url` ingress whose page gives it the label "URL (RTSP)"
- **WHEN** it renders
- **THEN** it reads "URL (RTSP)" with the dot of `url`

## ADDED Requirements

### Requirement: Tags
Edition: CE. The status badge, the live chip, the kind badge and the chips an edition shows beside them SHALL share one
tag style: 24 px high, the content centred, one corner radius and the label font, in every state, so that tags side by
side line up whatever they hold.

#### Scenario: List row
- **GIVEN** an egress row of the Egress list with the status "active" and the type Room composite
- **WHEN** the row renders in the table or as a card
- **THEN** the status badge and the type badge are 24 px high

#### Scenario: Live chip states
- **WHEN** the live chip reads "LIVE", "paused" or "stale"
- **THEN** it is 24 px high, as a status badge beside it

#### Scenario: Chip of an edition
- **GIVEN** an edition chip styled as a tag, with an icon and a label
- **WHEN** it renders beside a status badge
- **THEN** both are 24 px high and their labels share one baseline
