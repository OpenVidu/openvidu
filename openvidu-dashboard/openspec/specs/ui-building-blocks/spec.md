# ui-building-blocks Specification

## Purpose
Behaviour of the shared UI components every page is built from (tables, paginator, badges, tiles, charts, range
picker, states, lock overlay, search), so that every page looks and behaves the same.

## Requirements

### Requirement: Data table

Edition: CE. The data table SHALL take column definitions (key, header, sortable, hideable, cell template), rows, the
current sort key and order, and loading, error and empty states. It renders `<th scope="col">` with `aria-sort`,
selectable cell text, and emits sort changes only, never navigating on row click. An error keeps the previous rows below
an error notice with Retry. A wide table scrolls horizontally and has no vertical scrollbar of its own.

#### Scenario: Sort emits, URL navigates
- **GIVEN** a sortable column header
- **WHEN** the user activates it
- **THEN** the table emits the key and the toggled order, and the page writes `sort` and `order` to the URL without `cursor`

#### Scenario: Error keeps rows
- **GIVEN** rows from the previous page load
- **WHEN** the refresh request fails
- **THEN** the rows stay visible below an inline error notice with Retry

#### Scenario: No inner vertical scroll
- **GIVEN** a rooms table of 25 rows wider than the viewport
- **WHEN** it renders
- **THEN** it scrolls horizontally inside its card and the rows grow the page, with no vertical scrollbar on the table

#### Scenario: First load
- **GIVEN** a list opened for the first time with a page size of 25
- **WHEN** its first request is in flight
- **THEN** the table shows 25 skeleton rows

#### Scenario: Refresh keeps rows
- **GIVEN** a rooms table showing 25 rows
- **WHEN** a refresh is in flight
- **THEN** the 25 rows stay visible and no skeleton row renders

#### Scenario: Refresh keeps the empty state
- **GIVEN** a list showing "No rooms match"
- **WHEN** a refresh is in flight
- **THEN** the empty state stays and no skeleton row renders

#### Scenario: Filter change keeps rows
- **GIVEN** a rooms table showing active rooms
- **WHEN** the status filter changes to closed
- **THEN** the active rows stay until the closed rooms arrive and replace them, with no skeleton rows in between

#### Scenario: Loading states
- **WHEN** the table waits for its first response, refreshes, or changes filters, sort or page
- **THEN** skeleton rows equal to the page size render only until the table's first response; after it, a refresh keeps
  the rendered rows or the empty state, and a change of filters, sort or page keeps the previous rows until the new ones
  arrive

### Requirement: Cursor paginator

Edition: CE. The paginator SHALL take `limit`, `nextCursor`, `prevCursor`, optional `total` and the page number from the
URL (`page`, 1 when absent). It renders Prev/Next (disabled without their cursor), a page-size select with 10/25/50/100
whose label is never truncated and the shown range. Prev and Next write the cursor and the page; range changes are
announced to assistive technology. It is hidden while the first page (no `cursor`) has no rows.

#### Scenario: Unknown total
- **GIVEN** a response without `total`, 25 rows, `limit=25` and `page=3`
- **WHEN** the paginator renders
- **THEN** it reads "Showing 51–75" and Next is enabled only if `nextCursor` is present

#### Scenario: Page size change
- **GIVEN** the user selects 100
- **WHEN** the change applies
- **THEN** the page writes `limit=100`, drops `cursor` and `page` and stores 100 as the preference

#### Scenario: Next and previous
- **GIVEN** `page=2`
- **WHEN** the user presses Next and then Prev
- **THEN** the URL reads `page=3` with the next cursor, then `page=2` with the previous cursor

#### Scenario: Empty first page
- **GIVEN** a list whose first page answers no rows
- **WHEN** the page renders
- **THEN** the empty state shows and no paginator is rendered

#### Scenario: Shown range
- **WHEN** the paginator renders a page
- **THEN** it reads "Showing x–y of total" when `total` is known, or "Showing x–y" otherwise, with x = (page − 1) ×
  limit + 1

### Requirement: Column visibility

Edition: CE. Hideable columns SHALL be toggled from the column menu of the table's Columns button, the selection stored
per table as a viewer preference; status, the identifying link and the primary timestamp cannot be hidden. The table
shows exactly the selected columns (by default all but those hidden by default) at any width, never hiding one to fit,
and scrolls sideways inside a narrower container. As cards, the table hides its Columns button.

#### Scenario: Hidden column persists
- **GIVEN** the user hides Data up / down on the rooms table
- **WHEN** the page is reopened
- **THEN** Data up / down stays hidden and the menu offers to show it again

#### Scenario: Selection is what shows
- **GIVEN** the rooms table, 1100 px wide on a 1920 px viewport, with every column selected
- **WHEN** it renders
- **THEN** every selected column shows, Data up / down included, the table scrolls sideways inside its card when the
  columns do not fit, and the Columns menu lists them all as shown

