# Operations

- Owner decisions: the proposal is approved; its revision against the specs archived by `analytics-export-unavailable`
  and `overview-live-tiles` changed no owner-facing behaviour. Every subagent runs on Opus at the owner's request; the
  verifier and the reviewer run without their guard, with the owner's consent.
- Owner review on `./dashboard.sh demo ce` after group 7 (8.1): the collection breakdown stays as it is (its columns
  are not aligned with the main table's, accepted); at 375 px the Size column is reached by scrolling the table
  sideways, accepted.
- Full verification and code review on `d12444b89`. The initial bundle warning of the e2e build predates the change (CI
  run 43950788545 of `fced8ec7d`: 39.58 kB over; this change adds 0.11 kB). Refactor review (7.3), from the
  implementer's report: none needed; splitting the Data tab tests out of `settings-page.spec.ts` is left for later.
- Owner decisions on the reports and the demo, applied by a revision: the retention message drops the list of keys,
  links to the "Analytics settings" section of the configuration reference and sits in an info notice; the note on
  the info icons is removed; `analytics_daily` leaves the deployment clock (code review WARNING 1); unlimited daily
  rollups keep "Grows without limit" without data (verification SUGGESTION 1); a class with 0 documents carries no
  tip otherwise; WARNING 2 and SUGGESTIONs 1, 2 and 5 of the code review and SUGGESTION 2 of the verification are
  applied; SUGGESTION 4 of the code review (browser clock against server dates) is accepted as a known limit.
- Owner review of the revision (group 9) on `./dashboard.sh demo ce`: accepted; the retention link reads
  "Configuration reference" at the owner's request.
