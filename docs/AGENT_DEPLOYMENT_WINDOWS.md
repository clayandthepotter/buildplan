# BuildPlan AI Agent Deployment - Windows Server 2025

**Purpose**: Deploy self-managing AI team to Windows Server VPS with Telegram integration  
**Platform**: Windows Server 2025  
**Status**: Production-ready architecture  
**Updated**: 2026-02-02

---

## 🏗️ System Architecture for Windows

### Overview
```
Windows Server 2025 VPS
├── Agent Orchestrator (Node.js service via Windows Service/Task Scheduler)
│   ├── PM Agent (always running)
│   ├── Technical Architect Agent (on-demand)
│   ├── Backend Engineer Agent (on-demand)
│   ├── Frontend Engineer Agent (on-demand)
│   ├── DevOps Engineer Agent (on-demand)
│   ├── QA Engineer Agent (on-demand)
│   └── Documentation Agent (on-demand)
├── Telegram Bot (communication hub)
├── File Watcher (monitors requests and tasks directories)
├── GitHub Sync (bidirectional)
└── SQLite DB (state management)
```

### Advantages of Windows Server
- ✅ Familiar Remote Desktop access
- ✅ Easy file management via Explorer
- ✅ Visual monitoring tools
- ✅ PowerShell automation
- ✅ Windows Task Scheduler for reliability

---

## 📦 Tech Stack (Windows-Optimized)

### Core Components
- **Runtime**: Node.js 20+ LTS (Windows installer)
- **AI Provider**: OpenAI API or Anthropic Claude API
- **Communication**: Telegram Bot API
- **Version Control**: Git for Windows + GitHub CLI
- **File Monitoring**: chokidar (cross-platform)
- **Process Management**: PM2 (Windows-compatible) OR Windows Service
- **Database**: SQLite (better-sqlite3 with Windows binaries)
- **Scheduling**: node-cron OR Windows Task Scheduler

### Infrastructure
- **OS**: Windows Server 2025
- **Access**: Remote Desktop Protocol (RDP)
- **Monitoring**: Task Manager + Event Viewer + PM2 monit
- **Logs**: Winston + Windows Event Log

---

## 🚀 Deployment Steps for Windows Server

### 1. Initial Server Setup

**Connect via RDP**:
```
Remote Desktop → your-vps-ip:3389
Username: Administrator
Password: [your password]
```

**Install Prerequisites**:

1. **Install Node.js**
   - Download: https://nodejs.org/en/download/
   - Get: "20.x.x LTS - Windows Installer (.msi)"
   - Run installer (check "Add to PATH")
   - Verify in PowerShell:
   ```powershell
   node --version
   npm --version
   ```

2. **Install Git for Windows**
   - Download: https://git-scm.com/download/win
   - Run installer (use default options)
   - Verify:
   ```powershell
   git --version
   ```

3. **Install Visual C++ Build Tools** (for native modules)
   - Open PowerShell as Administrator:
   ```powershell
   npm install -g windows-build-tools
   # OR download Visual Studio Build Tools
   ```

4. **Install PM2** (optional but recommended)
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-service
   ```

---

### 2. Project Setup

**Clone Repository**:
```powershell
# Create project directory
cd C:\
mkdir Projects
cd Projects

# Clone repo
git clone https://github.com/[your-username]/buildplan.git
cd buildplan

# Create agent orchestrator directory
mkdir buildplan-agents
cd buildplan-agents
```

**Initialize Project**:
```powershell
# Initialize npm
npm init -y

# Install dependencies
npm install openai anthropic-sdk node-telegram-bot-api @octokit/rest chokidar node-cron better-sqlite3 dotenv winston
```

**Create .env file**:
```powershell
# Create .env
notepad .env
```

Paste this content:
```env
# AI Provider (choose one)
OPENAI_API_KEY=sk-your-openai-key
# OR
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-telegram-chat-id

# GitHub
GITHUB_TOKEN=ghp_your-github-token
GITHUB_REPO=your-username/buildplan

# Paths (Windows style)
PROJECT_ROOT=C:\Projects\buildplan
REQUESTS_DIR=C:\Projects\buildplan\requests
TASKS_DIR=C:\Projects\buildplan\tasks