#### Scenario: Cards hide Columns
- **GIVEN** a table rendered as cards
- **WHEN** it renders
- **THEN** no Columns button is shown

### Requirement: Table to cards on narrow screens

Edition: CE. The table SHALL become cards only below 600 px (XSmall): title = identifying cell (link + copy button),
second line = status column cell, if any, + primary timestamp, third line = up to three key metrics, other columns in an
expandable "More" area, sorting in a select above the cards; card cells wrap inside the card, keeping each copy button
beside its value, never over the next field. Wider viewports keep the table at any container width.

#### Scenario: Phone layout
- **GIVEN** a 375 px viewport and the rooms list
- **WHEN** it renders
- **THEN** each row is a card titled by the identifying link and its copy button, then the status and the start time, then up to three metrics, and a sort select is shown above

#### Scenario: Half-width card on a wide viewport
- **GIVEN** a table of seven visible columns in a card 560 px wide on a 1440 px viewport
- **WHEN** it renders
- **THEN** it renders as a table that scrolls sideways inside the card, not as cards

#### Scenario: Status column in the card
- **GIVEN** a table with a Status column rendered as cards
- **WHEN** a card renders
- **THEN** its second line shows the cell of that Status column next to the primary timestamp

### Requirement: Status badge
Edition: CE. The status badge SHALL render icon + label for a status within a domain (room, participant, egress,
ingress) using container/text pairs that meet 4.5:1 in both themes: active/live green, closed/complete neutral, failed
red, aborted orange, starting/pending blue, idle neutral. The label keeps the lowercase words of the status. An
`estimated` flag adds a dotted outline and the tooltip "Closed by the reconciler: the end time is estimated". Colour is
never the only cue.

#### Scenario: Reconciler-closed room
- **GIVEN** a room with status closed and `closedBy=reconciler`
- **WHEN** the badge renders
- **THEN** it shows the check icon, "closed", a dotted outline and the tooltip "Closed by the reconciler: the end time is estimated"

#### Scenario: Idle ingress
- **GIVEN** an ingress with status `inactive`
- **WHEN** the badge renders
- **THEN** it reads "idle" in the neutral colours

### Requirement: Kind badge
Edition: CE. The kind badge SHALL render participant kinds, egress types and ingress input types as outlined chips with
neutral colours and the label in text: the value's friendly label, such as "Agent", "Room composite" or "RTMP", or the
raw value when the dashboard has no label for it.

#### Scenario: Agent participant
- **GIVEN** a participant of kind `AGENT`
- **WHEN** the badge renders
- **THEN** it reads "Agent" as an outlined chip

#### Scenario: Unknown kind
- **GIVEN** an egress type `new_type` the dashboard has no label for
- **WHEN** the badge renders
- **THEN** it reads `new_type`

### Requirement: KPI tile

Edition: CE. The KPI tile SHALL show label, value with tabular figures, optional unit, delta and hint, keep the last
value while refreshing, show a skeleton only on first load and highlight a changed value for 600 ms unless reduced
motion is requested or the value changed less than 5 s before. A bandwidth tile shows upload and download on two lines
with their arrows. An approximate value is prefixed with a focusable "≈" that carries the approximation tooltip; the
tile itself carries no tooltip.

#### Scenario: Refresh keeps the value
- **GIVEN** a tile showing 87
- **WHEN** a refresh is in flight
- **THEN** 87 stays visible without a skeleton, and a new value of 90 is highlighted briefly

#### Scenario: Bandwidth tile
- **GIVEN** 12 MB up and 48 MB down
- **WHEN** the tile renders
- **THEN** it reads "↑ 12.0 MB" on the first line and "↓ 48.0 MB" on the second

#### Scenario: Approximate value
- **GIVEN** the Rooms tile "Rooms in range" with an approximate value of 1 204
- **WHEN** the user hovers or focuses the "≈" before the value
- **THEN** the approximation tooltip shows, and hovering the rest of the tile shows nothing

### Requirement: Time-series chart fixed to the range
Edition: CE. The time-series chart SHALL render the given series between `from` and `to` in the given timezone with
granularity buckets; the x-axis never extends beyond the range, wheel and drag scroll the page, and no zoom
component is enabled. It uses a shared tooltip keyed by x across the charts of a page, 2 px lines, one y-axis
per chart, and formats bytes, bitrates, durations and percentages with the shared formatters.

#### Scenario: Wheel over a chart
- **GIVEN** a chart in the page
- **WHEN** the user scrolls the mouse wheel over it
- **THEN** the page scrolls and the chart range is unchanged

#### Scenario: Sparse data
- **GIVEN** buckets exist only for half of the range
- **WHEN** the chart renders
- **THEN** the x-axis spans `from` to `to` and missing buckets show gaps, not a shortened axis

