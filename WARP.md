# BuildPlan Development Log

## Project Overview
BuildPlan is a **multi-tenant SaaS platform** designed to scale to tens of thousands of users across thousands of organizations. It's an all-in-one DevOps and Project Management automation platform that eliminates the tedious overhead of managing software development projects. The system automatically translates stakeholder requests into execution plans, assigns work to appropriate team members (human or AI), manages dependencies and timelines, and keeps documentation synchronized with project state.

### Multi-Tenant Architecture Requirements
- Support for 10,000+ concurrent users
- Thousands of unique organizations/workspaces/companies
- Complete data isolation between tenants
- Per-tenant GitHub App installations
- Scalable infrastructure with horizontal scaling
- Enterprise-grade security and compliance

## Initial Setup (2026-02-02)

### Project Initialization
- Created project directory structure at `C:\Users\hello\OneDrive\Documents\GitHub\buildplan`
- Established GitHub repository configuration
- Created initial documentation files (README.md, WARP.md, TODO.md)

### Core Concept Definition
Based on extensive product specification discussions, the following core concepts were established:

#### User-Facing Simplicity
- **Three Core Nouns**: Request (what you want), Plan (what we'll do), Proof (how we know it's done)
- **Dad-proof language**: No technical jargon in stakeholder-facing interfaces
- **Four Simple Milestones**: Clarify → Build → Check → Release

#### Autopilot Philosophy
- System behaves like a "project manager that never sleeps"
- Automatic task assignment, sequencing, and timeline management
- Human override allowed but never required for normal operations
- Clarity gates prevent starting work without sufficient information

#### Built-in AI Agent Workforce
The system ships with pre-configured AI agents that handle standard PM and development roles:
- **Manager Agent**: Scope definition, planning, task breakdown, blocker management
- **Builder Agents**: Backend, Frontend, QA implementation specialists
- **Documentation Agent**: Maintains all project documentation
- **API Doc Agent**: OpenAPI spec generation and maintenance

#### Living Documentation System
- Documentation is source-grounded (derived from real data, never fantasy)
- Staleness detection triggers automatic updates
- Multiple doc types: Overview, User Guide, SOP, Runbook, Release Notes, API Reference
- Documentation lives in repository and updates via same PR workflow as code

### Technical Architecture Decisions

#### Technology Stack
- **Backend**: Node.js/TypeScript with microservices architecture
- **API**: REST with OpenAPI documentation, rate limiting, and API versioning
- **Database**: PostgreSQL + Prisma ORM with row-level security for tenant isolation
- **Caching**: Redis for sessions, rate limiting, and real-time pub/sub
- **Job Queue**: Bull/BullMQ for background processing and agent orchestration
- **Frontend**: Next.js with SSR for performance and SEO
- **GitHub Integration**: GitHub Apps API with per-tenant installations
- **Agent Framework**: Custom orchestration with structured outputs and job queuing
- **Infrastructure**: Docker containers, Kubernetes-ready for horizontal scaling
- **Observability**: Structured logging (Winston/Pino), Prometheus metrics, OpenTelemetry tracing

#### GitHub Integration Strategy
- Agents work via branch → commit → PR workflow
- No direct commits to protected branches
- PR-based gates for stage transitions
- Full audit trail via GitHub's native tracking
- GitHub Bridge microservice handles all repo operations

#### Workflow Engine Design
- Event-driven architecture
- Deterministic stage transitions with explicit gate conditions
- Dependency graph (DAG) for task sequencing
- Capacity-aware scheduling with WIP limits
- Confidence scoring based on readiness and risk factors

### Project Structure Established

