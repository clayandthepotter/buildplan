# BuildPlan AI Agent Deployment System

**Purpose**: Deploy self-managing AI team to VPS with Telegram integration  
**Status**: Production-ready architecture  
**Updated**: 2026-02-02

---

## 🏗️ System Architecture

### Overview
```
VPS Server
├── Agent Orchestrator (Node.js service)
│   ├── PM Agent (always running)
│   ├── Technical Architect Agent (on-demand)
│   ├── Backend Engineer Agent (on-demand)
│   ├── Frontend Engineer Agent (on-demand)
│   ├── DevOps Engineer Agent (on-demand)
│   ├── QA Engineer Agent (on-demand)
│   └── Documentation Agent (on-demand)
├── Telegram Bot (communication hub)
├── File Watcher (monitors /requests and /tasks)
├── GitHub Sync (bidirectional)
└── SQLite DB (state management)
```

### Communication Flow
```
You (Telegram) 
    ↓
Telegram Bot
    ↓
Agent Orchestrator
    ↓
AI Agents (via OpenAI/Anthropic API)
    ↓
Execute Tasks (write code, create files)
    ↓
Commit to GitHub
    ↓
Notify You (Telegram)
```

---

## 📦 Tech Stack

### Core Components
- **Runtime**: Node.js 20+
- **AI Provider**: OpenAI API or Anthropic Claude API
- **Communication**: Telegram Bot API
- **Version Control**: GitHub API
- **File Monitoring**: chokidar (file watcher)
- **Process Management**: PM2
- **Database**: SQLite (agent state, task queue)
- **Scheduling**: node-cron (daily standups)

### Infrastructure
- **VPS**: Ubuntu 22.04 LTS (recommended)
- **Reverse Proxy**: Nginx (optional, for webhooks)
- **Monitoring**: PM2 monitoring
- **Logs**: Winston + PM2 logs

---

## 🤖 Agent Orchestrator Design

### File Structure
```
/buildplan-agents
├── package.json
├── ecosystem.config.js          # PM2 config
├── .env                         # Secrets
├── src/
│   ├── index.js                 # Main orchestrator
│   ├── agents/
│   │   ├── pm-agent.js          # PM Agent logic
│   │   ├── architect-agent.js
│   │   ├── backend-agent.js
│   │   ├── frontend-agent.js
│   │   ├── devops-agent.js
│   │   ├── qa-agent.js
│   │   └── docs-agent.js
│   ├── telegram/
│   │   ├── bot.js               # Telegram bot
│   │   └── handlers.js          # Message handlers
│   ├── watchers/
│   │   ├── requests-watcher.js  # Monitors /requests
│   │   └── tasks-watcher.js     # Monitors /tasks
│   ├── github/
│   │   ├── sync.js              # GitHub sync
│   │   └── commits.js           # Auto-commit logic
│   ├── scheduler/
│   │   └── cron-jobs.js         # Daily standup, etc.
│   ├── db/
│   │   ├── database.js          # SQLite setup
│   │   └── models.js            # Data models
│   └── utils/
│       ├── ai-client.js         # OpenAI/Claude wrapper
│       ├── logger.js            # Logging
│       └── file-ops.js          # File operations
└── logs/
```

---

## 📱 Telegram Integration

### Telegram Group Setup

**1. Create Telegram Bot**
- Talk to @BotFather
- `/newbot` → name it "BuildPlan PM Bot"
- Get bot token → save to `.env`

**2. Create Telegram Group**
- Name: "BuildPlan Dev Team"
- Add bot as admin
- Get chat ID

**3. Group Structure**
```
BuildPlan Dev Team (Telegram Group)
├── You (Human Executive)
├── PM Agent Bot (posts standups, asks approvals)
└── Notification Channel
    ├── Task assignments
    ├── Task completions
    ├── Blocker alerts
    ├── Approval requests
    └── Daily standups
```

### Message Format

