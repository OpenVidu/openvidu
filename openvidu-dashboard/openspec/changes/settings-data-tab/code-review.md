# Code review: settings-data-tab

- Date: 2026-11-16
- Reviewed commit: `d12444b89a858718102354ab4357ea93337beaa7` (`git diff origin/master`, 8 commits, clean tree)
- Scope: `features/settings/storage-classes.ts`, `data-tab.{ts,html,scss}`, `collection-breakdown.ts`,
  `core/info.ts` (`readAt`), `settings-page.ts`, the Overview link, the unit and e2e tests, `CHANGELOG.md`.

Paths below are relative to `dashboard-ce/frontend/projects/dashboard-ui/src/lib/` unless they start with
`dashboard-ce/`.

## Summary

CRITICAL: 0 · WARNING: 2 · SUGGESTION: 5

The class arithmetic checks out against every scenario of the delta specs: units (all spans and retentions in ms,
`UNIT_MS` keyed by the unit `retentionLength()` picks, so a 36-hour retention counts hours), floor rounding, the
full tolerance `retention − span ≤ max(1 day, retention / 10)`, the one-day floor of the estimate, `null` retention
(always "Grows without limit", estimate only from one day and with documents), retention not reported (no tips),
a class with no documents (no estimate), sizes of 0, a missing `oldest` (filtered out; no clock means no tip), an
`oldest` in the future (`Math.max(0, …)` gives "Less than 1 … so far"), and a span longer than the retention
(negative remainder, full). The estimates use the exact span, the progress the floored one, as the spec states.
Hand-checked figures: 560 MB × 90/12 = 4.2 GB, 70 × 7/5 = 98 MB, 30 × 7/3 = 70 MB, 6 × 7/3 = 14 MB,
3 × 400/30 = 40 MB, 260 kB × 365/73 = 1.3 MB, 260 kB × 1825/73 = 6.5 MB.

## Off-by-one coverage of "N of M days so far"

| Mutation of `progress()` / `classTip()`                         | Caught by                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `count ± 1`                                                     | every exact-span test (12, 5, 3, 30, 73 days; 5 hours)      |
| `Math.round` or `Math.ceil` instead of `Math.floor`             | "Span rounded down" (5 d 23 h → 5)                          |
| `Math.min` instead of `Math.max` in the tolerance               | "Class at full retention", "Full within a tenth"            |
| days always, instead of the retention unit                      | "No estimate under one day of data" ("5 of 36 hours")       |
| "Less than 1" threshold moved (`count <= 1`, `spanMs < 2 units`) | **not caught** (SUGGESTION 1)                              |
| `<` instead of `<=` at the full boundary                        | **not caught** (SUGGESTION 1)                               |
| span measured to render time instead of `readAt`                | **not caught** (WARNING 2)                                  |

## WARNING

### 1. The daily bucket start inflates the deployment clock of Stats and Tracks by up to one day

`features/settings/storage-classes.ts:75-81` (`DEPLOYMENT_CLOCK` includes `analytics_daily`, and
`analytics_hourly`), used at `:171` and `:180`.

The `oldest` of a rollup collection is its earliest `bucket`, the start of the bucket, not the first data in it; the
daily buckets start at UTC midnight (`analytics-ui` "per UTC day"), and the writer upserts the end bucket of the first
room that closes. On a young deployment the deployment clock is therefore floored to the UTC midnight before the first
data, up to 24 h earlier.

- Trigger: first room closes at 2026-11-16T23:30Z; the info document is read at 2026-11-17T00:40Z. Events and
  entities date the deployment at 23:30, but `analytics_daily.oldest` is 2026-11-16T00:00Z, so Stats and Tracks and
  subscriptions get a span of 24 h 40 min instead of 1 h 10 min.
- Consequence: the tip reads "1 of 7 days so far · ≈ <size × 6.8> at full retention (estimate)" after 70 minutes of
  data. That bypasses the one-day floor of decision 7, which exists to avoid estimates from a few hours of activity,
  and the estimate is about 20× too low (the real 7-day size is ≈ size × 144). Until the deployment is several days
  old, "N" for these two classes reads up to one day high and the estimate correspondingly low (at 3 days of real data
  up to 25 % under). The same flooring applies, by at most one hour, to `analytics_hourly`.
- The spec scenario "Stats and tracks on the deployment clock" even takes "a daily bucket, 3 days old" as the earliest
  date, so this is a design point for the owner rather than a deviation from the spec. Options: leave the daily (and
  hourly) rollups out of the deployment clock while any other clock collection is dated, or count a daily bucket from
  its end; either keeps the 200-day case of "Deployment older than the stats retention", which entity, event or hourly
  dates also cover with the default retentions.

### 2. No test pins the span to the moment the info document was read

`features/settings/data-tab.ts:86`; tests at `features/settings/settings-page.spec.ts:66-73`.

