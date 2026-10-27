# Design

## Context

- Every entity update of the writer is a pipeline of `$set` stages built by `stage()` from the assignments of a
  `fields` set. Values are mixed: expressions from the helpers of `expr.go` (`$ifNull`, `$cond`, `$setUnion`…), field
  paths and variables (`$name`, `$$this.v`, `$$REMOVE`) and data from the event (names, identities, errors, metadata,
  encoded messages, attributes).
- Nothing tells data apart from expressions, so MongoDB evaluates a data string starting with `$` and a data document
  whose keys look like operators or paths.

## Goals / Non-Goals

**Goals:**
- Data is never evaluated, whatever it holds, without touching each of the call sites.

**Non-Goals:**
- Changing how expressions are built, or the classic updates of the rollups and the heartbeat, where values are never
  evaluated.

## Decisions

### Typed references, escaped stages

Field paths and variables get their own type, `ref`, returned by `field()` and used for `$$REMOVE` and the `$$this`
variables. `stage()` walks its assignments and wraps in `$literal` every plain string that starts with `$`; a `ref`
becomes its string. The walk enters documents and arrays, and leaves an existing `$literal` as it is.

Alternative rejected: wrapping data at each call site. There are about 300 assignments, and a missed one fails only
with an unusual value.

### Maps wrapped at the source

Participant attributes are the only document whose keys come from the client. The projection wraps them in
`$literal`, so their keys are neither operators nor paths. The other documents (encoded messages, the request summary,
outputs, permissions, client info) have fixed keys and are walked like any expression.

### Data model

- No collection, field, index, retention or schema-version change. Values that were lost or evaluated are now stored
  as received.
- Migration from legacy events: the legacy migration projects with the same code, so migrated documents get the fix
  too.
- Performance: one walk of each stage before it is sent, linear in its size; negligible next to the write.

## Risks / Trade-offs

- [A future expression writes a field path as a plain string] → It would be stored as a string instead of evaluated.
  The integration suites compare every projected document with its expected contract fields, so the change shows up
  there.
