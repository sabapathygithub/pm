# PM MVP Detailed Plan

This document is the implementation checklist for the MVP.

Important gate:
- Do not start coding a phase until the user approves this plan.

Decisions locked from planning:
- Card edits are supported both directly in UI and via AI.
- AI can create/edit/move cards and rename column titles.
- Auth is a simple frontend-only gate for MVP (`user` / `password`).
- Structured outputs are required for AI responses.
- DB schema design/sign-off is deferred to Part 5.
- Column structure is fixed; only titles are renamable.
- Non-Docker local development is acceptable in intermediate phases.

## Part 1: Plan

Scope:
- In: enrich this plan with actionable checklists, tests, and success criteria.
- In: create `frontend/AGENTS.md` documenting current frontend state.
- Out: backend/frontend feature implementation.

Implementation checklist:
- [x] Expand this file into detailed parts with explicit scope, implementation steps, test steps, and success criteria.
- [x] Capture planning decisions and constraints that affect later parts.
- [x] Add a user approval gate before implementation work.
- [x] Create `frontend/AGENTS.md` describing existing frontend architecture and test setup.

Test checklist:
- [ ] Manual review confirms each part (1-10) has implementation checklist, test checklist, and success criteria.
- [ ] Manual review confirms `frontend/AGENTS.md` reflects actual current code.

Success criteria:
- User explicitly approves this plan.
- `docs/PLAN.md` and `frontend/AGENTS.md` are complete and accurate.

## Part 2: Scaffolding

Scope:
- In: Docker setup, FastAPI bootstrap in `backend/`, start/stop scripts in `scripts/`.
- In: hello world static page + hello API.
- Out: full frontend serving and persistence.

Implementation checklist:
- [x] Create FastAPI app entrypoint with `/api/health` or `/api/hello` endpoint.
- [x] Serve a simple static hello page from backend root.
- [x] Add `scripts/start.*` and `scripts/stop.*` for macOS/Linux/Windows.
- [x] Add Dockerfile and compose config to run backend.
- [x] Document local non-Docker run command.

Test checklist:
- [x] Run backend locally and verify hello page loads.
- [x] Verify hello API returns expected JSON.
- [ ] Run via Docker and verify both hello page and API.

Success criteria:
- Backend runs locally and in Docker.
- Hello page and hello API both work in both modes.

## Part 3: Add in Frontend

Scope:
- In: statically build frontend and serve it from FastAPI at `/`.
- Out: login, DB, and AI features.

Implementation checklist:
- [x] Configure frontend build output for backend static serving.
- [x] Add FastAPI static mount or file serving for built frontend assets.
- [x] Keep API routes namespaced so frontend and API do not conflict.

Test checklist:
- [x] Build frontend and run backend serving build output.
- [x] Verify `/` renders Kanban board UI.
- [ ] Run existing frontend unit/e2e tests in this integrated mode where feasible.

Success criteria:
- Kanban board renders at `/` through backend-served static assets.

## Part 4: Add fake user sign in experience

Scope:
- In: frontend-only auth gate with hardcoded credentials and logout.
- Out: backend session/token auth.

Implementation checklist:
- [x] Create login view shown before board access.
- [x] Validate credentials against `user` / `password`.
- [x] Store logged-in state in frontend (simple and explicit).
- [x] Add logout control that clears logged-in state.

Test checklist:
- [x] Unit/component tests for successful login.
- [x] Unit/component tests for invalid credentials.
- [x] Unit/component tests for logout behavior.
- [x] E2E flow test: login -> board visible -> logout -> login visible.

Success criteria:
- Board is inaccessible until valid login.
- Logout consistently returns user to login screen.

## Part 5: Database modeling

Scope:
- In: propose and document SQLite schema and JSON storage strategy.
- Out: implementing full data layer (Part 6).

