# Tasks

## 1. Tag style

- [x] 1.1 `.ovd-tag` in the library theme (D1), applied by `StatusBadge`, `LiveChip` and `KindBadge`, each keeping only
      its colours and state rules. Verify: `badges.spec.ts` checks the class on the three, and the e2e check of 3.2.

## 2. Badges

- [x] 2.1 `KindBadge` (D2): the dot in `entityColor(kind)`, the outline with no fill and the optional `tooltip` and
      `label`. Verify: `badges.spec.ts` "Agent participant", "Main kinds", "Unknown kind", "Named kind" and "Label given
      by the page".
- [x] 2.2 `StatusBadge` (D3): the optional `subject` and `icon`. Verify: `badges.spec.ts` "Reconciler-closed room",
      "Named status", "Named estimated status" and "Icon given by the page".
- [x] 2.3 The light neutral status container (D4). Verify: `tokens.spec.ts` "sets the neutral status container apart
      from a hovered row" in both schemes.

## 3. Lists and e2e

- [x] 3.1 The Participants, Egress and Ingress lists keep their templates; their specs read the new badge. Verify:
      `ng test` of the list pages.
- [x] 3.2 e2e: the Egress list measures a row's status and type badges at 24 px in the table and on a phone, the
      Overview's live chip at 24 px, and the axe checks pass in light and dark. Verify: `./dashboard.sh e2e`.

## 4. Documentation

- [x] 4.1 `dashboard-ce/frontend/AGENTS.md`: the `.ovd-tag` class next to the other theme helpers. Verify:
      read-through.
- [x] 4.2 `CHANGELOG.md`: the 3.10.0 Improved › UI line of the proposal. Verify: read-through.

## 5. Final verification

- [x] 5.1 `./dashboard.sh check` and `./dashboard.sh e2e` green; `openspec validate entity-tags --strict` green.
- [ ] 5.2 Manual check on `./dashboard.sh demo both`: the Participants, Egress and Ingress lists in light and dark, at
      1440 px and on a phone.

## Workflow follow-up

- Owner review, then archive when asked: sync the specs, delete the change folder, commit "archive entity-tags, keep
  only the specs", and move the PRO `ce.ref`.
- The PRO detail headers (`detail-header-tags`) build on this change.
