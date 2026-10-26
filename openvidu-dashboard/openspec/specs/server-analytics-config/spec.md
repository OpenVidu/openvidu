# server-analytics-config Specification

## Purpose
The `openvidu.analytics` configuration surface of the OpenVidu server: keys, defaults per edition,
validation, the mapping of the deprecated `expiration` and `fixer_interval` keys and the environment variable forms.

## Requirements

### Requirement: Configuration keys and defaults
Edition: CE and PRO. The server SHALL read `openvidu.analytics` with the keys `enabled`, `mongo_url`, `database`,
`interval`, `retention {events, stats, tracks, entities, rollups_5min, rollups_hourly, rollups_daily}`,
`stats_detail`, `anonymize_ip`, `store_metadata`, `events.store_types`, `queue {max_events, max_stats}`,
`validation_action`, `reconciler {enabled, interval, max_closures_per_run}` and `migration {enabled, rate,
batch_size}`, applying a default for every absent key.

#### Scenario: Minimal configuration
- **GIVEN** a configuration with only `enabled: true` and `mongo_url`
- **WHEN** the server starts
- **THEN** the effective values are `database: openvidu`, `interval: 10s`, `retention.events: 7d`, `retention.stats: 7d`, `retention.tracks: 7d`, `retention.entities: 90d`, `retention.rollups_5min: 7d`, `retention.rollups_hourly: 400d`, no limit for daily rollups, `anonymize_ip: true`, `store_metadata: false`, `queue.max_events: 20000`, `queue.max_stats: 50000`, `validation_action: warn`, `reconciler.enabled: true`, `reconciler.interval: 60s`, `reconciler.max_closures_per_run: 500`, `migration.enabled: true`, `migration.rate: 2000`, `migration.batch_size: 500` and `events.store_types` equal to the catalogue minus `API_CALL`, `TRACK_PUBLISHED_UPDATE`, `TRACK_MAX_SUBSCRIBED_VIDEO_QUALITY` and `TRACK_SUBSCRIBE_REQUESTED`

#### Scenario: Daily rollups kept forever
- **GIVEN** `retention.rollups_daily` absent or `0`
- **WHEN** the server starts
- **THEN** daily rollups never expire

#### Scenario: Analytics disabled
- **GIVEN** `enabled` absent or `false`
- **WHEN** the server starts
- **THEN** no database connection is opened, no collection is created and the ingest clients discard events and stats

### Requirement: Stats detail default per edition
Edition: CE and PRO. `stats_detail` SHALL accept `participant` or `track`; when absent, the CE server
SHALL default to `participant` and the PRO server to `track`; an explicit value SHALL win in both editions.

#### Scenario: CE default
- **GIVEN** a CE server with `stats_detail` absent
- **WHEN** stats are written
- **THEN** `track_stats` documents are per participant and direction

#### Scenario: PRO default
- **GIVEN** a PRO server with `stats_detail` absent
- **WHEN** stats are written
- **THEN** `track_stats` documents are per track and direction

#### Scenario: Explicit value
- **GIVEN** a PRO server with `stats_detail: participant`
- **WHEN** stats are written
- **THEN** `track_stats` documents are per participant and direction

### Requirement: Deprecated expiration key
Edition: CE and PRO. The deprecated `expiration` key SHALL be accepted: when it is set and neither
`retention.events` nor `retention.stats` is set, both take its value and a deprecation warning names them; when
either of them is set, `expiration` is ignored for both and the warning says so.

#### Scenario: Only expiration set
- **GIVEN** `expiration: 768h` and no `retention` block
- **WHEN** the server starts
- **THEN** `retention.events` and `retention.stats` are `32d`, the other retentions keep their defaults and a warning names `retention.events` and `retention.stats`

#### Scenario: Both set
- **GIVEN** `expiration: 768h` and `retention.events: 1d`
- **WHEN** the server starts
- **THEN** `retention.events` is `1d`, `retention.stats` keeps its default `7d` and a warning states that `expiration` is ignored

### Requirement: Deprecated fixer_interval key
Edition: CE and PRO. The deprecated `fixer_interval` key SHALL set the reconciler period when
`reconciler.interval` is absent, with a deprecation warning naming `reconciler.interval`; when both are set,
`reconciler.interval` SHALL win and the warning SHALL say that `fixer_interval` is ignored.

#### Scenario: Only fixer_interval set
- **GIVEN** `fixer_interval: 30s` and no `reconciler.interval`
- **WHEN** the server starts
- **THEN** the reconciler runs every 30 s and a warning names `openvidu.analytics.reconciler.interval` as its replacement

#### Scenario: Both set
- **GIVEN** `fixer_interval: 30s` and `reconciler.interval: 20s`
- **WHEN** the server starts
- **THEN** the reconciler runs every 20 s and a warning states that `fixer_interval` is ignored

#### Scenario: Alias from the environment
- **GIVEN** `LIVEKIT_OPENVIDU_ANALYTICS_FIXER_INTERVAL=30s` and no `reconciler.interval`
- **WHEN** the server starts
- **THEN** the reconciler runs every 30 s and the deprecation warning is logged

#### Scenario: Invalid alias value
- **GIVEN** `interval: 10s` and `fixer_interval: 5s`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.fixer_interval`

### Requirement: Validation of values
Edition: CE and PRO. When analytics is enabled, the server SHALL refuse to start on an invalid value and name the
offending key: empty `mongo_url`, `interval` outside 1s–60s, `reconciler.interval` below `interval`, a retention
below 1h, above 2^31−1 s or not in whole seconds, `retention.entities` below 2d, `retention.rollups_daily` below
`rollups_hourly`, unknown `stats_detail` or `validation_action` or event type, a queue limit below 1000,
or a reconciler or migration limit out of range.

#### Scenario: Invalid interval
- **GIVEN** `interval: 500ms`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.interval` and the allowed range

