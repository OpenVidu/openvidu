## MODIFIED Requirements

### Requirement: Time-series chart fixed to the range
Edition: CE. The time-series chart SHALL render the given series between `from` and `to` in the given timezone with
granularity buckets; the x-axis never extends beyond the range nor ticks closer than the unit of its labels, wheel and
drag scroll the page, and no zoom component is enabled. It uses a shared tooltip keyed by x across the charts of a
page, 2 px lines, one y-axis per chart, and the shared formatters for bytes, bitrates, durations and percentages.

#### Scenario: Wheel over a chart
- **GIVEN** a chart in the page
- **WHEN** the user scrolls the mouse wheel over it
- **THEN** the page scrolls and the chart range is unchanged

#### Scenario: Sparse data
- **GIVEN** buckets exist only for half of the range
- **WHEN** the chart renders
- **THEN** the x-axis spans `from` to `to` and missing buckets show gaps, not a shortened axis

#### Scenario: Labels of a short range
- **GIVEN** a chart from 10:06:20 to 10:09:50 with one-minute buckets
- **WHEN** it renders
- **THEN** the x-axis labels read whole minutes, each one once (`10:07`, `10:08`, `10:09`), and a range of several
  days labelled `MM-dd` ticks at most once a day

#### Scenario: Integer values
- **GIVEN** a series whose values are all integers, such as active participants 2, 3 and 2
- **WHEN** the chart renders
- **THEN** the y-axis ticks are whole numbers, never 0.5 or 2.5, and a chart holding a fractional value keeps
  fractional ticks

#### Scenario: Last step of a step series
- **GIVEN** a step series whose last bucket starts at 10:06 with the value 1, in a range ending at 10:06:55
- **WHEN** the chart renders
- **THEN** the line holds 1 from 10:06 to 10:06:55 instead of ending at 10:06

### Requirement: Empty, skeleton and error states
Edition: CE. Empty state SHALL show icon, title, hint and up to two actions ("Clear filters", "Widen range");
skeletons match the height of what they replace, stay invisible for their first 300 ms and render only until the first
response of what they replace; the error notice shows the message, a Retry action and the request id, inline in a
card or at page level.

#### Scenario: No rooms match
- **GIVEN** a filtered list returns no rows
- **WHEN** the empty state renders
- **THEN** it reads "No rooms match" with the hint "Change the filters or widen the time range.", offers "Clear filters" and "Widen range", and the layout height does not jump

#### Scenario: Fast first response
- **GIVEN** a page whose first response arrives 120 ms after it opens
- **WHEN** the page loads
- **THEN** no skeleton bar is painted, the space of what it replaces is kept and the content appears without a layout
  jump

#### Scenario: Slow first response
- **GIVEN** a page whose first response takes 2 s
- **WHEN** the page loads
- **THEN** the skeleton becomes visible 300 ms after the page opened and the content replaces it when the response
  arrives

### Requirement: Global search

Edition: CE. The global search SHALL debounce input and send no request below 2 characters, showing the hint "Type at
least 2 characters". An exact ID (`RM_`, `PA_`, `EG_`, `IN_`, `TR_` prefix) shows "Open <entity> <ID>" first; Enter
opens that detail route (locked in CE) keeping the current range. Other text shows grouped prefix results (rooms,
participants, egress, ingress; up to five each) with "See all in …" links to the list filtered by `q`.

#### Scenario: Exact SID
- **GIVEN** the user types `PA_x1y2` with the range `from=now-6h&to=now&tz=UTC`
- **WHEN** the results panel opens and the user presses Enter
- **THEN** its first option reads "Open participant PA_x1y2", the application navigates to `/participants/PA_x1y2`, and the Participants breadcrumb links to `/participants?from=now-6h&to=now&tz=UTC`

#### Scenario: Exact track ID
- **GIVEN** the user types `TR_a2b3`
- **WHEN** the results panel opens and the user presses Enter
- **THEN** its first option reads "Open track TR_a2b3" and the application navigates to `/tracks/TR_a2b3`

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

### Requirement: Formatters

Edition: CE. Shared formatters SHALL render numbers with `Intl.NumberFormat('en')`, percentages with one decimal and a
space before the sign ("96.4 %", donut labels included), bytes in decimal units with three significant digits and
durations as `850 ms`, `42 s`, `12 m 05 s`, `1 h 02 m`, `3 d 4 h`, rounded to the smallest unit shown; timestamps
SHALL read as the timestamp format scenario states.

#### Scenario: Bytes and duration
- **GIVEN** 12345678 bytes and 3725000 ms
- **WHEN** formatted
- **THEN** they read "12.3 MB" and "1 h 02 m"

#### Scenario: Rounded durations
- **GIVEN** durations of 2 700 ms, 59 600 ms and 3 569 600 ms
- **WHEN** formatted
- **THEN** they read "3 s", "1 m 00 s" and "59 m 30 s"

#### Scenario: Percent in a donut
- **GIVEN** a connection success ratio of 0.9643 and a donut slice of 0.25
- **WHEN** they are shown
- **THEN** they read "96.4 %" and "25.0 %"

#### Scenario: Timestamp format

- **WHEN** a timestamp is formatted
- **THEN** it reads `2026-10-13 12:31:05` (date omitted inside the current day of a 24 h range) with a `UTC` suffix
  when `tz=UTC`

### Requirement: Enum labels

Edition: CE. Every enum value outside a status badge SHALL show its friendly sentence-case label, in kind badges,
chart categories and filters: egress type, SDK, OS, browser, connection type and participant kind; the browser key
`none` reads "No browser". A value without a label shows the raw value, and an OS string a client reported reads as
its family label when it names one. Status badges keep their lowercase words.

#### Scenario: Chart category and filter
- **GIVEN** egresses of type `room_composite`
- **WHEN** the egress type breakdown and the Type filter render
- **THEN** both read "Room composite"

#### Scenario: Browser keys
- **GIVEN** a browser breakdown with the keys `chrome`, `none` and `other`
- **WHEN** its donut renders
- **THEN** the slices read "Chrome", "No browser" and "Other"

#### Scenario: Reported OS
- **GIVEN** the client OS strings `linux`, `Linux`, `macos` and `Chrome OS`
- **WHEN** they are shown through the shared OS label
- **THEN** they read "Linux", "Linux", "macOS" and "Chrome OS"

### Requirement: Live durations

Edition: CE. Every duration of something still running SHALL count up live from its start between refreshes, in whole
elapsed units and ignoring any stored duration it carries; a total that includes a running part adds that part's
elapsed time. An ended item shows its stored duration, or its end minus its start without one, and an item with
neither a stored duration nor the times to compute one shows "—".

#### Scenario: Running total
- **GIVEN** an ingress with a stored total duration of 1 h and a session publishing for 5 minutes
- **WHEN** its total duration renders
- **THEN** it reads "1 h 05 m" and keeps counting while the session runs

#### Scenario: Running and then ended
- **GIVEN** an egress active for 2 700 ms
- **WHEN** its duration renders
- **THEN** it reads "2 s", and once the egress ends with a stored duration of 2 700 ms it reads "3 s"

#### Scenario: Nothing to compute
- **GIVEN** a row with no stored duration and no start time
- **WHEN** it renders
- **THEN** its duration reads "—"
