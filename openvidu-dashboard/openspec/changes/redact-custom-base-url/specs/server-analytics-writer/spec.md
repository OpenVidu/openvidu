## MODIFIED Requirements

### Requirement: Secrets allow-list
Edition: CE and PRO. Projectors SHALL copy only fields named in an explicit allow-list into any document,
including raw payloads; every other field, present or future, SHALL be dropped. Egress stream, web, websocket and
custom base URLs SHALL be stored without userinfo, query string and fragment and with their last path segment replaced
by `***`; the ingress URL SHALL be stored without userinfo, query string and fragment.

#### Scenario: Fully populated messages
- **GIVEN** an `AnalyticsEvent` of every type with every string field set to a unique sentinel, including `room.turn_password`, egress storage credentials, webhook signing keys, egress tokens, `ingress.stream_key`, `ingress.url`, SIP credentials and `api_call` request bodies
- **WHEN** each is projected with `store_metadata` and IP storage enabled
- **THEN** the sentinels found in all write models are exactly those of the allow-list paths

#### Scenario: Stream URL redacted
- **GIVEN** an egress with stream URL `rtmps://user:pw@live.example.com/app/live_123?token=abc`
- **WHEN** it is projected
- **THEN** the stored output URL is `rtmps://live.example.com/app/***`

#### Scenario: Custom base URL redacted
- **GIVEN** a room composite egress, and a unified egress with a template source, both with custom base URL `https://layouts.example.com/app/index.html?token=abc`
- **WHEN** their `EGRESS_STARTED` events are stored
- **THEN** each raw payload holds `custom_base_url: "https://layouts.example.com/app/***"`
