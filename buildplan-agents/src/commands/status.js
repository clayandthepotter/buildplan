const AgentCollaboration = require('../services/agentCollaboration');
const ProgressTracker = require('../services/progressTracker');

/**
 * BuildPlan Status Dashboard
 * Real-time view of agent statuses, tasks, and collaboration
 * Usage: node src/commands/status.js [--watch] [--agent <name>]
 */

const AGENTS = [
  'pm-agent',
  'rd-agent',
  'backend-agent',
  'frontend-agent',
  'architect-agent',
  'devops-agent',
  'qa-agent',
  'docs-agent'
];

/**
 * Format agent status with emoji
 */
function formatStatus(status) {
  const statusMap = {
    idle: { emoji: '💤', color: '\x1b[90m' }, // Gray
    working: { emoji: '⚙️', color: '\x1b[36m' }, // Cyan
    blocked: { emoji: '🚫', color: '\x1b[31m' }, // Red
    unknown: { emoji: '❓', color: '\x1b[90m' }  // Gray
  };

  const info = statusMap[status] || statusMap.unknown;
  return `${info.emoji} ${info.color}${status.toUpperCase()}\x1b[0m`;
}

/**
 * Display single agent status
 */
function displayAgentStatus(agentName) {
  const status = AgentCollaboration.getAgentStatus(agentName);
  const messages = AgentCollaboration.getMessages(agentName, 'sent');

  console.log(`\n${agentName.toUpperCase().replace('-', ' ')}`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Status: ${formatStatus(status.status)}`);

  if (status.metadata && Object.keys(status.metadata).length > 0) {
    if (status.metadata.taskId) {
      console.log(`Current Task: ${status.metadata.taskId}`);
    }
    if (status.metadata.phase) {
      console.log(`Phase: ${status.metadata.phase}`);
    }
    if (status.metadata.error) {
      console.log(`Error: \x1b[31m${status.metadata.error}\x1b[0m`);
    }
  }

  if (messages.length > 0) {
    console.log(`Unread Messages: ${messages.length}`);
  }

  if (status.updatedAt) {
    const updated = new Date(status.updatedAt);
    const now = new Date();
    const diff = Math.floor((now - updated) / 1000);
    
    let timeAgo;
    if (diff < 60) {
      timeAgo = `${diff}s ago`;
    } else if (diff < 3600) {
      timeAgo = `${Math.floor(diff / 60)}m ago`;
    } else {
      timeAgo = `${Math.floor(diff / 3600)}h ago`;
    }
    
    console.log(`Last Update: ${timeAgo}`);
  }
}

/**
 * Display all agent statuses
 */
function displayAllAgents() {
  console.clear();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     BuildPlan Agent Status Dashboard     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\nUpdated: ${new Date().toLocaleTimeString()}\n`);

  for (const agentName of AGENTS) {
    displayAgentStatus(agentName);
  }

  // Display collaboration metrics
  console.log('\n\n╔══════════════════════════════════════════╗');
  console.log('║         Collaboration Metrics            ║');
  console.log('╚══════════════════════════════════════════╝');

  const blockedTasks = AgentCollaboration.getBlockedTasks();
  const openBlockers = AgentCollaboration.getOpenBlockers();

  console.log(`\nBlocked by Dependencies: ${blockedTasks.length}`);
  console.log(`Open Blockers: ${openBlockers.length}`);

  if (openBlockers.length > 0) {
    console.log('\nTop Blockers:');
    openBlockers.slice(0, 3).forEach(blocker => {
      console.log(`  • ${blocker.taskId} (${blocker.severity}): ${blocker.description.substring(0, 50)}...`);
    });
  }

  // Display progress summary
  console.log('\n\n╔══════════════════════════════════════════╗');
  console.log('║           Progress Summary               ║');
  console.log('╚══════════════════════════════════════════╝\n');

  try {
    const progress = ProgressTracker.getOverallProgress();
    
    console.log(`Total Tasks: ${progress.total}`);
    console.log(`Completed: ${progress.completed} (${Math.round((progress.completed / progress.total) * 100)}%)`);
    console.log(`In Progress: ${progress.inProgress}`);
    console.log(`Blocked: ${progress.blocked}`);
    console.log(`Velocity: ${progress.velocity.toFixed(1)} tasks/day`);
  } catch (error) {
    console.log('Progress data not available');
  }

  console.log('\n\n[Press Ctrl+C to exit]');
}

/**
 * Display collaboration report
 */
function displayCollaborationReport() {
  console.clear();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      Collaboration Report                ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const report = AgentCollaboration.generateReport();
  console.log(report);
}

/**
 * Main status command
 */
async function runStatus(options = {}) {
  const { watch = false, agent = null, collaboration = false } = options;

  if (collaboration) {
    displayCollaborationReport();
    return;
  }

  if (agent) {
    // Display single agent
    if (!AGENTS.includes(agent)) {
      console.error(`Unknown agent: ${agent}`);
      console.error(`Available agents: ${AGENTS.join(', ')}`);
      process.exit(1);
    }

    displayAgentStatus(agent);

    if (watch) {
      setInterval(() => {
        console.clear();
        displayAgentStatus(agent);
      }, 2000);
    }
  } else {
    // Display all agents
    displayAllAgents();

    if (watch) {
      setInterval(() => {
        displayAllAgents();
      }, 2000);
    }
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
BuildPlan Status Dashboard

Usage: node src/commands/status.js [options]

Options:
  --watch                     Refresh every 2 seconds
  --agent <name>              Show status for specific agent
  --collaboration             Show collaboration report

Available Agents:
  ${AGENTS.join(', ')}

Examples:
  node src/commands/status.js
  node src/commands/status.js --watch
  node src/commands/status.js --agent backend-agent
  node src/commands/status.js --agent backend-agent --watch
  node src/commands/status.js --collaboration
`);
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = {
    watch: args.includes('--watch') || args.includes('-w'),
    agent: args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null,
    collaboration: args.includes('--collaboration') || args.includes('-c')
  };

  runStatus(options);
}

module.exports = { runStatus, displayAgentStatus, displayAllAgents };
