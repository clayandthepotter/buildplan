# BuildPlan - Route-by-Route Implementation Plan

**Philosophy**: Build like a house - foundation first, then tackle each room systematically.  
**Approach**: UI-first development - see what users need, then build backend to support it.  
**Organization**: Group work by route/page, complete each fully before moving to next.

---

## 🏗️ Building Analogy

```
House Construction               Software Development
├─ Foundation (exact shape)  →  Route architecture + API contracts
├─ Frame (supporting members) →  Authentication + Database + Caching
├─ Utilities (plumbing/electric) → Core services + Queue system
├─ Close up (walls/roof)     →  API endpoints + Business logic
└─ Rooms (one by one)         →  Pages/Routes (UI → API → Logic)
```

---

## Phase 0: Foundation - Routing Architecture

**Duration**: Week 1  
**Goal**: Define ALL routes, API contracts, and data flows before building anything

### Application Routing Structure

```
BuildPlan Application Routes
├─ Public Routes (no auth)
│  ├─ / (landing page)
│  ├─ /login
│  ├─ /register
│  ├─ /forgot-password
│  └─ /reset-password/:token
│
├─ App Routes (authenticated)
│  ├─ /dashboard (default after login)
│  ├─ /requests
│  │  ├─ /requests (list/roadmap view)
│  │  ├─ /requests/new (intake wizard)
│  │  └─ /requests/:id (detail view)
│  │     ├─ Overview tab
│  │     ├─ Plan tab
│  │     ├─ Tasks tab
│  │     ├─ Docs tab
│  │     └─ Activity tab
│  ├─ /my-work (tasks assigned to user)
│  ├─ /settings
│  │  ├─ /settings/organization
│  │  ├─ /settings/members
│  │  ├─ /settings/agents
│  │  ├─ /settings/integrations
│  │  └─ /settings/profile
│  └─ /admin
│     ├─ /admin/organizations (list all orgs - super admin)
│     └─ /admin/usage (usage analytics)
│
└─ API Routes
   ├─ /api/auth/*
   ├─ /api/organizations/*
   ├─ /api/requests/*
   ├─ /api/plans/*
   ├─ /api/tasks/*
   ├─ /api/agents/*
   ├─ /api/docs/*
   └─ /api/github/*
```

### Tasks for Phase 0

1. **Create routing map document** (this file)
2. **Define API contract for each route**
   - Request/response schemas
   - Query parameters
   - Authorization requirements
3. **Create Figma/wireframes for each page**
   - Mobile + desktop mockups
   - User flows between pages
4. **Document data requirements per route**
   - What database queries needed
   - What caching strategy
   - Real-time vs static data

**Deliverable**: Complete routing architecture doc + wireframes + API contracts

---

## Phase 1: Foundation & Frame (Weeks 2-3)

**Goal**: Set up infrastructure exactly sized for our routes

### Week 2: Foundation

#### Infrastructure Setup
```
✓ Monorepo structure
  ├─ packages/api      (Express + Prisma)
  ├─ packages/web      (Next.js)
  └─ packages/shared   (Types + utilities)

✓ Docker Compose
  ├─ PostgreSQL
  ├─ Redis
  └─ API service

✓ Database schema
  └─ Prisma models for ALL entities (based on route requirements)
```

#### Database Schema (complete, based on routes)
```prisma
// Core multi-tenant
model Organization { }
model User { }
model OrganizationMember { }
model Subscription { }
model Usage { }

// Request workflow
model Request { }
model Plan { }
model Milestone { }
model Task { }
model TaskDependency { }
model ProofItem { }

// Agent system
model AgentRun { }
model AgentPrompt { }

// Documentation
model Doc { }
model DocSection { }

// Audit & notifications
model AuditLog { }
model Notification { }
```

**Tasks**:
1. Complete Prisma schema with all fields
2. Row-Level Security (RLS) policies on all tenant tables
3. Seed script with realistic test data
4. Migration files

**Deliverable**: Working database with test data

---

### Week 3: Frame & Utilities