```
buildplan/
├── README.md              # Main project documentation
├── WARP.md                # This development log
├── TODO.md                # Task tracking
├── .gitignore             # Git exclusions
├── docs/                  # Extended documentation
├── github-bridge/         # GitHub integration microservice
│   ├── src/
│   │   ├── index.ts       # Express server with REST endpoints
│   │   ├── github.ts      # Octokit wrapper and Git operations
│   │   ├── patch.ts       # Unified diff parsing and application
│   │   ├── validators.ts  # Zod request schemas
│   │   └── types.ts       # TypeScript type definitions
│   ├── package.json       # Dependencies and scripts
│   ├── tsconfig.json      # TypeScript configuration
│   └── .env.example       # Environment variable template
└── [Core application modules - TBD]
```

### GitHub Bridge Service
The first implemented component provides GitHub repository operations for AI agents:

**Capabilities**:
- `POST /v1/branch` - Create feature branches from base branch
- `POST /v1/commit` - Commit multiple file changes atomically
- `POST /v1/apply-patch` - Apply unified diffs to repository files
- `POST /v1/pull` - Open pull requests with generated content

**Key Features**:
- Supports GitHub App authentication (recommended) or personal tokens
- Atomic multi-file commits
- Unified diff support for agent-generated patches
- Full error handling and validation via Zod schemas
- Request logging via Morgan
- Security hardening via Helmet

**Design Rationale**:
- Microservice architecture allows independent scaling
- Octokit provides battle-tested GitHub API wrapper
- Unified diff support enables agent code editing workflows
- Atomic commits ensure consistency

## Multi-Tenant Architecture

### Tenant Isolation Strategy
**Row-Level Security (RLS)**: Primary isolation mechanism
- All core tables include `organization_id` foreign key
- PostgreSQL RLS policies enforce automatic filtering
- Application sets `app.current_organization_id` session variable
- Eliminates accidental cross-tenant data leakage

**Schema Isolation** (Future consideration for enterprise tier):
- Dedicated schemas per large tenant
- Better for regulatory compliance and data residency
- Enables per-tenant backup/restore

