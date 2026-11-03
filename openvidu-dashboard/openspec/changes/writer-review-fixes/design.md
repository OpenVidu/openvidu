# Design

## Context

- **Ingress state:** `IOInfoService.UpdateIngressState` (`pkg/service/ioservice_ingress.go`) stores the state the
  ingress service sends and emits `IngressStarted`, `IngressUpdated` or `IngressEnded` with it. On a local deployment
  the buffering and publishing states arrive with an empty `room_id`, and only the ending state names the room
  (`RM_rgFu9jsQne28`), although the ingress participant joined that room 40 ms before the publishing state.
- **Ingress projection:** the writer's `projection/ingress.go` lifts `roomSid` from `state.room_id`, and adds the
  session to the room's `internal.ingressSessionIds` only when it is set.
- **Ingress store:** `IOInfoService` holds an `IngressStore`, which `getIngressStore` resolves to the `*RedisStore`,
  also the `ObjectStore` that loads rooms by name. Ingress needs Redis.
- **Egress history:** `projection/egress.go` adds `{ status, at }` to `statusHistory` with `$setUnion`, which drops only
  identical entries: two `active` updates 13 ms apart, one per output, both stay.
- **Browser vocabulary:** `projection/vocabulary.go` maps an empty browser to `other`, through `browserFamily()`.

## Goals / Non-Goals

**Goals:**
- A publishing ingress session is linked to, and counted by, its room with no new projection path.
- The contract stays additive.

**Non-Goals:**
- Changing how the ingress service reports its state (upstream LiveKit ingress).

## Decisions

### D1. The server names the room of an ingress state

In an OPENVIDU block of `UpdateIngressState`, when `req.State.RoomId` is empty and the ingress has a room name, the
server loads that room through the store and sets the room's SID on the state it emits. A missing or failing load
leaves it empty, logged at debug. The block runs before the telemetry calls, so the webhook and the analytics event
carry the same state, and the stored state is updated with it too.

The store is reached through a type assertion of `s.is` to the room loader that `*RedisStore` implements, so the wire
graph is unchanged.

Rejected: linking the session in the writer when the ingress participant joins. That event has no `resource_id`, so
the room could not count the session until it ends, and the room's counters would still miss a live ingress.

### D2. One status history entry per egress status

The `statusHistory` update keeps, for the incoming status, the entry with the earliest `at`: it drops any stored entry
of the same status whose `at` is later, adds the incoming entry when no entry of that status is left, sorts by `at` and
keeps the last 50. Egress statuses only move forward, so a repeated status is never a new step.

Rejected: comparing with the last entry only, which depends on the order events arrive in.

### D3. `none` in the browser vocabulary

`browserFamily("")` returns `none`, and `BrowserFamily` gains `NONE: 'none'`, in the contract that the validator and
the writer share.

Rejected: leaving `other` for both, which hides SDKs without a browser among unknown browsers.

## Data model

| Collection | Change |
| --- | --- |
| `ingress_sessions` | `roomSid` set from the first publishing state, instead of the ending one. |
| `rooms` | `internal.ingressSessionIds`, and the counters it feeds, set as soon as the session publishes. |
| `egresses` | `statusHistory` with one entry per status. |
| `analytics_5min`, `analytics_hourly`, `analytics_daily` | `participants.byBrowser.none`. |

- No index change.
- No schema version bump: the v2 schema has not shipped.
- Legacy migration: the legacy events carry no ingress state of this kind and no output updates, so the mapping is
  unchanged. Legacy sessions without a browser stay under `other`.

## Performance budget

One `LoadRoom` (a Redis `HGET`) per ingress state update without a room id: a handful per ingress session. The writer
budgets are unchanged; the batch benchmark covers the egress update.

## Risks / Trade-offs

- [The room is recreated under the same name while the ingress publishes] → The state names the room active at the
  time of the update, the one the ingress participant is in.
- [The webhooks of those state updates now carry `room_id`] → An addition, matching what the ending state already
  sends.

## Migration Plan

Ships with the 3.10 server, and the dashboard typings ship with it through the contract. `ui-review-fixes` labels the
new key.
