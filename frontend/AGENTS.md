# Frontend Agent Notes

This file documents the current frontend MVP as of Phase 1 planning.

## Overview

The frontend is a Next.js app that renders a login-gated single-board Kanban UI. It now reads/writes board state through backend `/api/board` when available, with a local fallback for standalone frontend dev.

## Tech Stack

- Next.js 16 (`next`)
- React 19 (`react`, `react-dom`)
- TypeScript
- Tailwind CSS v4
- `@dnd-kit` for drag and drop
- Vitest + Testing Library for unit/component tests
- Playwright for e2e tests

Key scripts (`frontend/package.json`):
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:all`

## Code Structure

- `src/app/`
- `layout.tsx`: App shell layout
- `page.tsx`: Entry page for board demo
- `globals.css`: Global styles and color variables
- `src/components/`
- `AuthGate.tsx`: Frontend-only login/logout gate (`user` / `password`)
- `KanbanBoard.tsx`: Top-level board state and interactions
- `lib/api.ts`: Board fetch/save API client helpers
- `KanbanColumn.tsx`: Column UI, title rename input, add-card form hook-up
- `KanbanCard.tsx`: Draggable card UI with delete action
- `KanbanCardPreview.tsx`: Drag overlay card preview
- `NewCardForm.tsx`: Inline add-card form
- `src/lib/`
- `kanban.ts`: Board data types, seed data, move-card logic, id generator
- `src/test/`
- Vitest test setup files
- `tests/`
- Playwright e2e specs

## Current Data Model

Defined in `src/lib/kanban.ts`:
- `Card`: `id`, `title`, `details`
- `Column`: `id`, `title`, `cardIds[]`
- `BoardData`: `columns[]`, `cards` record

Current board assumptions:
- Five columns are present in seed data.
- Column IDs are stable in current implementation.
- Card objects are normalized in a dictionary and referenced by `cardIds` arrays in columns.

## Current Features Implemented

- Renders Kanban board with five columns.
- Requires login via hardcoded credentials before board is shown.
- Supports logout back to login view.
- Column titles can be renamed inline.
- Existing cards can be edited directly in the UI.
- Cards can be dragged and dropped:
- within the same column
- across columns
- to empty/column drop zones
- New cards can be added to a selected column.
- Cards can be deleted.
- Board updates are sent to backend `/api/board` when backend is available.

## Current Gaps vs Root Requirements

Compared with project root `AGENTS.md`, these are not implemented yet:
- No AI sidebar or chat UX.
- No AI-driven create/edit/move/rename operations.
- No structured output handling.

## Testing Status

Current tests:
- `src/components/AuthGate.test.tsx`
- Blocks invalid login
- Allows valid login
- Logs out back to login view
- `src/components/KanbanBoard.test.tsx`
- Renders five columns
- Renames a column
- Adds and removes a card
- Edits an existing card
- `src/lib/kanban.test.ts`
- Verifies reorder and cross-column move logic
- `tests/kanban.spec.ts` (Playwright)
- Loads board
- Adds a card
- Moves a card between columns

Known testing gaps for upcoming phases:
- API integration and persistence coverage
- Direct card edit behavior tests
- AI chat and structured output integration tests

## Working Rules for Frontend Changes

- Keep MVP scope simple; avoid over-engineering.
- Preserve fixed column structure; allow only title rename.
- Add features in phased order from `docs/PLAN.md`.
- Ensure tests are updated with each feature phase before marking done.
