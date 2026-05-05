# CLAUDE.md

Instructions for Claude when working on this project.

## TDD is mandatory

Before implementing any new feature or changing existing behaviour, follow **red/green TDD**:

1. **Red**: write the failing test(s) first. Run `npm test` and confirm they fail for the expected reason.
2. **Green**: implement the minimum code needed to make the tests pass. Run `npm test` again and confirm everything passes.
3. Refactor only after green.

Do not write production code without a failing test driving it. Ask before skipping (e.g. for trivial cosmetic CSS where no logic is involved).

## Test setup

- Vitest is the test runner. Tests colocate next to source as `*.test.ts(x)`.
- Pure logic (`src/lib/*.ts`) is the primary target — fast, no DOM.
- UI changes that don't affect logic can be hand-verified, but any state machine, mapping, or transformation **must** have unit tests.

## Workflow

- `npm test` — single-shot run, used during the red/green cycle.
- `npm run test:watch` — interactive mode while iterating.
- `npx tsc --noEmit -p tsconfig.app.json` — type-check before committing.
- `npm run build` — production build sanity check.

## Other conventions

- Update `MANUAL.md` whenever a user-facing feature is added, changed, or removed.
- Keep the plan file (`~/.claude/plans/<id>.md`) up to date when planning multi-step work.

## Coding style

- Reuse existing infrastructure and architectural choices. When adding new code, prefer extending or adapting what is already there over introducing a parallel implementation. If reuse requires changes elsewhere to accommodate the new caller, that is better than implementing the same thing twice.
- Comments describe the current state of the code. Do not reference past states, how something used to work, what was changed, or why an earlier approach was abandoned.