### Requirement: Chart markers
Edition: CE. The chart SHALL draw event markers (join/leave, egress start/end, aborted) as dashed vertical lines,
aborted connections in their own colour, at most 50 per chart; with more than 50 it draws none and shows "N events in
range" at its top right. A marker's label shows beside its line only while that line is hovered, never as overlapping
text on the chart.

#### Scenario: Too many markers
- **GIVEN** 120 marker events in the range
- **WHEN** the chart renders
- **THEN** no marker lines are drawn and the chart shows "120 events in range"

#### Scenario: Close markers
- **GIVEN** three joins within the same minute
- **WHEN** the chart renders
- **THEN** three dashed marker lines are drawn without labels, and hovering one shows its label, such as "alice joined", beside that line only

### Requirement: Chart palette and quality bands

Edition: CE. Series colours SHALL follow the entity, never the rank, from eight palette slots with light and dark values
that are pairwise distinguishable; known values (participant kinds, egress statuses and types, ingress input types,
directions) have fixed distinct slots, and two other entities of one chart never share a slot.

#### Scenario: Palette values
- **WHEN** series and quality bands render in light and dark themes
- **THEN** the series take the colours of the slot tokens `--ovd-chart-1` to `--ovd-chart-8` for the applied theme,
  each slot with a light and a dark value, and each quality band is drawn in its own colour tinted at 12 % opacity

#### Scenario: Same entity, same colour
- **GIVEN** the Participant kind breakdown of two ranges, with `EGRESS` first in one and second in the other
- **WHEN** both render
- **THEN** `EGRESS` has the same colour in both

#### Scenario: Egress statuses
- **GIVEN** egresses ended as complete, aborted, limit reached and failed in one chart
- **WHEN** the chart renders
- **THEN** the four segments have four distinguishable colours and failed is red

### Requirement: Chart accessibility
Edition: CE. Each chart SHALL expose `role="img"` with a generated summary (range, series, min/max/last), be focusable,
offer a data table toggle, and show direct labels on breakdowns whose light slots fall below 3:1.

#### Scenario: Screen reader summary
- **GIVEN** a bandwidth chart over 24 h
- **WHEN** focus reaches the canvas
- **THEN** the summary names the range, the two series and their min, max and last values, and the table toggle is the next focus stop

### Requirement: Breakdown chart
Edition: CE. The breakdown chart SHALL render a donut or horizontal bar with a legend, direct labels, a fixed colour per
entity and a toggle to a table of the same data; more than eight entries fold into "Other" (outline grey).

#### Scenario: Nine SDKs
- **GIVEN** nine SDK entries
- **WHEN** the donut renders
- **THEN** eight slices are shown plus "Other", and the table toggle lists all nine

### Requirement: Date-time range picker
Edition: CE. The picker SHALL offer presets 1 h, 6 h, 24 h, 7 d, 30 d, 90 d, this month and custom, explicit `from`/`to`
to the minute, a timezone select with a UTC toggle, and show the active zone. It validates `from < to`, warns while
the start, that of the applied range until the custom start is edited, predates the retention of the page's data
at the same instant, and writes the parameters by the shell's URL rules. Its zone controls change only the session
zone, never the stored default.

#### Scenario: Custom range
- **GIVEN** the user picks custom with `2026-10-01 00:00` to `2026-10-02 00:00`
- **WHEN** Apply is pressed
- **THEN** the URL has both values in ISO 8601 with the selected `tz` and no `cursor`

#### Scenario: Invalid order
- **GIVEN** `to` earlier than `from`
- **WHEN** Apply is pressed
- **THEN** the picker shows "End must be after start" and writes nothing

#### Scenario: Zone picked on a list
- **GIVEN** the stored default zone is the browser zone Europe/Madrid
- **WHEN** the user selects Asia/Tokyo in the picker of the rooms list
- **THEN** the URL has `tz=Asia/Tokyo`, every page opened afterwards in the session uses Asia/Tokyo, and Settings
  shows "Browser (Europe/Madrid)" as the default

#### Scenario: Applied range older than the retention
- **GIVEN** a page whose data has a 90-day retention and an applied range starting 120 days ago
- **WHEN** the picker opens
- **THEN** it reads "Data older than 90 days is not retained."

#### Scenario: Custom start moved before the retention
- **GIVEN** a page whose data has a 90-day retention and the picker open on the last 24 hours
- **WHEN** the user sets the start date 100 days back
- **THEN** the warning appears before Apply is pressed, and disappears when the start date is set back inside the
  retention

#### Scenario: Preset as long as the retention
- **GIVEN** a page whose data has a 90-day retention, the 90 d preset applied and the page open for an hour
- **WHEN** the picker opens
- **THEN** no retention warning is shown