**PM Agent Posts**:
```
🤖 PM Agent
📊 Daily Standup - 2026-02-02

In Progress: 3 tasks
Blocked: 0 tasks
Awaiting Review: 1 task
Completed Today: 2 tasks

⚠️ APPROVAL NEEDED:
- DESIGN-002: API Contracts (review)
  📁 /tasks/review/DESIGN-002.md

Type /approve DESIGN-002 to approve
Type /reject DESIGN-002 [reason] to reject
```

**Task Notifications**:
```
✅ Task Complete
TASK-045: Login API Implementation

Agent: Backend Engineer
Status: Complete
Coverage: 92%
Files: 3 changed

🔍 Ready for QA
```

**Blocker Alerts**:
```
🚨 BLOCKER ALERT
TASK-100: Login UI

Agent: Frontend Engineer
Issue: Login API endpoint returning wrong format
Needs: Human decision on API contract

Type /escalation-100 for details
```

### Telegram Commands

**For You (Human)**:
- `/standup` - Get latest standup report
- `/status` - View all in-progress tasks
- `/approve TASK-XXX` - Approve a task
- `/reject TASK-XXX [reason]` - Reject with reason
- `/request [description]` - Submit new project request
- `/assign TASK-XXX to [agent]` - Manual assignment
- `/block TASK-XXX [reason]` - Block a task
- `/velocity` - View team metrics
- `/help` - List all commands

**Agent Notifications (Auto-posted)**:
- Task started
- Task completed
- Task blocked
- Approval needed
- Daily standup
- Weekly report

---

## 🔄 Agent Execution Model

### PM Agent (Always Running)

**Triggers**:
- Scheduled: Every hour (check for new requests/tasks)
- Cron: Daily at 8 AM (standup)
- Cron: Weekly Friday 4 PM (weekly report)
- Event: New file in `/requests/pending/`
- Event: Task status change
- Command: Telegram `/standup`

**Workflow**:
```javascript
// Pseudo-code
async function runPMAgent() {
  // 1. Check for new requests
  const newRequests = await checkRequestsPending();
  for (const request of newRequests) {
    await analyzeRequest(request);
    await createTaskBreakdown(request);
    await notifyHumanViaTeleg ram(request);
  }
  
  // 2. Check for tasks ready to assign
  const readyTasks = await getTasksWithMetDependencies();
  for (const task of readyTasks) {
    const agent = await selectAgent(task);
    if (agent.available) {
      await assignTask(task, agent);
      await notifyAgentAndHuman(task, agent);
    }
  }
  
  // 3. Check for blockers
  const blockedTasks = await checkForBlockers();
  if (blockedTasks.length > 0) {
    await escalateToHuman(blockedTasks);
  }
  
  // 4. Update metrics
  await updateMetrics();
}
```

### Specialist Agents (On-Demand)

**Triggers**:
- PM Agent assigns task
- Task file appears in their queue
- Telegram notification received

**Workflow**:
```javascript
// Pseudo-code for Backend Agent
async function runBackendAgent(taskId) {
  // 1. Read task file
  const task = await readTaskFile(taskId);
  
  // 2. Update status
  await updateTaskStatus(taskId, 'Working');
  await notifyTelegram(`Backend Agent starting ${taskId}`);
  
  // 3. Load context
  const designDoc = await loadDesignDoc(task.dependencies);
  const existingCode = await loadRelevantCode();
  
  // 4. Generate code via AI
  const prompt = buildPrompt(task, designDoc, existingCode);
  const code = await callAI(prompt); // OpenAI/Claude API
  
  // 5. Write files
  await writeFiles(code);
  
  // 6. Run tests
  const testResults = await runTests();
  
  // 7. Update task
  if (testResults.passed) {
    await updateTaskStatus(taskId, 'Complete');
    await updateTaskFile(taskId, {
      status: 'Complete',
      coverage: testResults.coverage,
      notes: 'Implementation complete, all tests passing'
    });
    await notifyTelegram(`✅ ${taskId} complete`);
    await notifyPMAgent(taskId, 'complete');
  } else {
    await updateTaskStatus(taskId, 'Blocked');
    await notifyTelegram(`🚨 ${taskId} blocked: tests failing`);
    await escalateToHuman(taskId, testResults.errors);
  }
}
```

