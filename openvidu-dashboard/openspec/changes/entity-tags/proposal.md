# Proposal

## Why

The status badge, the live chip and the kind badge were styled one by one, and the review of the demo found them of
different heights side by side: in a list row, a status badge and a kind badge do not line up, and the chips an edition
shows next to them in a page header (a class, a recorded mark, a retry count) do not either. The kind badge is also
the only place where a participant kind, an egress type or an ingress input type appears without the colour it has in
the Analytics charts. Its outlined neutral look tells nothing at a glance.

## What Changes

- **One tag style:** the status badge, the live chip, the kind badge and any chip an edition shows beside them share
  one height (24 px), corner radius and label font, with their content centred, so tags in one row line up. It is a
  library style that an edition can apply to its own chips.
- **Kind badge:** a tag with a dot in the value's Analytics colour and its label, on a neutral background. Examples:
  - Standard in the Participants colour, Agent in its own;
  - Room composite in the Egress colour;
  - RTMP in the Ingress colour.
  - Lists show it as they do today, in the Kind, Type and Input columns, without a tooltip.
  - A page may give it a tooltip naming what it shows, and a more precise label of the same value (such as "URL
    (RTSP)").
- **Status badge:**
  - A page may name what the badge shows, such as "Room status"; the tooltip then starts with that name, followed by
    the estimate or the hint after " · ".
  - A page may give a status its own icon where the meaning depends on the entity, such as a muted microphone or
    camera.
  - Lists keep their tooltips as they are.

Not in scope:
- The PRO detail page headers, a separate PRO change.
- New columns or filters in the lists.

Edition: CE. The PRO edition builds its detail page headers on these pieces.

Repositories: Dashboard CE (specs, frontend library, `CHANGELOG.md`). Dashboard PRO: `ce.ref` move, then a PRO change.

CHANGELOG line (`CHANGELOG.md`, 3.10.0, Improved › UI, unreleased): "Status, live and kind tags share one height, and the
kind, type and input tags of the lists carry the colour of their Analytics charts."

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-building-blocks`:
  - a new requirement for the shared tag style;
  - the kind badge shows the Analytics colour and accepts a tooltip;
  - the status badge accepts a subject for its tooltip and an icon for a status.

## Impact

- **Frontend library:**
  - a global `.ovd-tag` class in the library theme;
  - `StatusBadge`, `LiveChip` and `KindBadge`;
  - their tests;
  - `AGENTS.md`.
- **Lists:** the participant, egress and ingress lists, and the room's tables in PRO, render the new kind badge with no
  template change.
- **No API, data model or writer change.**