#### Scenario: Data kept forever
- **GIVEN** a page whose data has no retention limit and a range starting 3 years ago
- **WHEN** the picker opens
- **THEN** no retention warning is shown

### Requirement: Refresh control

Edition: CE. The refresh control SHALL show the interval select, a manual refresh button and "updated hh:mm:ss" from
XLarge up, and below XLarge the refresh button and an interval menu button whose menu lists the intervals and the last
update time. The refresh button is disabled while a request is in flight; the update time is announced in a polite live
region and reserves its width, so the controls never move when it appears or changes.

#### Scenario: Manual refresh during a request
- **GIVEN** a request in flight
- **WHEN** the user presses refresh
- **THEN** nothing is sent and the button stays disabled until the request completes

#### Scenario: Interval on a wide screen
- **GIVEN** a 1920 px viewport on the Rooms page
- **WHEN** the header renders
- **THEN** the refresh button, the interval select and "updated hh:mm:ss" are visible

#### Scenario: Interval on a laptop
- **GIVEN** a 1280 px viewport on the Rooms page
- **WHEN** the user opens the interval menu button next to the refresh button
- **THEN** the menu lists the intervals with the current one checked and the last update time, and the page has no
  horizontal scroll

#### Scenario: Interval on a phone
- **GIVEN** a 390 px viewport on the Rooms page
- **WHEN** the user opens the interval menu in the second header row
- **THEN** it lists Off, 10 s, 30 s, 1 min and 5 min with the current one checked and shows "updated hh:mm:ss"

#### Scenario: Page refreshed on demand
- **GIVEN** a 1920 px viewport on the Analytics page
- **WHEN** the header renders
- **THEN** the control shows the refresh button and "updated hh:mm:ss", and no interval select or menu button

#### Scenario: Reserved update width
- **GIVEN** a page whose first response has not arrived
- **WHEN** "updated hh:mm:ss" appears and later changes
- **THEN** the refresh button, the interval control and the controls after them keep their position

#### Scenario: Refresh button and time only
- **GIVEN** a page that refreshes only on demand
- **WHEN** the refresh control renders
- **THEN** it shows just the refresh button and the update time

#### Scenario: Page that cannot auto-refresh
- **GIVEN** a page whose refresh scheduler is paused with a reason
- **WHEN** the refresh control renders
- **THEN** the interval select or menu button stays visible but disabled, with the page's reason as its tooltip

### Requirement: Empty, skeleton and error states
Edition: CE. Empty state SHALL show icon, title, hint and up to two actions ("Clear filters", "Widen range"); skeletons
match the height of rows, tiles, charts or text they replace and render only until the first response of what they
replace; the error notice shows the message, a Retry action and the request id, inline in a card or at page level.

#### Scenario: No rooms match
- **GIVEN** a filtered list returns no rows
- **WHEN** the empty state renders
- **THEN** it reads "No rooms match" with the hint "Change the filters or widen the time range.", offers "Clear filters" and "Widen range", and the layout height does not jump

### Requirement: PRO lock overlay
Edition: CE. The lock overlay SHALL take a feature key and render its title, explanation and docs link in a full-page
or card variant, make no network call, and keep the page's header and breadcrumbs in the full-page variant. The
full-page variant dims a silhouette of three tiles and one block behind the message; the card variant sizes to its
message.

#### Scenario: Locked analytics card
- **GIVEN** the quality analytics feature is disabled
- **WHEN** the card renders
- **THEN** it is as tall as its message, not as the real chart, and reads "Quality analytics is available in OpenVidu PRO" with the link

#### Scenario: Locked page silhouette
- **GIVEN** a CE room detail page
- **WHEN** the full-page lock renders
- **THEN** behind the message it shows a dimmed row of three tiles and one block below them, with no bar above the tiles

### Requirement: Live chip

Edition: CE. The live chip SHALL show a pulsing dot and "LIVE", switch to a "stale" state with a `schedule` icon when
the last server status found the writer batch older than the writer freshness windows' fresh window, and announce
updates in a polite live region. One minimum width across states keeps a state change from moving what follows. It
shows only on the Overview.

#### Scenario: Rooms list
- **GIVEN** an active room in the Rooms list
- **WHEN** the row renders
- **THEN** it shows the active status badge and no LIVE chip

#### Scenario: Not in lists
- **WHEN** a list page or a list row shows an active entity
- **THEN** no live chip is shown, since the status badge already says active

### Requirement: Breadcrumbs component
Edition: CE. The breadcrumbs component SHALL render items (label, optional link, optional copy value) as a `nav` with an
ordered list, append the current range parameters to links, and render the last item as text followed by a copy
button.

#### Scenario: Range in crumb links
- **GIVEN** the current range `from=now-6h&to=now&tz=UTC`
- **WHEN** the "Rooms" crumb renders
- **THEN** its link is `/rooms?from=now-6h&to=now&tz=UTC`