---

## 💾 Database Schema

### SQLite Tables

```sql
-- Agent state tracking
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT CHECK(status IN ('available', 'working', 'offline')),
  current_task_id TEXT,
  last_active TIMESTAMP,
  tasks_completed INTEGER DEFAULT 0,
  average_task_time REAL
);

-- Task queue
CREATE TABLE task_queue (
  task_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  blocked_reason TEXT
);

-- Request tracking
CREATE TABLE requests (
  request_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Metrics
CREATE TABLE metrics (
  date DATE PRIMARY KEY,
  tasks_completed INTEGER,
  average_cycle_time REAL,
  blocked_time_percent REAL,
  human_approval_wait_time REAL
);

-- Telegram messages (audit trail)
CREATE TABLE telegram_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT,
  from_user TEXT,
  text TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Deployment Steps

### 1. VPS Setup

```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Git
apt install -y git

# Clone buildplan repo
cd /opt
git clone https://github.com/[your-username]/buildplan.git
cd buildplan

# Create agent orchestrator directory
mkdir buildplan-agents
cd buildplan-agents
```

### 2. Agent Orchestrator Setup

```bash
# Initialize npm project
npm init -y

# Install dependencies
npm install \
  openai \
  anthropic-sdk \
  node-telegram-bot-api \
  @octokit/rest \
  chokidar \
  node-cron \
  better-sqlite3 \
  dotenv \
  winston

# Create .env file
cat > .env << EOF
# AI Provider
OPENAI_API_KEY=sk-your-key
# OR
ANTHROPIC_API_KEY=sk-ant-your-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# GitHub
GITHUB_TOKEN=ghp_your-token
GITHUB_REPO=your-username/buildplan

# Paths
PROJECT_ROOT=/opt/buildplan
REQUESTS_DIR=/opt/buildplan/requests
TASKS_DIR=/opt/buildplan/tasks

# Config
PM_AGENT_INTERVAL=3600000  # 1 hour in ms
STANDUP_CRON=0 8 * * *     # Daily 8 AM
EOF

# Set permissions
chmod 600 .env
```

### 3. Create Main Orchestrator

**src/index.js**:
```javascript
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const chokidar = require('chokidar');
const { PMAgent } = require('./agents/pm-agent');
const { setupDatabase } = require('./db/database');
const logger = require('./utils/logger');

require('dotenv').config();

class AgentOrchestrator {
  constructor() {
    this.telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.pmAgent = new PMAgent(this);
    this.agents = new Map();
    this.db = null;
  }

  async start() {
    logger.info('🚀 Starting BuildPlan Agent Orchestrator');
    
    // 1. Setup database
    this.db = await setupDatabase();
    logger.info('✅ Database initialized');
    
    // 2. Setup Telegram bot
    this.setupTelegramHandlers();
    logger.info('✅ Telegram bot ready');
    
    // 3. Setup file watchers
    this.setupFileWatchers();
    logger.info('✅ File watchers active');
    
    // 4. Setup cron jobs
    this.setupCronJobs();
    logger.info('✅ Cron jobs scheduled');
    
    // 5. Start PM Agent loop
    this.startPMAgentLoop();
    logger.info('✅ PM Agent running');
    
    // 6. Send startup notification
    await this.notifyTelegram('🚀 BuildPlan AI Team is now online and ready!');
    
    logger.info('✅ Agent Orchestrator fully operational');
  }

  setupFileWatchers() {
    // Watch for new requests
    chokidar.watch(process.env.REQUESTS_DIR + '/pending', {
      persistent: true,
      ignoreInitial: false
    }).on('add', async (path) => {
      logger.info(`📥 New request detected: ${path}`);
      await this.pmAgent.processNewRequest(path);
    });

    // Watch for task updates
    chokidar.watch(process.env.TASKS_DIR + '/in-progress', {
      persistent: true
    }).on('change', async (path) => {
      logger.info(`📝 Task updated: ${path}`);
      await this.pmAgent.handleTaskUpdate(path);
    });
  }

