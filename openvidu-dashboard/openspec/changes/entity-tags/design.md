# Design

## Context

See proposal.md for the motivation. Current state of `projects/dashboard-ui/src/lib/components/badges`:

| Piece          | Box                                                          | Height |
| -------------- | ------------------------------------------------------------ | ------ |
| `StatusBadge`  | 16 px icon, `padding: 2px 8px 2px 6px`, 1 px transparent border | 22 px  |
| `LiveChip`     | 8 px dot or 16 px icon, `padding: 2px 10px`, no border       | 20 px  |
| `KindBadge`    | text only, `padding: 1px 8px`, 1 px outline                  | 18 px  |

- Every piece uses the `label-medium` font and an 8 px radius.
- The library theme (`styles/_index.scss`, mixin `theme`) already holds global helper classes such as `.ovd-tabular`
  and `.ovd-visually-hidden`, which the editions use in their own templates.
- Breakdown entries keep their key as the colour entity: `entityColor(key, colors)` gives `STANDARD`, `room_composite`
  or `rtmp` their fixed slot and other keys a hashed one.

## Goals / Non-Goals

**Goals:**
- One height and alignment for every tag, the edition's chips included, without wrapping them in a new component.
- The kind colours of Analytics wherever a kind, type or input type is shown.

**Non-Goals:**
- Changing the status colours or icons of the CE domains.
- Tooltips in lists.

## Decisions

### D1. A global `.ovd-tag` class

- The theme gains `.ovd-tag`:
  - `display: inline-flex`, `align-items: center`, `box-sizing: border-box`;
  - `block-size: 24px`, `padding-inline: 8px`, `gap: 4px`;
  - a 1 px transparent border, so a dotted or solid outline never changes the size;
  - the 8 px radius, the `label-medium` font, `white-space: nowrap`;
  - 16 px `mat-icon`s.
- `StatusBadge`, `LiveChip` and `KindBadge` put the class on their inner element and keep only their colours and
  state rules in their own styles. The live chip keeps its 84 px minimum width.
- The PRO chips (topology, recorded, retries, backup storage) apply the same class.

Rejected alternatives:
- **A tag component.** The PRO chips are a button, a tooltip trigger and a component with its own inputs; a wrapper
  would add nesting for a box style.
- **A SCSS mixin.** Editions build against the published library, and a global class needs no import path.

### D2. Kind badge colour

- The badge computes `entityColor(kind, colors)` from `ChartColorsService`, the key the Analytics breakdowns use.
- It draws an 8 px dot before the label, on the neutral `surface-container-high` background with the `on-surface`
  text, so the text contrast does not depend on the palette.
- A key the Analytics charts move to a free slot (an unknown one) can differ from its chart: unknown keys are rare and
  keep their label.
- A `tooltip` input sets a Material tooltip and makes the badge focusable, with the tooltip in its accessible name.
- A `label` input replaces the friendly label, for a page that knows more about the value (an RTSP `url` ingress);
  the dot still follows the value.

### D3. Status badge subject and icon

- `subject` (optional): the tooltip is `subject`, or `subject · <estimate or hint>`. Without a subject the tooltip is
  unchanged.
- `icon` (optional): replaces the icon of the status style.

## Risks / Trade-offs

- **[A taller row]** Rows with a badge grow by at most 2 px. → The data table rows are taller than 24 px already.
- **[Colour in a list]** A coloured dot could suggest a state. → The dot is small and its label always shows.
