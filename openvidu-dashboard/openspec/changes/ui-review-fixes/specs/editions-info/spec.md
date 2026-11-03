## MODIFIED Requirements

### Requirement: Storage and database facts in info

Edition: CE. With a valid bearer token `GET /api/v1/info` SHALL include `database` (`version` of the MongoDB server
and `timeseriesSupported`) and `storage`, one entry per analytics collection with `documents`, `storageBytes`,
`indexBytes` and `oldest` (the earliest value of the collection's time field when an index leads with it, and of
`firstSeenAt` for `nodes`), read with `$collStats` and cached for 60 seconds.

#### Scenario: Storage per collection

- **GIVEN** a database with 1 200 rooms and 20 000 raw events
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `storage.rooms.documents` is `1200`, `storage.events.documents` is `20000`, every entry has `storageBytes`
  and `indexBytes`, and `database.version` is the server version string

#### Scenario: Oldest per collection

- **GIVEN** a database with documents in every analytics collection
- **WHEN** the client requests `GET /api/v1/info` with a valid token
- **THEN** `oldest` holds the earliest `createdAt` of `rooms` and `ingresses`, `joinedAt` of `participants`,
  `startedAt` of `egresses` and `ingress_sessions`, `ts` of `events`, `bucket` of the 5-minute and hourly rollups and
  of the `global` scope of the daily rollups, and `firstSeenAt` of `nodes`, while `tracks`, `track_subscriptions` and
  `track_stats` have no `oldest`
