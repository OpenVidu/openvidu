## MODIFIED Requirements

### Requirement: Checkpoint and resume
Edition: CE and PRO. The checkpoint (`phase` and the last fully applied second of each collection) SHALL be persisted
after every batch. A batch that fails with a transient error SHALL be retried from the writes it already applied,
without reading it again, in up to five rounds of five attempts; a non-transient error, or a transient one through all
of them, SHALL set `state: "failed"` with a clear `error`, and the next writer start SHALL retry from the checkpoint.

#### Scenario: Killed mid-run
- **GIVEN** a migration killed after 40 % of the documents, in the middle of a stats batch
- **WHEN** the writer restarts
- **THEN** the replay resumes at the first second of that batch, and the final documents differ from those of an uninterrupted run at most by that batch's `track_stats` samples and stats deltas applied twice

#### Scenario: Database error
- **GIVEN** a MongoDB outage during a batch
- **WHEN** the batch fails five rounds of five attempts, spaced 1, 2, 4 and 8 s within a round and between rounds (about 90 s)
- **THEN** `state` is `failed`, `error` names the failure and the checkpoint, and the next writer start retries from the checkpoint

#### Scenario: Transient error with progress
- **GIVEN** a phase that fails with a network error four times, applies more batches and fails again
- **WHEN** it is retried
- **THEN** the attempt count starts again after the progress and the migration keeps `state: "running"`

#### Scenario: Batch finished after its fixer closures failed
- **GIVEN** a legacy events batch whose authentic events were applied and whose fixer closures fail once with a network error
- **WHEN** the batch is retried
- **THEN** its authentic events are not applied again, and the rollup counters, the closed entities and `counts` equal those of an uninterrupted run

#### Scenario: Stats batch finished after a transient error
- **GIVEN** a legacy stats batch whose `track_stats` insert and participant deltas succeeded and whose room deltas fail once with a network error
- **WHEN** the batch is retried
- **THEN** no `track_stats` sample is duplicated, and the participant, room and rollup documents equal those of an uninterrupted run

## ADDED Requirements

### Requirement: Interrupted batch replayed whole
Edition: CE and PRO. A batch whose run ends before its checkpoint is persisted (process killed, lock lost, or migration
failed after its retries) SHALL be replayed whole by the next run, which MAY add again that batch's `track_stats`
samples and stats deltas and the rollup counters of its events not stored raw, and MAY leave uncounted its events
stored raw whose rollups were not applied. No document of an earlier batch SHALL be applied again.

#### Scenario: Batch replayed after a failed run
- **GIVEN** a legacy events batch whose raw inserts succeeded and whose rollup writes fail until the migration is `failed`
- **WHEN** the next writer start resumes the migration
- **THEN** the batch is read again from its first second, its events stored raw are skipped as duplicates and not counted in the rollups, and no event of an earlier batch is counted again

### Requirement: Migration lock held through retries
Edition: CE and PRO. The migration runner SHALL refresh the migration lock before every retry of a batch and SHALL stop
when a refresh fails, leaving the batch to the next runner, so that no other node starts that batch while this one
still retries it.

#### Scenario: Lock refreshed while a batch retries
- **GIVEN** a batch that fails with a network error and a lock refresh that fails before its third attempt
- **WHEN** the batch is retried
- **THEN** the lock is refreshed before the second attempt, no third attempt is made, and the next runner resumes from the checkpoint
