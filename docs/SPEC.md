# Calculator — Specification & Design Decisions

This document is the single source of truth for the project. It records the requirements,
the design decisions (with rationale), the API contract, and the implementation plan.
Requirement and decision IDs (FR-xx, BR-xx, NFR-xx, D-xx) are referenced from the implementation
plan (§12) and the README. Code and tests do not reference them; test names describe behavior.

---

## 1. Scope and assumptions

- **Reference behavior:** Windows 11 Calculator, **Standard** mode. Deliberate deviations are
  recorded as design decisions.
- **Mobile:** only the layout changes on small screens; behavior is identical on every device (D-23).
- **Goal:** Deliver Standard-mode behavior with an architecture that can be extended to a
  Scientific mode later, without building any of Scientific mode now.
- **Prioritization:** MoSCoW, to keep the scope within the suggested time budget.
- **Core assumption:** All arithmetic on values is performed by the backend. The frontend
  manages input and display state only (see D-03).

Priority labels: **Must** (required), **Should** (planned), **Could** (only if time remains),
**Won't** (deliberately out of scope).

---

## 2. Functional requirements — Frontend

### Must

| ID | Requirement |
|---|---|
| FR-01 | The user can enter digits 0–9 and a decimal point. A number contains at most one decimal point. Pressing `.` on empty input produces `0.`. A leading `0` is replaced by the next digit (`0` → `5`). |
| FR-02 | A number entered by the user has at most 16 digits. A leading `0` before the decimal point, the sign, and the decimal point do not count. Further digits are ignored. |
| FR-03 | Binary operations `+ − × ÷` and `=` are supported. |
| FR-04 | Chained operations use **immediate execution** (no operator precedence), as in Windows Standard mode: `2 + 3 × 4 =` → `20`. |
| FR-05 | `C` resets everything. `CE` clears only the current entry. `⌫` deletes the last digit of the current entry. |
| FR-06 | `+/-` toggles the sign of the current value. This is a notation edit (D-12). |
| FR-07 | The display has two lines: the expression on top (e.g. `12 + 5 =`) and the current value or result below. |
| FR-08 | On a calculation error, the error text for the code (§9) is shown and the keys listed in §9 are disabled. The error state is exited with `C`, `CE`, `⌫`, or a digit key, which resets the whole state including the expression line. |
| FR-09 | If the backend is unreachable, times out, or returns an unexpected (non-JSON or 5xx) response, the user is informed and the app does not crash (client-side code `NETWORK_ERROR`). |

### Should

| ID | Requirement |
|---|---|
| FR-10 | Unary operations: `%`, `√x`, `x²`, `1/x`. They apply immediately to the current value. The expression line shows `√(9)`, `sqr(5)`, `1/(5)`, and nests them (`√(sqr(5))`). For `%`, the expression line shows the computed value instead (`200 + 20`). |
| FR-11 | Percent: with a pending `+` or `−`, `200 + 10 %` → `200 + 20` (calls `percent_of`); `200 + %` → `200 + 400`. With a pending `×` or `÷`, `10 %` → `0.1` (calls `percent`). With no pending operator, `10 %` → `0.1` (calls `percent`) — a deliberate deviation from Windows (D-10). |
| FR-12 | Full keyboard support, using the Windows shortcuts: digits, `.`, `+ - * /`, `Enter` and `=` (equals), `Backspace` (⌫), `Escape` (C), `Delete` (CE), `%`, `@` (√x), `q` (x²), `r` (1/x), `F9` (+/-). Keys can also be reached with `Tab` and pressed with `Space`. |
| FR-13 | Responsive layout: fully usable at viewport widths of 320 px and above. Only the layout adapts; behavior does not change. |
| FR-17 | Results are displayed with at most **16 significant digits**, rounded half away from zero (D-21). Notation follows the display rule in D-22. The backend returns full precision (D-11). |
| FR-18 | Repeated `=` repeats the last operation with the last right-hand operand: `5 + 3 = = =` → `8`, `11`, `14`. After `5 + 3 =`, typing `7` and `=` gives `10` (`7 + 3`). |
| FR-19 | Thousands separators are shown in the display (`1,234,567`). |

### Could

| ID | Requirement |
|---|---|
| FR-14 | History panel of past calculations. |
| FR-15 | Memory keys: `MC MR M+ M− MS`. |
| FR-16 | Light and dark theme. |
| FR-20 | Display font shrinks automatically for long numbers. |

---

## 3. Functional requirements — Backend API