Design decision 8 and the "Retention progress" requirement ("The span runs from the clock of the class to the moment
the dashboard read the info document") are implemented by passing `InfoService.readAt()` to `storageClasses()`.
`info.spec.ts` checks that `readAt` is recorded and `storage-classes.spec.ts` passes a fixed `READ_AT`, but the wiring
in the Data tab is untested: the settings tests build `oldest` from `Date.now()` and render a few milliseconds after the
read, with real timers, so replacing `this.service.readAt() ?? Date.now()` by `Date.now()` (or reading the clock at
render) keeps every test green.

- Trigger: a session that reads the info document, stays open two days, then opens the Data tab would show spans two
  days longer than the sizes they are paired with; no test would notice the regression.
- Fix: one settings test with fake timers that reads the info document, advances the clock by days before rendering
  `tab=data`, and asserts the tip still counts from the read (for example still "12 of 90 days so far").

## SUGGESTION

### 1. Boundaries of the progress text and of the full tolerance are not exercised

`features/settings/storage-classes.ts:131` and `:148`; `features/settings/storage-classes.spec.ts`.

No test has a span in [1, 2) units, so `count < 1` could become `count <= 1` (1 day 20 h reading "Less than 1 day of 7
days so far") unnoticed; `EVERY_COLLECTION` in `settings-page.spec.ts:459-473` produces "1 of 7 days so far" on
Events and Entities but asserts neither. No test sits on the full boundary either (span exactly retention − 1 day,
for example 6 days of 7, or 360 of 400), so `<=` versus `<` in `classTip()` is free. Two `it.each` rows in
`storage-classes.spec.ts` would pin both: `1 * DAY` → "1 of 7 days so far · …" and `6 * DAY` → `null` (or a tip, if
the owner reads "within one day" as exclusive).

### 2. Clock membership is only partly covered by tests

`features/settings/storage-classes.spec.ts:129-155`.

"Entities clock ignores nodes and ingresses" makes `rooms` the earliest, so dropping `participants`, `egresses` or
`ingress_sessions` from `ENTITY_CLOCK` still passes; likewise nothing fails if `analytics_5min` or `analytics_hourly`
leave `DEPLOYMENT_CLOCK`. Making a different collection the earliest in each case (or one `it.each` over the clock
collections) would lock the table of decision 2.

### 3. A class without documents still shows progress from the deployment clock

`features/settings/storage-classes.ts:180` with `classTip()` at `:139`.

Stats and Tracks and subscriptions take the deployment clock even when their own collections are empty or absent.
Trigger: a deployment whose nodes run without media statistics (`mediaStats: false`, `data-model`) has no
`track_stats`; at 3 days the Stats row (0 documents, 0 B) carries "3 of 7 days so far". The spec does not forbid it
(the class has a clock), but the tip describes data that does not exist. Consider no tip, or only the progress being
dropped, when `documents === 0` for a class on the deployment clock.

### 4. Spans use the browser clock against server dates

`core/info.ts:50`.

`readAt` is the browser's `Date.now()` while every `oldest` is a server date. A browser clock a day behind turns a full
Events class (oldest 6 d 23 h on the server) into a 5 d 23 h span and a "5 of 7 days so far" tip; a clock ahead hides
tips. The frontend AGENTS.md and `ui-shell` "Freshness judged at response time" avoid the browser clock for ages; the
rule is about freshness, so this is not a breach, and only skews of hours matter given the one-day tolerance. The
HTTP `Date` header of the info response, or the `generatedAt` of the last status, would give a server-side "now" if
the owner wants it.

### 5. Dead fallback

`features/settings/data-tab.ts:86`.

`readAt` is always set together with `info` (`core/info.ts:50-51`), so `?? Date.now()` never runs once `info()` is
non-null; it only hides a future break of that invariant behind the render-time clock that WARNING 2 says no test
would catch. Narrowing the type (or reading both from one signal holding `{ info, readAt }`) would remove it.

## Checked without findings

- `schema_meta` excluded from rows and total; the unit test that every `Collection` except `schema_meta` belongs to
  exactly one class.
- `tab=about` falls back to Preferences without code; no leftover `about-tab` import, export or README reference
  (`auth.spec.ts` keeps `tab=about` as an arbitrary protected URL, as decision 13 says).
- Breakdown: `aria-expanded`/`aria-controls` (the controlled row exists only when expanded, which axe accepts with
  `aria-expanded="false"`), per-row state in a signal, nothing in the URL, oldest in the session zone, undated hint only
  for the three undated collections.
- `InfoService.readAt` is set only for the full document, before `info`, so the computed never pairs a new document
  with an old instant.
- No request, query or index added; the computation is over at most fourteen entries.
- e2e mock: Entities 12 of 90 days, Events at 6.9 of 7 days (full), the classes on the deployment clock full at 30
  days, as the keyboard and phone tests need.
- `CHANGELOG.md` line rewritten under 3.10.0 `Added` → `UI`.
