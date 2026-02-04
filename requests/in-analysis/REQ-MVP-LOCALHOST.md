# REQ-MVP-LOCALHOST: BuildPlan MVP (Multi-tenant SaaS) running locally

**Submitted By**: PO (OpenClaw)
**Date**: 2026-02-04
**Priority**: High
**Status**: Pending

## Goal
Deliver a working MVP of the *actual* BuildPlan multi-tenant SaaS (not just the agent system), running on localhost.

## Deployment target (MVP)
- Local development only (localhost ports)
- Start with Docker Compose for Postgres + Redis (if needed)
- App server(s) run via `npm run dev` / `npm start` (acceptable for MVP)

## Core UX (dad-proof)
User-facing nouns: **Request → Plan → Proof**.

### Must-have flows
1. **Auth**: Register + Login + Logout
2. **Organizations**: Create org on signup; invite/join later can be stubbed
3. **Requests**:
   - Create request (title + description + priority)
   - List requests (org-scoped)
   - Request detail page
4. **Plan generation**:
   - Convert Request → Plan (basic milestone/task breakdown)
   - Store plan + tasks
   - Manual “Generate plan” button is OK for MVP
5. **Proof**:
   - Mark tasks complete with a proof note/URL
   - Request shows progress (tasks completed/total)

## Multi-tenant requirement (must)
- Data isolation by organization
- Use Postgres + Prisma
- Row-Level Security (RLS) preferred; if too heavy for MVP, enforce org scoping in queries and clearly mark as temporary.

## Tech constraints
- Node.js / TypeScript
- REST API
- Next.js web UI (basic, not pretty)

## Acceptance criteria
- `docker compose up` starts DB (and Redis if used)
- `npm run dev` brings up the web UI
- A new user can register and log in
- User can create a Request and see it in the list
- User can generate a Plan for a Request and see tasks created
- User can mark a task complete with a Proof entry
- All data is isolated per organization
- README updated with local run instructions

## Notes
- Keep scope tight: one org per user is fine for MVP.
- Prefer a monorepo under `/packages` if it already exists; otherwise implement minimal structure consistent with the repo's roadmap.