| ID | Requirement |
|---|---|
| BR-01 | The API is versioned under `/api/v1/...`. |
| BR-02 | A single endpoint performs exactly one operation per request (unary or binary). See D-02, D-09. |
| BR-03 | Supported operations: `add`, `subtract`, `multiply`, `divide`, `percent`, `percent_of`, `sqrt`, `square`, `reciprocal`. |
| BR-04 | Numbers are received and returned as JSON **strings** in the formats defined in §8 (Number format). |
| BR-05 | All errors share one JSON format: `{ "error": { "code": "...", "message": "..." } }`. This includes 404 and 405 responses. |
| BR-06 | HTTP status codes: 400 for malformed or invalid requests; 404, 405, 413, and 415 for their standard meanings; 422 for well-formed requests that are mathematically undefined; 500 for unexpected errors. |
| BR-07 | Handled edge cases. Calculation level: division by zero, `0 ÷ 0`, reciprocal of zero, square root of a negative number, overflow, underflow, invalid number formats, `NaN`/`Infinity`, unknown operation, wrong operand count. HTTP level: malformed JSON, missing fields, unknown fields, wrong content type, oversized body, unknown path, wrong HTTP method. |
| BR-08 | `GET /healthz` reports service health (used by Docker and monitoring). |
| BR-09 | **Could:** `GET /api/v1/operations` lists supported operations and their arity. |

---

## 4. Non-functional requirements

NFRs are cross-cutting: unless stated otherwise, every step of the implementation plan (§12) must comply with all of them.

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Precision | The backend uses decimal arithmetic, not floating point (`0.1 + 0.2 = 0.3`). |
| NFR-02 | Extensibility | Each operation implements a common interface and is registered in a registry. Adding an operation does not require changing existing code (Open/Closed principle). |
| NFR-03 | Extensibility | Frontend calculator logic (reducer) is separate from the UI and reusable with a different keypad (e.g. a future Scientific mode). |
| NFR-04 | Architecture | Backend is layered: `api` (HTTP) → `calculator` (service, registry, operations). |
| NFR-05 | Testing | Go: table-driven unit tests. Frontend: Vitest + React Testing Library + user-event. Coverage is measured as **line coverage**; the gate is NFR-17. Logic layers (operations, reducer, formatting) target near-complete coverage as a goal, not a gate. |
| NFR-06 | Security | Request body is limited to **4 KiB**. No input can make the server panic. Internal error details are logged, never returned to the client. CORS is off by default (same-origin, D-18) and enabled only for an explicitly configured origin. |
| NFR-07 | Reliability | The service is stateless. |
| NFR-08 | Accessibility | Keys have descriptive `aria-label`s (e.g. `√x` → "square root"). The display uses `aria-live="polite"`. Visible focus indicator. Text contrast meets WCAG 2.1 AA (at least 4.5:1). Usable by keyboard alone. Touch targets at least 44×44 px. |
| NFR-09 | Code quality | Go: `gofmt`, `golangci-lint`. Frontend: TypeScript strict mode, ESLint, Prettier. |
| NFR-10 | Portability | `docker compose up --build` starts the whole system with one command. |
| NFR-11 | Documentation | README with setup, run instructions, API examples, and design decisions. `docs/openapi.yaml` describes the API. `PROMPTS.md` lists the AI prompts used. |
| NFR-12 | Dependencies | Keep dependencies minimal. Backend uses `net/http` from the standard library, no web framework. |
| NFR-13 | CI | GitHub Actions runs lint, type checks, tests, and coverage on every push to `main`. |
| NFR-14 | Deployment | **Could:** live demo on a free hosting platform. |
| NFR-15 | Language | Code, comments, UI text, README, PROMPTS.md, and commit messages are in English. |
| NFR-16 | Testing | **Should:** a Go fuzz test proves that number parsing never panics on any input. |
| NFR-17 | Testing | CI fails if line coverage drops below **80%**, checked separately for the backend and the frontend. Entry points and configuration are excluded (backend: `cmd/server`; frontend: `src/main.tsx`, config files, test setup); everything else counts. |

---

## 5. Out of scope and known limitations

### Won't (future work)

- Scientific and Programmer modes; expression parser (`POST /api/v1/evaluate`) with operator precedence.
- Scientific-notation-first display rules of Scientific mode.
- Unit conversion, graphing.
- User accounts, authentication, persistence, database.
- Partial input blocking during requests (see D-13).

### Known limitations

- **Finite precision.** Results are rounded to 34 significant digits (D-11). `1 ÷ 3 × 3` is internally
  `0.999…9` (34 nines) and displays as `1`, but `1 ÷ 3 × 3 − 1` gives `-1e-34`, where Windows (which
  uses exact rational arithmetic) gives `0`. Exact rational arithmetic is out of scope.
- **Small-number notation** may differ from Windows in some ranges (D-22).

---

