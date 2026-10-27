# Tasks

## 1. Backend: registry and generator

- [x] 1.1 In `src/api/route-registry.ts`, add:
      - a required `operationId` and an optional `refreshCookie: 'required' | 'optional'` to `RouteDefinition`;
      - `edition?: Edition` to `RouteResponse`;
      - `tag(name, description)` and the `edition` getter to `RouteRegistry`.
      `register()` and `replace()` reject a repeated `operationId` and an undeclared tag. Verify with
      `route-registry.test.ts` cases for both rejections.
- [x] 1.2 In `src/api/openapi.ts`, change `openApiDocument(registry, { version, basePath, license? })` to emit:
      - `servers`, `info.description`, `info.license` and `tags` (declared and used, in declaration order);
      - `operationId`;
      - `400` only with input, `401` for `bearer` and `optional-bearer`, no automatic `403`;
      - `ApiError` on every error without a schema;
      - responses filtered by `edition`;
      - the `If-None-Match` parameter on operations with `304`;
      - the `refreshCookie` security scheme;
      and drop the dead locked-route description. Verify with `route-registry.test.ts` cases for each rule.
- [x] 1.3 In `src/lifecycle/startup.ts` and `src/index.ts`, add the optional `DashboardOptions.apiLicense` and pass it,
      with the bound base path, to the document. Verify with the typecheck and the `servers` case of 1.2.

## 2. Backend: parameters and routes

- [x] 2.1 In `src/api/query.ts`, describe `from`, `to`, `tz`, `limit`, `order`, `cursor` and `q` at the parameter
      level (after `.default()`), with `to` getting its own example. Make `csvParam()` render as an array of its values
      with `style: form`, `explode: false`. Verify with a generator unit case on a ranged list query.
- [x] 2.2 In every `src/*/*-routes.ts` and `src/api/probes.ts`:
      - declare the module's tags;
      - give each route its `operationId`;
      - describe every route-specific parameter;
      - render the other comma-separated parameters as arrays (`features`, egress `status`, analytics `metrics` and
        `dimensions`);
      - mark the analytics `403` as `edition: 'ce'`;
      - add `refreshCookie` and the `Set-Cookie` headers to the auth routes.
      Verify with the integration test of 3.1.
- [x] 2.3 In `src/ingress/ingress-responses.ts`, make `byInputType` a `z.object` with `rtmp`, `whip` and `url`. Verify
      with the ingress response unit tests and the mapper checks.
- [x] 2.4 In `src/http/errors.ts`, make `apiNotFound` name the path of `req.originalUrl`. Verify with the app unit test
      of the unknown API path, which asserts the message.

## 3. Tests and docs

- [x] 3.1 Add the integration test `test/integration/openapi-document.test.ts`. It boots the CE dashboard in
      development and reads `/api/v1/docs/openapi.json`, then asserts:
      - unique `operationId`s;
      - every tag is declared with a description;
      - every parameter has a description;
      - every response ≥ 400 has `ApiError`;
      - no `400` on operations without input;
      - no `403` `PRO_FEATURE` outside the analytics routes;
      - `If-None-Match` wherever there is a `304`;
      - the refresh cookie scheme on refresh and logout;
      - `servers` and `license`.
      Verify that `./dashboard.sh test-integration` passes.
- [x] 3.2 Lint both a development document and the generated one with Redocly CLI (`recommended`, scratch install,
      not a dependency). Expect no errors, and no warnings other than intentional ones recorded in this file. Verify by
      running it by hand once.
      Result: valid. The only warnings are `operation-4xx-response` on `getHealth`, `getReadiness` and `logout`, which
      answer no 4xx by design.
- [x] 3.3 Update `dashboard-ce/backend/AGENTS.md` (route declaration: `operationId`, tags through `registry.tag`,
      parameter descriptions, response `edition`, `refreshCookie`), and add the `CHANGELOG.md` line of the proposal.
      Verify that `./dashboard.sh check` passes.

## Workflow follow-up

- Move `ce.ref` in openvidu-pro and document the PRO routes there (PRO change).
- Archive when the owner asks.