### Requirement: Global search

Edition: CE. The global search SHALL debounce input and send no request below 2 characters, showing the hint "Type at
least 2 characters". An exact ID (`RM_`, `PA_`, `EG_`, `IN_` prefix) shows "Open <entity> <ID>" as the first option;
Enter opens that detail route (locked in CE) keeping the current range. Other text shows grouped prefix results (rooms,
participants, egress, ingress; up to five each) with "See all in …" links to the list filtered by `q`.

#### Scenario: Exact SID
- **GIVEN** the user types `PA_x1y2` with the range `from=now-6h&to=now&tz=UTC`
- **WHEN** the results panel opens and the user presses Enter
- **THEN** its first option reads "Open participant PA_x1y2", the application navigates to `/participants/PA_x1y2`, and the Participants breadcrumb links to `/participants?from=now-6h&to=now&tz=UTC`

#### Scenario: Prefix search
- **GIVEN** the user types `dem`
- **WHEN** results arrive
- **THEN** rooms starting with "dem" are listed under Rooms with "See all in Rooms" linking to `/rooms?q=dem`

#### Scenario: One character
- **GIVEN** the user types `d`
- **WHEN** the debounce elapses
- **THEN** no search request is sent and the hint reads "Type at least 2 characters"

#### Scenario: Clear the search
- **GIVEN** the global search holding `dem` with its results open
- **WHEN** the user activates the "Clear search" button
- **THEN** the box is empty, the results close, the focus stays in the box and the button disappears

#### Scenario: Keyboard, placeholder and clear button
- **WHEN** the global search renders at any header width
- **THEN** it is keyboard navigable, its placeholder shows whole, without truncation, and while it holds text a clear
  button empties it and closes the results

### Requirement: Section card

Edition: CE. The section card SHALL show a title, a count, an actions slot and collapse/expand, remembering the
collapsed state in memory per route for the session. The actions slot, in the section header, holds the section's
filters and the Columns button of its table.

#### Scenario: Collapsed card survives a reload

- **GIVEN** the Rooms card of the Analytics page collapsed
- **WHEN** the page reloads its data after a range change
- **THEN** the card stays collapsed

#### Scenario: Card actions in the header

- **GIVEN** the Rooms card of the Analytics page
- **WHEN** it renders
- **THEN** its Export CSV button is in the section header, after the title

### Requirement: Toast
Edition: CE. Toasts SHALL be Material snackbars shown for 3 s in a polite live region, one at a time.

#### Scenario: Copy toast
- **GIVEN** a copy action
- **WHEN** it succeeds
- **THEN** "Copied" is shown for 3 s and announced politely

### Requirement: Formatters

Edition: CE. Shared formatters SHALL render numbers with `Intl.NumberFormat('en')`, percentages with one decimal and a
space before the sign ("96.4 %", donut labels included), bytes in decimal units with three significant digits and
durations as `850 ms`, `42 s`, `12 m 05 s`, `1 h 02 m`, `3 d 4 h`; timestamps SHALL read as the timestamp format
scenario states.

#### Scenario: Bytes and duration
- **GIVEN** 12345678 bytes and 3725000 ms
- **WHEN** formatted
- **THEN** they read "12.3 MB" and "1 h 02 m"

#### Scenario: Percent in a donut
- **GIVEN** a connection success ratio of 0.9643 and a donut slice of 0.25
- **WHEN** they are shown
- **THEN** they read "96.4 %" and "25.0 %"

#### Scenario: Timestamp format

- **WHEN** a timestamp is formatted
- **THEN** it reads `2026-10-13 12:31:05` (date omitted inside the current day of a 24 h range) with a `UTC` suffix
  when `tz=UTC`

### Requirement: External links
Edition: CE. Links to documentation and PRO pages SHALL open in a new tab with `rel="noopener"` and a trailing
`open_in_new` icon.

#### Scenario: Documentation link
- **GIVEN** the Documentation link of the sidenav footer
- **WHEN** it renders
- **THEN** it has `target="_blank"`, `rel="noopener"` and the trailing icon

### Requirement: Chart titles

Edition: CE. Time-series and breakdown charts SHALL show their title as a visible heading above the plot, besides the
accessible summary, and an optional note under the title that never overlaps the legend or the plot. The note of every
time-series chart names its bucket (such as "Hourly") and the time zone of its axis; other notes give the unit, such as
"per UTC day".

#### Scenario: Hourly note
- **GIVEN** the Egress section of Analytics with hourly buckets and `tz=Europe/Madrid`
- **WHEN** "Egress ended by status" renders
- **THEN** a note naming "Hourly" and Europe/Madrid reads under the title, not above it

### Requirement: Track source icon
Edition: CE. Track sources SHALL render as icons with a tooltip and an accessible label (Camera `videocam`, Microphone
`mic`, Screen share `screen_share`, Screen share audio `volume_up`, Unknown `help`) wherever a source is shown in a
table or a list of sources.

