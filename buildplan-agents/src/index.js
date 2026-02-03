const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const chokidar = require('chokidar');
const path = require('path');
const Database = require('better-sqlite3');
const logger = require('./utils/logger');
const fileOps = require('./utils/file-ops');

require('dotenv').config();

class AgentOrchestrator {
  constructor() {
    this.telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.pmAgent = null;
    this.db = null;
    
    // Specialist AI agents
    this.agents = {
      architect: null,
      backend: null,
      frontend: null,
      devops: null,
      qa: null,
      docs: null
    };
  }

  async start() {
    logger.info('🚀 Starting BuildPlan Agent Orchestrator');
    
    try {
      // 1. Setup database
      await this.setupDatabase();
      logger.info('✅ Database initialized');
      
      // 2. Load PM Agent
      const { PMAgent } = require('./agents/pm-agent');
      this.pmAgent = new PMAgent(this);
      logger.info('✅ PM Agent loaded');
      
      // 2b. Load Specialist Agents
      this.loadSpecialistAgents();
      logger.info('✅ Specialist agents loaded');
      
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
      await this.notifyTelegram('🚀 BuildPlan AI Team is now online!\n\nSend /help for available commands.');
      
      logger.info('✅ Agent Orchestrator fully operational');
    } catch (error) {
      logger.error('Failed to start orchestrator:', error);
      throw error;
    }
  }

  loadSpecialistAgents() {
    const BackendAgent = require('./agents/backend-agent');
    const ArchitectAgent = require('./agents/architect-agent');
    
    this.agents.backend = new BackendAgent(this);
    this.agents.architect = new ArchitectAgent(this);
    
    // TODO: Add remaining agents as they're implemented
    // this.agents.frontend = new FrontendAgent(this);
    // this.agents.devops = new DevOpsAgent(this);
    // this.agents.qa = new QAAgent(this);
    // this.agents.docs = new DocsAgent(this);
    
    logger.info('Loaded agents: Backend, Architect');
  }
  
  /**
   * Get appropriate agent for a task based on task type
   */
  getAgentForTask(taskType) {
    const agentMap = {
      'design': this.agents.architect,
      'architecture': this.agents.architect,
      'backend': this.agents.backend,
      'backend-api': this.agents.backend,
      'api': this.agents.backend,
      'frontend': this.agents.frontend,
      'ui': this.agents.frontend,
      'devops': this.agents.devops,
      'database': this.agents.devops,
      'qa': this.agents.qa,
      'testing': this.agents.qa,
      'docs': this.agents.docs,
      'documentation': this.agents.docs
    };
    
    const agent = agentMap[taskType.toLowerCase()];
    
    if (!agent) {
      logger.warn(`No agent found for task type: ${taskType}`);
      return null;
    }
    
    if (!agent.isAvailable()) {
      logger.warn(`${agent.role} is not available (workload: ${agent.workload})`);
      return null;
    }
    
    return agent;
  }

  async setupDatabase() {
    const dbPath = path.join(__dirname, '..', 'agents.db');
    this.db = new Database(dbPath);
    
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
    const requestsPath = path.join(process.env.REQUESTS_DIR, 'pending');
    const tasksPath = path.join(process.env.TASKS_DIR, 'in-progress');
    
    // Ensure directories exist
    fileOps.ensureDirectory(requestsPath);
    fileOps.ensureDirectory(tasksPath);
    
    // Watch for new requests
    chokidar.watch(requestsPath, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    }).on('add', async (filePath) => {
      // Skip if it's the directory itself
      if (filePath === requestsPath) return;
      
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
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
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
    });

    // Weekly report Friday 4 PM
    cron.schedule('0 16 * * 5', async () => {
      logger.info('📊 Generating weekly report');
      try {
        await this.pmAgent.generateWeeklyReport();
      } catch (error) {
        logger.error('Error in weekly report:', error);
      }
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

    // /request command - submit new request via Telegram
    this.telegramBot.onText(/\/request (.+)/, async (msg, match) => {
      try {
        const description = match[1];
        const username = msg.from.username || msg.from.first_name;
        
        await this.telegramBot.sendMessage(msg.chat.id, `📝 Creating request: "${description}"`);
        
        // Create request file
        const requestId = `REQ-${Date.now()}`;
        const requestContent = `# ${requestId}: ${description.substring(0, 50)}\n\n` +
          `**Submitted By**: ${username}\n` +
          `**Date**: ${new Date().toISOString()}\n` +
          `**Priority**: Medium\n` +
          `**Status**: Pending\n\n` +
          `## What Do You Want Built?\n\n${description}\n\n` +
          `## Success Criteria\n\n[PM Agent will analyze and define]\n`;
        
        const requestPath = path.join(process.env.REQUESTS_DIR, 'pending', `${requestId}.md`);
        fileOps.writeFile(requestPath, requestContent);
        
        logger.info(`Request created: ${requestId} by ${username}`);
        
      } catch (error) {
        logger.error('Error in /request:', error);
        await this.telegramBot.sendMessage(msg.chat.id, '❌ Error creating request');
      }
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

📝 /request [description] - Submit new project request
📊 /standup - Get latest standup report
📋 /status - View all in-progress tasks
✅ /approve TASK-XXX - Approve a task
❌ /reject TASK-XXX [reason] - Reject with reason
❓ /help - This message

*Example:*
/request Build a login system with email and password
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
