# Verification: settings-data-tab

- Date: 2026-11-16
- Mode: incremental
- Verified commit: `38021c9639b07bd7773519d07b4916f5875f2f00`; starts from `d12444b89a858718102354ab4357ea93337beaa7`
  (the full verification and the code review). `git diff d12444b89..HEAD`: the reports and owner decisions
  (`461dde1b3`), the approved revision of the artifacts (`02e08498d`), group 9 (`89b20e450` to `6af4a5aad`) and the
  owner review of it (`38021c963`). Working tree clean before and after the checks.
- Guard probe (step 1) skipped by the owner's decision: this session cannot activate the guard. Held to its rules: only
  reads, the checks below and this file.
- This report supersedes `code-review.md` of `d12444b89`: every finding of it is listed below with its status.

`features/` is `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/`, `core/` its sibling.

## Checks run

| Command | Result |
| --- | --- |
| `./dashboard.sh check` | Pass (exit 0): lint, format, typecheck, `openspec validate --all --strict` (31 items), tooling tests 115, typings 109, backend unit 240, `dashboard-ui` 602 in 51 files (586 + 17 new − `What the estimates assume`), `frontend` 1 |
| `./dashboard.sh scenarios settings-data-tab` | 52 scenarios, 0 without a test |
| `./dashboard.sh e2e` | Pass (exit 0): mocked suite 126 passed, real-backend suite 6 passed (Docker available); axe on `tab=data` with Entities expanded in the light and the dark theme |
| `./dashboard.sh test-integration` | Not applicable: no backend file changed |
| Contract check, image build and smoke | Not applicable: no contract, image or runtime dependency change |
| CI run of the push (task 10.1) | Pending (orchestrator) |

Bundle: initial 39.74 kB over the 1.20 MB warning budget (39.69 kB at `d12444b89`, 39.58 kB on `origin/master`
`fced8ec7d`): the revision adds 0.05 kB raw (`EXTERNAL_LINKS.analyticsSettings`, `InfoRead`); initial 310.0 kB gzip
of 400 kB; Settings chunk 19.8 kB gzip (19.9 kB before), under 150 kB. Not a finding of this change.

## Earlier findings

| Report | Finding | Status | Evidence |
| --- | --- | --- | --- |
| Verification | SUGGESTION 1, unlimited daily rollups without a clock | Resolved | "Clock of each data class" now ends "A class without a clock has no tip, except unlimited Daily rollups" (`specs/settings-about/spec.md:171-172`), design decision 7; `storage-classes.ts:145-149`; `Unlimited daily rollups without data` (`storage-classes.spec.ts:251`, no `analytics_daily` entry: 0 documents, tip "Grows without limit") |
| Verification | SUGGESTION 2, breakdown table named by `aria-label` | Resolved | Visually hidden `<caption>` bound with `[textContent]` (`collection-breakdown.ts:23`), so the name is exact; `Expand a class` asserts it (`settings-page.spec.ts:523-525`); axe passes in both themes with Entities expanded |
| Code review | WARNING 1, daily bucket start inflates the deployment clock | Resolved | `DEPLOYMENT_CLOCK` without `analytics_daily` (`storage-classes.ts:74-83`); design decisions 2 and 4, spec "Clock of each data class"; `Daily bucket outside the deployment clock` (`storage-classes.spec.ts:213`: daily 1 day, events 5 h → "Less than 1 day of 7 days so far"; with the daily bucket in the clock it would read "1 of 7 days so far · …") |
| Code review | WARNING 2, span not pinned to the read | Resolved | `Span ends at the read` (`settings-page.spec.ts:391-410`): fake `Date`, info read with `rooms` 12 days old, clock advanced 2 days, then `tab=data` rendered; expects "12 of 90 days so far", which `Date.now()` at render would turn into 14 |
| Code review | SUGGESTION 1, progress and full boundaries | Resolved | `Span rounded down: exactly one day` (`storage-classes.spec.ts:118`, catches `count <= 1` and a 2-unit threshold), `Class at full retention: exactly 6 of 7 days` (`:128`, catches `<` for `<=`) |
| Code review | SUGGESTION 2, clock membership | Resolved | `it.each` over the four entity clock collections (`:169`) and the seven deployment clock collections (`:197`), each the only earliest; dropping any fails its row; adding `analytics_daily` back fails `:213` |
| Code review | SUGGESTION 3, class without documents shows progress | Resolved | `documents === 0` → no tip (`storage-classes.ts:151`); requirement "Retention progress" ("A class with documents…"), design decision 7; `Class without documents` (`storage-classes.spec.ts:150`: Stats 0 documents, 0 bytes, no tip, with a 3-day deployment clock that would otherwise give "3 of 7 days so far") |
| Code review | SUGGESTION 4, browser clock against server dates | Accepted by the owner | Known limit in the proposal (`proposal.md:41-42`) and in design Risks (`design.md:186-189`) |
| Code review | SUGGESTION 5, dead `?? Date.now()` fallback | Resolved | `InfoService.read()` returns `InfoRead` (`core/info.ts:14-18`, `:36`); the Data tab destructures `{ info, readAt }` with no fallback (`data-tab.ts:79-87`) |

## Revised requirements and scenarios