#### Scenario: Published sources
- **GIVEN** a participant publishing camera and microphone
- **WHEN** the Published column renders
- **THEN** it shows the camera and microphone icons, and hovering the first shows "Camera"

### Requirement: Paused live chip

Edition: CE. While the page's auto-refresh is off, the live chip SHALL read "paused" with a `pause` icon and the tooltip
"Auto-refresh is off · data from hh:mm:ss" (the page's last update); "stale" takes precedence, and choosing an interval
again turns it back to "LIVE".

#### Scenario: Stale takes precedence
- **GIVEN** the auto-refresh set to Off
- **WHEN** a status reports the writer batch 45 s before its `generatedAt`
- **THEN** the chip reads "stale"

#### Scenario: Interval chosen again
- **GIVEN** the chip reading "paused"
- **WHEN** the user chooses 10 s
- **THEN** the chip reads "LIVE"

### Requirement: Balanced tile rows

Edition: CE. Every row of KPI tiles SHALL use the fewest rows in which each tile is at least 150 px wide, and as wide as
its widest value on one line when the row allows, spreading the tiles evenly so no row holds more than one tile more
than another (best effort: a value wider than the row wraps). It is laid out from its measured width before first paint,
the tiles wrapping at the minimum width until measured, so no tile renders narrower than 150 px.

#### Scenario: Seven tiles with room for five
- **GIVEN** seven tiles and a width that fits five
- **WHEN** the row renders
- **THEN** the tiles take two rows of four and three, not five and two

#### Scenario: Everything fits
- **GIVEN** six tiles and a width that fits six
- **WHEN** the row renders
- **THEN** they share one row

#### Scenario: Phone
- **GIVEN** a 375 px viewport and a row of five tiles
- **WHEN** the row renders
- **THEN** the tiles take rows of two, two and one

#### Scenario: First paint of the Overview

- **GIVEN** the Overview tile row not measured yet
- **WHEN** it paints for the first time
- **THEN** no tile is narrower than 150 px and the row does not jump to another layout after the first frame

### Requirement: Retention length wording
Edition: CE. Every UI text that names a retention SHALL state it in the largest of days, hours, minutes and seconds that
divides it exactly, as "7 days", "1 day", "36 hours" or "90 minutes", or as "7-day", "36-hour" before a noun, and never
round it; a retention without limit SHALL read "Kept forever" where a value is shown.

#### Scenario: Whole days
- **GIVEN** an hourly rollup retention of 400 days and a range starting 500 days ago
- **WHEN** the Analytics page renders
- **THEN** its banner reads "Hourly data older than 400 days is not retained; daily values are shown"

#### Scenario: Hours
- **GIVEN** a page whose data has a 36-hour retention and a range starting 2 days ago
- **WHEN** the range picker shows its retention warning
- **THEN** it reads "Data older than 36 hours is not retained." and never "2 days" or "0 days"

#### Scenario: One day
- **GIVEN** a 1-day retention
- **WHEN** a text names it
- **THEN** it reads "1 day", or "1-day" before a noun

#### Scenario: Minutes
- **GIVEN** a 90-minute retention
- **WHEN** a text names it
- **THEN** it reads "90 minutes", or "90-minute" before a noun

### Requirement: No native title tooltips
Edition: CE. Cards, sections and charts SHALL NOT expose their title as a native `title` attribute, so hovering any part
of them, links included, shows only the tooltips the page defines.

#### Scenario: Link inside a card
- **GIVEN** the Recent rooms card of the Overview
- **WHEN** the pointer rests on a room link
- **THEN** no element between the link and the document root carries a `title` attribute

### Requirement: List empty state
Edition: CE. A list whose first page has no rows SHALL read "No <things> match" with the hint "Change the filters or
widen the time range." and two actions: Clear filters, which removes every filter and `q`, keeping the range, sort and
page size, and Widen range, which opens the range picker. The paginator is hidden meanwhile.

#### Scenario: No agents match
- **GIVEN** the Agents list with filters that match no agent
- **WHEN** it renders
- **THEN** it reads "No agents match" with the hint "Change the filters or widen the time range." and the Clear filters and Widen range actions, and no paginator

#### Scenario: Clear filters
- **GIVEN** `/rooms?from=now-7d&to=now&status=closed&q=demo&cursor=abc&page=2` with no rows
- **WHEN** the user presses Clear filters
- **THEN** the URL becomes `/rooms?from=now-7d&to=now` with the same `tz`, and the list loads its first page

### Requirement: Exact ID not found in a list
Edition: CE. When a list's search holds an exact ID that matches no entity, the list SHALL read "<Entity> <ID> was not
found" with a Clear search action that removes `q`, in place of the filters empty state.

#### Scenario: Unknown egress ID
- **GIVEN** the Egress list searched for `EG_missing`
- **WHEN** the response has no rows
- **THEN** the list reads "Egress EG_missing was not found" with a Clear search action and no paginator

### Requirement: Notice
Edition: CE. Error, warning and info messages inside pages SHALL use one notice: an icon, a message and an optional
action, coloured by variant. The error variant shows the message for the error code, a Retry action and the request id
when it is known, inline in a card or at page level.

#### Scenario: Error with Retry
- **GIVEN** a request that failed with a request id
- **WHEN** its error notice renders
- **THEN** it shows the error icon, the message for the error code, the request id and a Retry action in the error colours

#### Scenario: Info without action
- **GIVEN** an info notice without action
- **WHEN** it renders
- **THEN** it shows the info icon and the message in the info colours, and no button

### Requirement: Section error keeps content

Edition: CE. When the refresh of a card fails, the card SHALL keep its last content and show an error notice with Retry
above it.

#### Scenario: Analytics card refresh fails

- **GIVEN** the Rooms card of the Analytics page showing data
- **WHEN** its refresh fails
- **THEN** it keeps its charts under the error notice with Retry

### Requirement: Charts update in place

Edition: CE. A refresh SHALL update the series of a rendered chart in place, without re-creating the chart or replaying
its entry animation; the entry animation runs only on the first render, and never when reduced motion is requested.

#### Scenario: Refresh of an Analytics chart

- **GIVEN** a rendered chart of the Analytics page
- **WHEN** the user presses refresh
- **THEN** its series update in place without replaying the entry animation

### Requirement: Enum labels

Edition: CE. Every enum value outside a status badge SHALL show its friendly sentence-case label, in kind badges,
chart categories and filters: egress type, SDK, OS, connection type and participant kind. A value without a label
shows the raw value. Status badges keep their lowercase words.

#### Scenario: Chart category and filter
- **GIVEN** egresses of type `room_composite`
- **WHEN** the egress type breakdown and the Type filter render
- **THEN** both read "Room composite"

### Requirement: Reconciler estimate text

Edition: CE. Every value estimated by the reconciler SHALL be explained with one text, "Closed by the reconciler: the
end time is estimated", as the tooltip of the estimated status badge.

#### Scenario: Estimated status badge

- **GIVEN** a room closed by the reconciler in the Rooms list
- **WHEN** the user hovers its status badge
- **THEN** the tooltip reads "Closed by the reconciler: the end time is estimated"

### Requirement: Time cells
Edition: CE. Every table column that shows times SHALL render each time as a time element with tabular figures, so the
digits align from row to row, and SHALL carry the time-zone header hint: a tooltip on the column header naming the
active zone.

#### Scenario: Started column
- **GIVEN** the Rooms list with `tz=Europe/Madrid`
- **WHEN** the Started column renders
- **THEN** its times align digit by digit across rows and hovering the header shows Europe/Madrid

### Requirement: Live durations

Edition: CE. Every duration of something still running SHALL count up live from its start between refreshes, ignoring
any stored duration it carries; a total that includes a running part adds that part's elapsed time. An ended item shows
its stored duration, or its end minus its start without one, and an item with neither a stored duration nor the times
to compute one shows "—".

#### Scenario: Running total
- **GIVEN** an ingress with a stored total duration of 1 h and a session publishing for 5 minutes
- **WHEN** its total duration renders
- **THEN** it reads "1 h 05 m" and keeps counting while the session runs

#### Scenario: Nothing to compute
- **GIVEN** a row with no stored duration and no start time
- **WHEN** it renders
- **THEN** its duration reads "—"

### Requirement: Abbreviation tooltips

Edition: CE. Wherever SDK labels a column header, a fact, a chart or a tile, its info tip SHALL spell the abbreviation
out; the label itself carries no dotted underline and no hover text.

#### Scenario: Charts named by an abbreviation

- **WHEN** the user opens the info tip of the Analytics SDK breakdown
- **THEN** it reads "Software development kit the client connected with."

### Requirement: List search box
Edition: CE. Every list SHALL search with one box: a search icon, the list's label (Rooms "Room name or SID",
Participants and Agents "Identity or SID", Egress "Room name or egress ID", Ingress "Ingress name or ID") and a "Clear
search" button. Text of at least 2 characters, or an exact ID, is written to `q` after 300 ms, dropping `cursor` and
`page`; one character shows the hint "Type at least 2 characters" and writes nothing.

