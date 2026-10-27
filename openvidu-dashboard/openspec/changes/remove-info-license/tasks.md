# Tasks

## 1. Typings

- [x] 1.1 Remove `InfoLicense` and `InfoResponse.license` from `typings/src/api/info.ts`, and `LICENSE_INFO` from
      `typings/src/api/features.ts`. Drop the `license` assertion of `typings/test/ui-contract.test.ts`. Verify with the
      typings typecheck and tests.

## 2. Backend

- [x] 2.1 Remove `TOKENS.LicenseInfo`, its default binding and the `license` option of `InfoService`, and the
      `license` property of the info response schema. Verify with the backend typecheck and unit tests, and that the
      OpenAPI document of the integration suite has no `license` under the info response.

## 3. Frontend

- [x] 3.1 Remove the `license-info` entry of `FEATURE_COPY` and the uses of that identifier and of "License" in the
      info, shell and settings specs. Verify with the library unit tests.

## 4. Tests

- [x] 4.1 In `e2e/tests/settings.spec.ts`, drop the `license` of the PRO info and the "License" checks, keeping the
      PRO badge check. Verify with the e2e suite.

## 5. Docs and CHANGELOG

- [x] 5.1 Remove `LicenseInfo` from the extension tokens of `dashboard-ce/backend/AGENTS.md`. No CHANGELOG line: the
      key never shipped. Verify by reading the file against the change.

## 6. Integration check

- [x] 6.1 Run lint, format check, typecheck, spec validation, unit, integration and e2e tests. Verify that they pass.
