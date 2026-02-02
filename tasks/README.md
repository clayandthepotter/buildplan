# BuildPlan Task Management System

This directory contains the AI team's task management system. Tasks flow through different stages from creation to completion.

## Directory Structure

```
/tasks
├─ /inbox           → New tasks awaiting PM review
├─ /backlog         → Prioritized, ready to assign
├─ /in-progress     → Currently being worked on
├─ /review          → Awaiting human approval
├─ /blocked         → Waiting on dependencies
├─ /completed       → Done and approved
├─ /archive         → Historical reference (quarterly cleanup)
└─ /templates       → Task templates for each agent type
```

## Task Lifecycle

```
1. INBOX       → PM reviews and validates
2. BACKLOG     → PM prioritizes and waits for dependencies
3. IN-PROGRESS → Agent actively working
4. REVIEW      → Awaiting human approval (if needed)
5. COMPLETED   → Done ✅
6. ARCHIVE     → Moved after 90 days
```

**Alternate paths**:
- `IN-PROGRESS` → `BLOCKED` (dependency issue) → back to `IN-PROGRESS`
- `REVIEW` → `IN-PROGRESS` (changes requested)

## Task Types

| Type | Template | Assigned To | Requires Human Approval |
|------|----------|-------------|-------------------------|
| DESIGN-XXX | design-task.md | Technical Architect | Yes (at completion) |
| TASK-XXX | backend-task.md | Backend Engineer | No (QA verifies) |
| TASK-XXX | frontend-task.md | Frontend Engineer | No (QA verifies) |
| TASK-XXX | devops-task.md | DevOps Engineer | Yes (before migration) |
| QA-XXX | qa-task.md | QA Engineer | Yes (at completion) |
| DOCS-XXX | docs-task.md | Documentation Agent | No |

## Task Naming Convention

- `DESIGN-001` → Design/architecture tasks
- `TASK-001` → Implementation tasks (backend, frontend, devops)
- `QA-001` → Testing tasks
- `DOCS-001` → Documentation tasks

## How It Works

### For PM Agent
1. **Morning**: Run daily standup
   - Review all in-progress tasks
   - Check for blockers
   - Assign new tasks from backlog
   
2. **Throughout Day**: Monitor progress
   - Review agent updates
   - Resolve blockers
   - Coordinate handoffs
   
3. **End of Day**: Prepare for tomorrow
   - Update task statuses
   - Identify tomorrow's priorities

### For Specialist Agents
1. **Check Assignment**: Look for tasks in /in-progress with your name
2. **Read Task**: Understand requirements and acceptance criteria
3. **Update Status**: Mark as "Working"
4. **Do Work**: Implement, test, document
5. **Update Progress**: Add notes and check off criteria
6. **Complete**: Mark status "Complete", add handoff notes
7. **Notify PM**: Signal task is done

### For Human Executive
1. **Daily**: Review standup report in /standup/
2. **As Needed**: Approve tasks in /review/
3. **Weekly**: Review progress report
4. **Escalations**: Respond to PM escalations

## Task File Format

Every task file contains:
- **Header**: Type, priority, complexity, estimates, status
- **Description**: What needs to be done
- **Dependencies**: What must be complete first
- **Acceptance Criteria**: Checkboxes for completion
- **Deliverables**: What files/outputs are expected
- **Notes**: Agent work notes
- **Blockers**: Any issues preventing progress
- **Handoff**: Notes for next agent

## Status Values

- `Not Started` → Task created but not assigned
- `Working` → Agent actively working
- `Complete` → Agent finished, awaiting review
- `Blocked` → Cannot proceed due to dependency
- `Approved` → Human approved (for review tasks)
- `Changes Requested` → Human requested modifications

## Quick Commands (Conceptual)

```bash
# PM creates task
cp templates/backend-task.md inbox/TASK-123.md
# Edit task details
# Move to backlog
mv inbox/TASK-123.md backlog/

# PM assigns task
mv backlog/TASK-123.md in-progress/
# Notify agent

# Agent completes
# Update task file status
# Move to review (if human approval needed)
mv in-progress/TASK-123.md review/

# Human approves
mv review/TASK-123.md completed/
```

## Best Practices

### For PM Agent
- Never assign tasks with unmet dependencies
- Keep max 2 tasks per agent at once
- Escalate blockers within 2 hours
- Update all task files daily
- Celebrate completions

### For Specialist Agents
- Read the full task before starting
- Update progress hourly
- Check off criteria as you complete them
- Add clear handoff notes
- Report blockers immediately
- Test your work before marking complete

### For Human
- Review tasks in /review/ within 2 hours
- Be specific when requesting changes
- Acknowledge escalations promptly
- Read the daily standup
- Provide feedback on completed features

## Metrics Tracked

- **Velocity**: Tasks completed per day
- **Cycle Time**: Time from assignment to completion
- **Blocked Time**: Time tasks spend in blocked status
- **Approval Wait**: Time tasks wait in review
- **Quality**: Bugs found per task
- **Coverage**: Test coverage per task

## Integration with Other Systems

- **Git**: Each task should reference commits
- **Tests**: Each task should reference test results
- **Docs**: Each task should update relevant docs
- **WARP.md**: Completed features logged
- **TODO.md**: High-level tracking (deprecated in favor of /tasks)

## Migration from TODO.md

The old TODO.md is replaced by this task system:
- More granular tracking
- Clear ownership
- Automated workflow
- Better visibility
- Audit trail

Tasks from TODO.md will be converted to individual task files by PM Agent.

---

**Questions?** See `docs/AI_TEAM_PROTOCOL.md` for full team protocols.