#### Authentication System
```typescript
// All auth endpoints working
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/switch-org
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

#### Core Middleware
- JWT authentication
- Organization context
- RBAC permissions
- Request validation (Zod)
- Error handling
- Request logging

#### Redis & Queue Setup
- Session storage
- Cache utilities
- Bull queue for agents
- Queue monitoring

**Tasks**:
1. Implement all auth endpoints
2. Set up middleware stack
3. Configure Redis + Bull
4. Create API error responses

**Deliverable**: Complete auth system + middleware

---

## Phase 2: Public Routes (Week 4)

**Approach**: Build UI first, connect to API, ensure works completely

### Route 1: Landing Page `/`

**UI First**:
```jsx
Components needed:
├─ Hero section
├─ Features grid
├─ Pricing table
├─ FAQ accordion
└─ CTA buttons → /register
```

**API**: None (static page)

**Tasks**:
1. Design + build landing page UI
2. Make responsive (mobile/tablet/desktop)
3. Add animations/transitions
4. Test all CTA links

**Completion criteria**: Landing page looks great, all links work

---

### Route 2: Login `/login`

**UI First**:
```jsx
<LoginPage>
  <EmailInput />
  <PasswordInput />
  <RememberMe />
  <LoginButton />
  <ForgotPasswordLink />
  <RegisterLink />
  <OrganizationSwitcher /> // if multiple orgs
</LoginPage>
```

**API Needed**:
```typescript
POST /api/auth/login
  Request: { email, password }
  Response: { token, user, organizations[] }
```

**Tasks**:
1. Build login UI with form validation
2. Implement API endpoint
3. JWT token generation
4. Session management
5. Redirect to /dashboard on success
6. Error handling for wrong credentials

**Completion criteria**: Can log in, token stored, redirected properly

---

### Route 3: Register `/register`

**UI First**:
```jsx
<RegisterPage>
  <NameInput />
  <EmailInput />
  <PasswordInput />
  <PasswordConfirmInput />
  <OrganizationNameInput />
  <TermsCheckbox />
  <RegisterButton />
  <LoginLink />
</RegisterPage>
```

**API Needed**:
```typescript
POST /api/auth/register
  Request: { name, email, password, organizationName }
  Response: { token, user, organization }
```

**Backend Logic**:
1. Create User
2. Hash password (bcrypt)
3. Create Organization
4. Create OrganizationMember (role: OWNER)
5. Create Subscription (tier: FREE)
6. Create Usage record
7. Generate JWT

**Tasks**:
1. Build register UI with validation
2. Implement all backend logic
3. Email uniqueness check
4. Password strength validation
5. Auto-login after register
6. Redirect to onboarding or /dashboard

**Completion criteria**: Can register, org created, logged in automatically

---

### Route 4: Password Reset `/forgot-password` + `/reset-password/:token`

**UI First**:
```jsx
<ForgotPasswordPage>
  <EmailInput />
  <SendResetLinkButton />
</ForgotPasswordPage>

<ResetPasswordPage token={token}>
  <NewPasswordInput />
  <ConfirmPasswordInput />
  <ResetButton />
</ResetPasswordPage>
```

**API Needed**:
```typescript
POST /api/auth/forgot-password
  Request: { email }
  Response: { message: "Reset link sent" }

POST /api/auth/reset-password
  Request: { token, newPassword }
  Response: { message: "Password reset successful" }
```

**Backend Logic**:
1. Generate secure reset token
2. Store token with expiration (1 hour)
3. Send email (or log to console for MVP)
4. Validate token on reset
5. Hash new password
6. Invalidate token after use

**Tasks**:
1. Build both UI pages
2. Implement token generation
3. Implement token validation
4. Email sending (console.log for MVP)
5. Token expiration handling

**Completion criteria**: Can request reset, use token to set new password

---

## Phase 3: Core App Shell (Week 5)

### App Layout Component

**UI First**:
```jsx
<AppLayout>
  <Header>
    <Logo />
    <OrganizationSwitcher />
    <NotificationBell />
    <UserMenu />
  </Header>
  <Sidebar>
    <NavLink to="/dashboard">Dashboard</NavLink>
    <NavLink to="/requests">Requests</NavLink>
    <NavLink to="/my-work">My Work</NavLink>
    <NavLink to="/settings">Settings</NavLink>
  </Sidebar>
  <MainContent>
    {children}
  </MainContent>