## 6. Design decisions

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Windows 11 Standard mode is the behavioral reference. | A familiar, well-defined behavior set; answers "what is the correct behavior?" for every edge case. |
| D-02 | The backend performs one operation per request (`op a` or `a op b`). | Sufficient for Standard mode; simpler and more testable than an expression parser. |
| D-03 | The frontend never operates on a number's **value**; it only edits its **notation**. Value operations produce new digits (addition, square root, percent, …) and run on the backend. Notation edits are adding/removing digits, the decimal point, and the sign. **Single exception:** rounding to 16 significant digits for display (FR-17). It changes only the displayed text; the stored raw value is never modified, and the next operation always receives the full-precision value. | Keeps all math in one place with one precision rule. Notation edits and display rounding cannot change a stored value. Satisfies "the frontend consumes the backend API". |
| D-04 | Decimal arithmetic on the backend; numbers travel as JSON strings. | Financial-grade correctness: float errors are unacceptable. JavaScript `number` is also a float, so numeric JSON would lose precision in transit. |
| D-05 | Monorepo: `/frontend` and `/backend` in one repository. | The deliverable is a single Git repository. |
| D-06 | Decimal library: `cockroachdb/apd`. | Built-in `Sqrt`, power, and logarithm functions; precision, rounding, and exponent limits configured in one context object. Covers Standard mode and a future Scientific mode. (`shopspring/decimal` lacks a built-in square root.) |
| D-07 | Styling: CSS Modules. | Component-scoped styles without naming collisions; zero configuration with Vite. A utility framework is unnecessary at this size. |
| D-08 | Git workflow: all work is committed directly to `main` in small Conventional Commits. CI runs on every push. | Small, focused commits keep the history readable and easy to review; CI reports a failing change immediately. |
| D-09 | Single endpoint `POST /api/v1/calculate`; the operation name is in the body. | Maps one-to-one onto the operation registry: adding an operation needs no new route or handler. Validation and error handling live in one place. |
| D-10 | Percent is two operations: `percent` (1 operand, `b / 100`) and `percent_of` (2 operands, `a × b / 100`). Without a pending operator, `%` calls `percent` instead of returning `0` as Windows does. | Every operation has exactly one meaning and a fixed arity. Returning `0` would be a value decision made on the frontend (conflicts with D-03) and is not meaningful to the user. The iPhone Calculator behaves the same way (`50 %` → `0.5`). |
| D-11 | Internal precision: 34 significant digits (IEEE 754 decimal128). The backend returns results at this precision; the frontend displays 16 digits but sends the full-precision raw value to the next operation. | A standard precision, well above the 16 displayed digits, so rounding errors from chained operations stay invisible in normal use. Residual errors at the 34th digit remain possible (§5, Known limitations). |
| D-12 | `+/-` is a notation edit performed on the frontend (prepend/remove a leading `-`). | Follows from D-03: changing the sign alters no digits and cannot lose precision. Avoids a network round trip per key press. |
| D-13 | While a request is in flight, all keys are disabled; key presses are ignored (not queued). A loading indicator appears only if the request exceeds 300 ms. | Simplest deterministic behavior; local requests complete in milliseconds. Queuing is complex and error-prone. Partial blocking is listed as future work. |
| D-14 | Frontend tests mock the API module with `vi.mock`. | The API layer is a thin single entry point; a network-level mocking library would add a dependency for little gain. |
| D-15 | Go tests use only the standard `testing` package. | Table-driven tests need no assertion library; consistent with NFR-12. |
| D-16 | No Makefile. All commands are documented in the README. | `make` is not available on every platform by default; the commands are short and cross-platform. |
| D-17 | Backend runtime image: distroless, non-root user. The binary implements its own `-healthcheck` flag. | Minimal attack surface and small image. Distroless has no `curl`/`wget`, so the binary checks its own `/healthz`. |
| D-18 | The browser always talks to one origin; a proxy forwards `/api/*` to the backend (Vite dev proxy in development, nginx in Docker). CORS middleware is active only when `ALLOWED_ORIGIN` is set. | Avoids CORS entirely in normal use; the frontend uses relative URLs and the same build runs in every environment. CORS is needed only if frontend and backend are deployed on different origins (e.g. a live demo). |
| D-19 | Frontend state: `useReducer` with a pure reducer plus a `useCalculator` hook for async work. No global state library. | The calculator is a state machine; a pure reducer is trivially testable. |
| D-20 | `0 ÷ 0` returns `UNDEFINED_RESULT` ("Result is undefined"), separate from `DIVISION_BY_ZERO`. | Matches Windows, and the two cases are mathematically different. |
| D-21 | Rounding is **half away from zero** everywhere (`-2.5` → `-3`): apd `RoundHalfUp` on the backend, `Intl.NumberFormat` `roundingMode: "halfExpand"` on the frontend. The adjusted exponent must lie within **[−9999, 9999]**. For results: above → `OVERFLOW`; below → `0` (underflow, no error). Operands outside the range are rejected with `INVALID_NUMBER`. | This is the rounding calculator users expect, and naming the exact mode on both sides prevents the backend and frontend from rounding negative halves differently. The exponent range mirrors the range of the Windows calculator. Underflow to zero is the conventional calculator behavior. |
| D-22 | Display notation: let `v` be the value rounded to 16 significant digits. `0` is shown as `0`. If `1e-7 ≤ |v| < 1e16`, plain notation; otherwise scientific notation `m.mmme±n` (e.g. `1.2e+20`, `1.5e-8`). Trailing zeros of the fraction and mantissa are removed. | A simple, testable rule. The upper bound matches the 16 displayed digits; the lower bound keeps small numbers readable. Windows uses a more complex rule, so small numbers may be displayed differently. |
| D-23 | Mobile devices change only the layout; behavior follows Windows on every device. | One behavioral reference. Mobile calculators such as the iPhone's use operator precedence; mixing references would make the same key sequence give different results on different devices. |
| D-24 | `docs/SPEC.md` takes precedence over `docs/openapi.yaml`. A discrepancy is a bug fixed in both files in the same commit. | One source of truth. |
| D-25 | HTTP request checks run in this order; the first failing check decides the response: unknown path (404) → wrong method (405) → `Content-Type` (415) → body size (413) → JSON syntax (`INVALID_JSON`) → fields and types (`VALIDATION_ERROR`) → operation name → operand count → operand format → calculation. `Content-Type` is compared by media type, so parameters such as `charset=utf-8` are accepted. When `ALLOWED_ORIGIN` is set, a CORS preflight (`OPTIONS` with `Access-Control-Request-Method`) gets 204 before routing; otherwise `OPTIONS` gets 405. | Cheap checks run first, and every request gets exactly one deterministic error that tests can rely on. Many clients send a `charset` parameter. Answering preflight before routing keeps CORS independent of the routes. |

