require('dotenv').config();
const path = require('path');

// Set PROJECT_ROOT for workspace manager
process.env.PROJECT_ROOT = path.join(__dirname, '..');
process.env.TASKS_DIR = path.join(__dirname, 'tasks');
process.env.REQUESTS_DIR = path.join(__dirname, 'requests');
process.env.STANDUP_DIR = path.join(__dirname, 'standups');

const { PMAgent } = require('./src/agents/pm-agent');
const approvalWorkflow = require('./src/services/approvalWorkflow');
const workspace = require('./src/services/workspaceManager');
const fileOps = require('./src/utils/file-ops');

async function testRDWorkflow() {
  console.log('=== Testing R&D Workflow ===\n');

  // Ensure workspace directories exist
  workspace.ensureAgentWorkspace('pm-agent');
  workspace.ensureAgentWorkspace('rd-agent');

  // Create a mock orchestrator
  const mockOrchestrator = {
    notifyTelegram: async (msg) => console.log('[Telegram]:', msg),
    getAgentForTask: (type) => null // For this test, we're not running the full agent
  };

  const pm = new PMAgent(mockOrchestrator);

  // Step 1: Create a request file
  console.log('Step 1: Creating feature request file...');
  const requestsDir = path.join(process.env.PROJECT_ROOT, 'buildplan-agents', 'requests', 'pending');
  fileOps.ensureDirectory(requestsDir);
  
  const requestId = 'REQ-TEST-' + Date.now();
  const requestContent = `---
type: feature
priority: high
requested_by: user
---

# User Dashboard Feature

Add a user dashboard with activity feed and notifications panel.

## Requirements
- Display recent activity
- Show real-time notifications
- Responsive design
`;
  
  const requestPath = path.join(requestsDir, `${requestId}.md`);
  fileOps.writeFile(requestPath, requestContent);
  console.log('Created request file:', requestPath);

  // Step 2: Process the request
  console.log('\nStep 2: Processing request...');
  await pm.processNewRequest(requestPath);

  // The R&D task ID should follow the pattern TASK-{requestId without REQ-}-RD
  const rdTaskId = `TASK-${requestId.replace('REQ-', '')}-RD`;
  console.log(`\nExpected R&D Task ID: ${rdTaskId}`);

  // Step 3: Check that R&D task file exists
  console.log('\nStep 3: Checking task file creation...');
  const backlogDir = path.join(process.env.TASKS_DIR, 'backlog');
  console.log(`Looking in: ${backlogDir}`);
  
  const taskPath = path.join(backlogDir, `${rdTaskId}.md`);
  const taskExists = fileOps.fileExists(taskPath);
  console.log(`Task file exists at ${taskPath}: ${taskExists}`);
  
  // List all files in backlog
  const allBacklog = fileOps.readDir(backlogDir);
  console.log(`Files in backlog: ${allBacklog.join(', ')}`);
  
  // Check in-progress too
  const inProgressDir = path.join(process.env.TASKS_DIR, 'in-progress');
  const inProgress = fileOps.readDir(inProgressDir);
  console.log(`Files in in-progress: ${inProgress.join(', ')}`);
  
  // Also check if directory exists
  console.log(`Backlog directory exists: ${fileOps.fileExists(backlogDir)}`);
  console.log(`TASKS_DIR: ${process.env.TASKS_DIR}`);

  if (taskExists) {
    const taskContent = fileOps.readFile(taskPath);
    // Task is a markdown file with frontmatter, not JSON
    const typeMatch = taskContent.match(/type:\s*([^\n]+)/);
    const titleMatch = taskContent.match(/title:\s*([^\n]+)/);
    const statusMatch = taskContent.match(/status:\s*([^\n]+)/);
    const assignedMatch = taskContent.match(/assigned_to:\s*([^\n]+)/);
    
    console.log('\nTask details:');
    console.log(`- Type: ${typeMatch ? typeMatch[1] : 'N/A'}`);
    console.log(`- Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
    console.log(`- Status: ${statusMatch ? statusMatch[1] : 'N/A'}`);
    console.log(`- Assigned to: ${assignedMatch ? assignedMatch[1] : 'N/A'}`);
  }

  // Step 4: Create mock research document (simulating RD-Agent output)
  console.log('\n\nStep 4: Creating mock research document...');
  const rdWorkspace = workspace.resolveAgentPath('rd-agent', 'research');
  fileOps.ensureDirectory(rdWorkspace);
  const researchPath = path.join(rdWorkspace, `${rdTaskId}.md`);
  const researchContent = `# R&D Research: User Dashboard

## Summary
Design and implementation plan for user dashboard with activity feed and notifications.

## Proposed Architecture
- Frontend: React components for dashboard, activity feed, and notifications
- Backend: API endpoints for fetching user data, activities, and notifications
- Database: New tables for activity_log and notifications

## Mockup
See attached mockup for UI design.

## Implementation Tasks
1. Define API contracts for dashboard endpoints
2. Create database schema for activity and notifications
3. Build backend API endpoints
4. Implement frontend React components
5. Write integration tests
`;
  fileOps.writeFile(researchPath, researchContent);
  console.log(`Created research document at: ${researchPath}`);

  // Step 5: Simulate approval (move task to review, then approve)
  console.log('\nStep 5: Simulating R&D task approval...');
  // Move task from backlog to review (simulating RD-Agent completing it)
  const reviewPath = path.join(process.env.TASKS_DIR, 'review', `${rdTaskId}.md`);
  fileOps.ensureDirectory(path.dirname(reviewPath));
  if (taskExists) {
    fileOps.moveFile(taskPath, reviewPath);
    console.log('Moved task to review');
  }
  
  // Now approve it
  await pm.approveTask(rdTaskId, 'test-user');
  console.log('Task approved');

  // Step 6: Check TODO.md was updated
  console.log('\n\nStep 6: Checking TODO.md...');
  const todoPath = path.join(process.env.PROJECT_ROOT, 'TODO.md');
  if (fileOps.fileExists(todoPath)) {
    const todoContent = fileOps.readFile(todoPath);
    const lines = todoContent.split('\n').slice(-10); // Last 10 lines
    console.log('Last 10 lines of TODO.md:');
    console.log(lines.join('\n'));
  } else {
    console.log('TODO.md not found (may need to be created)');
  }

  // Step 7: Check that tasks were created
  console.log('\n\nStep 7: Checking created tasks...');
  const backlogPath = workspace.resolveAgentPath('pm-agent', 'backlog');
  const backlogFiles = fileOps.readDir(backlogPath);
  const taskFiles = backlogFiles.filter(f => f.startsWith('TASK-') && f.endsWith('.json'));
  
  console.log(`Found ${taskFiles.length} task files in workspace:`);
  for (const file of taskFiles) {
    const content = fileOps.readFile(path.join(backlogPath, file));
    const task = JSON.parse(content);
    console.log(`- ${task.id}: ${task.title} (${task.assignedAgent})`);
  }

  console.log('\n=== Test Complete ===');
}

// Run test
testRDWorkflow().catch(console.error);
