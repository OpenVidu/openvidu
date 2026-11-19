# Operations

## Owner decisions

- The e2e suites (`./dashboard.sh e2e`) cannot run on the owner's machine (Ubuntu 20.04: Playwright 1.65 ships no
  Chromium for it). They are validated by the `e2e` job of the CI run of the push.
