# Project Requests System

This directory is where **you (the human executive)** submit project requests to the AI development team. The PM Agent monitors this directory and processes requests.

---

## 📁 Directory Structure

```
/requests
├── REQUEST_TEMPLATE.md      ← Copy this to create new requests
├── pending/                 ← You put new requests here
├── in-analysis/             ← PM Agent moves here while analyzing
├── approved/                ← Approved requests ready for implementation
├── rejected/                ← Requests that won't be implemented (with reason)
└── completed/               ← Finished features
```

---

## 🚀 How to Submit a Request

### Option 1: Simple Request (Recommended)
Create a new file in `/requests/pending/`:

```bash
# Copy template
cp requests/REQUEST_TEMPLATE.md requests/pending/REQ-001-login-system.md

# Edit the file with your request details
# PM Agent will pick it up automatically
```

### Option 2: Quick Request
Create a simple markdown file:

```markdown
# REQ-001: Build Login System

I need users to be able to log in with email/password.

Success criteria:
- Users can log in
- Invalid credentials show error
- Users stay logged in

Deadline: End of month
```

### Option 3: Verbal Request
Just tell the PM Agent directly:
> "PM Agent, I need a login system. Create a project request for this."

PM Agent will create the request file for you and ask clarifying questions.

---

## 📋 Request Lifecycle

```
1. YOU create request in /pending/
   ↓
2. PM Agent finds it (checks every hour or when invoked)
   ↓
3. PM Agent moves to /in-analysis/
   ↓
4. PM Agent analyzes and asks clarifying questions (if needed)
   ↓
5. PM Agent creates task breakdown
   ↓
6. PM Agent presents breakdown to YOU for approval
   ↓
7. If YOU approve:
   → PM moves to /approved/
   → PM creates DESIGN-XXX task
   → PM assigns to Technical Architect
   → Implementation begins
   
   If YOU reject or request changes:
   → PM updates request
   → PM presents again
   
   If infeasible:
   → PM moves to /rejected/ with explanation
```

---

## 🎯 What Makes a Good Request?

### ✅ Good Examples

**Example 1: Clear and Specific**
```markdown
# REQ-002: Password Reset Flow

Users need to be able to reset their password if they forget it.

Flow:
1. User clicks "Forgot Password" on login page
2. User enters email
3. System sends reset link to email
4. User clicks link, enters new password
5. User can log in with new password

Success: User can reset password without admin help
Deadline: Not urgent, but within 2 weeks
```

**Example 2: High-Level (PM will fill in details)**
```markdown
# REQ-003: User Dashboard

Need a dashboard page that shows:
- Welcome message
- Recent activity
- Quick actions

PM Agent: Please design what metrics/data should be shown.
```

### ❌ Examples That Need More Detail

**Too Vague**:
```markdown
# REQ-004: Make the app better

The app needs to be improved.
```
*PM Agent will ask: "What specifically needs improvement?"*

**Missing Context**:
```markdown
# REQ-005: Add search

Add search functionality.
```
*PM Agent will ask: "Search where? Search for what? How should results be displayed?"*

---

## 🤖 What PM Agent Does With Your Request

1. **Reads and Analyzes**
   - Extracts requirements
   - Identifies ambiguities
   - Checks against existing architecture

2. **Asks Clarifying Questions** (if needed)
   - Technical approach preferences
   - Priority trade-offs
   - Success criteria clarification

3. **Creates Task Breakdown**
   - DESIGN-XXX (Technical Architect)
   - TASK-XXX (Backend, Frontend, DevOps)
   - QA-XXX (Testing)
   - DOCS-XXX (Documentation)

4. **Estimates Timeline**
   - Task complexity
   - Dependencies
   - Team velocity
   - Provides completion ETA

5. **Presents for Approval**
   - Shows full task breakdown
   - Timeline estimate
   - Resource allocation
   - Any risks or concerns

6. **Executes** (after approval)
   - Assigns tasks to agents
   - Monitors progress
   - Reports status in daily standups

---

## 📊 Request Statuses

| Status | Location | Meaning |
|--------|----------|---------|
| **Pending** | `/pending/` | New request, not yet reviewed |
| **In Analysis** | `/in-analysis/` | PM Agent is analyzing |
| **Approved** | `/approved/` | Approved, implementation started |
| **Rejected** | `/rejected/` | Won't be implemented (reason provided) |
| **Completed** | `/completed/` | Feature built, tested, deployed |

---

## 🎓 Examples of Different Request Types

