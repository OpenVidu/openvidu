# Design

## Context

See `proposal.md` for the motivation. What shapes the approach:

- `GET /api/v1/info` already reports `retention` (seven classes in milliseconds, `rollupsDailyMs` `null` when
  unlimited) and `storage`: one entry per existing analytics collection with `documents`, `storageBytes`, `indexBytes`
  and `oldest`. `oldest` is absent for `tracks`, `track_subscriptions` and `track_stats` (no index leads with their
  time field) and for an empty collection; `nodes` is dated by `firstSeenAt`. `storage` is cached 60 s by the backend.
- `InfoService` reads the info document at start, after sign-in and once when the server status reports another
  schema status or migration state; it never polls. The figures of the tab are those of that read.
- Classes and collections do not map one to one, and the contract only records the class of the collections that carry
  `expiresAt` and of the time series (`schema/collections.json`); the class of `events`, the rollups and `nodes` lives
  in the TTL indexes (`schema/indexes.json`).
- How each class expires (`data-model`, "Retention"): `events`, `track_stats` and the rollups by a TTL index on their
  timestamp; entities, tracks and subscriptions `retention` after they close (`expiresAt`, fixed when written); `nodes`
  `retention.entities` after the last heartbeat.
- The tab lives in `features/settings/` of the UI library as `about-tab.{ts,html,scss}`, tested by
  `settings-page.spec.ts` and the `settings` e2e suite. The shared info tip (`components/info-tip`) already works by
  hover, keyboard focus and tap.

## Goals / Non-Goals

**Goals:**

- Everything computed in the UI from the info document: no request, endpoint field, query or index is added.
- The class rules (collections, clock, progress, estimate) in one pure module that tests reach without rendering.
- The collection breakdown removable by deleting one component, one requirement and its tests.

**Non-Goals:**

- Dating `track_stats`, `tracks` or `track_subscriptions` in the backend, or refreshing the info document when the tab
  opens.
- A general expandable-row or disclosure building block.
- Sharing the class-to-collection map through the typings package.

## Data model and API

None. No collection, field, index, retention or schema version changes, so there is no migration mapping and no
OpenAPI change; `editions-info` keeps its contract.

## Decisions

1. **The UI derives the classes; the backend is untouched.** A row is a sum over at most six entries the UI already
   holds. Rejected: a `classes` array in the info document, which would change the API contract and the PRO backend
   for arithmetic over fourteen entries, and would have to be reverted in part if the breakdown is dropped.

2. **One pure module, `features/settings/storage-classes.ts`.** It holds the seven class definitions (label, retention
   key of `InfoRetention`, collections, clock collections) and the functions that turn an info document and a read
   time into rows: sums, clock, span, tip text. `data-tab.ts` only renders them. The map stays in the UI: nothing else
   reads it. A unit test asserts that every `Collection` except `schema_meta` belongs to exactly one class, so a
   collection added to the contract fails the suite until it is classified. Rejected: exporting the map from typings
   (no second consumer), deriving it from `collections.json` (it lacks `events`, the rollups and `nodes`).

   | Class                    | Retention key     | Collections                                                               | Clock                                                    |
   | ------------------------ | ----------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
   | Events                   | `eventsMs`        | `events`                                                                  | `events`                                                 |
   | Stats                    | `statsMs`         | `track_stats`                                                             | deployment clock                                         |
   | Tracks and subscriptions | `tracksMs`        | `tracks`, `track_subscriptions`                                           | deployment clock                                         |
   | Entities                 | `entitiesMs`      | `rooms`, `participants`, `egresses`, `ingresses`, `ingress_sessions`, `nodes` | `rooms`, `participants`, `egresses`, `ingress_sessions`  |
   | 5-minute rollups         | `rollups5MinMs`   | `analytics_5min`                                                          | `analytics_5min`                                         |
   | Hourly rollups           | `rollupsHourlyMs` | `analytics_hourly`                                                        | `analytics_hourly`                                       |
   | Daily rollups            | `rollupsDailyMs`  | `analytics_daily`                                                         | `analytics_daily`                                        |

   The deployment clock is the earliest `oldest` of `rooms`, `participants`, `egresses`, `ingress_sessions`, `events`
   and the three rollup collections.