#### Scenario: Agents search
- **GIVEN** the Agents list
- **WHEN** the user types `voice` in the "Identity or SID" box and waits 300 ms
- **THEN** the URL gets `q=voice` without `cursor` and `page`, and the list shows the agents whose identity starts with "voice"

#### Scenario: Too short
- **GIVEN** the Rooms list
- **WHEN** the user types `d`
- **THEN** the box shows the hint "Type at least 2 characters" and the URL keeps its `q`

#### Scenario: Clear search
- **GIVEN** the Ingress list with `q=cam`
- **WHEN** the user presses the "Clear search" button
- **THEN** the box empties and `q` leaves the URL

### Requirement: Exact ID search in lists
Edition: CE. An exact ID in a list's search box (the list's `RM_`, `PA_`, `EG_` or `IN_` prefix followed by letters and
digits) SHALL filter the list to that entity, ignoring the range and the other filters, with the hint "Exact ID: range
and filters ignored · Enter opens it"; Enter opens the entity's detail (the locked page in CE), keeping the range.

#### Scenario: Room SID outside the range
- **GIVEN** the Rooms list over the last hour with `status=active`, and a room `RM_ab12cd` closed two days ago
- **WHEN** the user types `RM_ab12cd`
- **THEN** the list shows that room alone and the hint reads "Exact ID: range and filters ignored · Enter opens it"