Implementation checklist:
- [x] Draft schema for users, single board per user, columns, cards, and board JSON.
- [x] Document tradeoffs, constraints, and migration strategy in `docs/`.
- [ ] Request explicit user sign-off before coding DB layer.

Test checklist:
- [ ] Review schema against required operations (fetch board, update board, card and column edits).
- [ ] Confirm schema enforces one-board-per-user and fixed column structure intent.

Success criteria:
- User approves DB design document.

## Part 6: Backend

Scope:
- In: API routes for reading/updating board and DB auto-create.
- Out: frontend API wiring (Part 7) and AI (Part 8+).

Implementation checklist:
- [x] Implement DB initialization if file/tables do not exist.
- [x] Add board read endpoint for current user.
- [x] Add board update endpoint for current user.
- [x] Enforce fixed column IDs/count and title rename-only rule.
- [x] Add backend tests for valid updates and rejected invalid updates.

Test checklist:
- [x] Unit tests for DB initialization.
- [x] Integration tests for read/update endpoints.
- [x] Validation tests for malformed payloads and invalid operations.

Success criteria:
- API persists and returns board state for user.
- Invalid board mutations are rejected with clear errors.

## Part 7: Frontend + Backend

Scope:
- In: wire frontend board operations to backend APIs for persistence.
- Out: AI chat behavior.

Implementation checklist:
- [x] Replace local-only board bootstrap with backend fetch after login.
- [x] Persist card create/edit/delete/move via backend updates.
- [x] Persist column title rename via backend updates.
- [x] Handle API failure states simply (no over-engineering).

Test checklist:
- [x] Integration tests for API-backed board load/update.
- [x] E2E test verifies persisted state survives page reload.

Success criteria:
- Board changes persist across reloads.
- Core board interactions remain functional with API backing.

## Part 8: AI connectivity

Scope:
- In: backend OpenRouter call plumbing and connectivity verification.
- Out: full structured board-update behavior (Part 9).

Implementation checklist:
- [x] Add OpenRouter client using `OPENROUTER_API_KEY` from `.env`.
- [x] Use model `openai/gpt-oss-120b:free`.
- [x] Add simple test call path for prompt `2+2`.

Test checklist:
- [x] Integration test with mocked external call.
- [x] Manual/dev smoke test confirms real connectivity when key is present.

Success criteria:
- Backend can successfully call OpenRouter and return a response.

## Part 9: Structured AI Kanban operation

Scope:
- In: structured outputs including assistant message + optional board update.
- In: include board JSON and conversation history in AI request.
- Out: final chat sidebar UX (Part 10).

Implementation checklist:
- [x] Define strict response schema for AI output.
- [x] Send board JSON, message, and history to model.
- [x] Validate schema before applying update.
- [x] Apply valid updates while enforcing board constraints.

Test checklist:
- [x] Tests for valid structured response with no board update.
- [x] Tests for valid structured response with board update.
- [x] Tests for invalid schema response handling.

Success criteria:
- AI response is schema-validated and safe updates apply deterministically.

## Part 10: AI sidebar widget

Scope:
- In: sidebar chat UI and automatic board refresh after AI update.
- Out: additional non-MVP enhancements.

Implementation checklist:
- [x] Build sidebar chat UI integrated with current layout.
- [x] Send user message/history to backend AI endpoint.
- [x] Render AI response.
- [x] Refresh board state immediately when AI update is applied.

Test checklist:
- [x] Unit tests for chat component rendering and input behavior.
- [x] Integration tests for chat submit and response rendering.
- [x] E2E test for AI-driven board update reflected in UI.

Success criteria:
- Sidebar chat works end-to-end.
- Board updates from AI are visible immediately in UI.

## Cross-phase quality gates

Implementation checklist:
- [ ] Keep docs concise and updated as each part is completed.
- [ ] Keep frontend unit tests, e2e tests, and backend tests passing.

Test checklist:
- [ ] Run full relevant test suites before marking any part complete.

Success criteria:
- No phase is marked complete without passing tests and explicit verification.