# Config
PM_AGENT_INTERVAL=3600000
STANDUP_CRON=0 8 * * *
NODE_ENV=production
```

---

### 3. Create Agent Orchestrator

**Directory Structure**:
```
C:\Projects\buildplan\buildplan-agents\
├── package.json
├── .env
├── ecosystem.config.js (for PM2)
├── src\
│   ├── index.js
│   ├── agents\
│   │   ├── pm-agent.js
│   │   ├── architect-agent.js
│   │   ├── backend-agent.js
│   │   ├── frontend-agent.js
│   │   ├── devops-agent.js
│   │   ├── qa-agent.js
│   │   └── docs-agent.js
│   ├── telegram\
│   │   └── bot.js
│   ├── watchers\
│   │   ├── requests-watcher.js
│   │   └── tasks-watcher.js
│   ├── github\
│   │   └── sync.js
│   ├── db\
│   │   ├── database.js
│   │   └── models.js
│   └── utils\
│       ├── ai-client.js
│       ├── logger.js
│       └── file-ops.js
└── logs\
```

**Create src\index.js**:
```javascript
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

require('dotenv').config();

class AgentOrchestrator {
  constructor() {
    this.telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.agents = new Map();
    this.db = null;
    
    // Initialize agent modules
    this.pmAgent = null; // Will load dynamically
  }

  async start() {
    logger.info('🚀 Starting BuildPlan Agent Orchestrator (Windows Server)');
    
    try {
      // 1. Setup database
      await this.setupDatabase();
      logger.info('✅ Database initialized');
      
      // 2. Load PM Agent
      const { PMAgent } = require('./agents/pm-agent');
      this.pmAgent = new PMAgent(this);
      logger.info('✅ PM Agent loaded');
      
      // 3. Setup Telegram bot
      this.setupTelegramHandlers();
      logger.info('✅ Telegram bot ready');
      
      // 4. Setup file watchers
      this.setupFileWatchers();
      logger.info('✅ File watchers active');
      
      // 5. Setup cron jobs
      this.setupCronJobs();
      logger.info('✅ Cron jobs scheduled');
      
      // 6. Start PM Agent loop
      this.startPMAgentLoop();
      logger.info('✅ PM Agent running');
      
      // 7. Send startup notification
      await this.notifyTelegram('🚀 BuildPlan AI Team is now online! (Windows Server)');
      
      logger.info('✅ Agent Orchestrator fully operational');
    } catch (error) {
      logger.error('Failed to start orchestrator:', error);
      throw error;
    }
  }

