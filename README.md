# BuildPlan

**Turn vague requests into delivered outcomes automatically** — with simple language for stakeholders and precise execution for builders.

## Overview

BuildPlan is a **multi-tenant SaaS platform** designed to scale to tens of thousands of users across thousands of organizations. It's an all-in-one DevOps and Project Management automation platform that eliminates the tedious overhead of managing software development projects. It automatically translates stakeholder requests into execution plans, assigns work to the appropriate team members (human or AI), manages dependencies and timelines, and keeps documentation up-to-date throughout the project lifecycle.

### Scale & Architecture
- **Multi-tenant**: Supports thousands of unique organizations/workspaces/companies
- **Scalable**: Designed to handle 10,000+ concurrent users
- **Isolated**: Complete data isolation between organizations
- **Enterprise-ready**: Built for security, compliance, and reliability at scale

## The Problem

Traditional software development suffers from:
- Vague project requests lacking sufficient detail
- Communication breakdowns and mismatched expectations
- Time-consuming manual project management tasks
- Constant status update meetings
- Documentation that drifts out of sync with reality
- Requiring 20+ different software subscriptions to accomplish project management

## The Solution

BuildPlan provides a seamless, autopilot experience:

1. **Simple Intake**: Stakeholder fills out a simple request form (in plain language)
2. **Automatic Planning**: Software translates the request, builds execution plan, assigns tasks, sets priorities and timelines
3. **Automatic Execution**: Workers (human or AI agents) execute assigned tasks
4. **Smart Notifications**: Stakeholders receive updates only on critical progress markers
5. **Living Documentation**: Docs are automatically generated and kept current with project changes

## Core Product Principles

1. **Dad-proof language** — Only three user-facing nouns: Request, Plan, Proof
2. **Autopilot by default** — System behaves like a "project manager that never sleeps"
3. **Human override allowed, never required** — Manual intervention for emergencies, not daily operations
4. **Clarity gates prevent chaos** — System won't start building without required information
5. **Agents are first-class workers** — Built-in AI agents handle PM/lead/dev/QA roles out-of-the-box

## Key Features

### Automated Workflow Management
- **Smart Intake Forms**: Dad-proof questionnaire that extracts critical project details
- **Automatic Task Generation**: Breaks projects into milestones and tasks with proper dependencies
- **Intelligent Assignment**: Routes work to appropriate workers based on role and capacity
- **Timeline Management**: Auto-schedules work respecting working hours, WIP limits, and existing commitments
- **Blocking Detection**: Automatically identifies and surfaces blockers

### Built-in AI Agent Workforce
- **Manager Agent**: Generates scope contracts, plans, tasks, and manages blockers
- **Builder Agents**: Backend, Frontend, QA specialists that produce implementation artifacts
- **Documentation Agent**: Creates and maintains Overview, User Guides, SOPs, Runbooks, Release Notes
- **API Doc Agent**: Generates and maintains OpenAPI specs and endpoint documentation

### Living Documentation System
- Automatically generates documentation from source-grounded data
- Detects when docs become stale and triggers updates
- Supports multiple doc types: Guides, Procedures, References, Updates
- Documentation stays in sync with code changes via GitHub integration

### GitHub Integration
- Agents create branches and PRs automatically
- Code changes, tests, and docs committed together
- Safe PR-based workflow prevents direct-to-main chaos
- Full audit trail of all changes

## User Roles

- **Stakeholder**: Submits Requests, approves Plans, receives notifications
- **Admin**: Assigns roles, configures settings, handles overrides
- **Worker (Human)**: Executes tasks, marks complete, provides evidence
- **Agent (AI)**: Executes role-specific functions automatically

## System Workflow

### Four Simple Milestones (User-facing)
1. **Clarify** - Define scope and requirements
2. **Build** - Implement the solution
3. **Check** - Verify and test
4. **Release** - Deploy and confirm

### Twelve Internal Stages (Behind the scenes)
1. Intake and triage
2. Discovery and definition
3. Solution design and technical approach
4. UX/UI design
5. Planning and breakdown
6. Implementation
7. Code review and merge
8. QA and verification
9. Staging/UAT
10. Release and deployment
11. Post-release monitoring
12. Closeout and iteration

## Technology Stack

- **Backend**: Node.js/TypeScript with horizontally scalable microservices
- **API**: REST with comprehensive OpenAPI documentation
- **Database**: PostgreSQL with Prisma ORM (tenant isolation via row-level security)
- **Caching**: Redis for session management and real-time features
- **Message Queue**: Bull/BullMQ for background job processing
- **Frontend**: Next.js with server-side rendering
- **Integration**: GitHub Apps API (per-tenant installations)
- **AI Orchestration**: Custom agent framework with structured outputs
- **Infrastructure**: Containerized deployment (Docker/Kubernetes ready)
- **Observability**: Structured logging, metrics, and distributed tracing

## Project Structure

