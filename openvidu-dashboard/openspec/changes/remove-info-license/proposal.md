# Proposal

## Why

`GET /api/v1/info` declares an optional `license` block, and the feature catalogue a `license-info` key. No page
shows either, and the dashboard is not meant to expose license data, in the UI or through the API.

## What Changes

- **BREAKING (unreleased):** `GET /api/v1/info` loses the optional `license` key: no edition reports it, and the
  OpenAPI document no longer declares it.
- The `license-info` identifier leaves the `FeatureKey` enumeration and the lock catalogue of the UI.
- The backend loses the `LicenseInfo` extension token, the `InfoLicense` type and the info service option that
  filled the key.

Scope excludes the following:
- The OpenAPI document's `info.license` (the license of the API itself) and the `apiLicense` option of
  `startDashboard()`.
- CE's lack of license checks, which stays as specified.

Edition: CE, and the seams an extending edition uses. Repository: dashboard only (`openvidu-dashboard/` in
`OpenVidu/openvidu`).

CHANGELOG: none. The key and the feature identifier never shipped in a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `editions-info`: the Info endpoint keys, the migration outcome requirement (replaced by one without the license)
  and the feature catalogue.

## Impact

- Typings: `api/info.ts` (`InfoLicense`, `InfoResponse.license`) and `api/features.ts` (`LICENSE_INFO`).
- Backend: `di/tokens.ts`, `di/container.ts`, `info/info-service.ts` and `info/info-routes.ts`. Rebinding
  `LicenseInfo` from `DashboardOptions.configure` is no longer possible.
- Frontend: `components/lock/features.ts`.
- Tests: the typings UI contract, the info, shell and settings specs, and the settings e2e suite.
- Docs: `dashboard-ce/backend/AGENTS.md`, which lists the extension tokens.
