# Tasks

## 1. Typings

- [x] 1.1 Add `rawRequest?: Record<string, unknown>` to `EgressDocument` in `typings/src/data-model/entities.ts` and the
      `rawRequest` object to the `egresses` schema in `typings/contract/schemas.ts`. Add the raw request of each egress
      fixture in `contract/fixtures/egress-ingress.ts`, shared with the recording event of `contract/fixtures/events.ts`.
      Regenerate the contract with `pnpm --filter @openvidu-dashboard/typings run contract`. Verify with the typings
      typecheck and tests.

## 2. Writer (openvidu-livekit)

- [x] 2.1 Vendor the contract with `typings/contract/vendor.sh`. Add `RawRequest` to the `EgressDocument` struct and set
      `rawRequest` in the egress projection from the `request` member of the encoded `EgressInfo`. Verify with the unit
      tests of `openvidu/analytics/...` and the lint of the fork.
- [x] 2.2 Assert in the egress integration tests that `rawRequest` holds the file and stream outputs, with the stream
      URL redacted and no credential. Verify with the analytics integration tests and `typings/contract/writer-check.sh`.

## 3. Data generator

- [x] 3.1 Write `rawRequest` on every generated egress document, from the request the generator derives for the egress
      events. Verify with the data generator tests and by loading a demo dataset.

## 4. Docs and CHANGELOG

- [x] 4.1 No CHANGELOG line: the analytics data model has not shipped. Update the `AGENTS.md` files only if a command or
      path changes. Verify by reading the change against them.

## 5. Integration check

- [x] 5.1 Run `./dashboard.sh check` and the backend integration tests. Verify that they pass.
