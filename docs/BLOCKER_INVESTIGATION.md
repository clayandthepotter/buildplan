# Blocker Investigation Features

## Overview
Enhanced the BuildPlan AI team with detailed blocker tracking and conversational PM interface.

## Problem Solved
Previously, when tasks were blocked, the system only showed "Execution failed" without any details about:
- What test failed
- What error occurred
- Stack traces or error output
- How to fix the issue

This made it impossible to debug blocked tasks without manually reading log files.

## Solution Implemented

### 1. Enhanced Error Capture (Backend Agent)
**File**: `buildplan-agents/src/agents/backend-agent.js`

- Modified `executeTask()` to return detailed error objects instead of just `false`
- Updated `runTests()` to capture and return test output (stdout/stderr)
- Each failure point now returns:
  ```javascript
  {
    success: false,
    error: "Human-readable error message",
    details: "Full test output or stack trace"
  }
  ```

### 2. Enhanced Error Handling (Base Agent)
**File**: `buildplan-agents/src/agents/base-agent.js`

- Updated `runTaskWorkflow()` to handle both legacy boolean and new object returns
- Automatically appends error details to task Progress Log
- Passes detailed error messages to `blockTask()` instead of generic "Execution failed"

### 3. PM Conversation Service
**File**: `buildplan-agents/src/services/pmConversation.js`

New service that provides:
- Query any task by ID across all directories
- Parse task files to extract blocker information
- Get all currently blocked tasks
- Format blocker details for human-readable output

**Key Methods**:
- `queryTask(taskId)` - Get full details about a specific task
- `getBlockedTasks()` - List all blocked tasks with reasons
- `formatTaskInfo()` - Human-friendly task information
- `formatBlockedTasksSummary()` - Summary of all blockers

### 4. New Telegram Commands
**File**: `buildplan-agents/src/index.js`

Added two new commands to the Telegram bot:

#### `/blockers`
Shows all currently blocked tasks with:
- Task ID and title
- Block reason
- Error details (truncated if long)

Example output:
```
🚫 2 Blocked Task(s)

1. TASK-1770152858774-01
   Title: Implement feature
   Reason: Tests failed: Test suite failed
   Details: Error: Cannot find module 'express'...

2. TASK-1770156914117-01
   Title: Implement feature
   Reason: Tests failed: Test suite failed
   Details: TypeError: undefined is not a function...
```

#### `/blocker [task-id]`
Get detailed information about a specific task:
- Task status and location
- Assigned agent
- Priority level
- Complete blocker reason
- Full error details (not truncated)
- Recent progress log (last 5 entries)

Example:
```
/blocker TASK-1770152858774-01
```

Output:
```
📋 TASK-1770152858774-01
📂 Status: BLOCKED
📝 Title: Implement feature
👤 Assigned: none
⚡ Priority: medium

🚫 BLOCKER:
Reason: Tests failed: Test suite failed

📄 Error Details:
```
Error: Cannot find module 'express'
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:...)
    at Function.Module._load (internal/modules/cjs/loader.js:...)
```

📊 Recent Progress (last 5):
- [2026-02-03T21:31:27.138Z] Backend-Agent: BLOCKED: Tests failed
- [2026-02-03T21:31:27.136Z] Backend-Agent: Tests failed - task blocked
- [2026-02-03T21:31:25.682Z] Backend-Agent: Running tests
- [2026-02-03T21:31:15.191Z] Backend-Agent: Checking dependencies
- [2026-02-03T21:31:15.181Z] Backend-Agent: Writing files locally
```

## Updated Help Command
The `/help` command now includes a new section:

```
Debugging & Blockers:
🚫 /blockers - List all blocked tasks
🔍 /blocker [task-id] - Get detailed blocker info
```

## Usage Examples

### Scenario 1: Check if any tasks are blocked
```
User: /blockers
Bot: 🚫 2 Blocked Task(s) [shows summary]
```

### Scenario 2: Investigate a specific blocker
```
User: /blocker TASK-1770152858774-01
Bot: [Shows full task details with error output]
```

### Scenario 3: Natural language query
```
User: /request what is blocking TASK-1770152858774-01
[System will analyze, create tasks, and you can then use /blocker to get details]
```

## Benefits

1. **Transparency**: You can see exactly why tasks are blocked
2. **Debugging**: Full error output helps identify the root cause
3. **Conversational**: Ask the PM about blockers like you would a real PM
4. **Actionable**: Error details tell you what needs to be fixed
5. **Efficient**: No need to manually read log files or task markdown

## Next Steps

To apply these changes:
```powershell
cd C:\Users\Administrator\Projects\buildplan\buildplan-agents
pm2 restart buildplan-agents
pm2 logs buildplan-agents
```

Then test with:
```
/blockers
/blocker TASK-1770152858774-01
```

## Architecture

```
┌─────────────────┐
│  Backend Agent  │
│  (Task fails)   │
└────────┬────────┘
         │
         │ Returns { success: false, error: "...", details: "..." }
         ▼
┌─────────────────┐
│   Base Agent    │
│ (Captures error)│
└────────┬────────┘
         │
         │ Writes error details to task file
         │ Calls blockTask() with detailed reason
         ▼
┌─────────────────┐
│  Task Blocked   │
│  (tasks/blocked)│
└────────┬────────┘
         │
         │ PM Conversation Service reads task file
         ▼
┌─────────────────┐
│ Telegram Bot    │
│ /blocker cmd    │
└─────────────────┘
         │
         │ Formats and displays to user
         ▼
┌─────────────────┐
│      User       │
│  (Sees details) │
└─────────────────┘
```

## Files Modified

1. `buildplan-agents/src/agents/backend-agent.js` - Enhanced error capture
2. `buildplan-agents/src/agents/base-agent.js` - Enhanced error handling
3. `buildplan-agents/src/agents/pm-agent.js` - Added conversational query handler
4. `buildplan-agents/src/index.js` - New Telegram commands + conversational handler

## Files Created

1. `buildplan-agents/src/services/pmConversation.js` - PM query service
2. `docs/BLOCKER_INVESTIGATION.md` - This documentation

## Technical Notes

- The error parsing handles multiline error output correctly
- Task files are searched across all directories (inbox, backlog, in-progress, blocked, review, completed)
- Long error messages are automatically truncated in `/blockers` summary but shown in full with `/blocker [id]`
- Backward compatible with agents that still return boolean values
- All Telegram messages are HTML-formatted with automatic chunking for long outputs
