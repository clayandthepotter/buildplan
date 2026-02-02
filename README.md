# BuildPlan

**Turn vague requests into delivered outcomes automatically** — with simple language for stakeholders and precise execution for builders.

## Overview

BuildPlan is an all-in-one DevOps and Project Management automation platform that eliminates the tedious overhead of managing software development projects. It automatically translates stakeholder requests into execution plans, assigns work to the appropriate team members (human or AI), manages dependencies and timelines, and keeps documentation up-to-date throughout the project lifecycle.

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

- **Backend**: Node.js/TypeScript
- **API**: REST with comprehensive OpenAPI documentation
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js (planned)
- **Integration**: GitHub Apps API
- **AI Orchestration**: Custom agent framework with structured outputs

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

## Security & Compliance

- Branch protections enforced (no direct commits to main)
- All agent actions logged with full audit trail
- Human approval required for sensitive operations
- Role-based access control
- Secrets managed securely via environment variables

## Roadmap

### MVP (V1)
- [x] Project specification and architecture
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
