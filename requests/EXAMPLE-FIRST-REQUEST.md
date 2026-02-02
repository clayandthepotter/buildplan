# EXAMPLE: Your First Project Request

**This is an example to show you how it works. Delete this file when you're ready.**

---

# REQ-001: Build Foundation Infrastructure

**Request ID**: REQ-001  
**Submitted By**: Executive  
**Date**: 2026-02-02  
**Priority**: Critical  
**Status**: Pending

---

## What Do You Want Built?

I want the foundational infrastructure for BuildPlan set up so we can start building features. This includes:
- Database setup with PostgreSQL
- Prisma ORM configured
- Row-Level Security (RLS) for multi-tenancy
- Docker development environment
- Basic authentication system

Essentially, complete Phase 0 and Phase 1 from the BUILD_PLAN_ROUTE_BY_ROUTE.md document.

---

## Why Do You Need This?

This is the foundation that all other features depend on. Without it, we can't build any user-facing features. It's blocking all other work.

---

## Who Is This For?

This is for the development team - it's infrastructure work that enables everything else.

---

## Success Criteria

- PostgreSQL database running in Docker
- Prisma schema defined with all core models (Organization, User, Request, Plan, Task, etc.)
- RLS policies working and tested (data isolation between orgs)
- Docker Compose file that starts everything
- JWT authentication implemented
- Can create a user, log in, and see data only for their organization

---

## Constraints or Requirements

- Must use PostgreSQL (not MongoDB or other)
- Must use Prisma ORM
- Must implement Row-Level Security for tenant isolation
- Must use Docker for local development
- Should follow the route-by-route build plan

---

## Nice-to-Haves (Optional)

- Redis caching set up
- Bull queue system configured
- Basic monitoring/logging

---

## Context or Background

This is our first sprint. We're building the foundation. The BUILD_PLAN_ROUTE_BY_ROUTE.md has the detailed breakdown of what's needed. Phase 0 (routing architecture) and Phase 1 (infrastructure) are what I want completed.

---

## Questions for PM Agent

1. Should we tackle this all at once or break it into smaller milestones I need to approve?
2. What's the estimated timeline for completing Phase 0 and Phase 1?
3. Are there any risks or blockers you foresee?

---

## Attachments

- See: `docs/BUILD_PLAN_ROUTE_BY_ROUTE.md`
- See: `docs/ARCHITECTURE.md`
- See: `TODO.md` (tasks already broken down)

---

## PM Agent Instructions

This should map to tasks already in TODO.md Phase 0 and Phase 1. Convert those to individual task files and let's get started!