</AppLayout>
```

**API Needed**:
```typescript
GET /api/auth/me
  Response: { user, organization, permissions[] }

GET /api/organizations
  Response: { organizations[] } // for switcher

POST /api/auth/switch-org
  Request: { organizationId }
  Response: { token, organization }

GET /api/notifications
  Response: { notifications[], unreadCount }
```

**Tasks**:
1. Build responsive app shell
2. Implement organization switcher
3. Implement notification bell (badge with count)
4. Implement user menu (logout, profile)
5. Navigation highlighting (active route)
6. Protected route wrapper

**Completion criteria**: App shell works, can switch orgs, navigation works

---

### Route 5: Dashboard `/dashboard`

**UI First**:
```jsx
<DashboardPage>
  <WelcomeCard user={user} />
  <StatsRow>
    <StatCard title="Active Requests" value={5} />
    <StatCard title="My Tasks" value={12} />
    <StatCard title="Blockers" value={2} />
  </StatsRow>
  <RecentRequestsList />
  <MyTasksList limit={5} />
  <QuickActions>
    <NewRequestButton />
  </QuickActions>
</DashboardPage>
```

**API Needed**:
```typescript
GET /api/dashboard/stats
  Response: {
    activeRequests: number,
    myTasks: number,
    blockers: number
  }

GET /api/requests?limit=5&sort=recent
  Response: { requests[] }

GET /api/tasks/me?limit=5
  Response: { tasks[] }
```

**Backend Logic**:
1. Count active requests for organization
2. Count tasks assigned to current user
3. Count blocked tasks
4. Fetch recent requests with pagination
5. Fetch user's tasks with pagination

**Tasks**:
1. Build dashboard UI with stats cards
2. Implement stats API endpoint
3. Implement requests list component
4. Implement tasks list component
5. Real-time updates (optional for MVP)

**Completion criteria**: Dashboard shows accurate data, links work

---

## Phase 4: Request Management (Weeks 6-8)

### Route 6: Requests List `/requests`

**UI First**:
```jsx
<RequestsPage>
  <PageHeader>
    <SearchBar />
    <FilterDropdown status={} priority={} />
    <SortDropdown />
    <NewRequestButton />
  </PageHeader>
  
  <RequestsGrid view="grid|list">
    {requests.map(request => (
      <RequestCard
        title={request.title}
        status={request.status}
        priority={request.priority}
        progress={request.progress}
        assignee={request.assignee}
        onClick={() => navigate(`/requests/${request.id}`)}
      />
    ))}
  </RequestsGrid>
  
  <Pagination />
</RequestsPage>
```

**API Needed**:
```typescript
GET /api/requests
  Query: {
    page?: number,
    limit?: number,
    status?: RequestStatus[],
    priority?: Priority[],
    search?: string,
    sort?: 'recent' | 'priority' | 'status'
  }
  Response: {
    requests: Request[],
    pagination: { page, limit, total, pages }
  }
```

**Backend Logic**:
1. Build query with filters
2. Apply RLS (organization_id)
3. Apply search (title, description)
4. Apply sorting
5. Paginate results
6. Include related data (assignee, task counts)

**Tasks**:
1. Build requests list UI
2. Implement filtering UI
3. Implement search
4. Implement API endpoint with all filters
5. Implement pagination
6. Grid vs list view toggle

**Completion criteria**: Can view, filter, search, and navigate requests

---

### Route 7: New Request `/requests/new` (Intake Wizard)

**UI First** (Multi-step form):
```jsx
<IntakeWizard>
  <ProgressBar currentStep={step} totalSteps={11} />
  
  {step === 1 && <Step1_Title />}
  {step === 2 && <Step2_WhatChanges />}
  {step === 3 && <Step3_WhoFor />}
  {step === 4 && <Step4_WhyMatters />}
  {step === 5 && <Step5_RequestType />}
  {step === 6 && <Step6_DoneMeans />}
  {step === 7 && <Step7_Examples />}
  {step === 8 && <Step8_Constraints />}
  {step === 9 && <Step9_Deadline />}
  {step === 10 && <Step10_Tradeoff />}
  {step === 11 && <Step11_Review />}
  
  <NavigationButtons>
    <BackButton />
    <SaveDraftButton />
    <NextButton />
    <SubmitButton />
  </NavigationButtons>
