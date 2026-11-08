# Design

## Context

- The list tiles are plain `ovd-kpi-tile` elements in each page template (`rooms-page.html`,
  `participants-page.html`, `agents-page.html`, `egress-page.html`, `ingress-page.html`). Their values come from the
  summary endpoints, or from the overview live counters for Agents.
- The labels mix three forms for current figures ("Active rooms", "Active now", "Agents now", "Active", "Publishing
  now"), and two range tiles lack "in range" ("Participant sessions", "Total duration").
- Info texts live in `INFO_TEXTS` (`format/info-texts.ts`), one per term. `dataUpDown` is used only by the Analytics
  tile Data up / down.
- `TableColumn.info` already renders the info tip in the header and on the phone cards.

## Goals / Non-Goals

**Goals:**
- One rule for every list page: current figures first, labelled "active now"; range figures after them, labelled "in
  range".
- Every data transferred figure of the CE pages explains up and down.

**Non-Goals:**
- Changing tile values, hints or the summary endpoints.
- The Overview, whose Live and Today groups already say which figures are current.

## Decisions

### D1. Label scheme

- The page's own entity takes the short "Active now", because the page title already names it. Rooms shows active
  rooms; Ingress shows ingresses publishing now. For ingress, "active" means publishing, as on the status filter.
- Other current figures name what they count: "Participants active now", "Services active now".
- Range figures end in "in range". "Total duration" becomes "Duration in range", since "Total" adds nothing once the
  range is named.
- Order: current tiles, then range tiles, so the live part reads first on every page.

Rejected:
- "Rooms active now" on Rooms, which repeats the page title.
- Keeping "Publishing now" on Ingress, the only page that would break the pattern.

### D2. Texts for each direction

`dataUp` ("Bytes the participants sent to the server.") and `dataDown` ("Bytes the server sent to the participants.")
are the two halves of `dataUpDown`. A tile that shows one direction explains only that one. The chart and the column
show both directions and reuse `dataUpDown`. The Data transferred card heading keeps no info tip, so no text is shown
twice in one card.

### D3. Exempt labels

The list of plain labels in `ui-info-tips` names "totals of counts" instead of "totals". Total egress and Total
sessions count things whose noun explains itself. Total up and Total down are byte figures whose direction needs the
same explanation as Data up / down. Durations stay exempt on their own.

## Risks / Trade-offs

- Tests and screenshots that read the old labels break. The e2e specs and unit specs are updated in this change; the
  documentation screenshots follow with the release documentation.
- Extending editions that place their own tiles next to the list tiles must follow the scheme themselves. None does
  today.
