# Spec Delta

## ADDED Requirements

### Requirement: Confirmation dialog
Edition: CE. Destructive actions SHALL be confirmed in one modal dialog: a title, a body with optional links and an
optional checkbox, and the buttons Cancel and a confirm button in the error colour, in that order. It opens with focus
on Cancel, keeps focus inside, closes on Cancel, Escape or a click outside without confirming, and returns focus to the
control that opened it; it passes axe in both themes and fits a 375 px viewport.

#### Scenario: Keyboard confirmation
- **GIVEN** a confirmation dialog opened from a button
- **WHEN** the user presses Tab until the confirm button and then Enter
- **THEN** focus started on Cancel, never left the dialog, the action is confirmed once and focus returns to the
  button that opened it

#### Scenario: Escape cancels
- **GIVEN** a confirmation dialog open
- **WHEN** the user presses Escape
- **THEN** the dialog closes, nothing is confirmed and focus returns to the button that opened it

#### Scenario: Dialog on a phone
- **GIVEN** a 375 px viewport in the dark theme
- **WHEN** a confirmation dialog with a checkbox and a link opens
- **THEN** its title, body, checkbox and both buttons are inside the viewport, the page does not scroll sideways and
  axe reports no violation

### Requirement: Info tip with a link
Edition: CE. An info tip whose text holds a link SHALL show it in a panel, never a hover tooltip: its icon, named "About
<label>" with `aria-expanded`, toggles it on click, tap, Enter or Space. Tab from the icon reaches the link (new tab),
Shift+Tab returns, Tab from the link closes the panel and goes on; Escape or a click outside closes it, focus back on
the icon. The panel fits a 375 px viewport and passes axe in both themes.

#### Scenario: Link tip by keyboard
- **GIVEN** an info tip with a link, followed by another focusable control
- **WHEN** the user tabs to its icon, presses Enter, Tab, Shift+Tab, Tab, then Tab again; and, in a second pass, opens
  it and presses Escape
- **THEN** the panel opened with `aria-expanded="true"`, focus went to the link, back to the icon, to the link, and the
  last Tab closed the panel and moved focus to the next control; Escape closed the panel and returned focus to the icon

#### Scenario: Link tip on a phone
- **GIVEN** a 375 px touch viewport and an info tip with a link
- **WHEN** the user taps the icon and then taps outside the panel
- **THEN** the panel shows inside the viewport, its link can be tapped, and the tap outside closes it without a sideways
  scroll