### Data Model Tenancy
Every multi-tenant table follows this pattern:
```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- other columns
);

CREATE POLICY tenant_isolation ON requests
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### Scaling Considerations

#### Horizontal Scaling
- **Stateless API servers**: Scale web tier independently
- **Connection pooling**: PgBouncer for efficient database connections
- **Background workers**: Separate worker pools for agent jobs
- **Read replicas**: Route read-heavy queries to replicas

#### Performance at Scale
- **Indexing strategy**: Composite indexes on (organization_id, ...)
- **Query optimization**: Ensure all queries include organization_id filter
- **Partitioning**: Consider table partitioning for high-volume tenants
- **Caching**: Redis for frequently accessed data (workspace settings, user sessions)

#### Queue Architecture
- **Agent jobs**: Isolated queues per tenant (prevents noisy neighbor)
- **Priority queues**: Enterprise tier gets dedicated high-priority workers
- **Rate limiting**: Per-tenant API rate limits (stored in Redis)
- **Job retries**: Exponential backoff with dead letter queue

### Security & Compliance

#### Authentication & Authorization
- **Multi-org support**: Users can belong to multiple organizations
- **Role-based access control (RBAC)**: Per-organization role assignments
- **Session management**: Organization context stored in JWT/session
- **SSO support**: Per-tenant SAML/OAuth configuration (enterprise)

#### Data Security
- **Encryption at rest**: Database-level encryption
- **Encryption in transit**: TLS 1.3 for all connections
- **Secrets management**: Vault/AWS Secrets Manager for GitHub tokens
- **Audit logging**: Immutable audit trail per organization

#### Compliance Readiness
- **Data residency**: Support for region-specific deployments
- **GDPR compliance**: Data export, deletion, and consent management
- **SOC 2 Type II**: Audit trail, access controls, incident response
- **Data retention**: Configurable per-tenant retention policies

### Subscription & Billing

#### Tier Structure
- **Free Tier**: 1 workspace, 5 users, 10 requests/month, community agents
- **Pro Tier**: Unlimited workspaces, 50 users, 500 requests/month, all agents
- **Enterprise Tier**: Unlimited users, unlimited requests, SLA, SSO, dedicated support

#### Usage Tracking
- Requests created (per month)
- Agent compute time (minutes)
- Storage used (GB)
- API calls (per day)
- GitHub operations (commits, PRs)

#### Quota Enforcement
- Soft limits with grace period
- Hard limits at tier boundaries
- Usage notifications at 75%, 90%, 100%
- Automatic upgrades suggested

## Key Design Principles

### Definition of Ready
Enforced before work begins:
- Problem and goal clearly stated
- Scope and non-goals defined
- Acceptance criteria written
- Dependencies identified
- Telemetry plan exists
- Test plan exists

### Definition of Done
Required before release:
- Code merged and reviewed
- Tests passing and added where needed
- QA done and signed off
- Monitoring/analytics present
- Docs/release notes updated
- Rollout plan executed
- Post-release checks complete

### Agent Guardrails
- All agent actions logged
- Outputs are versioned
- Agents cannot ship without required approvals (configurable)
- Human editing/override available at all stages
- Prompt management system with versioning and rollback

## Data Model Highlights

### Core Entities
- **Workspace**: Tenant configuration, timezone, work week settings
- **User**: Human workers with roles, specialties, capacity settings
- **Request**: Intake form data, scope contract, readiness status
- **Plan**: Milestones, timeline estimates, assumptions, risks
- **Milestone**: High-level project phases (Clarify/Build/Check/Release)
- **Task**: Granular work units with dependencies, assignments, status
- **ProofItem**: Verification checklist with evidence links
- **AgentRun**: Agent execution logs with inputs/outputs
- **AuditLog**: Complete history of actions and overrides

### Documentation Entities
- **DocPack**: Collection of all docs for a request
- **DocSection**: Individual documentation segments with sources
- **DocVersion**: Immutable snapshots for versioning
- **StalenessSignal**: Triggers for doc regeneration

### Multi-Tenant Entities
- **Organization**: Top-level tenant entity with subscription, settings, limits
- **OrganizationMember**: User membership with roles per organization
- **Subscription**: Billing, plan limits, feature flags per organization
- **Usage**: Metrics tracking for billing and quota enforcement
- **TenantSettings**: Per-tenant configuration and customizations

## MVP Scope

### Must-Have Features
1. Request intake wizard (dad-proof questionnaire)
2. Translation layer (scope contract + task generation)
3. Built-in PM workflow (roadmap, detail views, work queues)
4. Workflow engine (auto-assignment, transitions, blocking)
5. Agent team (Manager, Builder, QA, Docs, API)
6. Documentation engine with staleness detection
7. GitHub Bridge integration
8. Notification system (in-app + email)
9. Manual override tools (reassign, pause, emergency priority)
10. Audit logging

### Should-Have (Post-MVP)
- Template system per request type
- Advanced role mapping and load balancing
- Slack/SMS notifications
- Dashboard analytics

### Future Considerations
- Built-in Git + web IDE
- Full CI/CD pipeline integration
- Multi-org enterprise features
- SOC2 compliance packet generation
- Architecture diagram auto-generation

## Next Steps

1. **Complete GitHub repository setup**
   - Initialize git repository
   - Create .gitignore file
   - Create GitHub remote repository
   - Push initial commit

2. **Implement GitHub Bridge service**
   - Set up package.json and dependencies
   - Implement all source files
   - Create .env.example template
   - Test endpoints with sample GitHub repo

3. **Design database schema**
   - Define Prisma schema for core entities
   - Set up migrations
   - Create seed data for testing

4. **Build Request intake wizard**
   - Design 10-12 question adaptive form
   - Implement form validation
   - Create intake data storage

5. **Develop Translation layer**
   - Scope contract generation logic
   - Task breakdown algorithm
   - Dependency detection
   - Timeline estimation engine

---

This document is updated automatically as project development progresses.
