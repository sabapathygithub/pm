# Code Review

Date: 2026-03-10  
Project: PM MVP (`/Users/sabapathykathiresan/projects/pm`)

## Overall Assessment

The project is in a good MVP state with clear architecture and meaningful test coverage.  
The highest risks are security and data integrity in backend auth handling, plus robustness gaps around runtime payload validation and Docker hardening.

## Highest Priority Findings

### 1) Secret exposure in repo
- Severity: High
- File: `backend/.env:1`
- Issue: A real API key is present in tracked files.
- Risk: Credential compromise, unauthorized usage, billing abuse.
- Recommendation:
  - Rotate/revoke key immediately.
  - Remove secrets from tracked files.
  - Keep `.env.example` only.
  - Ensure `.env` is ignored and scan history for leaks.

### 2) Backend identity is client-controlled (no auth boundary)
- Severity: High
- File: `backend/app/main.py:82`
- File: `backend/app/main.py:121`
- File: `backend/app/database.py:16`
- Issue: `username` from request is trusted for board read/write and AI operations.
- Risk: Any caller can access/modify another user’s data by choosing a username.
- Recommendation:
  - Implement server-side auth/session and derive user from auth context.
  - Remove `username` from public mutating API surfaces.
  - Reject unauthenticated access.

### 3) Frontend API payloads are not runtime-validated
- Severity: High
- File: `frontend/src/lib/api.ts:16`
- File: `frontend/src/components/KanbanBoard.tsx:248`
- Issue: API responses are cast with TypeScript assertions only.
- Risk: Malformed/inconsistent payload can crash UI (e.g., missing card for a `cardId`).
- Recommendation:
  - Add runtime schema validation (Zod/manual).
  - Guard card mapping/rendering against missing card objects.
  - Reject invalid payloads and keep last known good board.

## Medium Priority Findings

### 4) AI board + conversation updates are non-atomic
- Severity: Medium
- File: `backend/app/main.py:142`
- Issue: Board update and conversation update are separate operations.
- Risk: Partial writes create inconsistent state if one update fails.
- Recommendation: Wrap both updates in one DB transaction.

### 5) Conversation history grows unbounded
- Severity: Medium
- File: `backend/app/main.py:158`
- File: `backend/app/ai_client.py:70`
- Issue: Full history is appended and sent each AI call.
- Risk: Token/cost growth, latency, eventual request failures.
- Recommendation: Cap history window and enforce message size limits.

### 6) OpenRouter response parsing is brittle
- Severity: Medium
- File: `backend/app/ai_client.py:52`
- File: `backend/app/ai_client.py:135`
- Issue: Assumes `message.content` is always plain string.
- Risk: Valid provider responses in alternate content shapes can fail.
- Recommendation: Normalize supported content formats before JSON parsing.

### 7) Column title persistence sends full save per keystroke
- Severity: Medium
- File: `frontend/src/components/KanbanColumn.tsx:45`
- File: `frontend/src/components/KanbanBoard.tsx:57`
- Issue: Every input change triggers full board PUT.
- Risk: Excess traffic and out-of-order save behavior under latency.
- Recommendation: Debounce or commit-on-blur/Enter.

### 8) Drag and drop is pointer-only
- Severity: Medium
- File: `frontend/src/components/KanbanBoard.tsx:67`
- Issue: Keyboard sensor is missing.
- Risk: Poor accessibility for keyboard users.
- Recommendation: Add keyboard DnD sensor and related accessibility tests.

### 9) Docker build is not lockfile-reproducible
- Severity: Medium
- File: `Dockerfile:13`
- Issue: `uv.lock` exists but is not copied/used in locked mode before sync.
- Risk: Dependency drift across builds.
- Recommendation: Copy `backend/uv.lock` and use frozen/locked install mode.

### 10) Container runs as root
- Severity: Medium
- File: `Dockerfile:9`
- Issue: No non-root `USER` in runtime image.
- Risk: Higher blast radius on compromise.
- Recommendation: Create and run as non-root user; set writable ownership only where needed.

### 11) Docker DB persistence not guaranteed
- Severity: Medium
- File: `docker-compose.yml:1`
- Issue: No volume configured for SQLite DB path.
- Risk: Data loss across container recreation.
- Recommendation: Add named volume/bind mount for DB storage path.

## Low Priority Findings

### 12) Validation allows extra fields
- Severity: Low
- File: `backend/app/board_validation.py:4`
- Issue: Required structure checked, but unknown properties not forbidden.
- Risk: Schema drift and junk data.
- Recommendation: Use strict Pydantic/schema with `extra="forbid"` style behavior.

### 13) User creation has race window
- Severity: Low
- File: `backend/app/database.py:16`
- Issue: Select-then-insert pattern can race.
- Risk: intermittent integrity errors under concurrency.
- Recommendation: Use `INSERT OR IGNORE` + select, or catch/retry on integrity error.

### 14) Docs model string mismatch
- Severity: Low
- File: `docs/PLAN.md:170`
- File: `backend/README.md:20`
- Issue: `(free)` vs `:free` mismatch.
- Risk: setup confusion.
- Recommendation: Standardize on `openai/gpt-oss-120b`.

### 15) `.dockerignore` should exclude `.env`
- Severity: Low
- File: `.dockerignore:1`
- Issue: `.env` not excluded from build context.
- Risk: secret exposure to build context.
- Recommendation: add `.env` to `.dockerignore`.

## Test Coverage Gaps

- Missing authz tests proving users cannot access each other’s data.
- Missing transactional failure tests for AI operate (board+conversation atomicity).
- Missing malformed backend payload resilience tests in frontend.
- Missing tests for OpenRouter alternate content shapes.
- Missing stress/concurrency tests around first-time user creation.
- DnD E2E appears coordinate-heavy and may be flaky in CI.

## Suggested Fix Order

1. Remove exposed secret and rotate key.
2. Implement server-side auth boundary for board/AI endpoints.
3. Add runtime response validation + UI guards in frontend.
4. Make AI updates transactional and cap conversation growth.
5. Harden Docker (lockfile/frozen installs, non-root user, DB volume, `.dockerignore`).
6. Improve accessibility and failure-path test coverage.

## Conclusion

MVP functionality is largely present and coherent, but there are important production-readiness blockers:
- auth/authorization boundary,
- secret hygiene,
- defensive payload handling,
- and deploy hardening.

Addressing the top five items above will significantly reduce risk without overengineering.
