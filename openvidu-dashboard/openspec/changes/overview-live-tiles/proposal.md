# Proposal

## Why

The live tiles of the Overview page count what is running now, but only "Active rooms" says so: "Participants",
"Egress" or "Ingress" read like the Today tiles below them. The Egress tile also counts the in-flight egresses
(`starting`, `active`, `ending`) while linking to `/egress?status=active`, so the list it opens shows fewer egresses
than the tile and no option of its status filter is selected.

With "Active" in front, two labels no longer fit their tile at common desktop widths: they wrap, and the value of a
tile whose label takes two lines sits one line lower than those of its neighbours.

## What Changes

Edition: CE. Repository: dashboard (`openvidu`). No change in openvidu-livekit or openvidu-deployment.

- The six live tiles read "Active rooms", "Active participants", "Active publishers", "Active egress", "Active
  ingress" and "Active agents". Their info tips keep their texts and take the new names ("About Active participants",
  "About Active publishers", "About Active agents").
- The Active egress tile links to `/egress?status=starting,active,ending`, the URL the Active option of the Egress
  status filter writes: the list requests the three in-flight statuses and its status filter shows Active.
- In every row of KPI tiles, on every page, the values end at the same height whatever lines the labels take: labels
  start at the top and may wrap, and the values rest at the bottom of the tiles. Where a tile has a hint or a delta it
  stays under the value, and the values of that row are level too (Participants, Egress, Ingress, Analytics). A value
  on one line now ends level with the last line of a value on two (Analytics, "Data up / down") instead of starting
  level with its first.

Not in scope:

- The Today tiles (Rooms, Participants, Minutes, Egress, Ingress), the "View active rooms" links and the stale notice.
- The Data pipeline card and its "Storage and retention" link.
- The Egress page: its status filter, its "Active now" tile and a hand-typed `/egress?status=active`, which still
  filters by that one status with no option selected.
- The links of the other live tiles: each already opens the set its tile counts (active rooms; active STANDARD
  sessions, the default kind of the Participants list; those with `publisher=true`; active agent sessions; ingresses
  publishing).
- The width of the tiles and the number of tiles per row: a tile row still sizes its tiles for their values, not for
  their labels.
- The API, the typings and the data contract.
- An edition that extends CE: it takes the labels, the link and the tile layout from the library, and adapts whatever
  of its own names the old labels.

Known behaviour, unchanged: every list but Ingress applies the global range (last 24 h by default) to the start time
also when it is filtered to what is active (`rooms-api`, `participants-api`, `egress-api`). A room, participant,
publisher, egress or agent that started before the range is counted by its live tile and absent from the list the tile
opens. The "Active now" tiles of the list pages relate to their tables the same way.

CHANGELOG: no line. The Overview page is new in the unreleased 3.10.0, whose entries list changes against 3.9, and its
entry ("live counters of rooms, participants, publishers, egress, ingress and agents linked to their lists") stays
true. The tiles are new in 3.10.0 as well, so their layout has no line either.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `overview-ui`: "Live KPI tiles" names the six tiles with "Active" and links the egress tile to the in-flight statuses.
- `ui-info-tips`: "Overview info tips" names the live tiles that carry an info tip by their new labels.
- `participants-ui`: the "Publishers chip" scenario of "Participants filters and room chip" names the Overview tile it
  arrives from by its new label; the behaviour of the page does not change.
- `ui-building-blocks`: new requirement "KPI tile values level in a row".

## Impact

- `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/overview/`: the page template and component, and
  their unit tests.
- `dashboard-ce/frontend/projects/dashboard-ui/src/lib/features/participants/participants-page.spec.ts`: test titles.
- `dashboard-ce/frontend/projects/dashboard-ui/src/lib/components/tiles/`: the shared KPI tile and tile row, used by
  the tile rows of the Overview, Rooms, Participants, Agents, Egress, Ingress and Analytics pages and by the pages of
  an extending edition.
- `dashboard-ce/e2e/tests/overview.spec.ts` and `info-tips.spec.ts`: the tile and info tip names, and the two tiles
  followed to their lists.
- `dashboard-ce/e2e/tests/overview.spec.ts`, `egress.spec.ts` and `analytics.spec.ts`: the level values.
- No dependency, API, configuration or upgrade impact.