---

## 7. Architecture

```
DEVELOPMENT
  Browser ──► Vite dev server (:5173) ──/api/*──► Go backend (:8080)

DOCKER
  Browser ──► nginx container (:8080 on host) ──/api/*, /healthz──► Go backend container (:8080, internal only)
```

### Technology stack

| Layer | Choice |
|---|---|
| Backend language | Go, current stable release |
| HTTP | `net/http` (method-based routing) |
| Decimal math | `github.com/cockroachdb/apd` |
| Logging | `log/slog` (JSON) |
| Handler tests | `net/http/httptest` |
| Lint | `gofmt`, `golangci-lint` |
| Frontend | React + TypeScript (strict) + Vite |
| State | `useReducer` + custom hook |
| HTTP client | native `fetch` behind a typed module in `src/api/` |
| Styling | CSS Modules |
| Frontend tests | Vitest + React Testing Library + `@testing-library/user-event`, V8 coverage |
| Frontend lint | ESLint + Prettier |
| Package manager | npm (`npm ci` in CI and Docker) |
| Containers | Multi-stage Docker builds, nginx for the frontend, Docker Compose |
| CI | GitHub Actions |

### Backend middleware

Request body size limit, panic recovery (→ 500 JSON), request logging, `Content-Type` check (→ 415),
CORS (only when `ALLOWED_ORIGIN` is set, D-18).

### Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Backend listen port |
| `ALLOWED_ORIGIN` | *(empty — CORS disabled)* | Allowed origin when frontend and backend run on different origins |

### Repository layout

```
/
├── backend/
│   ├── cmd/server/main.go          # entry point: config, wiring, server start, -healthcheck flag
│   ├── internal/
│   │   ├── api/                    # handlers, middleware, request/response types, error mapping
│   │   └── calculator/             # service, operation interface, registry, one file per operation
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                    # backend client and API types
│   │   ├── features/calculator/
│   │   │   ├── components/         # Calculator, Display, Keypad, Key
│   │   │   ├── state/              # reducer, actions, state types, keypad layout config
│   │   │   └── hooks/              # useCalculator
│   │   └── utils/format.ts         # display formatting
│   ├── nginx.conf
│   └── Dockerfile
├── docs/
│   ├── SPEC.md                     # this file
│   └── openapi.yaml
├── .github/workflows/ci.yml
├── .gitattributes  .editorconfig  .gitignore  .dockerignore
├── docker-compose.yml
├── CLAUDE.md
├── PROMPTS.md
└── README.md
```

Frontend code is organized by feature, not by file type, so a future Scientific mode gets its own folder.

---

## 8. API contract

Contract-first: `docs/openapi.yaml` is generated from this section. This section takes precedence (D-24).

### Endpoints

| Method | Path | Purpose | Priority |
|---|---|---|---|
| `POST` | `/api/v1/calculate` | Perform one operation | Must |
| `GET` | `/healthz` | Health check → `200 {"status":"ok"}` | Must |
| `GET` | `/api/v1/operations` | List operations and arity | Could |

### Request

```json
POST /api/v1/calculate
Content-Type: application/json

{ "operation": "add", "operands": ["0.1", "0.2"] }
```

- `operation` (string, required): one of the registered operation names.
- `operands` (array of strings, required): length must equal the operation's arity.
- Unknown fields are rejected.
- The request body is limited to 4 KiB.

### Number format

**Input (operands)**

- Grammar: optional `-`, then digits with an optional fraction, then an optional exponent:
  `^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$`, at most 100 characters.