### Feature Request
```markdown
# REQ-010: Export Data Feature

Users should be able to export their data to CSV/JSON.

Who: Pro tier users only
Why: Regulatory compliance + user demand
Success: User clicks export, downloads file with all their data
```

### Bug Fix Request
```markdown
# REQ-011: Fix Login Timeout Issue

Current issue: Users get logged out after 5 minutes
Expected: Users should stay logged in for 24 hours
Priority: High (affecting all users)
```

### Technical Improvement
```markdown
# REQ-012: Add Database Indexes

Current: Query performance degrading as data grows
Goal: Add indexes to improve query speed
Success: Dashboard loads in <500ms even with 10k+ records
```

### Infrastructure Request
```markdown
# REQ-013: Set Up Staging Environment

Need a staging environment to test changes before production
Requirements:
- Mirrors production setup
- Separate database
- Easy to deploy to
Timeline: Before we launch first feature
```

---

## 💡 Tips for Success

### 1. Be Clear About Priority
- **Critical**: Blocking other work, needs immediate attention
- **High**: Important for upcoming milestone
- **Medium**: Should be done soon
- **Low**: Nice to have when time permits

### 2. Provide Context
The more context you provide, the better the team can design the solution:
- Why is this needed?
- Who will use it?
- What problem does it solve?
- Are there examples to reference?

### 3. Define Success Clearly
"Done" means different things to different people. Be explicit:
- ✅ "User can upload profile photo" (clear)
- ❌ "User profile is better" (vague)

### 4. Mention Constraints
If there are constraints, say so upfront:
- Technical: "Must work with existing auth system"
- Timeline: "Needed by end of week"
- Business: "Must comply with GDPR"
- Design: "Should match existing UI patterns"

### 5. Ask Questions
If you're unsure about technical approach, ask:
- "What's the best way to handle X?"
- "Should we do A or B approach?"
- "Are there security concerns with this?"

---

## 🔄 Request Workflow Example

**You submit**:
```markdown
# REQ-020: Team Member Management

I need admins to be able to invite and manage team members.
```

**PM Agent analyzes and asks**:
> "Some clarifying questions:
> 1. What roles should team members have? (Admin, Member, Viewer?)
> 2. Should invites expire after X days?
> 3. Can members be removed? What happens to their data?
> 4. Email invitations or other method?"

**You respond**:
> "Good questions!
> 1. Three roles: Admin (full access), Member (can create/edit), Viewer (read-only)
> 2. Yes, invites expire after 7 days
> 3. Yes, members can be removed. Archive their data, don't delete.
> 4. Email invitations with secure token link"

**PM Agent creates breakdown**:
> "Task Breakdown for REQ-020:
> 
> - DESIGN-020: Design team management system (2 days)
> - TASK-020-A: Backend - Invitation API (3 hours)
> - TASK-020-B: Backend - Role management API (4 hours)
> - TASK-020-C: Frontend - Team settings page (6 hours)
> - TASK-020-D: Frontend - Invitation flow (4 hours)
> - QA-020: Test team management (3 hours)
> - DOCS-020: Document team management feature (2 hours)
> 
> Total Estimate: 4-5 days
> Dependencies: Requires authentication system (REQ-001) complete
> 
> Approve to begin?"

**You approve**:
> "Approved. Let's do it."

**PM Agent executes**:
- Moves request to `/approved/`
- Creates DESIGN-020 task
- Assigns to Technical Architect
- Reports progress in daily standups

---

## 📞 Quick Reference

**To submit new request**: 
1. Copy `REQUEST_TEMPLATE.md` to `pending/REQ-XXX-title.md`
2. Fill in details
3. PM Agent will find it automatically

**To check request status**: 
- Look in `/requests/[status]/` directories
- Or ask PM Agent: "What's the status of REQ-XXX?"

**To modify request**:
- Edit the file in its current location
- Add a comment section at bottom with updates
- Notify PM Agent if urgent

**To cancel request**:
- Move to `/rejected/` and add reason
- Or tell PM Agent: "Cancel REQ-XXX, no longer needed"

---

## 🚨 Emergency Requests

For critical/urgent requests, you can:

1. **Create request + notify immediately**:
   ```markdown
   # REQ-URGENT-001: Production Down
   
   Priority: CRITICAL
   Issue: [description]
   Impact: [who's affected]
   ```
   Then tell PM Agent: "URGENT: REQ-URGENT-001 needs immediate attention"

2. **Skip request process entirely**:
   Just tell PM Agent directly what needs to happen:
   > "CRITICAL: Production API is down. Create emergency task for Backend Agent to investigate immediately."

---

**System Ready**: You can now submit project requests to your AI team! 🚀
