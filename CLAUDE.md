# CLAUDE.md

There are four behavioral guidelines (1,2,3,4) in this file for you to follow. For project-specific instructions, see #Project

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Project

Full-stack calculator: Go backend + React/TypeScript frontend.
Behavior reference: Windows 11 Calculator, Standard mode. On mobile, only the layout changes;
behavior is the same on every device (D-23). Deliberate deviations from Windows are recorded as D-xx.

`docs/SPEC.md` is the source of truth for requirements (FR/BR/NFR), design decisions (D-xx),
the API contract, and the implementation plan. Read the relevant sections before starting a task.
If a request conflicts with the spec, stop and ask instead of guessing.

# Hard rules

- IMPORTANT: The frontend never operates on a number's value. All arithmetic goes through
  `POST /api/v1/calculate`. The frontend only edits notation: digits, decimal point, sign (D-03, D-12).
  Display rounding to 16 digits is the only exception; the stored raw value is never changed (D-03).
- Numbers are JSON strings in the formats defined in SPEC §8. The backend uses `cockroachdb/apd`
  with 34 significant digits, rounding half away from zero, and an exponent range of ±9999
  (D-04, D-06, D-11, D-21).
- docs/SPEC.md takes precedence over docs/openapi.yaml; keep both consistent in the same commit (D-24).
- If a design decision changes during implementation, do not edit the old entry silently:
  add a new D-xx entry to docs/SPEC.md explaining what changed and why.
- All errors use `{ "error": { "code": "...", "message": "..." } }`, including 404 and 405 (BR-05).
- Minimal dependencies. Backend: `net/http`, no web framework. Go tests: standard `testing` only.
  Ask before adding any new dependency.
- Everything is in English: code, comments, UI text, docs, commit messages.
- PROMPTS.md is written by the developer. Never create, edit, or delete it.
- Comments must be short and simple, do not refer any document or decision in a comment.
  Test names describe the behavior and do not contain requirement or decision IDs.
- Never run `git commit` or `git push`. The developer does both.
  When a task is done, suggest a one-line Conventional Commits message, without a body.
  When a step of SPEC §12 is complete, check it against the Definition of Done in SPEC §12.

# Commands

- Backend tests: `cd backend && go test ./... -race -cover`
- Backend lint: `cd backend && gofmt -l . && golangci-lint run`
- Frontend tests: `cd frontend && npm test`
- Frontend checks: `cd frontend && npm run lint && npx tsc --noEmit`
- Full stack: `docker compose up --build` → http://localhost:8080

# Workflow

- All work is committed directly to `main`; there are no branches (see SPEC §12). Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`.
- Keep changes in small, logical steps, and say where a commit boundary makes sense.
- Write tests first for operations, the reducer, and `format.ts`.
- Before saying a task is done: run tests and lint, and show the actual output.
- Coverage must stay at or above 80%.

# Environment

- Development is on Windows 11 (shell commands run in Git Bash). CI and Docker run on Linux.
- Keep LF line endings. Do not commit `node_modules/`, build output, coverage reports, or `.env` files.