```
buildplan/
├── README.md              # This file
├── WARP.md                # Project development log
├── TODO.md                # Task tracking
├── docs/                  # Additional documentation
├── github-bridge/         # GitHub integration service
│   ├── src/
│   │   ├── index.ts       # Main server
│   │   ├── github.ts      # GitHub API operations
│   │   ├── patch.ts       # Diff/patch utilities
│   │   ├── validators.ts  # Request validation
│   │   └── types.ts       # TypeScript definitions
│   ├── package.json
│   └── tsconfig.json
└── [Additional modules TBD]
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- GitHub account with access to create GitHub Apps
- PostgreSQL database (for core app)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/[username]/buildplan.git
cd buildplan
```

2. Set up GitHub Bridge service:
```bash
cd github-bridge
npm install
cp .env.example .env
# Edit .env with your GitHub App credentials
npm run dev
```

3. [Core application setup instructions TBD]

## Configuration

### GitHub App Setup
1. Create a GitHub App in your organization/account
2. Set required permissions: Contents (Read/Write), Pull Requests (Read/Write), Metadata (Read)
3. Generate and download private key
4. Install the app on target repositories
5. Add credentials to `.env` file

### Agent Configuration
Agents come pre-configured with sensible defaults. Admins can:
- Customize agent system prompts
- Set agent permissions (suggest-only vs autopilot)
- Define role mappings
- Configure approval requirements

## Documentation Philosophy

All documentation in BuildPlan is:
- **Source-grounded**: Generated only from real data (requests, tasks, artifacts, events)
- **Living**: Automatically updated when sources change
- **Versioned**: Changes tracked with full audit trail
- **Accessible**: Written in plain language for non-technical stakeholders

## Multi-Tenant Architecture

### Organization Management
- **Workspace Isolation**: Complete data separation between organizations
- **Multi-org Users**: Users can belong to multiple organizations
- **Role-Based Access**: Fine-grained permissions per organization
- **Team Management**: Invite members, assign roles, manage access

### Subscription Tiers

#### Free Tier
- 1 workspace
- 5 team members
- 10 requests per month
- Community support
- Core agents included

#### Pro Tier
- Unlimited workspaces
- 50 team members
- 500 requests per month
- Email support
- All agents + advanced features
- Priority queue processing

#### Enterprise Tier
- Unlimited team members
- Unlimited requests
- 99.9% SLA guarantee
- Dedicated support + CSM
- SSO (SAML/OAuth)
- Advanced security features
- Custom integrations
- Dedicated infrastructure option

### Usage & Quotas
- **Soft Limits**: Grace period before enforcement
- **Usage Dashboard**: Real-time consumption metrics
- **Automatic Notifications**: Alerts at 75%, 90%, 100% usage
- **Easy Upgrades**: One-click tier changes

## Security & Compliance

### Data Security
- **Tenant Isolation**: Row-level security (RLS) in PostgreSQL
- **Encryption**: Data encrypted at rest and in transit (TLS 1.3)
- **Secrets Management**: Vault/AWS Secrets Manager for sensitive data
- **Branch Protections**: No direct commits to main
- **Audit Trail**: Immutable logs of all actions per organization

### Access Control
- **Multi-factor Authentication**: Optional 2FA for all users
- **Role-Based Access Control**: Granular permissions system
- **SSO Support**: SAML and OAuth for enterprise customers
- **Session Management**: Secure JWT-based authentication
- **API Keys**: Scoped API tokens for programmatic access

### Compliance
- **GDPR Ready**: Data export, deletion, and consent management
- **SOC 2 Type II**: Security controls and audit readiness
- **Data Residency**: Support for region-specific deployments
- **Retention Policies**: Configurable per-tenant data retention
- **Audit Logging**: Complete trail for compliance reporting

## Roadmap

### Implementation Build Plan

A comprehensive 16-week implementation plan has been created with 7 phases:

1. **Phase 1: Foundation & Infrastructure** (Weeks 1-3)
2. **Phase 2: Authentication & Organization Management** (Weeks 4-5)
3. **Phase 3: Request Intake & Translation Layer** (Weeks 6-8)
4. **Phase 4: Workflow Engine & Agent Framework** (Weeks 9-11)
5. **Phase 5: GitHub Integration** (Week 12)
6. **Phase 6: Frontend & User Experience** (Weeks 13-15)
7. **Phase 7: Polish & MVP Launch** (Week 16)

📋 **[View Complete Build Plan](https://github.com/clayandthepotter/buildplan/tree/main#plans)** in the Warp Plans section.

### MVP (V1) - Target: 16 Weeks
- [x] Project specification and architecture
- [x] Multi-tenant architecture design
- [x] Auto-documentation pipeline
- [ ] Request intake wizard
- [ ] Translation layer (scope contract generation)
- [ ] Built-in workflow engine
- [ ] Agent team (Manager, Builder, QA, Docs, API)
- [ ] GitHub Bridge service
- [ ] Basic notification system
- [ ] Documentation engine

### V2 (Future)
- [ ] Built-in Git + web IDE
- [ ] Full CI/CD pipelines
- [ ] Advanced analytics dashboards
- [ ] Architecture diagram generation
- [ ] Multi-org enterprise SSO
- [ ] Compliance packet generator (SOC2)

## Contributing

[Contribution guidelines TBD]

## License

[License TBD]

## Support

[Support information TBD]

---

**BuildPlan** - Because stakeholders deserve simple language, and engineers deserve precise execution.
