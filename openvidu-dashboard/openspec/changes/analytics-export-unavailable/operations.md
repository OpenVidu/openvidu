# Operations

- Owner decisions: the proposal is approved; the reviewer's suggestion of one `@let` for the `mediaStats() === 'none'`
  condition of the Data transferred card is applied.
- Refactor review (task 4.3), from the implementer's report: no shared form for the three cards that pair `[empty]`
  with `exportDisabled`; an `unavailable` input on `ovd-analytics-card` is the abstraction design decision 1 rejects.
- Full verification and code review ran on `4d6aa85f8e`, the same tree as `6cfbf885c` of `master`: the commits were
  cherry-picked onto `origin/master` (two commits outside `openvidu-dashboard/`).
- The verifier and the reviewer ran without their guard, with the owner's consent; `git status` after them showed only
  their reports.
- Incremental verification on `988a180fb`: nothing open. Pushed to `master` as `19af60976`. CI run 43895194983 of
  `openvidu-dashboard-ci.yml`: the first attempt failed in `Integration tests (MongoDB)` (`info-query-plan.test.ts`, no
  oldest document of `ingresses` and `ingress_sessions` in the generated day), a suite this change does not touch; the
  rerun of that job passed and the run is green.