- Accepted examples: `"12"`, `"-0.5"`, `"12."`, `".5"`, `"-0."`, `"1.2e+20"`, `"1E-5"`.
- Rejected examples (`INVALID_NUMBER`): `""`, `" 5"`, `"+5"`, `"abc"`, `"NaN"`, `"Inf"`, `"Infinity"`, `"1,000"`.
- The adjusted exponent must be within [−9999, 9999]; `"1e20000"` and `"1e-20000"` are rejected with `INVALID_NUMBER` (D-21).
- Operands with more than 34 significant digits are rounded to 34 (half away from zero, D-21).

**Output (`result`)**

- Rounded to 34 significant digits, half away from zero (D-11, D-21).
- Normalized: no trailing zeros in the fraction (`"4"`, not `"4.000"`); `-0` is returned as `"0"`.
- Plain notation when the adjusted exponent is between −20 and 33 (`"100"`, never `"1E+2"`);
  otherwise scientific notation with a lowercase `e` and an explicit sign (`"1.5e+40"`, `"2e-25"`).

### Success response

```json
200 OK
{ "operation": "add", "result": "0.3" }
```

### Error response

```json
422 Unprocessable Entity
{ "error": { "code": "DIVISION_BY_ZERO", "message": "Cannot divide by zero" } }
```

The frontend selects the UI text from `code` (§9); `message` is for developers.

### Operations

| Operation | Arity | Formula | Errors |
|---|---|---|---|
| `add` | 2 | `a + b` | `OVERFLOW` |
| `subtract` | 2 | `a − b` | `OVERFLOW` |
| `multiply` | 2 | `a × b` | `OVERFLOW` |
| `divide` | 2 | `a ÷ b` | `DIVISION_BY_ZERO` (`b = 0`, `a ≠ 0`), `UNDEFINED_RESULT` (`0 ÷ 0`), `OVERFLOW` |
| `percent` | 1 | `b ÷ 100` | — |
| `percent_of` | 2 | `a × b ÷ 100` | `OVERFLOW` |
| `sqrt` | 1 | `√a` | `INVALID_DOMAIN` (negative input) |
| `square` | 1 | `a²` | `OVERFLOW` |
| `reciprocal` | 1 | `1 ÷ a` | `DIVISION_BY_ZERO`, `OVERFLOW` |

Results below the exponent range underflow to `"0"` without an error (D-21).

### Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 400 | `VALIDATION_ERROR` | Missing field, wrong type, or unknown field |
| 400 | `INVALID_NUMBER` | An operand does not match the input number format |
| 400 | `UNSUPPORTED_OPERATION` | Operation name not in the registry |
| 400 | `INVALID_OPERAND_COUNT` | Operand count does not match the operation's arity |
| 404 | `NOT_FOUND` | Unknown path |
| 405 | `METHOD_NOT_ALLOWED` | Wrong HTTP method |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeds 4 KiB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` of a POST request is not `application/json` |
| 422 | `DIVISION_BY_ZERO` | `divide` with divisor 0 (dividend not 0), or `reciprocal` of 0 |
| 422 | `UNDEFINED_RESULT` | `0 ÷ 0` |
| 422 | `INVALID_DOMAIN` | Operation undefined for the input (square root of a negative number) |
| 422 | `OVERFLOW` | Result exponent above 9999 (D-21) |
| 500 | `INTERNAL_ERROR` | Unexpected error. Details are logged only. |

Rule: 400-range = "the request is wrong"; 422 = "the request is well-formed but mathematically undefined".
HTTP-level details (order of checks when a request has several faults, `Content-Type` parameters such as
`charset`, CORS preflight handling) follow D-25.

---

## 9. Frontend design

### Components

```
App
└── Calculator        ← uses useCalculator; the only stateful component
    ├── Display       ← expression line + value line, aria-live
    └── Keypad        ← renders keys from a layout config array
        └── Key       ← a single button