</IntakeWizard>
```

**API Needed**:
```typescript
POST /api/requests
  Request: { title, intake: {...} }
  Response: { request: Request }

PATCH /api/requests/:id/draft
  Request: { intake: {...} }
  Response: { request: Request }

GET /api/requests/:id/draft
  Response: { request: Request }
```

**Backend Logic**:
1. Validate intake form data
2. Calculate readiness score
3. Identify missing information
4. Set status (DRAFT, NEEDS_INFO, READY)
5. Auto-save draft every 30 seconds
6. Generate scope contract (via Manager Agent)

**Tasks**:
1. Build all 11 wizard steps
2. Form validation per step
3. Progress persistence (localStorage + API)
4. Draft autosave
5. Review step with preview
6. API endpoint for create/update
7. Readiness scoring algorithm
8. Trigger Manager Agent on submit

**Completion criteria**: Can complete wizard, draft saves, creates request

---

### Route 8: Request Detail `/requests/:id`

**UI First** (Tabbed interface):
```jsx
<RequestDetailPage requestId={id}>
  <RequestHeader>
    <Title />
    <Status />
    <Priority />
    <Actions>
      <EditButton />
      <DeleteButton />
      <ShareButton />
    </Actions>
  </RequestHeader>
  
  <Tabs>
    <Tab label="Overview">
      <ScopeContract />
      <Readiness />
      <Timeline />
      <Risks />
    </Tab>
    
    <Tab label="Plan">
      <Milestones>
        {milestones.map(m => (
          <Milestone>
            <Tasks />
          </Milestone>
        ))}
      </Milestones>
    </Tab>
    
    <Tab label="Tasks">
      <TasksKanban />
    </Tab>
    
    <Tab label="Docs">
      <DocsList />
    </Tab>
    
    <Tab label="Activity">
      <ActivityFeed />
    </Tab>
  </Tabs>
</RequestDetailPage>
```

**API Needed**:
```typescript
GET /api/requests/:id
  Response: {
    request: Request,
    scopeContract: ScopeContract,
    plan: Plan,
    milestones: Milestone[],
    tasks: Task[],
    docs: Doc[],
    activity: Activity[]
  }

PATCH /api/requests/:id
  Request: { ...updates }
  Response: { request: Request }

DELETE /api/requests/:id
  Response: { success: boolean }
```

**Backend Logic**:
1. Fetch request with all related data
2. Apply RLS verification
3. Check user permissions
4. Include task progress calculations
5. Include activity log
6. Handle updates
7. Handle soft delete

**Tasks**:
1. Build request detail UI with tabs
2. Implement overview tab (scope contract display)
3. Implement plan tab (milestone/task tree)
4. Implement tasks tab (Kanban board)
5. Implement docs tab (document list)
6. Implement activity tab (audit log)
7. Implement all API endpoints
8. Real-time updates via polling or SSE

**Completion criteria**: Can view complete request details, all tabs work

---

## Phase 5: My Work & Task Management (Week 9)

### Route 9: My Work `/my-work`

**UI First**:
```jsx
<MyWorkPage>
  <Header>
    <Title>My Work</Title>
    <FilterBar>
      <StatusFilter />
      <MilestoneFilter />
      <PriorityFilter />
    </FilterBar>
  </Header>
  
  <TasksGrouped>
    <Group title="Today" tasks={todayTasks} />
    <Group title="This Week" tasks={weekTasks} />
    <Group title="Upcoming" tasks={upcomingTasks} />
    <Group title="Blocked" tasks={blockedTasks} />
  </TasksGrouped>
  
  <TaskModal task={selectedTask}>
    <TaskDetails />
    <MarkCompleteButton />
    <AddEvidenceForm />
    <CommentsSection />
  </TaskModal>
</MyWorkPage>
```

**API Needed**:
```typescript
GET /api/tasks/me
  Query: {
    status?: TaskStatus[],
    milestone?: string,
    groupBy?: 'date' | 'milestone' | 'priority'
  }
  Response: { tasks: Task[] }

GET /api/tasks/:id
  Response: { task: Task, request: Request }