All in `specs/settings-about/spec.md`; each test below asserts what its scenario states.

- **Retention progress** (now "A class with documents"): `storage-classes.ts:142-160`. Span ends at the read (see
  WARNING 2 above), Class without documents (above), Span rounded down and Class at full retention with their new
  boundary rows (above). The remaining scenarios are unchanged and pass.
- **Clock of each data class**: deployment clock of seven collections without `analytics_daily`
  (`storage-classes.ts:74-83`). Stats and tracks on the deployment clock (`storage-classes.spec.ts:182`, earliest an
  hourly bucket 3 days old, 30 MB → "≈ 70 MB", 4 + 2 MB → "≈ 14 MB"; and `:197`), Daily bucket outside the deployment
  clock (`:213`), Entities clock ignores nodes and ingresses (`:156`, `:169`), Unlimited daily rollups without data
  (`:251`).
- **Size estimate at full retention**: No estimate under one day of data now gives Tracks 16 documents
  (`storage-classes.spec.ts:239`), needed since a class without documents has no tip; "Grows without limit" for
  unlimited daily rollups whatever the data (`storage-classes.ts:145-149`). Only `rollupsDailyMs` is nullable in
  `InfoRetention` (`dashboard-ce/typings/src/api/info.ts:50`), so no other class reaches that branch.
- **Collection breakdown** ("a table named 'Collections of <class>'"): Expand a class asserts the caption text
  (`settings-page.spec.ts:523`).
- **Retention configuration message**: one `ovd-notice` `variant="info"` (host role `status`,
  `components/feedback/notice.ts:14`) after the muted "Retention not reported…" line (`data-tab.html:202-211`), link
  `EXTERNAL_LINKS.analyticsSettings` (`core/links.ts:4`). Where the retention is set (`settings-page.spec.ts:450-466`):
  role `status`, the exact sentence, link text "Configuration reference", `href`, `target="_blank"`, and no text after
  the table matching `info icon|estimate`. The e2e `Data shows the storage per data class…`
  (`e2e/tests/settings.spec.ts:33-66`) checks the notice and the `href` in the built app; `Retention tip on a phone`
  still asserts `scrollWidth <= 375` with the notice in place. The removed scenario `What the estimates assume` has no
  test and no text left.

Artifacts: proposal, design (decisions 2, 4, 7, 8, 10, 11, Risks, test map) and tasks agree with the specs and the
code; the test map lists all 52 scenarios. `openspec validate --strict` passes.

## InfoService.read()

`InfoService` keeps one signal of `InfoRead` (`core/info.ts:28`); `info` is now a `computed` over it (`:33`, same
`Signal<InfoResponse | null>` type for consumers) and `read` exposes the pair (`:36`). It is set only for the full
document and cleared with it (`:55`, `:60`), so `info` and `readAt` can no longer disagree.

It is a seam an extending edition may use: `public-api.ts:49` exports all of `core/info.ts`, so `InfoRead` and
`read()` are public, and the library README (`dashboard-ce/frontend/projects/dashboard-ui/README.md:78-79`, "Injection tokens") says root services such as
`InfoService` can be replaced with a provider. An extending edition that replaces `InfoService` must now provide
`read`, because the CE Data tab it renders through the CE Settings route reads it; a PRO adaptation of the Data tab
(out of scope here) would take the instant from `read()`. No compatibility concern: `readAt` never reached
`origin/master` (`fced8ec7d` has neither member), so nothing published is removed. See SUGGESTION 1 for the design
text.

## Issues

### CRITICAL

None.

### WARNING

None.

### SUGGESTION

1. **Design decision 8 still names the member that was replaced.** `design.md:103-107` says `InfoService` records
   `readAt` with the document; the code exposes it as `InfoService.read()`, an `InfoRead` of `info` and `readAt`
   (`core/info.ts:14-18`, `:36`), which is now public API. Recommendation: name `read()` / `InfoRead` in decision 8
   before archiving, so the design matches the seam an extending edition sees.

## Definition of Done (items the diff affects)

| Item | Status |
| --- | --- |
| All tasks checked | Not yet: 10.1, 11.1, 11.2 (orchestrator) pending; 9.1–9.7 checked |
| `scenarios` finds a passing test for every delta scenario | Met (52/52; all pass in `check` and `e2e`) |
| `check` passes locally | Met |
| CI run of the push green | Pending (task 10.1) |
| UI changes: `e2e` with axe and both themes | Met |
| Latest verification reports without CRITICAL | Met (this report) |
| Refactor review applied or recorded | 7.3 recorded in `operations.md`; the outcome of 9.7 is not in the repository, so not checked here. Recommendation: the orchestrator records it in `operations.md` |
| `CHANGELOG.md`, `README.md`, `AGENTS.md` reflect the change | Met: the `CHANGELOG.md:54-56` line ("where the retention is configured") still holds; no README or AGENTS.md text names the message or `readAt` |
| Change archived | Pending; at sync, update the Purpose of `openspec/specs/settings-about/spec.md` (design decision 12) |

## Final assessment

No critical issues or warnings. 1 suggestion to consider. Every finding of the earlier verification and code review is
resolved, except code review SUGGESTION 4, accepted by the owner. Ready for archive (with noted improvements) once the
orchestrator's groups 10 and 11 are done.