#### Scenario: Reconciler interval shorter than the batch interval
- **GIVEN** `interval: 10s` and `reconciler.interval: 5s`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.reconciler.interval` and `openvidu.analytics.interval`

#### Scenario: Retention with a fraction of a second
- **GIVEN** `retention.events: 168h500ms`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.retention.events` and requiring a whole number of seconds

#### Scenario: Retention above the TTL limit
- **GIVEN** `retention.rollups_hourly: 30000d`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.retention.rollups_hourly` and the maximum `24855d3h14m7s` (2^31−1 seconds, the MongoDB TTL limit), before any database operation

#### Scenario: Entities retention too short for daily unique identities
- **GIVEN** `retention.entities: 1d`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.retention.entities` and the minimum `2d`

#### Scenario: Daily rollups kept for less than hourly rollups
- **GIVEN** `retention.rollups_hourly: 400d` and `retention.rollups_daily: 365d`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.retention.rollups_daily` and `openvidu.analytics.retention.rollups_hourly`

#### Scenario: Reconciler and migration limits
- **GIVEN** one of `reconciler.max_closures_per_run: 0`, `migration.rate: -1` or `migration.batch_size: 20000`
- **WHEN** the server starts
- **THEN** it exits with a message naming that key; the accepted values are `max_closures_per_run` at least 1, `rate` at least 0 and `batch_size` from 1 to 10000

#### Scenario: Unknown event type
- **GIVEN** `events.store_types: [ROOM_CREATED, ROOM_CLOSED]`
- **WHEN** the server starts
- **THEN** it exits with a message naming `ROOM_CLOSED` as unknown

### Requirement: Duration syntax
Edition: CE and PRO. Every duration of `openvidu.analytics` SHALL accept a Go duration (`10s`, `168h`, `1h30m`), a
bare integer of nanoseconds, or a whole number of days followed by `d` and optionally by a Go duration (`7d`,
`400d`, `1d12h`); any other form SHALL stop the server with a message naming the key and the accepted forms.

#### Scenario: Days
- **GIVEN** `retention.entities: 90d`
- **WHEN** the server starts
- **THEN** closed entities are kept for 2 160 hours

#### Scenario: Days and hours
- **GIVEN** `retention.tracks: 1d12h`
- **WHEN** the server starts
- **THEN** closed tracks and subscriptions are kept for 36 hours

#### Scenario: Go duration in hours
- **GIVEN** `retention.events: 168h`
- **WHEN** the server starts
- **THEN** raw events are kept for 7 days

#### Scenario: Unsupported form
- **GIVEN** one of `retention.events: 1w`, `retention.events: 1.5d` or `retention.events: 12h1d`
- **WHEN** the server starts
- **THEN** it exits with a message naming `openvidu.analytics.retention.events` and the accepted forms

### Requirement: Environment variable forms
Edition: CE and PRO. Every key SHALL be settable through `LIVEKIT_OPENVIDU_ANALYTICS_<KEY_PATH>` with the
path upper-cased and dots replaced by underscores; durations, in YAML or the environment, follow the duration
syntax, booleans are `true`/`false` and `events.store_types` a comma-separated list; an environment variable
overrides the YAML value.

#### Scenario: Duration as an integer
- **GIVEN** `interval: 10000000000`
- **WHEN** the server starts
- **THEN** the effective `interval` is `10s`

#### Scenario: Nested duration from the environment
- **GIVEN** `LIVEKIT_OPENVIDU_ANALYTICS_RETENTION_EVENTS=30d` and a YAML file with `retention.events: 7d`
- **WHEN** the server starts
- **THEN** the effective `retention.events` is `30d`

#### Scenario: Reconciler interval from the environment
- **GIVEN** `LIVEKIT_OPENVIDU_ANALYTICS_RECONCILER_INTERVAL=30s`
- **WHEN** the server starts
- **THEN** the effective `reconciler.interval` is `30s`

#### Scenario: Boolean default overridden from the environment
- **GIVEN** `LIVEKIT_OPENVIDU_ANALYTICS_ANONYMIZE_IP=false` and no `anonymize_ip` in the YAML file
- **WHEN** the server starts
- **THEN** the effective `anonymize_ip` is `false`

#### Scenario: List from the environment
- **GIVEN** `LIVEKIT_OPENVIDU_ANALYTICS_EVENTS_STORE_TYPES=ROOM_CREATED,ROOM_ENDED`
- **WHEN** the server starts
- **THEN** only `ROOM_CREATED` and `ROOM_ENDED` raw events are stored

### Requirement: Effective configuration logged
Edition: CE and PRO. At startup the server SHALL log the effective analytics configuration at info level with the
credentials of `mongo_url` redacted and every duration in the duration syntax, leading with whole days.

#### Scenario: Startup log
- **GIVEN** `mongo_url: mongodb://admin:secret@mongo:27017/?replicaSet=rs0`
- **WHEN** the server starts
- **THEN** the log line contains every effective key, `mongodb://admin:***@mongo:27017/?replicaSet=rs0` and never `secret`

#### Scenario: Durations in days
- **GIVEN** the default configuration with `retention.tracks: 36h`
- **WHEN** the server starts
- **THEN** the log line shows `retention.entities` as `90d`, `retention.tracks` as `1d12h`, `interval` as `10s` and `reconciler.interval` as `1m`