  async setupDatabase() {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '..', 'agents.db');
    this.db = new Database(dbPath);
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT CHECK(status IN ('available', 'working', 'offline')),
        current_task_id TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        tasks_completed INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS task_queue (
        task_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS requests (
        request_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        completed_at DATETIME
      );
    `);
    
    logger.info('Database tables created/verified');
  }

  setupFileWatchers() {
    const requestsPath = process.env.REQUESTS_DIR + '\\pending';
    const tasksPath = process.env.TASKS_DIR + '\\in-progress';
    
    // Ensure directories exist
    if (!fs.existsSync(requestsPath)) {
      fs.mkdirSync(requestsPath, { recursive: true });
    }
    if (!fs.existsSync(tasksPath)) {
      fs.mkdirSync(tasksPath, { recursive: true });
    }
    
    // Watch for new requests (Windows path)
    chokidar.watch(requestsPath, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: true // Important on Windows
    }).on('add', async (filePath) => {
      logger.info(`📥 New request detected: ${filePath}`);
      try {
        await this.pmAgent.processNewRequest(filePath);
      } catch (error) {
        logger.error('Error processing request:', error);
      }
    });

    // Watch for task updates
    chokidar.watch(tasksPath, {
      persistent: true,
      awaitWriteFinish: true
    }).on('change', async (filePath) => {
      logger.info(`📝 Task updated: ${filePath}`);
      try {
        await this.pmAgent.handleTaskUpdate(filePath);
      } catch (error) {
        logger.error('Error handling task update:', error);
      }
    });
    
    logger.info(`Watching: ${requestsPath}`);
    logger.info(`Watching: ${tasksPath}`);
  }

  setupCronJobs() {
    // Daily standup at 8 AM
    cron.schedule(process.env.STANDUP_CRON || '0 8 * * *', async () => {
      logger.info('⏰ Running daily standup');
      try {
        await this.pmAgent.runDailyStandup();
      } catch (error) {
        logger.error('Error in daily standup:', error);
      }
    }, {
      timezone: "America/New_York" // Adjust to your timezone
    });

    // Weekly report Friday 4 PM
    cron.schedule('0 16 * * 5', async () => {
      logger.info('📊 Generating weekly report');
      try {
        await this.pmAgent.generateWeeklyReport();
      } catch (error) {
        logger.error('Error in weekly report:', error);
      }
    }, {
      timezone: "America/New_York"
    });
  }

  startPMAgentLoop() {
    const interval = parseInt(process.env.PM_AGENT_INTERVAL) || 3600000; // 1 hour
    setInterval(async () => {
      try {
        await this.pmAgent.tick();
      } catch (error) {
        logger.error('Error in PM Agent tick:', error);
      }
    }, interval);
    
    logger.info(`PM Agent checking every ${interval / 1000 / 60} minutes`);
  }

  setupTelegramHandlers() {
    // Handle errors
    this.telegramBot.on('polling_error', (error) => {
      logger.error('Telegram polling error:', error);
    });

    // /standup command
    this.telegramBot.onText(/\/standup/, async (msg) => {
      try {
        const report = await this.pmAgent.getLatestStandup();
        await this.telegramBot.sendMessage(msg.chat.id, report, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error in /standup:', error);
        await this.telegramBot.sendMessage(msg.chat.id, '❌ Error generating standup');
      }
    });

    // /approve command
    this.telegramBot.onText(/\/approve (.+)/, async (msg, match) => {
      try {
        const taskId = match[1].trim();
        await this.pmAgent.approveTask(taskId, msg.from.username);
        await this.telegramBot.sendMessage(msg.chat.id, `✅ ${taskId} approved`);
      } catch (error) {
        logger.error('Error in /approve:', error);
        await this.telegramBot.sendMessage(msg.chat.id, '❌ Error approving task');
      }
    });

    // /reject command
    this.telegramBot.onText(/\/reject (.+)/, async (msg, match) => {
      try {
        const parts = match[1].split(' ');
        const taskId = parts[0];
        const reason = parts.slice(1).join(' ') || 'No reason provided';
        await this.pmAgent.rejectTask(taskId, reason, msg.from.username);
        await this.telegramBot.sendMessage(msg.chat.id, `❌ ${taskId} rejected: ${reason}`);
      } catch (error) {
        logger.error('Error in /reject:', error);
        await this.telegramBot.sendMessage(msg.chat.id, '❌ Error rejecting task');
      }
    });

    // /status command
    this.telegramBot.onText(/\/status/, async (msg) => {
      try {
        const status = await this.pmAgent.getStatus();
        await this.telegramBot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
      } catch (error) {
        logger.error('Error in /status:', error);
        await this.telegramBot.sendMessage(msg.chat.id, '❌ Error getting status');
      }
    });

    // /help command
    this.telegramBot.onText(/\/help/, async (msg) => {
      const help = `
*BuildPlan AI Team Commands*

📊 /standup - Get latest standup report
📋 /status - View all in-progress tasks
✅ /approve TASK-XXX - Approve a task
❌ /reject TASK-XXX [reason] - Reject with reason
📈 /velocity - View team metrics (coming soon)
❓ /help - This message
      `;
      await this.telegramBot.sendMessage(msg.chat.id, help, { parse_mode: 'Markdown' });
    });
  }

  async notifyTelegram(message, options = {}) {
    try {
      await this.telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, options);
      logger.info(`Telegram notification sent: ${message.substring(0, 50)}...`);
    } catch (error) {
      logger.error('Failed to send Telegram message:', error);
    }
  }

  async shutdown() {
    logger.info('🛑 Shutting down Agent Orchestrator');
    if (this.db) {
      this.db.close();
    }
    process.exit(0);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  if (orchestrator) {
    await orchestrator.shutdown();
  }
});

process.on('SIGTERM', async () => {
  if (orchestrator) {
    await orchestrator.shutdown();
  }
});

// Start orchestrator
const orchestrator = new AgentOrchestrator();
orchestrator.start().catch((error) => {
  logger.error('Failed to start orchestrator:', error);
  process.exit(1);
});

module.exports = AgentOrchestrator;
```

---

### 4. Run as Windows Service (Option 1 - Recommended)

**Using PM2 with Windows Service**:

```powershell
# Navigate to project
cd C:\Projects\buildplan\buildplan-agents

# Start with PM2
pm2 start src\index.js --name buildplan-agents

# Install as Windows Service
pm2-service-install

# Configure service
pm2 save

# Start service
pm2 resurrect

# Check status
pm2 list
pm2 logs buildplan-agents
```

**PM2 will now**:
- Start automatically on server boot
- Restart if crashes
- Log all output
- Provide monitoring

---

### 5. Run with Task Scheduler (Option 2 - Alternative)

**Create PowerShell startup script**:

**start-agents.ps1**:
```powershell
# Set working directory
Set-Location "C:\Projects\buildplan\buildplan-agents"

# Start Node.js service
& "C:\Program Files\nodejs\node.exe" "src\index.js"
```

**Configure Task Scheduler**:
1. Open Task Scheduler (Win + R → `taskschd.msc`)
2. Create Task → "BuildPlan Agents"
3. Trigger: At startup
4. Action: Start program
   - Program: `powershell.exe`
   - Arguments: `-File "C:\Projects\buildplan\buildplan-agents\start-agents.ps1"`
5. Settings: Run whether user is logged on or not
6. OK

---

### 6. Monitoring on Windows

**View in Task Manager**:
1. Open Task Manager (Ctrl + Shift + Esc)
2. Details tab → Find `node.exe`
3. Monitor CPU, Memory usage

**View Logs**:
```powershell
# PM2 logs
pm2 logs buildplan-agents --lines 100

# Or view log files directly
Get-Content C:\Projects\buildplan\buildplan-agents\logs\combined.log -Wait -Tail 50
```

**Event Viewer** (if running as service):
1. Win + R → `eventvwr.msc`
2. Windows Logs → Application
3. Filter for "BuildPlan" or "PM2"

---

## 📱 Telegram Setup

### Get Bot Token

1. Open Telegram
2. Search for "@BotFather"
3. Send `/newbot`
4. Name: "BuildPlan PM Bot"
5. Username: "buildplan_pm_bot" (or similar)
6. Copy token → Add to `.env`

### Get Chat ID

1. Create Telegram group "BuildPlan Dev Team"
2. Add your bot to group
3. Send a message in group
4. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
5. Find `"chat":{"id":-1001234567890}` → Copy chat ID
6. Add to `.env`

---

## 🔧 Windows-Specific Tips

### Firewall Configuration
```powershell
# Allow Node.js through firewall (if needed for webhooks)
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### Auto-Start on Login
Create shortcut in:
```
C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\
```
Target: `C:\Projects\buildplan\buildplan-agents\start-agents.ps1`

### PowerShell Script for Quick Management

**manage-agents.ps1**:
```powershell
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start','stop','restart','status','logs')]
    [string]$Action
)

cd C:\Projects\buildplan\buildplan-agents

switch ($Action) {
    'start' {
        pm2 start src\index.js --name buildplan-agents
        Write-Host "✅ Agents started"
    }
    'stop' {
        pm2 stop buildplan-agents
        Write-Host "🛑 Agents stopped"
    }
    'restart' {
        pm2 restart buildplan-agents
        Write-Host "🔄 Agents restarted"
    }
    'status' {
        pm2 status
    }
    'logs' {
        pm2 logs buildplan-agents --lines 50
    }
}
```

Usage:
```powershell
.\manage-agents.ps1 -Action start
.\manage-agents.ps1 -Action logs
```

---

## 🚨 Troubleshooting Windows-Specific Issues

### Issue: "Cannot find module 'better-sqlite3'"
**Solution**:
```powershell
npm install --build-from-source better-sqlite3
```

### Issue: File watcher not detecting changes
**Solution**: Add delay in chokidar options:
```javascript
awaitWriteFinish: {
  stabilityThreshold: 2000,
  pollInterval: 100
}
```

### Issue: PM2 not persisting after reboot
**Solution**:
```powershell
pm2 save
pm2 startup
# Follow the command it provides
```

### Issue: Telegram bot not responding
**Solution**:
1. Check firewall isn't blocking outbound HTTPS
2. Test bot token:
```powershell
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

---

## 📊 Testing the Setup

### 1. Test File Watcher
```powershell
# Create test request
cd C:\Projects\buildplan\requests\pending
echo "# TEST-001: Test Request" > TEST-001.md
```
Check if PM Agent detects it (should see in logs or Telegram)

### 2. Test Telegram Commands
In Telegram group:
- Send `/help` → Should list commands
- Send `/status` → Should show current status
- Send `/standup` → Should show latest standup

### 3. Check Database
```powershell
# Install sqlite3 CLI
npm install -g sqlite3

# Query database
sqlite3 C:\Projects\buildplan\buildplan-agents\agents.db "SELECT * FROM agents;"
```

---

## 🎯 Next Steps

1. ✅ Complete agent logic (PM Agent, specialist agents)
2. ✅ Test locally on your Windows machine first
3. ✅ Deploy to Windows Server VPS
4. ✅ Configure auto-start
5. ✅ Submit first real request
6. ✅ Monitor via Telegram

---

**Advantages of Windows Server Setup**:
- ✅ Visual management via RDP
- ✅ Familiar environment
- ✅ Easy debugging with Task Manager
- ✅ Can run development tools (VS Code) directly on server
- ✅ Copy/paste files easily

**Ready to build the agent logic?** Let me know and I'll create all the agent modules (PM Agent, specialist agents, etc.)!
