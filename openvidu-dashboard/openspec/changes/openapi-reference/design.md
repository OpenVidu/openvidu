# Design

## Context

- `RouteRegistry` holds one `RouteDefinition` per route, and `openApiDocument(registry, version)`
  (`src/api/openapi.ts`) turns the listed routes into a zod-openapi 6 document.
- How the generator fills error responses today:
  - It adds `400` to every operation, `401` to every non-public one, and `403` "PRO feature on CE" to every PRO route.
    No document lists those routes in an edition that answers that 403: locks are left out in CE, and PRO never
    answers it.
  - It adds the `ApiError` schema only to the errors it adds itself. Errors a route declares (login `401`/`429`,
    `ready` `503`, analytics `403`, detail `404`) have no body.
- Parameter descriptions come from `.meta()` on the Zod schemas:
  - A `.meta()` placed before `.default()` stays inside the parameter's schema and never reaches the parameter object.
    This is why `from` and `to` show no description.
  - `csvParam()` parses a string, so its parameters render as plain strings.
- `DashboardOptions` carries the edition and version. The public base path is bound to `TOKENS.BasePath` by a CE
  startup hook, before the docs router is built.

## Goals / Non-Goals

**Goals:**
- A document that a client generator and a reader can use as is.
- Pieces that let PRO document its routes the same way, without CE knowing them.
- Tests that keep the invariants for every route, not only for today's.

**Non-Goals:**
- Changing requests, responses, status codes or authentication.
- Serving the document in production.

## Decisions

### Explicit `operationId`, checked by the registry

- `RouteDefinition` gains a required `operationId`, camelCase, verb first:
  - `list<Resources>` for paged lists;
  - `get<Resource>` for single documents;
  - `get<Resource><Sub>` for sub-resources and summaries;
  - `login`, `refreshSession`, `logout`, `getCurrentAdmin` for auth;
  - `getHealth`, `getReadiness` for the probes.
- `register()` and `replace()` throw on an `operationId` another route already uses. A lock has none and is never
  listed.

Rejected: deriving IDs from method and path. Names such as `getApiV1RoomsSidSeries` read badly, and they would change
when a path changes.

### Declared tags

- `registry.tag(name, description)` declares a tag. Each route module declares its tags before registering its
  routes.
- `register()` throws on an undeclared tag.
- The document lists the declared tags, in declaration order, that at least one listed operation uses.
- Tag names are Title Case nouns: `Probes`, `Auth`, `Info`, `Overview`, `Rooms`, `Participants`, `Agents`, `Egress`,
  `Ingress`, `Analytics`, `Status`.
- PRO declares its own tags (such as `Tracks`) the same way.

### Error responses built by the generator

- `400` (`Invalid request`) is added only when the route has params, a query or a body.
- `401` is added for `bearer` and `optional-bearer` routes.
- The automatic `403` for PRO routes is removed.
- Every response with status ≥ 400 gets `application/json` with `ApiError` when the route gives no schema.
- `RouteResponse` gains `edition?: Edition`. A response with an edition is left out of other editions' documents. The
  CE analytics routes mark their `PRO_FEATURE` `403` as `ce`. The registry exposes its edition for this.

### Parameters

- **Shared pieces in `query.ts`:**
  - Shared parameters carry their descriptions after `.default()`, so zod-openapi lifts them to the parameter: `from`,
    `to`, `tz`, `limit`, `order`, `cursor` and `q`.
  - `to` gets its own example (`now`).
- **`csvParam(values)`:** adds `param: { style: 'form', explode: false }` and
  `override: { type: 'array', items: { type: 'string', enum: values } }`. The route adds the description. The other
  comma-separated parameters do the same: `features`, the egress `status` with its `all`, and the analytics `metrics`
  and `dimensions`.
- **`If-None-Match`:** the generator adds this header parameter to every operation whose responses include `304`.
- **Integration test:** it asserts that every parameter of the booted document has a description. A new route without
  one fails CI instead of silently degrading the document.

Alternatives rejected for the list parameters:
- Changing their schemas to `z.array()` with `explode`: Express parses `a,b` as one string, so validation would change.
- A document-wide `override` hook keyed on the transform: too implicit.

### Refresh cookie and `Set-Cookie`

- `RouteDefinition` gains an optional `refreshCookie: 'required' | 'optional'`. It only affects the document;
  authentication is unchanged, and the auth routes stay `public`.
- The generator adds the `refreshCookie` security scheme (`apiKey`, `in: cookie`, name `REFRESH_COOKIE`). It sets
  `security: [{ refreshCookie: [] }]` for refresh, and `[{}, { refreshCookie: [] }]` for logout, which also answers
  without a cookie.
- The auth responses that set or clear the cookie declare a `Set-Cookie` header with its attributes: login `200`,
  refresh `200` and `401`, logout `204`.

### Metadata

- `openApiDocument(registry, { version, basePath, license? })`:
  - `servers: [{ url: basePath without its trailing slash, or '/' }]`;
  - `info.description`: one Markdown text of the conventions, edition-neutral;
  - `info.license`: the given one, or `{ name: 'Apache 2.0', identifier: 'Apache-2.0' }`.
- `DashboardOptions` gains an optional `apiLicense`, which an extending edition passes. CE passes nothing.

### Schema with required keys never defined

`byInputType: z.record(inputType, count)` renders `required` without `properties`. It becomes
`z.object({ rtmp: count, whip: count, url: count })`, which validates the same values.

### Unknown-route message

`apiNotFound` is mounted on `/api`, so `req.path` lacks the prefix. The message uses the path of `req.originalUrl`
(without the query string), which is the path the client sent: `${req.baseUrl}${req.path}` would turn `/api` into
`/api/`.

## Risks / Trade-offs

- **[Breaking for PRO at compile time]** `operationId` becomes required, and undeclared tags throw. → PRO adds them in
  the same move of `ce.ref`, with its own document test.
- **[`override` drifting from the parser]** The array rendering duplicates the allowed values. → Both come from the same
  `values` argument of `csvParam()`. The other list parameters pass their own enum constant to both the parser and the
  override.

## Migration Plan

This changes the document only; deploy as usual. Clients that generated code from the old document get stable method
names from now on.
