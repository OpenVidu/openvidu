# Proposal

## Why

The OpenAPI document (`GET /api/v1/docs/openapi.json`) lists every route, but it does not describe the API well enough
to use it without reading the code:
- No operation has an `operationId`.
- Most parameters have no description.
- Comma-separated lists are typed as bare strings.
- Several error responses are missing or have no body schema.
- Some responses are declared that the edition never answers.
- There is no `servers`, `license` or tag list.

The unknown-route `404` also names a path without its `/api` prefix.

## What Changes

- **Document metadata:**
  - `info` gains a description of the API conventions (authentication, time ranges, pagination, errors, conditional
    requests, request IDs, versioning) and the license.
  - `servers` gains the public base path.
  - A `tags` list, with one description per tag, in a stable order.
- **Operations:**
  - Every operation has a unique `operationId` and tags from that list.
  - Every parameter has a description.
  - Comma-separated list parameters are documented as arrays of their allowed values (`style: form`, `explode: false`).
  - Routes answered conditionally declare the `If-None-Match` request header next to their `ETag` and `304`.
  - The auth routes declare the refresh cookie they read (as a cookie security scheme) and the `Set-Cookie` header they
    send.
- **Error responses:**
  - Every error response an operation can answer is declared with the `ApiError` schema.
  - `400` is declared only for operations that take input.
  - A response that only one edition answers appears only in that edition's document. This covers the automatic
    `PRO_FEATURE` `403`, which no listed route answers, and the `403` of PRO metrics on the CE analytics routes.
- **Schemas:** the ingress summary's `byInputType` is a plain object with its three keys. It was a record that
  required keys it never defined.
- **404 message:** the unknown-route `404` message names the full request path, `No API route for GET
  /api/v1/does-not-exist`.

Scope excludes the following:
- No route, parameter or response body changes.
- The PRO routes are documented by the PRO workspace on top of the generic pieces this change adds, so CE needs no
  PRO-specific code, and the seams stay generic: an optional license for the document and the per-route fields.

Edition: CE, and the generic pieces PRO builds on. Repository: `OpenVidu/openvidu` (dashboard) only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-conventions`:
  - The OpenAPI document gains requirements on its metadata, operations, parameters and error responses.
  - The unknown-route scenario fixes its message.

## Impact

- Backend:
  - `src/api/openapi.ts` (generator).
  - `src/api/route-registry.ts` (`operationId`, tag declarations, per-response edition, refresh cookie field).
  - `src/api/query.ts` (shared parameter descriptions and the array form of `csvParam`).
  - Every `src/*/*-routes.ts` (operation IDs, tags, parameter descriptions, error responses).
  - `src/ingress/ingress-responses.ts`.
  - `src/http/errors.ts`.
  - `src/lifecycle/startup.ts` (base path, and an optional license from `DashboardOptions`).
- Tests: unit tests of the generator and the registry, and an integration test that checks the invariants above on the
  document of the booted CE dashboard.
- PRO: its own routes must supply `operationId`, declared tags and parameter descriptions. That is a compile-time
  requirement once it moves `ce.ref`.
- CHANGELOG (`CHANGELOG.md`, 3.10.0, Added › Data), a new line: "API reference outside production: an OpenAPI 3.1
  document at `/api/v1/docs/openapi.json` and a browsable page at `/api/v1/docs`, with operation IDs, described
  parameters and every error response."