(Could: HistoryPanel, MemoryBar)
```

Presentational components (`Display`, `Keypad`, `Key`) receive props only and hold no state.

### Keypad layout (Standard mode)

Defined as data (`{ label, ariaLabel, action, variant }[]`), not hard-coded JSX, so other modes
only need another layout array.

```
[ %   ] [ CE  ] [ C   ] [ ⌫   ]
[ 1/x ] [ x²  ] [ √x  ] [ ÷   ]
[ 7   ] [ 8   ] [ 9   ] [ ×   ]
[ 4   ] [ 5   ] [ 6   ] [ −   ]
[ 1   ] [ 2   ] [ 3   ] [ +   ]
[ +/- ] [ 0   ] [ .   ] [ =   ]
```

### State shape (starting point)

```ts
type CalculatorState = {
  input: string;                       // number being typed, e.g. "12.5"
  accumulator: string | null;          // full-precision left-hand value
  pendingOperator: BinaryOperator | null;
  expression: string;                  // top display line, e.g. "12 + "
  lastOperation: { operator: BinaryOperator; operand: string } | null; // for repeated "=" (FR-18)
  status: 'ready' | 'loading' | 'error';
  errorCode: ApiErrorCode | 'NETWORK_ERROR' | null;
  justEvaluated: boolean;              // next digit starts a new number
};
```

Every value is stored raw (full precision); display strings are derived with `format.ts`.

### Async pattern

The reducer is pure and synchronous. `useCalculator`:

1. receives a key press and decides whether it needs a calculation;
2. dispatches `CALCULATION_STARTED` (status → `loading`, keys disabled — D-13);
3. calls the API module;
4. dispatches `CALCULATION_SUCCEEDED` or `CALCULATION_FAILED`.

API calls use `AbortController` with a 5-second timeout. Timeouts, network failures, non-JSON
responses, and 5xx responses map to `NETWORK_ERROR`. In-flight requests are aborted when the
component unmounts.

### Which keys send a request

| Key | Sends a request? |
|---|---|
| Digits, `.`, `⌫`, `CE`, `C`, `+/-` | No |
| `=` | Yes, unless there is neither a pending operator nor a last operation |
| `+ − × ÷` with a pending operator **and** a second operand | Yes — the intermediate result is computed (FR-04) |
| `+ − × ÷` without a pending operation | No — the operator is stored |
| `√x`, `x²`, `1/x`, `%` | Yes |

Example `5 + 3 × 2 =`: `×` sends `add(5, 3)` → display `8`; `=` sends `multiply(8, 2)` → `16`.

### Key behavior table (each row is a reducer test)

**Input**

| Situation | Behavior |
|---|---|
| Digit when input is `0` | Replace: `0` → `5` |
| `.` on empty input | `0.` |
| Second `.` | Ignored |
| Digit when 16 digits are already entered | Ignored (FR-02) |
| Digit right after a computed result (`=`, unary, or chained) | Starts a new number; the computed result is discarded |
| `.` right after a computed result | Starts a new number `0.` |
| `⌫` on the number being typed | Deletes the last character; a single digit, `-5`, `0.`, or `-0.` becomes `0` (never `-0`) |
| `⌫` on a computed result | Value kept; after `=`, the expression line is cleared |
| `CE` while typing the second operand (`5 + 3`) | Value becomes `0`; expression stays `5 +` |
| `CE` after `=` | Value becomes `0`; expression line and last operation are cleared |

**Binary operators and `=`**

| Situation | Behavior |
|---|---|
| Operator right after another operator | Replaces it: `5 +` then `×` → `5 ×` |
| Operator after a second operand | Computes the pending operation and stores the new operator: `5 + 3 ×` → expression `8 ×`, value `8` (FR-04) |
| Operator after `=` | The result becomes the left operand: expression `8 +`, value `8` |
| `=` right after an operator (`5 + =`) | The current value is used as the second operand: expression `5 + 5 =`, value `10` |
| `=` with no pending operator but a last operation | Applies the last operation to the current value: after `5 + 3 =`, `7 =` → expression `7 + 3 =`, value `10` (FR-18) |
| `=` again after `=` | Repeats the last operation on the result: after `5 + 3 =`, `=` → expression `8 + 3 =`, value `11` (FR-18) |
| `=` with neither a pending operator nor a last operation | No calculation; expression shows `5 =` |

**Unary operations and sign**

| Situation | Behavior |
|---|---|
| `√x`, `x²`, `1/x` | Applied to the current value; expression shows `√(9)`, `sqr(5)`, `1/(5)`; nested: `√(sqr(5))` |
| Unary key right after a binary operator | Applied to the current value as the second operand: `5 + √` → `5 + √(5)` |
| `+/-` right after a binary operator | Negates the current value as the second operand: `5 + negate(5)` |
| `+/-` on a unary result | Negates the value; the expression wraps it: `negate(√(9))` |
| `%` with pending `+` or `−` | `percent_of(accumulator, current)`; expression shows the computed value: `200 + 10 %` → `200 + 20`; `200 + %` → `200 + 400` |
| `%` with pending `×` or `÷` | `percent(current)`; expression shows the computed value: `200 × 10 %` → `200 × 0.1` |
| `%` with no pending operator | `percent(current)`; expression shows the computed value: `10 %` → `0.1` (D-10) |

**Requests and errors**

| Situation | Behavior |
|---|---|
| Any key during a request | Ignored (D-13) |
| In error state | Disabled: binary operators, `=`, `%`, `√x`, `x²`, `1/x`, `+/-`, `.` |
| `C`, `CE`, `⌫`, or a digit in error state | Exits the error state and resets the whole state, including the expression line; a digit then starts a new number (FR-08) |

### `+/-` (notation edit, D-12)

| Situation | Behavior |
|---|---|
| Number being typed | Prepend or remove leading `-` |
| On a computed result (`=` or unary) | Same rule; expression shows `negate(8)` or wraps the previous expression (`negate(√(9))`) |
| Value is `0` | Stays `0` (no `-0`) |
| Value is `0.` | Becomes `-0.` (user is still typing a decimal) |
| Value in scientific notation | Only the leading sign changes, never the exponent sign |

### Error texts

| Code | UI text |
|---|---|
| `DIVISION_BY_ZERO` | Cannot divide by zero |
| `UNDEFINED_RESULT` | Result is undefined |
| `INVALID_DOMAIN` | Invalid input |
| `OVERFLOW` | Overflow |
| `NETWORK_ERROR` | Service unavailable |
| Any other code | Something went wrong |

### Display formatting (`utils/format.ts`)

- Pure function: raw value string → display string.
- At most 16 significant digits, half away from zero (FR-17, D-21); notation by D-22.
- Thousands separators (FR-19), `en-US` grouping, in plain notation only.
- The value is never converted to a JavaScript float during formatting; precision preservation is
  covered by tests. Preferred implementation: `Intl.NumberFormat` with string input; a small
  string-based formatter otherwise.
- In-progress input (e.g. `12.`, `0.50`) keeps the user's trailing `.` and zeros.

### Keyboard and accessibility

- A single `keydown` listener on `window`.
- Shortcuts as listed in FR-12.
- `Enter` must trigger `=` exactly once, even when a key button has focus after a mouse click.
  Covered by a regression test. All other keys remain reachable with `Tab` and `Space`.
- `aria-live="polite"` on the display; `aria-label` on every symbol key; visible focus styles.

### Layout

CSS Grid keypad. Full screen on mobile (from 320 px width); centered, fixed width on desktop.
Touch targets ≥ 44×44 px.

---

## 10. Testing strategy

Test pyramid: many fast unit tests, fewer integration tests, E2E only if time remains.

General rules: test behavior, not implementation; Arrange–Act–Assert; descriptive test names
that state the behavior (`divide/returns DIVISION_BY_ZERO when divisor is zero`), without requirement IDs;
every Must and Should requirement is covered by at least one test; test files live next to the code (`divide_test.go`, `reducer.test.ts`).

### Backend

| Layer | What | How |
|---|---|---|
| Operations | Every operation and its errors (incl. `0 ÷ 0`), precision (`0.1 + 0.2 = 0.3`), 34-digit rounding half away from zero (including negative halves), overflow above 1e9999, underflow to `0` | Table-driven tests with `t.Run` subtests |
| Number format | Every accepted and rejected input example in §8, including out-of-range exponents; output normalization (`"4"`, `"100"`, `"0"` for `-0`, scientific notation boundaries) | Table-driven tests |
| Registry & service | Unknown operation, wrong arity | Table-driven tests |
| HTTP handlers | Every error code in §8 with its status and JSON body; success path; 404/405 in JSON format | `httptest` |
| Middleware | 413 at 4 KiB, panic → 500, 415; CORS headers present only when `ALLOWED_ORIGIN` is set | `httptest` |
| Fuzz (Should) | Number parsing never panics | `go test -fuzz` |

Commands: `go test ./... -race -cover`; `go test ./... -coverprofile=coverage.out` then
`go tool cover -html=coverage.out`.

### Frontend

| Layer | What | How |
|---|---|---|
| Reducer | Every row of the key behavior tables and the `+/-` table | Pure function tests, test-first |
| `format.ts` | Precision preservation, 16-digit rounding half away from zero (including negative halves), D-22 notation boundaries, thousands separators, negatives, magnitudes beyond the JavaScript number range (`1e400`, `-9.5e9999`, `1e-400`), in-progress input (`0.`, `12.50`) | Pure function tests |
| API client | Success, error JSON parsing, network error, timeout, non-JSON and 5xx responses | Mocked `fetch`, fake timers |
| `useCalculator` | Chained operations, input blocking during requests, error flows | API module mocked with `vi.mock` |
| Components | Click and keyboard flows (including the shortcuts in FR-12), disabled keys and error texts in error state, ARIA attributes, `Enter` regression | React Testing Library + `user-event` |

### Coverage and E2E

- Coverage reports are uploaded as CI artifacts; percentages go into the README.
- CI fails below 80% line coverage, per side (NFR-17): Vitest `coverage.thresholds` with the exclusions
  in NFR-17; for Go, a short script over `./internal/...`.
- Code that exists before its features (e.g. the scaffold `App.tsx` in step 4) gets a smoke test so the
  gate passes from the step that enables it.
- **Could:** Playwright smoke tests against `docker compose` (`2 + 3 = 5`, division by zero).

---

## 11. Delivery infrastructure

### Docker

- **Backend:** multi-stage. Build stage: official Go image, `CGO_ENABLED=0` static binary.
  Runtime stage: distroless, non-root user. Healthcheck runs `/server -healthcheck` (D-17).
- **Frontend:** multi-stage. Build stage: Node, `npm ci`, `npm run build`. Runtime stage: nginx.
- **nginx:** proxy `/api/` and `/healthz` to the backend; SPA fallback to `index.html`; long-term
  caching for hashed assets, no caching for `index.html`; gzip.
- **Compose:** only the frontend is published (host port 8080). The backend is reachable only on the
  internal network. Frontend uses `depends_on` with `condition: service_healthy`.
- Image versions are pinned; no `latest` tags.

Result: `docker compose up --build`, then open `http://localhost:8080`. The API is reachable at the
same address (`curl http://localhost:8080/api/v1/calculate ...`).