3. **Each class by its own oldest data (owner's decision).** It shows a retention that was just raised on Events,
   Entities and the rollups. Its cost is stated in the specs ("Idle period reads as filling") and in Risks. Rejected by
   the owner: one deployment clock for every class, which never misreads an idle period but hides every raise.

4. **Stats and Tracks and subscriptions use the deployment clock.** Their collections have no `oldest`. Dating
   `track_stats` needs a sort on the time field of a time series without an index on it (`ts_ttl` exists only in the
   plain-collection fallback), whose plan is unproven, and dating tracks needs a writer index, a contract change.
   Both stay out; a later change may add `oldest` to `track_stats` without touching this design, since the clock of a
   class is one entry of the table above.

5. **Entities are dated by creation and without `nodes` and `ingresses`.** Entities expire `retention` after they
   close, but the info document only dates their creation; a session lasts minutes or hours against a retention of
   days, so the creation-based span overstates the real one by at most the length of the earliest sessions. `nodes`
   is dated by `firstSeenAt` and expires after the last heartbeat, and an ingress exists from its creation until it is
   deleted: a long-lived server or ingress would make the class look full. Both still count in the documents and the
   size of the row.

6. **Full within one day or 10 % of the retention, whichever is longer.** At steady state the oldest surviving
   document is always slightly younger than the retention: the TTL monitor deletes everything older, and what remains
   starts at the next bucket (up to a day for daily rollups) or the next event. Without a tolerance every full class
   would read "6 of 7 days so far". One day covers the daily bucket; 10 % absorbs gaps on the long retentions (40 days
   on 400). A retention of one day or less therefore never shows the tip. Rejected: a tolerance per class (bucket
   size), which adds a rule per class for the same visible result.

7. **Estimate: size × retention ÷ span, from one day of data.** Size is `storageBytes + indexBytes` of the class. Below
   one day the multiplier (up to 400 for hourly rollups) would amplify a few hours of activity, so only the progress
   shows. Unlimited daily rollups use size × 365 days ÷ span. The Total row has no estimate (owner's decision).

8. **"Now" is the moment the info document was read.** `InfoService` records it with the document (`readAt`), and the
   module takes it as an argument: sizes and spans then describe the same instant, and tests pass a fixed time
   instead of faking the clock. Rejected: `Date.now()` at render, which would age the spans of a document whose sizes
   stay those of the read.

9. **Progress and estimate in the shared info tip (owner's decision).** `ovd-info-tip` after the retention value, with
   `subject` "<class> retention" (announced "About <class> retention") and the text of the specs; a class without
   a text renders no icon. Nothing new is built: the tip already opens on hover, focus and tap, and Material places
   the tooltip inside the viewport. Rejected: a muted line under the row (overruled by the owner), a `warning`
   variant (the state is not a problem).

10. **Breakdown as a removable unit.** `features/settings/collection-breakdown.ts`, a component with an inline
    template that renders the nested table of one class from its entries; the Data tab keeps a set of expanded class
    labels in a signal and renders, per class row, a native `<button>` (`aria-expanded`, `aria-controls`, the listed
    `keyboard_arrow_down` / `keyboard_arrow_up` icons) and, when expanded, a following row whose single cell spans the
    table and hosts the component. Dropping it means deleting the component, the button, the signal, the
    "Collection breakdown" requirement and its four tests. Rejected: `mat-expansion-panel` or `MatTable` detail rows
    (a second table structure for a feature that may go), collection rows inlined among the class rows (their Oldest
    column has no place in the class table).

11. **Layout.** The class table keeps the current plain `<table>` inside its `overflow-x: auto` wrapper, so the page
    never scrolls sideways; the first column may wrap so that the Retention cell and its icon stay in view at 375 px.
    The message and the estimate note are two muted paragraphs under the table; the Documentation link is
    `ovd-external-link` to `EXTERNAL_LINKS.documentation + '#retention'`.

12. **Names.** Files `data-tab.{ts,html,scss}`, class `DataTab`, selector `ovd-data-tab`; `SETTINGS_TABS` becomes
    `['preferences', 'data']`. `tab=about` needs no code: `oneOf()` already falls back to Preferences and leaves the
    URL alone. The capability folder stays `settings-about`, since a rename would re-add the untouched Preferences
    requirement and its seven scenarios as new; its Purpose is updated when the specs are synced.

13. **Spec deltas.** OpenSpec refuses a MODIFIED block that drops or renames a scenario, so "Settings tabs" and
    "Migration status" are removed and added again as "Preferences and Data tabs" and "Legacy migration on the Data
    tab" (the latter also because "Migration running" is a scenario of the modified "Server status card").
    In `ui-shell` only "Info re-read on server changes" is modified. Its "Protected route without a session"
    scenario keeps `/settings?tab=about` as an arbitrary protected URL, which still redirects as written. The
    "Timezone" requirement is left alone although its scenario "Settings is not a timed page" still says "About":
    modifying it would bring its scenario "UTC toggle" under the titled-test rule, and that scenario says the cursor
    is dropped while the zone chip keeps it (`zone-chip.spec.ts`), a disagreement this change must not settle.

## Performance budget

No request, query or index is added, so there is no `explain()` plan or p95 to verify. The computation runs once per
info document over at most fourteen entries. Verified by: the unit tests of the tab flush exactly the requests the
tab made before (the info document and the status poll), and `node scripts/check-bundle-size.mjs` (part of the
frontend build) keeps the lazy chunk of Settings under 150 kB gzip.

## Test strategy

Unit tests are Vitest (`ng test dashboard-ui`), e2e are Playwright against the mocked API. Paths are relative to
`dashboard-ce/`; `features/` is `frontend/projects/dashboard-ui/src/lib/features/`.

| Scenarios | Test file | Level |
| --- | --- | --- |
| Collections of each class, Class that sums several collections, Span rounded down, Class at full retention, Full within a tenth of the retention, Less than one unit of data, Idle period reads as filling, Entities clock ignores nodes and ingresses, Stats and tracks on the deployment clock, Deployment older than the stats retention, Class without a clock, Linear estimate, No estimate under one day of data, Unlimited daily rollups without a day of data, Daily rollups with a limit | `features/settings/storage-classes.spec.ts` | unit |
| Deep link to Data, Former About value, Migration running on the Data tab, Completed before the page opened, Completed while watching, Backend down, Info in flight, Info arrives, Class rows, Retention that is not a whole number of days, Retention not reported, Storage total without schema_meta, Class still filling, Unlimited daily rollups, Total without an estimate, Progress only in the tip, Breakdown collapsed by default, Expand a class, Collapse a class, Collection without an oldest date, Where the retention is set, What the estimates assume, Migration ends | `features/settings/settings-page.spec.ts` | unit |
| Steady server | `core/refresh/server-status.spec.ts` | unit |
| Healthy card, Server stopped, Server silent without a stop, Migration running, Auto-refresh off, Before the first status, Slow writer batches, Storage and retention link | `features/overview/overview-page.spec.ts` | unit |
| Retention tip by keyboard, Retention tip on a phone | `e2e/tests/settings.spec.ts` | e2e |

The e2e suite also follows the rename without owning a scenario: `settings`, `accessibility` (axe on `tab=data`, both
themes, with one class expanded), `auth`, `assets` and `tests-backend/session` open `tab=data`, and the mocked info
document gains the storage entries and `oldest` dates that make one class still filling.

## Risks / Trade-offs

- [A class reads as still filling after an idle period, with an estimate above its real steady size] → accepted by
  the owner; specified ("Idle period reads as filling"), softened by the tolerance of decision 6, and the note under
  the table says what the estimates assume.
- [A raised `stats` or `tracks` retention shows no tip on a deployment older than the new value] → accepted; decision
  4 leaves the door open to dating `track_stats`.
- [Estimates overstate small databases: WiredTiger sizes include allocation that does not scale with the data and do
  not shrink after deletes] → marked "≈" and "(estimate)"; the one-day floor avoids the worst multipliers.
- [The linear estimate ignores that a new `entities` or `tracks` retention only applies to what closes after the
  restart] → the documentation task states it; the tab message stays short.
- [The figures are those of the last info read, which a long session does not refresh] → unchanged behaviour; spans
  use the same instant (decision 8).
- [Fifteen scenarios of unchanged behaviour (Server status card, info re-read, migration, unavailable, loading) enter
  the titled-test rule because their requirements are modified or replaced] → their tests exist and are retitled or split; no new
  behaviour is tested twice.
- [The Overview test file holds the titled tests of the live tiles and of the Overview info tips, from the archived
  `overview-live-tiles`] → this change touches one query parameter and the untitled tests of the Data pipeline card,
  and leaves those titled tests as they are.
- [The main `ui-shell` spec keeps one scenario that names the About tab, "Settings is not a timed page"] → recorded
  in decision 13 for the change that settles the "UTC toggle" scenario.
- [The legacy collections kept for rollback are not counted] → out of scope by the owner's decision; the Total is the
  sum of the rows, which the specs state.

## Migration Plan

None: no data, API or configuration changes. Rolling back is reverting the commit.
