# Design

## Context

- `InfoService.build()` reads an optional `license` callback, bound in the container to `TOKENS.LicenseInfo` (`() =>
  undefined` on CE). It spreads the result into the response only when it is defined.
- The `GET /api/v1/info` route declares `license` as an optional object of its zod response schema, so the OpenAPI
  document shows it.
- `FeatureKey.LICENSE_INFO` has a copy in `FEATURE_COPY`, but no route or page gates on it.

## Goals / Non-Goals

**Goals:**
- No edition can add license data to `GET /api/v1/info`, and the OpenAPI document does not suggest it.

**Non-Goals:**
- Changing `info.license` of the OpenAPI document or `apiLicense`.
- Any other key of the info response.

## Decisions

### Remove the seam, not only the field

The token, the service option, the type and the schema property all go. An extending edition can no longer rebind
`LicenseInfo`, because the token no longer exists. The response schema has no `license` property, so the document
never declares it.

Alternative rejected: keeping the token with a CE default and dropping only the schema property. The response
would still carry whatever a rebinding returned, without documentation.

### Drop the feature identifier

`license-info` gated nothing. Keeping it would advertise a feature in `features` that no page offers.

### OpenAPI shape

- `GET /api/v1/info`: the `200` schema loses `license`, and `features` items lose `license-info`.
- Paths, parameters and status codes do not change. No query, index or performance budget is involved.

## Risks / Trade-offs

- **[Removing a key from `v1`]** → The key was never released, so the versioning policy for released fields does not
  apply.
