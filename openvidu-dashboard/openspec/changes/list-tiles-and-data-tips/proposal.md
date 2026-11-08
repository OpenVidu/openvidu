# Proposal

## Why

The tiles of the five list pages name the same idea five ways. Current figures read "Active rooms", "Active now",
"Agents now", "Active" or "Publishing now", and range figures sometimes say "in range" and sometimes not ("Participant
sessions", "Total duration"). A reader cannot tell at a glance which tiles follow the range picker. The data
transferred figures also lack an explanation: the Analytics tile Data up / down has an info tip, but the chart of the
same name, the Total up and Total down tiles and the Rooms column do not.

## What Changes

- **List tiles, current figures first, then range figures.** The main current tile reads "Active now". The other
  current tiles name what they count and add "active now". Range tiles end in "in range".

  | Page | Tiles, in order |
  | --- | --- |
  | Rooms | Active now · Participants active now · Rooms in range · Sessions in range |
  | Participants | Active now · Services active now · Sessions in range |
  | Agents | Active now · Agent sessions in range |
  | Egress | Active now · Started in range · Failed in range · Duration in range |
  | Ingress | Active now · Ingress in range · Sessions in range · Duration in range |

  Values, hints, info tips and approximation marks stay as they are. On Rooms, Participant sessions becomes Sessions
  in range and moves after Rooms in range. On Participants, the services tile moves before Sessions in range.
- **Data transferred info tips:**
  - The Analytics chart Data up / down gets the shared Data up / down text.
  - The tiles Total up and Total down get two new shared texts:
    - Up: "Bytes the participants sent to the server."
    - Down: "Bytes the server sent to the participants."
  - The Data up / down column of the Rooms table gets the shared text, in the table and on the phone cards.
- The plain labels that carry no info tip keep the totals of counts (Total egress, Total sessions). Total up and Total
  down, byte totals, now have one.

Scope excludes:
- Overview tiles, which already split into Live and Today groups.
- Detail pages and the cards that extending editions add, which reuse the shared texts on their own.
- The documentation page and its screenshots, refreshed with the release documentation.

Edition: CE. Extending editions inherit the list pages and the shared texts.
Repositories: the dashboard only (frontend, e2e, specs).

CHANGELOG lines (`Improved`, `UI`):
- "The list tiles say which figures are current ("active now") and which follow the range ("in range"), current ones
  first."
- "Data transferred tiles, chart and column explain what up and down mean."

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `rooms-ui`: Summary tiles labels and order.
- `participants-ui`: Participants summary tiles labels and order.
- `agents-ui`: the Active now and Agent sessions in range tiles.
- `egress-ui`: Egress summary tiles labels.
- `ingress-ui`: Ingress summary tiles labels.
- `ui-info-tips`: the up and down texts, the Analytics chart and total tiles, the Rooms column, the renamed tiles, and
  only the totals of counts exempt.

## Impact

- Frontend (`dashboard-ui`):
  - `format/info-texts.ts`: `dataUp` and `dataDown`;
  - the Rooms, Participants, Agents, Egress and Ingress page templates;
  - `features/analytics/analytics-page.html`: the Data transferred card;
  - `features/rooms/rooms-table/rooms-table.ts`: the bytes column info.
- Unit specs of those pages and of `info-texts`; e2e `rooms`, `participants`, `agents`, `accessibility`, `overview` and
  `base-href` where they read tile labels.
- No API, typings or data change.
