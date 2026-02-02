# TASK-XXX: [Infrastructure/Migration Task]

**Type**: DevOps  
**Priority**: [Critical/High/Medium/Low]  
**Complexity**: [High/Medium/Low]  
**Estimated**: [X hours/days]  
**Assigned**: DevOps Engineer Agent  
**Status**: Not Started  
**Created**: [YYYY-MM-DD HH:MM UTC]  
**Started**: [YYYY-MM-DD HH:MM UTC]  
**Completed**: [YYYY-MM-DD HH:MM UTC]

## Description
[Detailed description of the DevOps task]

## Dependencies
- [ ] [DESIGN-XXX] ([Design Name]) - Approved
- [ ] [TASK-XXX] ([Other Task]) - [Status]

## Acceptance Criteria
- [ ] Prisma schema updated
- [ ] Migration created
- [ ] RLS policies created/updated
- [ ] Rollback script created
- [ ] Tested locally
- [ ] Data integrity verified
- [ ] Documentation updated

## Deliverables
- `packages/api/prisma/schema.prisma` (if schema changes)
- `packages/api/prisma/migrations/[timestamp]_[name]/migration.sql`
- `scripts/rollback-[name].sql` (if destructive)
- Migration plan document

## Technical Specifications
**Schema Changes**:
- [ ] Tables added/modified
- [ ] Columns added/modified
- [ ] Indexes added
- [ ] Relations defined

**RLS Policies**:
- [ ] Policies for new tables
- [ ] organization_id context

**Infrastructure**:
- [ ] Docker config changes
- [ ] Environment variables
- [ ] CI/CD updates

## Notes
[Agent adds notes during work]

## Blockers
[Agent reports blockers here]

## Human Approval Required
⚠️ **YES** - Schema changes and migrations require human approval before execution

## Handoff
**To**: Backend Engineer Agent (after migration)  
**Handoff Notes**: [Agent provides migration summary and new schema docs]

---
**Last Updated**: [YYYY-MM-DD HH:MM UTC] by DevOps Engineer Agent
