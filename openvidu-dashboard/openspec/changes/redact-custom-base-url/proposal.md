# Proposal

## Why

The writer stores the `custom_base_url` of room composite requests and of the template source of unified egress
requests unchanged in raw event payloads. A custom base URL can carry a token in its query string, while the request
summary of the egress document already stores it redacted.

## What Changes

- Raw event payloads store `custom_base_url` redacted like the web URL: no userinfo, query string or fragment, and the
  last path segment replaced by `***`.

Scope excludes the following:
- Raw events already stored, which keep the value until they expire.
- Any other field of the allow-list.

Edition: CE and PRO (writer). Repositories: openvidu-livekit (`openvidu/analytics/schema/allowlist.go`) and the specs
of the dashboard.

CHANGELOG: none. The analytics data model has not shipped in a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `server-analytics-writer`: the secrets allow-list redacts custom base URLs.

## Impact

- Writer: the allow-list rule of `custom_base_url` in `RoomCompositeEgressRequest` and `TemplateSource`, and the codec
  tests.
- Dashboard: none; the request summary is unchanged.
