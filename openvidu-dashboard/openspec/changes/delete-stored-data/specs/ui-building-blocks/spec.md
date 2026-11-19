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