#### Scenario: Enter opens the detail
- **GIVEN** `PA_x1y2` typed in the Participants search box
- **WHEN** the user presses Enter
- **THEN** the application opens `/participants/PA_x1y2`, and the Participants breadcrumb links back with the same `from`, `to` and `tz`

### Requirement: Filter bar layout
Edition: CE. In the filter bar of a list or section, a hint under one field SHALL NOT move the other controls: every
control keeps its position and the hint only adds height below the bar.

#### Scenario: Hint appears
- **GIVEN** the Rooms filter bar with the status toggle and the search box side by side
- **WHEN** the hint "Type at least 2 characters" appears under the search box
- **THEN** the status toggle and the other filters keep their position

### Requirement: Room filter chip
Edition: CE. Participants, Agents and Egress SHALL show their `room` filter as one chip, "Room: <name>" (the room SID
until the name is known), that links to the room and has a remove button dropping `room`, `cursor` and `page`.

#### Scenario: Participants of a room
- **GIVEN** `/participants?room=RM_ab12cd` for room `demo-room`
- **WHEN** the list renders
- **THEN** it shows the chip "Room: demo-room" linking to the room, and its remove button lists every room's participants from the first page

### Requirement: Zone chip

Edition: CE. On a timed page without the range picker (the Overview) the header SHALL show a compact chip naming the
session zone ("UTC", "Europe/Madrid") whose menu offers UTC, the browser zone (named, such as "Browser
(Europe/Madrid)") and a search over every IANA zone, the active one checked; choosing one writes `tz` to the URL, which
sets the session zone without changing the stored default, and keeps the page's other parameters.

#### Scenario: Any other zone
- **GIVEN** the zone chip menu open on Overview
- **WHEN** the user types "tok" in its search and picks Asia/Tokyo
- **THEN** Overview reloads its today figures for Asia/Tokyo, the chip reads "Asia/Tokyo" and the menu closes

#### Scenario: Keyboard
- **GIVEN** the zone chip focused
- **WHEN** the user presses Enter, moves with the arrow keys and presses Enter on UTC
- **THEN** the session zone becomes UTC and focus returns to the chip

### Requirement: Info tips
Edition: CE. An info tip SHALL be an info icon button right after a label or heading, named "About <label>" for
assistive technology, that shows its text as a tooltip on hover, keyboard focus or tap and hides it on Escape, blur or a
second tap. KPI tiles, section and Analytics cards, charts, data table column headers (table and card layouts) and
entity facts take one from their definition; the label then carries no hover text of its own.

#### Scenario: Hover
- **GIVEN** a KPI tile "Unique identities" with an info tip
- **WHEN** the pointer rests on its info icon
- **THEN** the tooltip shows the explanation, and resting on the label or the value shows nothing

#### Scenario: Keyboard
- **GIVEN** a section card heading with an info tip
- **WHEN** the user tabs to its info icon and then presses Escape
- **THEN** the icon is announced as "About <heading>" with the explanation as its description, the tooltip shows on focus and hides on Escape

#### Scenario: Touch
- **GIVEN** a phone and a chart heading with an info tip
- **WHEN** the user taps the info icon and then taps it again
- **THEN** the first tap shows the tooltip and the second hides it, without a long press

#### Scenario: Sortable column header
- **GIVEN** a sortable column header with an info tip
- **WHEN** the user activates the info icon
- **THEN** the tooltip shows and the sort does not change; activating the header label sorts

#### Scenario: Tile that links to a list
- **GIVEN** an Overview live tile that opens a filtered list and has an info tip
- **WHEN** the user activates the info icon
- **THEN** the tooltip shows and the list does not open; activating the rest of the tile opens it

#### Scenario: Card layout
- **GIVEN** an XSmall viewport and a table column with an info tip
- **WHEN** the rows render as cards
- **THEN** that column's label in each card carries the info icon