### CI (GitHub Actions)

Triggers: every push to `main` (NFR-13). Superseded runs are cancelled.

| Job | Steps |
|---|---|
| `backend` | setup-go (cache) → `gofmt` check → `golangci-lint` → `go test -race -coverprofile` → 80% threshold → upload coverage artifact |
| `frontend` | setup-node (npm cache) → `npm ci` → ESLint → Prettier check → `tsc --noEmit` → Vitest with coverage (80% threshold) → `npm run build` → upload coverage artifact |
| `docker` | `docker compose build` |

### Repository hygiene

`.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, `.gitignore` (`node_modules/`, build output,
coverage, `.env`), `.dockerignore`.

### README outline

1. Overview (+ screenshot/GIF)
2. Quick start (`docker compose up --build`)
3. Local development (prerequisites with versions; run backend and frontend separately)
4. Testing & coverage (commands, current percentages)
5. API reference (endpoints, `curl` examples, error codes, link to `docs/openapi.yaml`)
6. Architecture (diagram, layers)
7. Design decisions (summary of §6)
8. Assumptions, deliberate deviations from Windows (D-10, D-22), and known limitations (§5)
9. Trade-offs & future work (§5)
10. AI usage (links to `PROMPTS.md` and `CLAUDE.md`)

Note for Windows users in the README: in PowerShell, `curl` is an alias; use `curl.exe`.

---

## 12. Implementation plan

Each row is one step, delivered as small Conventional Commits directly on `main` (D-08).
Cross-cutting NFRs (§4) apply to every step and are not listed per row.

| # | Step | Content | Requirements |
|---|---|---|---|
| 0 | Project scaffold | Hygiene files, folder structure, `docs/SPEC.md`, `CLAUDE.md`, README stub | §11 |
| 1 | API contract | `docs/openapi.yaml` from §8 | BR-01–08, D-24 |
| 2 | Backend operations | Verify the apd API first; operation interface, registry, 9 operations, number format, table-driven tests; CI with backend job | BR-02–04, BR-07 (calculation level), NFR-01–02, D-11, D-20, D-21 |
| 3 | Backend HTTP | Handler, error format (incl. 404/405), middleware, `/healthz`, `-healthcheck` flag, env config, `slog`, fuzz test | BR-05–08, BR-07 (HTTP level), NFR-06, NFR-16, D-25 |
| 4 | Frontend setup | Vite + TS strict, ESLint, Prettier, Vitest (with coverage exclusions and an `App` smoke test), dev proxy; CI frontend job | NFR-09, NFR-17, D-18 |
| 5 | Frontend logic | `format.ts`, API client, reducer (test-first from §9) | FR-01–11, FR-17–19, D-12, D-13, D-20, D-21, D-22 |
| 6 | Frontend UI | Components, `useCalculator`, keyboard, accessibility, responsive styles | FR-07–08, FR-12–13, NFR-08 |
| 7 | Docker | Dockerfiles, `nginx.conf`, `docker-compose.yml`, CI docker job | NFR-10, D-17 |
| 8 | README | Final README, coverage numbers, screenshot | NFR-11 |

**Order rationale:** the contract comes first as the single source of truth; the backend precedes the
frontend because it carries the highest technical risk (precision library); CI is introduced with the
first code step so every later change is checked; frontend logic precedes the UI so behavior is proven
before it is rendered.

Could items start only after step 8.

### Definition of Done (every step)

- [ ] CI green: lint, type check, tests, 80% coverage threshold *(from step 2 on, once CI exists)*
- [ ] Tests written for new code
- [ ] Conventional Commits messages
- [ ] README section updated if affected
- [ ] `docs/SPEC.md` and `docs/openapi.yaml` consistent (D-24)

### Risks

| Risk | Mitigation |
|---|---|
| apd API differs from expectations | Verified with a small spike at the start of step 2; fallback: `shopspring/decimal` with a hand-written square root |
| `Intl.NumberFormat` loses precision with string input, or fails on magnitudes beyond the JavaScript number range | Covered by the first formatting tests; fallback: small string-based formatter |
| Reducer complexity | The key behavior tables define the behavior; implemented test-first, row by row, Must behaviors first |
| Line-ending differences between development and Linux environments | `.gitattributes` in the first commit |

### Open items

- Live demo hosting platform (free tier) — decided last (NFR-14).
