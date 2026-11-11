# Spec Delta

## ADDED Requirements

### Requirement: Publisher peak
Edition: CE and PRO servers. The writer SHALL keep in `participants.peakPublishers` the most STANDARD sessions of a
room active at once that have sent media. A session has sent media from the first `TRACK_PUBLISHED` of one of its
tracks with `muted: false`, or `TRACK_UNMUTED`, until it leaves. The peak SHALL be evaluated at every event that
changes either set, including several in one batch, and SHALL never decrease.

#### Scenario: Meeting with one speaker
- **GIVEN** an active room whose five STANDARD participants publish their microphone and camera muted, as OpenVidu Meet
  does when they are turned off
- **WHEN** only one of them unmutes its microphone, several times
- **THEN** `participants.peakPublishers` is 1 and `participants.peakActive` is 5

#### Scenario: Participants taking turns
- **GIVEN** an active room with four STANDARD participants that published muted
- **WHEN** `alice` unmutes and mutes again, and then `bob` unmutes and mutes again, both staying in the room
- **THEN** `participants.peakPublishers` is 2

#### Scenario: Senders one after the other
- **GIVEN** an active room
- **WHEN** `alice` joins, publishes unmuted and leaves, and then `bob` joins and publishes unmuted
- **THEN** `participants.peakPublishers` is 1

#### Scenario: Peak inside one batch
- **GIVEN** a batch in which `alice` and `bob` publish unmuted tracks and `alice` then leaves
- **WHEN** the batch is projected
- **THEN** `participants.peakPublishers` is 2

#### Scenario: Track published muted and never unmuted
- **GIVEN** an active STANDARD participant
- **WHEN** a `TRACK_PUBLISHED` of its microphone with `muted: true` is projected, and no `TRACK_UNMUTED` follows
- **THEN** the session does not count in `participants.peakPublishers`

#### Scenario: Agent speaking
- **GIVEN** an active room with one STANDARD participant that never sends media
- **WHEN** an AGENT participant publishes an unmuted microphone track
- **THEN** `participants.peakPublishers` stays 0 and the room's `topology` is `single_participant`

### Requirement: Recorded room
Edition: CE and PRO servers. The writer SHALL set a room's `features.recording` once one of its egresses whose request
has a `file` or `segments` output reports `active`, `ending`, `complete` or `limit_reached`; `false` until then. An
egress with only `stream` or `images` outputs SHALL NOT make a room recorded.

#### Scenario: Recording that completes
- **GIVEN** a room composite egress of room `demo` with a file output
- **WHEN** its `EGRESS_STARTED` (starting), `EGRESS_UPDATED` (active) and `EGRESS_ENDED` (complete) are projected
- **THEN** the room's `features.recording` is `false` after the first event and `true` after the second and the third

#### Scenario: Recording that fails before starting
- **GIVEN** a track composite egress of room `demo` with a segments output
- **WHEN** its `EGRESS_STARTED` (starting) and `EGRESS_ENDED` (failed) are projected, with no `active` report
- **THEN** the room's `features.recording` stays `false`

#### Scenario: Live stream
- **GIVEN** a room composite egress of room `demo` with a stream output only
- **WHEN** it reports `active`
- **THEN** the room's `features.egress` is `true` and `features.recording` stays `false`

### Requirement: Room class counters at room end
Edition: CE and PRO servers. When the writer projects the `ROOM_ENDED` of a room with a `topology`, it SHALL add to the
hourly and daily rollups of the end bucket, in each scope of the room's server: 1 to `rooms.byTopology.<class>`; 1 to
`rooms.recorded` when `features.recording` is `true`; and 1 to `rooms.sizeByTopology.<class>.<range>` for a class
with a size range. It SHALL read them from the room document once the batch that closes it is applied.

#### Scenario: Ended rooms
- **GIVEN** a server with the media node label `mn-a` on which a recorded `many_to_many` room with N = 12 and a
  `one_to_one` room end between 10:00 and 11:00 UTC
- **WHEN** their `ROOM_ENDED` are projected
- **THEN** the hourly and daily documents of `global` and `node:mn-a` add 1 to `rooms.byTopology.many_to_many`, 1 to
  `rooms.byTopology.one_to_one`, 1 to `rooms.recorded` and 1 to `rooms.sizeByTopology.many_to_many.11-25`

#### Scenario: Events of the last batch
- **GIVEN** a batch in which a third STANDARD participant of a room sends media and the room then ends
- **WHEN** the batch is projected
- **THEN** the room is counted in `rooms.byTopology.many_to_many`, as its document reads after the batch

#### Scenario: Replayed batch
- **GIVEN** a batch whose `ROOM_ENDED` was already counted by a previous process
- **WHEN** the batch is processed again
- **THEN** `rooms.byTopology`, `rooms.recorded` and `rooms.sizeByTopology` are unchanged
