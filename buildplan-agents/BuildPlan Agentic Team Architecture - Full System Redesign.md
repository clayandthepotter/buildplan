# BuildPlan Agentic Team Architecture
## Transforming BuildPlan into a Real Development Team
# Executive Summary
Transform BuildPlan from a chatbot system into a fully operational agentic development team where:
* PM acts as real project manager (orchestrator, conversational, progress tracking)
* Each agent has role-specific tools and permissions
* CI/CD workflow enforces quality through QA gate
* GitHub is single source of truth (main branch protected)
* All work happens through feature branches → PRs → QA review → merge
* Team communicates like real humans in Telegram
# System Architecture Overview
## Team Hierarchy
```warp-runnable-command
You (Product Owner)
  ↓ Requirements & Approvals
PM Agent (Orchestrator)
  ↓ Task Delegation
├─ Technical Architect Agent
├─ Backend Agent
├─ Frontend Agent  
├─ DevOps Agent
├─ QA Agent (Gatekeeper)
└─ Docs Agent
  ↓ Pull Requests
GitHub (main branch - protected)
  ↓ Deployment
Production
```
## Core Principles
1. **PM is Conductor, Not Orchestra** - PM orchestrates, agents execute
2. **GitHub as Source of Truth** - All code changes go through PRs
3. **QA is Gatekeeper** - Nothing merges without QA approval
4. **Conversational Team** - Chat with agents like real employees
5. **Autonomous Execution** - Agents work independently with full tooling
6. **Transparent Collaboration** - All communication visible in Telegram
# Agent Roles, Responsibilities & Tools
## PM Agent (Project Manager)
### Role
Orchestrates the entire development process. Acts as the interface between you and the team.
### Responsibilities
* Parse TODO.md and create executable task files
* Assign tasks to appropriate agents based on skill/availability
* Monitor task progress and agent status
* Provide conversational progress reports
* Escalate blockers and decisions to you
* Conduct daily standups
* Maintain project timeline
* Coordinate dependencies between agents
### Tools & Permissions
* **File Operations**: Read/write to tasks/ directory
* **Task Management**: Create, update, move task files
* **Team Communication**: Send to Telegram, @mention agents
* **Git**: Read-only access to understand project state
* **Agent Management**: Query agent status, assign work
* **OpenAI API**: Generate responses, analyze project state
* **Database**: Read-only access to track metrics
### Capabilities
* Create task files from TODO.md specifications
* Assign tasks based on agent specialty and workload
* Track task status (pending → in-progress → review → done → blocked)
* Generate progress reports on demand
* Escalate blockers with context and options
* Answer questions about project state
### Example Interactions
```warp-runnable-command
You: "What's our progress?"
PM: "Phase 1 is 60% complete:
     ✅ Task 1.1: Monorepo setup (DevOps)
     ✅ Task 1.2: Docker config (DevOps)
     🔄 Task 1.3: Prisma schema (Architect + DevOps, ETA 2h)
     ⏳ Task 1.4: RLS policies (waiting on 1.3)
     
     Blocker: Need decision on authentication provider.
     Options: A) Supabase Auth, B) Clerk
     Recommend: A (fewer dependencies)"
```
## Technical Architect Agent
### Role
Designs system architecture, API contracts, database schemas, and technical specifications.
### Responsibilities
* Design API contracts for all endpoints
* Create database schemas (Prisma models)
* Design UI wireframes and component structure
* Define data flow and dependencies
* Make architectural decisions
* Review PRs for architectural consistency
### Tools & Permissions
* **File Operations**: Read/write to docs/, schema files
* **Git**: Create feature branches, commit, push, create PRs
* **OpenAI API**: Generate designs, schemas, diagrams
* **Database**: Design schemas, no data access
* **Diagram Tools**: Mermaid for architecture diagrams
* **Documentation**: Write to docs/ folder
### Capabilities
* Generate Prisma schemas from requirements
* Create API contract documentation
* Design database relationships and indexes
* Create Mermaid diagrams for system architecture
* Review other agents' PRs for design adherence
### Deliverables
* API contracts (docs/API_CONTRACTS.md)
* Database schemas (prisma/schema.prisma)
* Architecture diagrams (docs/ARCHITECTURE.md)
* Data flow documentation (docs/DATA_FLOW.md)
## Backend Agent
### Role
Implements APIs, business logic, database queries, and server-side functionality.
### Responsibilities  
* Implement Express.js API endpoints
* Write Prisma queries
* Implement business logic
* Write unit tests for all endpoints
* Handle error cases
* Integrate with external services
### Tools & Permissions
* **File Operations**: Read/write to packages/api/
* **Git**: Full git operations (branch, commit, push, PR)
* **OpenAI API**: Code generation and debugging
* **Database**: Full CRUD access via Prisma
* **Testing**: Run unit tests (Jest/Mocha)
* **NPM**: Install packages
* **Linting**: ESLint, Prettier
* **Environment**: Access to .env variables
### Capabilities
* Generate Express route handlers
* Write Prisma queries with proper error handling
* Generate unit tests (>80% coverage required)
* Debug failing tests
* Optimize database queries
* Integrate third-party APIs
### Deliverables
* API route files (packages/api/src/routes/)
* Service layer files (packages/api/src/services/)
* Unit test files (packages/api/src/**tests**/)
* Updated API documentation
## Frontend Agent
### Role
Builds UI components, pages, and client-side functionality.
### Responsibilities
* Implement Next.js pages and components
* Connect UI to backend APIs
* Implement form validation
* Handle client-side state management
* Ensure responsive design
* Write component tests
### Tools & Permissions
* **File Operations**: Read/write to packages/web/
* **Git**: Full git operations
* **OpenAI API**: Code generation
* **NPM**: Install packages
* **Testing**: Run component tests (Jest, React Testing Library)
* **Linting**: ESLint, Prettier
* **Build Tools**: Next.js build commands
### Capabilities
* Generate React/Next.js components
* Implement form validation (Zod)
* Connect to backend APIs
* Write component tests
* Optimize bundle size
* Ensure accessibility (WCAG)
### Deliverables
* Page components (packages/web/src/app/)
* Reusable UI components (packages/web/src/components/)
* API client code (packages/web/src/lib/api/)
* Component tests (packages/web/src/**tests**/)
## DevOps Agent
### Role
Manages infrastructure, databases, deployments, and CI/CD pipelines.
### Responsibilities
* Set up Docker configurations
* Manage database migrations
* Implement RLS policies
* Configure CI/CD pipelines
* Monitor application health
* Manage environment variables
### Tools & Permissions
* **File Operations**: Read/write to infrastructure files
* **Git**: Full git operations
* **Database**: Full admin access (migrations, RLS)
* **Docker**: Build and run containers
* **Prisma**: Run migrations
* **SQL**: Execute raw SQL for RLS policies
* **GitHub Actions**: Configure workflows
* **Deployment**: Deploy to staging/production
### Capabilities
* Create Docker Compose configurations
* Write Prisma migrations
* Implement PostgreSQL RLS policies
* Configure GitHub Actions workflows
* Set up monitoring and logging
* Manage secrets and environment variables
### Deliverables
* Docker files (Dockerfile, docker-compose.yml)
* Database migrations (prisma/migrations/)
* RLS policies (prisma/rls-policies.sql)
* CI/CD workflows (.github/workflows/)
* Deployment scripts (scripts/deploy/)
## QA Agent (Gatekeeper)
### Role
Tests everything, reviews PRs, ensures quality, and controls what merges to main.
### Responsibilities
* Review all pull requests
* Run automated test suites
* Perform manual testing
* Verify security (RLS, auth, input validation)
* Check code quality and standards
* Approve or reject PRs
* Report bugs and regressions
### Tools & Permissions
* **File Operations**: Read-only to all code
* **Git**: Read, comment on PRs, merge (ONLY agent with merge permission)
* **Testing**: Run all test suites
* **Database**: Read-only access for test verification
* **GitHub API**: Comment on PRs, approve, merge, close
* **Deployment**: Access to staging environment
* **Security Tools**: Run security scans
### Capabilities
* Run automated test suites (unit, integration, e2e)
* Perform security audits
* Verify RLS policies work correctly
* Test authentication flows
* Check accessibility compliance
* Verify responsive design
* Load test endpoints
### PR Review Process
1. Agent creates PR
2. QA Agent automatically triggered
3. Runs automated tests
4. Performs security checks  
5. Manual testing if needed
6. Comments with findings
7. Approves (merge) or Rejects (request changes)
### Deliverables
* PR review comments
* Test reports
* Bug reports (as GitHub issues)
* Security audit reports
## Docs Agent
### Role
Maintains all project documentation, API docs, user guides, and changelog.
### Responsibilities
* Update API documentation
* Maintain CHANGELOG.md
* Write user guides
* Document deployment procedures
* Keep README current
* Generate API reference docs
### Tools & Permissions
* **File Operations**: Read/write to docs/, README.md, CHANGELOG.md
* **Git**: Full git operations
* **OpenAI API**: Generate documentation
* **Code Reading**: Read all code to understand features
### Capabilities
* Generate API documentation from code
* Write clear user guides
* Maintain changelog with semantic versioning
* Create architecture diagrams
* Document deployment procedures
### Deliverables
* API documentation (docs/API.md)
* Changelog (CHANGELOG.md)
* User guides (docs/guides/)
* README updates
* Architecture documentation
# CI/CD Workflow
## Branch Strategy
```warp-runnable-command
main (protected)
  ↑ merge via PR + QA approval only
feature/TASK-ID-description
  ↑ agent work happens here
```
## Development Workflow
### 1. Task Assignment
```warp-runnable-command
PM creates task file → Assigns to agent → Agent receives notification
```
### 2. Agent Work Cycle
```python
# Agent workflow
1. Receive task assignment from PM
2. Create feature branch: feature/TASK-{id}-{description}
3. Implement solution:
   - Generate code
   - Write tests  
   - Update docs
   - Commit frequently with clear messages
4. Run local tests
5. Create Pull Request
6. Announce in Telegram: "PR ready for review"
7. Wait for QA review
8. If changes requested: fix and push
9. If approved: QA merges to main
10. Announce completion
```
### 3. QA Review Process
```python
# QA Agent workflow  
1. Notified of new PR
2. Checkout PR branch
3. Run automated tests:
   - Unit tests
   - Integration tests
   - Linting
   - Type checking
   - Security scan
4. Manual verification:
   - Test functionality
   - Verify RLS (if applicable)
   - Check error handling
   - Verify logging
5. Review code quality:
   - Follows conventions
   - Proper error handling
   - Test coverage >80%
   - Documentation updated
6. Comment findings in PR
7. Decision:
   - ✅ Approve & Merge → main
   - ❌ Request Changes → notify agent
   - 🚫 Close (critical issues)
8. If merged:
   - Notify team
   - Update task status
   - Trigger deployment
```
### 4. Merge to Main
```warp-runnable-command
- Only QA Agent can merge
- Requires: All tests passing
- Requires: QA approval
- Triggers: GitHub Actions
  - Run full test suite
  - Build production bundle
  - Deploy to staging
  - Notify team
```
## GitHub Actions Workflows
### PR Checks (Automatic)
```yaml
on: pull_request
jobs:
  - Lint code
  - Type check
  - Run unit tests  
  - Run integration tests
  - Check test coverage (min 80%)
  - Security scan
  - Build check
```
### Main Branch (After Merge)
```yaml
on: push to main
jobs:
  - Run full test suite
  - Build production
  - Deploy to staging
  - Run smoke tests
  - Notify team
```
# PM Orchestration System
## Task Creation Process
### Input: TODO.md
PM reads TODO.md and extracts task specifications.
### Processing
```js
// PM logic
function createTasksFromTODO(phase) {
  // 1. Parse TODO.md
  const tasks = parseTODO(phase);
  
  // 2. For each task:
  tasks.forEach(task => {
    // Create task file
    const taskFile = createTaskFile({
      id: generateTaskID(),
      title: task.title,
      description: task.description,
      assignee: determineAssignee(task.type),
      priority: task.priority,
      dependencies: task.dependencies,
      acceptanceCriteria: task.deliverables
    });
    
    // Assign to agent
    assignToAgent(taskFile, taskFile.assignee);
    
    // Notify team
    teamComms.announce(
      'PM-Agent',
      `Created ${taskFile.id}: ${taskFile.title}`,
      taskFile.id
    );
  });
}
```
### Output: Task Files
```markdown
---
id: TASK-1-3-01
title: Define Complete Prisma Schema
type: architecture
assigned_to: Architect-Agent
priority: critical
complexity: very-high
estimated_hours: 16
dependencies: [TASK-0-4]
status: pending
created: 2026-02-04T15:00:00Z
---
# Task: Define Complete Prisma Schema
## Description
Create comprehensive Prisma schema for all data models...
## Deliverables
- [ ] All models defined with complete fields
- [ ] Relationships configured
- [ ] Indexes on foreign keys
- [ ] Enums for status fields
## Acceptance Criteria
- Schema validates with `prisma validate`
- All relationships properly defined
- Indexes on all foreign keys
- Documentation comments on all models
## Progress Log
- [2026-02-04T15:00:00Z] PM-Agent: Task created
```
## Task Assignment Logic
```js
function determineAssignee(taskType) {
  const agentMap = {
    'architecture': 'Architect-Agent',
    'design': 'Architect-Agent',
    'api': 'Backend-Agent',
    'backend': 'Backend-Agent',
    'frontend': 'Frontend-Agent',
    'ui': 'Frontend-Agent',
    'devops': 'DevOps-Agent',
    'infrastructure': 'DevOps-Agent',
    'database': 'DevOps-Agent',
    'testing': 'QA-Agent',
    'documentation': 'Docs-Agent'
  };
  
  const agent = agentMap[taskType];
  
  // Check availability
  if (!agent.isAvailable()) {
    // Find alternative or queue
    return queueTask();
  }
  
  return agent;
}
```
## Progress Tracking
```js
class PMAgent {
  async getProgressReport() {
    const tasks = await this.getAllTasks();
    
    const report = {
      overall: calculateProgress(tasks),
      byPhase: groupByPhase(tasks),
      byAgent: groupByAgent(tasks),
      blockers: tasks.filter(t => t.status === 'blocked'),
      critical: tasks.filter(t => t.priority === 'critical')
    };
    
    return formatConversationalReport(report);
  }
  
  async handleUserQuery(query) {
    // Use AI to understand query intent
    const intent = await analyzeIntent(query);
    
    switch(intent.type) {
      case 'progress':
        return this.getProgressReport();
      case 'blocker':
        return this.getBlockerReport();
      case 'agent_status':
        return this.getAgentStatus();
      case 'decision':
        return this.escalateDecision(intent.context);
      default:
        return this.conversationalResponse(query);
    }
  }
}
```
# Implementation Phases
## Phase A: PM Orchestrator (Week 1)
### A.1: Task Creation System
**Duration**: 2 days
**Files**:
* buildplan-agents/src/services/taskManager.js
* buildplan-agents/src/agents/pm-agent.js (enhance)
**Deliverables**:
* Parse TODO.md into task specifications
* Create task files from specifications
* Task file template system
* Task dependency resolver
### A.2: Task Assignment System  
**Duration**: 1 day
**Files**:
* buildplan-agents/src/services/taskAssignment.js
**Deliverables**:
* Agent specialty mapping
* Workload balancing
* Assignment notification system
* Task queue management
### A.3: Progress Tracking
**Duration**: 2 days
**Files**:
* buildplan-agents/src/services/progressTracker.js
* buildplan-agents/src/agents/pm-agent.js (enhance)
**Deliverables**:
* Track task status changes
* Calculate completion percentages
* Identify blockers automatically
* Generate progress reports
### A.4: Conversational Interface
**Duration**: 2 days  
**Files**:
* buildplan-agents/src/agents/pm-agent.js (enhance)
**Deliverables**:
* Intent classification for user queries
* Contextual responses
* Progress report generation
* Decision escalation system
## Phase B: Agent Tool System (Week 2)
### B.1: File Operations Service
**Duration**: 1 day
**Files**:
* buildplan-agents/src/services/fileOps.js (enhance)
* buildplan-agents/src/services/permissions.js (new)
**Deliverables**:
* Permission system per agent
* Safe file read/write operations
* Path validation
* Audit logging
### B.2: Git Operations Service
**Duration**: 2 days
**Files**:
* buildplan-agents/src/services/gitOps.js (new)
**Deliverables**:
* Branch creation/management
* Commit operations
* Push to GitHub
* PR creation via GitHub API
* Branch cleanup
### B.3: Database Access Service
**Duration**: 1 day
**Files**:
* buildplan-agents/src/services/dbAccess.js (new)
**Deliverables**:
* Prisma client wrapper
* Permission-based access control
* Query execution with RLS context
* Migration execution
### B.4: Testing Service
**Duration**: 2 days
**Files**:
* buildplan-agents/src/services/testRunner.js (new)
**Deliverables**:
* Run unit tests
* Run integration tests
* Parse test results
* Coverage reporting
* Test failure analysis
## Phase C: CI/CD Workflow (Week 2-3)
### C.1: GitHub Actions Setup
**Duration**: 2 days
**Files**:
* .github/workflows/pr-checks.yml (new)
* .github/workflows/main-deploy.yml (new)
**Deliverables**:
* PR check workflow (lint, test, build)
* Main branch deployment workflow  
* Slack/Telegram notifications
* Status badges
### C.2: Branch Protection
**Duration**: 1 day
**Files**:
* GitHub settings (configured via API)
**Deliverables**:
* Protect main branch
* Require PR reviews
* Require status checks
* Require linear history
### C.3: PR Workflow Integration
**Duration**: 2 days
**Files**:
* buildplan-agents/src/services/prWorkflow.js (new)
* buildplan-agents/src/agents/base-agent.js (enhance)
**Deliverables**:
* Agent PR creation
* PR status monitoring
* PR comment handling
* Merge conflict detection
## Phase D: QA Gatekeeper (Week 3)
### D.1: QA Agent Core
**Duration**: 2 days
**Files**:
* buildplan-agents/src/agents/qa-agent.js (new)
**Deliverables**:
* PR review automation
* Test execution
* Code quality checks
* Security scanning
### D.2: Review Decision Logic
**Duration**: 2 days
**Files**:
* buildplan-agents/src/agents/qa-agent.js (enhance)
* buildplan-agents/src/services/reviewCriteria.js (new)
**Deliverables**:
* Approval criteria
* Rejection criteria
* Comment generation
* Merge execution
### D.3: Security Checks
**Duration**: 1 day
**Files**:
* buildplan-agents/src/services/securityScan.js (new)
**Deliverables**:
* RLS verification
* Auth flow testing
* Input validation checks
* Secrets detection
## Phase E: Agent Enhancements (Week 4)
### E.1: Agent Work Protocol
**Duration**: 3 days
**Files**:
* buildplan-agents/src/agents/backend-agent.js (enhance)
* buildplan-agents/src/agents/architect-agent.js (enhance)
* buildplan-agents/src/agents/devops-agent.js (new)
* buildplan-agents/src/agents/frontend-agent.js (new)
* buildplan-agents/src/agents/docs-agent.js (new)
**Deliverables**:
* Task execution workflow
* Branch creation
* Code generation
* Test writing
* PR creation
* Progress updates
### E.2: Agent Collaboration
**Duration**: 2 days
**Files**:
* buildplan-agents/src/services/agentCollaboration.js (new)
**Deliverables**:
* Agent-to-agent communication
* Dependency coordination
* Handoff protocols
* Blocker escalation
# Testing Strategy
## Unit Tests
* Test each service in isolation
* Mock external dependencies
* 80%+ coverage required
## Integration Tests
* Test PM → Agent workflow
* Test Agent → GitHub workflow
* Test QA review process
* Test team communication
## End-to-End Tests
```js
describe('Full Task Lifecycle', () => {
  it('should complete Phase 1 Task 1.1', async () => {
    // 1. PM creates task from TODO.md
    const task = await pm.createTask('1.1');
    
    // 2. PM assigns to DevOps  
    await pm.assignTask(task, 'DevOps-Agent');
    
    // 3. DevOps creates branch
    await devops.createBranch(task.id);
    
    // 4. DevOps implements solution
    await devops.executeTask(task);
    
    // 5. DevOps creates PR
    const pr = await devops.createPR(task);
    
    // 6. QA reviews PR
    const review = await qa.reviewPR(pr);
    
    // 7. QA approves and merges
    expect(review.approved).toBe(true);
    await qa.mergePR(pr);
    
    // 8. Verify main branch updated
    const mainBranch = await git.getBranch('main');
    expect(mainBranch.commits).toContain(pr.commitSha);
  });
});
```
# Success Metrics
## Team Performance
* **Task Completion Rate**: >80% tasks complete within estimates
* **PR Approval Rate**: >90% PRs approved on first review
* **Blocker Resolution**: <4 hours average blocker resolution
* **Code Quality**: >80% test coverage, 0 critical security issues
## PM Effectiveness
* **Response Time**: <1 minute to user queries
* **Assignment Accuracy**: >95% tasks assigned to correct agent
* **Progress Accuracy**: Daily reports match actual state
## CI/CD Health
* **Build Success Rate**: >95% builds pass
* **Deployment Frequency**: Multiple deploys per day
* **Mean Time to Recovery**: <30 minutes
# Risks & Mitigation
## Risk: Agents conflict on same files
**Mitigation**: Task dependency system prevents parallel work on same files
## Risk: QA becomes bottleneck
**Mitigation**: Automated checks reduce manual review time, priority queue for critical PRs
## Risk: Merge conflicts
**Mitigation**: Frequent main branch syncs, small PRs, clear file ownership
## Risk: Agent goes off-track
**Mitigation**: Progress checkpoints, PM monitoring, auto-escalation after 2x estimated time
# Next Steps
## Immediate Actions
1. **Review & Approve Plan**: You review this plan, provide feedback
2. **Prioritize Phases**: Decide implementation order
3. **Resource Allocation**: Confirm timeline acceptable
4. **Begin Implementation**: Start with Phase A (PM Orchestrator)
## Questions for You
1. Do you want to implement all phases, or start with core functionality?
2. Any specific tools/frameworks you want agents to use?
3. What's your tolerance for agent autonomy (how much should they decide vs. ask)?
4. Should agents have budget limits (API calls, compute time)?
5. Any security/compliance requirements we should bake in from start?
