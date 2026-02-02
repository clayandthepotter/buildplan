# QA-XXX: [Feature Name - Testing]

**Type**: QA  
**Priority**: [Critical/High/Medium/Low]  
**Complexity**: [High/Medium/Low]  
**Estimated**: [X hours/days]  
**Assigned**: QA Engineer Agent  
**Status**: Not Started  
**Created**: [YYYY-MM-DD HH:MM UTC]  
**Started**: [YYYY-MM-DD HH:MM UTC]  
**Completed**: [YYYY-MM-DD HH:MM UTC]

## Description
[Detailed description of what needs to be tested]

## Dependencies
- [ ] [TASK-XXX] ([Backend Task]) - Complete
- [ ] [TASK-XXX] ([Frontend Task]) - Complete

## Test Scope
- [ ] API endpoints
- [ ] UI components
- [ ] User flows
- [ ] Authorization
- [ ] Data isolation (RLS)
- [ ] Error handling
- [ ] Edge cases
- [ ] Performance
- [ ] Accessibility

## Acceptance Criteria
- [ ] All happy path tests pass
- [ ] All error case tests pass
- [ ] All edge case tests pass
- [ ] Authorization tests pass
- [ ] RLS tests pass (data isolation verified)
- [ ] Performance acceptable (<200ms API)
- [ ] Accessibility checks pass (WCAG AA)
- [ ] No console errors
- [ ] Mobile responsiveness verified
- [ ] Test report completed

## Test Cases

### API Tests
| Test ID | Endpoint | Scenario | Expected Result | Status |
|---------|----------|----------|----------------|---------|
| API-001 | POST /api/... | Valid input | 200 + data | ⏳ |
| API-002 | POST /api/... | Invalid input | 400 + error | ⏳ |

### UI Tests
| Test ID | Component | Scenario | Expected Result | Status |
|---------|-----------|----------|----------------|---------|
| UI-001 | LoginForm | Submit valid | Redirects to dashboard | ⏳ |
| UI-002 | LoginForm | Submit invalid | Shows error message | ⏳ |

### Authorization Tests
| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|---------|
| AUTH-001 | Access without token | 401 Unauthorized | ⏳ |
| AUTH-002 | Access wrong org data | 403 Forbidden | ⏳ |

### RLS Tests
| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|---------|
| RLS-001 | User A reads User B's org data | No data returned | ⏳ |
| RLS-002 | User A reads own org data | Data returned | ⏳ |

## Bugs Found
[List bugs found with severity and description]

## Deliverables
- Test report (tasks/completed/QA-XXX-report.md)
- Bug reports (if any)
- Screenshots of test results
- Test coverage metrics

## Notes
[Agent adds notes during testing]

## Blockers
[Agent reports blockers here]

## Handoff
**To**: Documentation Agent (if all tests pass) OR Back to Dev Agents (if bugs found)  
**Handoff Notes**: [Agent provides test summary and any issues]

---
**Last Updated**: [YYYY-MM-DD HH:MM UTC] by QA Engineer Agent
