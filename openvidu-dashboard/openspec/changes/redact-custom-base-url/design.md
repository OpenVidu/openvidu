# Design

## Context

- The codec copies a field of a protocol message only when the allow-list names it, with a rule per field. `redactURL`
  rewrites a URL to scheme, host and path with the last segment replaced by `***`.
- `custom_base_url` has the rule `keep` in `RoomCompositeEgressRequest` and `TemplateSource`. The egress request
  summary redacts it on its own, so only raw payloads hold the full value.

## Goals / Non-Goals

**Goals:**
- No stored payload holds the query string, userinfo or last path segment of a custom base URL.

**Non-Goals:**
- Rewriting stored events. The read side of an edition may redact them again.

## Decisions

### Same rule as the web URL

`custom_base_url` gets `redactURL`, the rule of `WebEgressRequest.url` and `WebSource.url`. A layout page under a
custom base URL is as likely as a web egress page to take a token in its query string or path.

Alternative rejected: `stripURLCredentials`, which keeps the path. A token in the last path segment would survive.

### Data model

- Collections: `events` (payloads of `EGRESS_*` events). No field, type, index or retention change; no schema-version
  change.
- Migration from legacy events: the legacy migration encodes with the same codec, so migrated payloads are redacted too.
- Performance: none.

## Risks / Trade-offs

- [The redacted value no longer opens the layout] → The value is shown for reference only; the request summary was
  already redacted.