PATCH /api/tasks/:id
  Request: {
    status?: TaskStatus,
    evidence?: Evidence[],
    notes?: string
  }
  Response: { task: Task }
```

**Backend Logic**:
1. Fetch all tasks assigned to current user
2. Apply RLS
3. Group tasks by date/milestone
4. Calculate due dates
5. Identify blockers
6. Handle status updates
7. Handle evidence attachments
8. Emit events on task completion

**Tasks**:
1. Build My Work UI with grouping
2. Implement task card component
3. Implement task modal/drawer
4. Implement mark complete flow
5. Implement evidence upload
6. Implement API endpoints
7. Task state transitions
8. Event emission on completion

**Completion criteria**: Can view my tasks, update status, add evidence

---

## Phase 6: Settings & Admin (Week 10)

### Route 10: Organization Settings `/settings/organization`

**UI First**:
```jsx
<SettingsLayout>
  <SettingsSidebar />
  
  <OrganizationSettings>
    <Section title="General">
      <OrgNameInput />
      <OrgSlugInput />
      <TimezoneSelect />
      <WorkWeekSelect />
    </Section>
    
    <Section title="Limits">
      <UsageChart />
      <CurrentPlan />
      <UpgradeButton />
    </Section>
    
    <Section title="Danger Zone">
      <DeleteOrgButton />
    </Section>
    
    <SaveButton />
  </OrganizationSettings>
</SettingsLayout>
```

**API Needed**:
```typescript
GET /api/organizations/:id/settings
  Response: { settings: OrgSettings, usage: Usage }

PATCH /api/organizations/:id/settings
  Request: { ...settings }
  Response: { organization: Organization }

GET /api/organizations/:id/usage
  Response: { usage: Usage, limits: Limits }
```

**Tasks**: Build UI, implement settings API, usage tracking

---

### Route 11: Members Management `/settings/members`

**UI First**:
```jsx
<MembersSettings>
  <Header>
    <InviteMemberButton />
  </Header>
  
  <MembersTable>
    {members.map(m => (
      <MemberRow>
        <Avatar />
        <Name />
        <Email />
        <RoleSelect />
        <RemoveButton />
      </MemberRow>
    ))}
  </MembersTable>
  
  <InvitationsTable>
    {invitations.map(i => (
      <InvitationRow>
        <Email />
        <Role />
        <Status />
        <ResendButton />
        <RevokeButton />
      </InvitationRow>
    ))}
  </InvitationsTable>
</MembersSettings>
```

**API Needed**:
```typescript
GET /api/organizations/:id/members
POST /api/organizations/:id/invitations
PATCH /api/organizations/:id/members/:userId/role
DELETE /api/organizations/:id/members/:userId
```

**Tasks**: Build members UI, RBAC implementation, invitation system

---

### Route 12: Agent Configuration `/settings/agents`

**UI First**:
```jsx
<AgentsSettings>
  <AgentsList>
    {agents.map(a => (
      <AgentCard>
        <Name />
        <Description />
        <Status enabled={} />
        <LastRun />
        <ConfigureButton />
      </AgentCard>
    ))}
  </AgentsList>
  
  <AgentConfigModal agent={selectedAgent}>
    <EnableToggle />
    <PromptEditor />
    <TestButton />
    <SaveButton />
  </AgentConfigModal>
  
  <AgentRunsHistory>
    {runs.map(r => (
      <RunRow>
        <Timestamp />
        <Agent />
        <Status />
        <Duration />
        <ViewOutputButton />
      </RunRow>
    ))}
  </AgentRunsHistory>
