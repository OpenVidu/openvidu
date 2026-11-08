# Tasks

## 1. Frontend

- [x] 1.1 List tiles: labels and order of `rooms-page.html`, `participants-page.html`, `agents-page.html`,
  `egress-page.html` and `ingress-page.html` as in the delta specs. Verify: the unit specs of the five pages assert the
  labels in order.
- [x] 1.2 `INFO_TEXTS.dataUp` and `INFO_TEXTS.dataDown`. Verify: `info-texts.spec.ts`.
- [x] 1.3 Analytics Data transferred card: `info` on Total up, Total down and the Data up / down chart. Verify:
  `analytics-page.spec.ts` reads the three info tips and none on the card heading.
- [x] 1.4 Rooms table: `info: INFO_TEXTS.dataUpDown` on the bytes column, next to its warning. Verify:
  `rooms-table.spec.ts` for the header and a phone card, with and without the per-row warning.

## 2. Tests

- [x] 2.1 e2e: `rooms`, `participants`, `agents`, `accessibility`, `overview` and `base-href` read the new labels; the
  rooms phone test reads the Data up / down info tip. Verify: `./dashboard.sh e2e`.
- [x] 2.2 `./dashboard.sh check` green.

## 3. Docs and CHANGELOG

- [x] 3.1 `CHANGELOG.md`, Improved / UI: the two lines of the proposal. Verify: reviewed in the diff.
- [x] 3.2 `dashboard-ui/README.md` and the `AGENTS.md` files: no change expected. Confirm that none names the old
  labels. Verify: `grep` for the old labels.
