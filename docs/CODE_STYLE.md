# Code style — worked examples

Companion to the rules in [CLAUDE.md](../CLAUDE.md). That file is normative; this
one shows what the comment rule looks like when applied, so the same reasoning
does not have to be rediscovered each time.

The paired examples below are illustrative. They are drawn from real conversions
rather than describing the code's present state, so expect to find the "after"
form — or something further evolved — when you go looking for them.

## Why the rule exists

A comment is a fragile place to put information, in two distinct ways.

It is **advisory**. Nothing obliges anyone to read it. No compiler parses it, no
linter checks it, no test exercises it. It asks the next author to be careful and
has no recourse when they are not.

It **drifts**. The code beside it changes and the comment silently stops being
true. Nothing fails, so nothing announces the divergence, and a comment that is
confidently wrong misleads more effectively than no comment at all.

Encoding the same information into names, types, and structure removes both
failure modes at once. There is no second artefact to fall out of step, because
the description _is_ the code — a rename cannot disagree with the thing it names,
and a type cannot go stale against the value it constrains. It is also checked:
the compiler enforces the types, the linter enforces the structure, and a reviewer
sees the intent change in the diff rather than having to notice that some prose
nearby no longer matches.

Invariants go one step further. Written as a test, an expectation becomes
executable: a refactor that violates it fails the suite instead of shipping. This
is the difference between recording that only one caller may win a race and
making it impossible to merge a change where two do.

What survives the rule is the information that genuinely has nowhere better to
live — an external constraint that cannot be rediscovered by reading this
repository, and the reason a lint rule is suppressed. Those are listed in
[CLAUDE.md](../CLAUDE.md); everything below is about moving the rest into code.

## The categories

| Category                              | Verdict                          |
| ------------------------------------- | -------------------------------- |
| External-system facts                 | Keep                             |
| Lint-suppression rationale            | Keep — required by the `--` form |
| Magic-number rationale                | Encode — derive the value        |
| Behavioural narration                 | Encode — extract and name        |
| Call-order / cross-module coupling    | Encode — make it structural      |
| Counterfactual ("X, not Y, because…") | Convert to a regression test     |
| Concurrency guarantees                | Encode — name, type, and test    |

## Encoding narration as structure

Narration that restates the algorithm is the most common offender, and function
names absorb almost all of it.

```ts
// Walk the picture the way it is read: down the current column, then across to
// the top of the next one. An image that only overflows vertically never
// reaches the sideways step... Reports whether the input was consumed; false
// means the picture is exhausted and the caller should navigate.
export function scrollForward(): boolean {
```

```ts
export type InputDisposition = 'consumed' | 'exhausted'

export function scrollForward(): InputDisposition {
  const element = getPanTarget()
  if (element === null) return 'exhausted'
  if (canStepDownColumn(element)) return stepDownColumn(element)
  if (canStepToNextColumn(element)) return stepToNextColumnTop(element)
  return 'exhausted'
}
```

The return type retires the sentence that existed only because `boolean` cannot
say what `true` meant. The helper names retire the walk description. The claim
that one rule covers every overflow shape is a property of the test suite, which
has a `describe` block per shape — it should not be restated in the source.

## Encoding values as derivations

```ts
// A stepped scroll leaves a tenth of the previous screenful in view so there is
// some overlap to read across.
const STEP_FRACTION = 0.9
```

```ts
const SCREENFUL = 1
const STEP_OVERLAP = 0.1
const STEP_FRACTION = SCREENFUL - STEP_OVERLAP
```

Partial encodings still count. `EDGE_TOLERANCE = 1` needed a comment explaining
that scroll offsets are fractional under zoom; renaming it `SUBPIXEL_TOLERANCE_PX`
absorbs most of that, leaving at most one line for the browser behaviour itself.

## Encoding meaning in union members

```ts
// Which corner of the next picture the reader should arrive at. Moving forward
// they arrive at the start; stepping back they arrive at the end, so a picture
// resumes where they left it rather than restarting from the top.
export type EntryCorner = 'start' | 'end'
```

```ts
export type Arrival = 'freshStart' | 'resumeFromEnd'
```

`setArrival('resumeFromEnd')` inside `navigateUnreadBack` now reads as the comment
did, at the call site where it matters.

## Encoding invariants as tests

This is the highest-value move, because it converts an assertion in English into
one the suite enforces. The shape to copy is a test name that reads as the
invariant itself:

- `should request the wake lock only once when takeLock is called concurrently`
- `should call cacheFunction only once for concurrent requests to same uncached path`
- `should not overwrite a room populated by a concurrent call during async initialization`
- `should not stack load handlers across resets`

Each of those names states an invariant that would otherwise have been a comment.
Where such a test exists, the comment beside the code is redundant and should go.

Counterfactual rationale — "named handlers, not inline closures, because closures
stack" — is the case where deleting the comment outright is genuinely risky, since
code can show what it does but never what it deliberately avoids. The answer is
not to keep the prose but to make the hazard executable: a regression test named
for it, so the "simplification" fails the suite instead of shipping.

## Concurrency

A concurrency comment is evidence of under-encoded structure, not an exception to
the rule. Decompose it into three parts:

1. **What the operation is** → a name that carries the exclusivity. `claimUnseenRow`
   says at most one caller wins; `updateRow` says nothing.
2. **What the guarantee is** → a result type that distinguishes outcomes.
   `validateAndIncrement: (incoming: number) => number | null` forces prose to
   explain that `null` means "lost the race"; a `{ matched: true, count } | { matched: false }`
   union states it. Then a test that issues the calls concurrently enforces it.
3. **Which mechanism supplies it** → the only irreducible part. That PostgreSQL
   serialises via row locks and SQLite via a whole-database write lock is an
   external-system fact and stays as a comment, now one line instead of three.

## Sequencing a cleanup

Work in this order; every step is name-and-structure only, so the existing suite
is the check that nothing moved:

1. Derivations and renames — mechanical, no behaviour change.
2. Function extraction for narration.
3. Counterfactual and concurrency comments last, paired with the tests that
   replace them, since that step _adds_ enforcement rather than only removing prose.