</AgentsSettings>
```

**API Needed**:
```typescript
GET /api/agents
GET /api/agents/:type/config
PATCH /api/agents/:type/config
POST /api/agents/:type/test
GET /api/agents/runs
GET /api/agents/runs/:id
```

**Tasks**: Build agents UI, prompt editor, test execution, run history

---

## Phase 7: Workflow Engine & Agents (Weeks 11-12)

### Backend Focus: Workflow Orchestration

**No UI** (backend services only)

**Components to Build**:

1. **State Machine**
```typescript
class WorkflowEngine {
  async transitionRequest(requestId, newStatus) { }
  async checkGateConditions(requestId, gate) { }
  async autoAssignTasks(planId) { }
  async handleTaskCompletion(taskId) { }
}
```

2. **Agent Framework**
```typescript
class AgentOrchestrator {
  async executeAgent(agentType, input) { }
  async queueAgentJob(agentType, input) { }
  async getAgentRun(runId) { }
}
```

3. **Manager Agent**
```typescript
class ManagerAgent {
  async generateScopeContract(request) { }
  async createPlan(request) { }
  async identifyMissingInfo(request) { }
  async postUpdate(request, update) { }
}
```

4. **Documentation Agent**
```typescript
class DocsAgent {
  async generateOverview(request) { }
  async generateUserGuide(request) { }
  async generateSOP(request) { }
  async detectStaleness(docId) { }
}
```

**Tasks**:
1. Implement state machine with transitions
2. Build agent orchestration system
3. Implement Manager Agent
4. Implement Docs Agent
5. Implement Builder Agent (basic)
6. Implement QA Agent
7. Bull queue integration
8. Event emission and handling

**Completion criteria**: Agents can be triggered, execute, and produce output

---

## Phase 8: GitHub Integration (Week 13)

### Backend Focus: GitHub Bridge

**Build GitHub Bridge Service** (from earlier spec)

**Components**:
1. GitHub App authentication
2. Branch creation
3. File commits
4. PR creation
5. Webhook handling

**Integration Points**:
- Trigger on request status → BUILDING
- Create branch: `bp/{requestId}/{slug}`
- Commit docs updates
- Open PR with scope contract
- Listen to PR events
- Update request status

**Tasks**:
1. Implement GitHub Bridge endpoints
2. GitHub App setup and installation
3. Repository connection UI (`/settings/integrations`)
4. PR workflow integration
5. Webhook receiver
6. Event processing

**Completion criteria**: Can connect repo, agent creates branch/PR

---

## Phase 9: Polish & Testing (Weeks 14-16)

### Week 14: Integration Testing
- End-to-end user journeys
- Multi-tenant isolation tests
- Permission boundary tests
- Performance profiling

### Week 15: Bug Fixes & Optimization
- Address all critical bugs
- Optimize slow queries
- Add missing indexes
- Improve API response times

### Week 16: Documentation & Launch Prep
- Complete API documentation
- User guides and tutorials
- Developer onboarding
- Beta user recruitment
- Launch checklist

---

## Implementation Guidelines

### For Each Route/Page

**Step 1: Design UI** (1-2 days)
- Wireframe or mockup
- Define all components
- Identify all data needs
- User interactions

**Step 2: Build UI** (2-3 days)
- Create all components
- Add form validation
- Add loading states
- Add error states
- Make responsive

**Step 3: Define API** (1 day)
- Request/response schemas
- Authorization rules
- Validation rules
- Document in API.md

**Step 4: Build API** (2-3 days)
- Implement endpoint
- Add validation
- Add authorization
- Add error handling
- Write tests

**Step 5: Connect & Test** (1 day)
- Connect UI to API
- Test happy path
- Test error cases
- Test edge cases
- Fix bugs

**Step 6: Complete** ✅
- Route fully works
- Code reviewed
- Tested
- Documented
- Merged

### Never Move Forward Until Current Route is Complete

**Complete means**:
- UI looks good and responsive
- API works with proper error handling
- Authorization works correctly
- Tests pass
- Documentation updated
- No known bugs

---

## Success Metrics

**After Each Route**:
- [ ] UI matches design
- [ ] All user interactions work
- [ ] API returns correct data
- [ ] Authorization enforced
- [ ] Loading states work
- [ ] Error states work
- [ ] Mobile responsive
- [ ] Tests written and passing
- [ ] Code reviewed and merged

**MVP Complete When**:
- [ ] All 12 core routes complete
- [ ] Agents working and tested
- [ ] GitHub integration functional
- [ ] Multi-tenant isolation verified
- [ ] Security audit passed
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] 5 beta users onboarded

---

**Plan Version**: 2.0 (Route-by-Route)  
**Created**: 2026-02-02  
**Philosophy**: Build systematically, one room at a time, complete before moving forward