  setupCronJobs() {
    // Daily standup at 8 AM
    cron.schedule(process.env.STANDUP_CRON, async () => {
      logger.info('⏰ Running daily standup');
      await this.pmAgent.runDailyStandup();
    });

    // Weekly report Friday 4 PM
    cron.schedule('0 16 * * 5', async () => {
      logger.info('📊 Generating weekly report');
      await this.pmAgent.generateWeeklyReport();
    });
  }

  startPMAgentLoop() {
    setInterval(async () => {
      await this.pmAgent.tick();
    }, parseInt(process.env.PM_AGENT_INTERVAL));
  }

  setupTelegramHandlers() {
    this.telegramBot.onText(/\/standup/, async (msg) => {
      const report = await this.pmAgent.getLatestStandup();
      await this.telegramBot.sendMessage(msg.chat.id, report, { parse_mode: 'Markdown' });
    });

    this.telegramBot.onText(/\/approve (.+)/, async (msg, match) => {
      const taskId = match[1];
      await this.pmAgent.approveTask(taskId, msg.from.username);
      await this.telegramBot.sendMessage(msg.chat.id, `✅ ${taskId} approved`);
    });

    this.telegramBot.onText(/\/reject (.+) (.+)/, async (msg, match) => {
      const taskId = match[1];
      const reason = match[2];
      await this.pmAgent.rejectTask(taskId, reason, msg.from.username);
      await this.telegramBot.sendMessage(msg.chat.id, `❌ ${taskId} rejected`);
    });

    this.telegramBot.onText(/\/status/, async (msg) => {
      const status = await this.pmAgent.getStatus();
      await this.telegramBot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
    });

    this.telegramBot.onText(/\/help/, async (msg) => {
      const help = `
*BuildPlan AI Team Commands*

/standup - Get latest standup report
/status - View all in-progress tasks
/approve TASK-XXX - Approve a task
/reject TASK-XXX [reason] - Reject with reason
/velocity - View team metrics
/help - This message
      `;
      await this.telegramBot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
    });
  }

  async notifyTelegram(message, options = {}) {
    try {
      await this.telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, options);
    } catch (error) {
      logger.error('Failed to send Telegram message:', error);
    }
  }
}

// Start orchestrator
const orchestrator = new AgentOrchestrator();
orchestrator.start().catch((error) => {
  logger.error('Failed to start orchestrator:', error);
  process.exit(1);
});
```

### 4. PM2 Configuration

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'buildplan-agents',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 5. Start Service

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# View logs
pm2 logs buildplan-agents

# Monitor
pm2 monit
```

---

## 🔐 Security Best Practices

### Environment Variables
- Never commit `.env` to Git
- Use strong API keys
- Rotate keys regularly

### VPS Hardening
```bash
# Setup firewall
ufw allow 22    # SSH
ufw allow 443   # HTTPS (if using webhooks)
ufw enable

# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Create non-root user
adduser buildplan
usermod -aG sudo buildplan
```

### Telegram Security
- Only accept commands from authorized users
- Validate all user inputs
- Rate limit commands

---

## 📊 Monitoring & Maintenance

### PM2 Monitoring
```bash
# View status
pm2 status

# View logs
pm2 logs buildplan-agents --lines 100

# Restart service
pm2 restart buildplan-agents

# Update code and restart
cd /opt/buildplan
git pull
pm2 restart buildplan-agents
```

### Health Checks
```bash
# Check if agents are responsive
curl localhost:3000/health

# Check database
sqlite3 /opt/buildplan/buildplan-agents/agents.db "SELECT * FROM agents;"

# Check Telegram bot
# Send /status in Telegram group
```

---

## 🎯 Next Steps

1. **Set up VPS**: Provision server, install dependencies
2. **Create Telegram Bot**: Get bot token
3. **Implement Orchestrator**: Build the code (I can help with this)
4. **Deploy**: Copy to VPS, configure, start with PM2
5. **Test**: Submit test request, verify agents respond
6. **Monitor**: Check Telegram notifications work

---

**Ready to implement?** Let me know and I'll create the full agent orchestrator code!
