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
    // If this bot token was previously configured for webhook delivery, Telegram will
    // reject getUpdates polling with a 409 conflict. We proactively clear any webhook
    // so local dev polling "just works".
    this._ensurePollingMode = async () => {
      try {
        await this.telegramBot.deleteWebHook({ drop_pending_updates: true });
      } catch (e) {
        // Non-fatal; polling may still work if no webhook is set.
        logger.warn('Could not delete Telegram webhook (continuing):', e.message || e);
      }
    };
    this.pmAgent = null;
    this.db = null;
    this.pendingApproval = null; // Stores state when waiting for user information
    
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
      
      // 1b. Setup Team Communication Service
      const TeamCommsService = require('./services/teamComms');
      this.teamComms = new TeamCommsService(this);
      logger.info('✅ Team Communication service loaded');
      
      // 2. Load PM Agent
      const { PMAgent } = require('./agents/pm-agent');
      this.pmAgent = new PMAgent(this);
      logger.info('✅ PM Agent loaded');
      
      // 2b. Load Specialist Agents
      this.loadSpecialistAgents();
      logger.info('✅ Specialist agents loaded');
      
      // 3. Setup Telegram bot
      await this._ensurePollingMode();
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
      await this.teamComms.teamAnnouncement('🚀 <b>BuildPlan AI Team is now online!</b>\n\n' +
        '👥 All agents are ready to collaborate\n' +
        '💬 You can see all team communication here\n' +
        '💡 Send /help for available commands');
      
      logger.info('✅ Agent Orchestrator fully operational');
    } catch (error) {
      logger.error('Failed to start orchestrator:', error);
      throw error;
    }
  }

  loadSpecialistAgents() {
    const BackendAgent = require('./agents/backend-agent');
    const ArchitectAgent = require('./agents/architect-agent');
    const RDAgent = require('./agents/rd-agent');
    
    this.agents.backend = new BackendAgent(this);
    this.agents.architect = new ArchitectAgent(this);
    this.agents.rd = new RDAgent(this);
    
    // TODO: Add remaining agents as they're implemented
    // this.agents.frontend = new FrontendAgent(this);
    // this.agents.devops = new DevOpsAgent(this);
    // this.agents.qa = new QAAgent(this);
    // this.agents.docs = new DocsAgent(this);
    
    logger.info('Loaded agents: Backend, Architect, R&D');
  }
  
  /**
   * Get appropriate agent for a task based on task type
   */
  getAgentForTask(taskType) {
    const agentMap = {
      'rd': this.agents.rd,
      'research': this.agents.rd,
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
    // Store last request ID for quick approval
    this.lastRequestId = null;
    
    // Handle errors
    this.telegramBot.on('polling_error', (error) => {
      logger.error('Telegram polling error:', error);
    });

    // /request command - submit new request via Telegram (supports multiline)
    this.telegramBot.onText(/\/request([\s\S]+)/, async (msg, match) => {
      try {
        const description = match[1].trim();
        
        if (!description) {
          await this.sendFormattedMessage(msg.chat.id, '❌ Please provide a description after /request');
          return;
        }
        
        const username = msg.from.username || msg.from.first_name;
        
        // Create request file
        const requestId = `REQ-${Date.now()}`;
        this.lastRequestId = requestId; // Store for quick approval
        
        // Extract title from description (first line or first 50 chars)
        const firstLine = description.split('\n')[0].replace(/^#+\s*/, '').trim();
        const title = firstLine.substring(0, 50) || 'New Request';
        
        const requestContent = `# ${requestId}: ${title}\n\n` +
          `**Submitted By**: ${username}\n` +
          `**Date**: ${new Date().toISOString()}\n` +
          `**Priority**: Medium\n` +
          `**Status**: Pending\n\n` +
          `${description}\n`;
        
        const requestPath = path.join(process.env.REQUESTS_DIR, 'pending', `${requestId}.md`);
        fileOps.writeFile(requestPath, requestContent);
        
        await this.sendFormattedMessage(msg.chat.id, 
          `📝 <b>Request Created</b>\n<i>${title}...</i>\n\n⏳ Analyzing...`
        );
        
        logger.info(`Request created: ${requestId} by ${username}`);
        
      } catch (error) {
        logger.error('Error in /request:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ <b>Error</b>: Could not create request');
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

    // /modify command - request changes to pending analysis
    this.telegramBot.onText(/\/modify([\s\S]+)/, async (msg, match) => {
      try {
        const modifications = match[1].trim();
        
        if (!modifications) {
          await this.sendFormattedMessage(msg.chat.id, '❌ Please specify what you want to modify');
          return;
        }
        
        if (!this.lastRequestId) {
          await this.sendFormattedMessage(msg.chat.id, '❌ No active request to modify. Submit one first with /request');
          return;
        }
        
        await this.pmAgent.modifyRequest(this.lastRequestId, modifications, msg.from.username);
      } catch (error) {
        logger.error('Error in /modify:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ <b>Error</b>: Could not modify request');
      }
    });
    
    // /provide command - submit required information
    this.telegramBot.onText(/\/provide([\s\S]+)/, async (msg, match) => {
      try {
        const information = match[1].trim();
        
        if (!information) {
          await this.sendFormattedMessage(msg.chat.id, '❌ Please provide the requested information');
          return;
        }
        
        await this.pmAgent.provideInformation(information, msg.from.username);
      } catch (error) {
        logger.error('Error in /provide:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ <b>Error</b>: Could not process information');
      }
    });
    
    // /approve command - now supports just /approve (uses last request)
    this.telegramBot.onText(/\/approve\s*(.*)/, async (msg, match) => {
      try {
        let taskId = match[1].trim();
        
        // If no ID provided, use last request
        if (!taskId && this.lastRequestId) {
          taskId = this.lastRequestId;
        }
        
        if (!taskId) {
          await this.sendFormattedMessage(msg.chat.id, '❌ No request to approve. Submit one first with /request');
          return;
        }
        
        await this.pmAgent.approveTask(taskId, msg.from.username);
      } catch (error) {
        logger.error('Error in /approve:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ <b>Error</b>: Could not approve');
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

    // /blockers command - show all blocked tasks
    this.telegramBot.onText(/\/blockers/, async (msg) => {
      try {
        const PMConversation = require('./services/pmConversation');
        const pmConvo = new PMConversation();
        
        const blockedTasks = await pmConvo.getBlockedTasks();
        const summary = pmConvo.formatBlockedTasksSummary(blockedTasks);
        
        await this.sendFormattedMessage(msg.chat.id, summary);
      } catch (error) {
        logger.error('Error in /blockers:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ Error retrieving blocked tasks');
      }
    });

    // /blocker [task-id] - get detailed blocker information for a specific task
    this.telegramBot.onText(/\/blocker (.+)/, async (msg, match) => {
      try {
        const taskId = match[1].trim();
        const PMConversation = require('./services/pmConversation');
        const pmConvo = new PMConversation();
        
        const taskInfo = await pmConvo.queryTask(taskId);
        const formattedInfo = pmConvo.formatTaskInfo(taskInfo);
        
        await this.sendFormattedMessage(msg.chat.id, formattedInfo);
      } catch (error) {
        logger.error('Error in /blocker:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ Error retrieving task information');
      }
    });

    // /todo command - show TODO.md
    this.telegramBot.onText(/\/todo/, async (msg) => {
      try {
        const todoPath = path.join(process.env.PROJECT_ROOT, 'TODO.md');
        const content = fileOps.readFile(todoPath);
        
        if (content) {
          // Format markdown for Telegram - let sendFormattedMessage handle splitting
          const formatted = this.formatMarkdownForTelegram(content);
          
          await this.sendFormattedMessage(msg.chat.id, 
            `📋 <b>TODO.md</b>\n\n${formatted}`
          );
        } else {
          await this.sendFormattedMessage(msg.chat.id, '⚠️ TODO.md not found');
        }
      } catch (error) {
        logger.error('Error in /todo:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ Error reading TODO.md');
      }
    });
    
    // /doc command - retrieve any document
    this.telegramBot.onText(/\/doc (.+)/, async (msg, match) => {
      try {
        const filename = match[1].trim();
        const docPath = path.join(process.env.PROJECT_ROOT, filename);
        const content = fileOps.readFile(docPath);
        
        if (content) {
          // Format markdown files, show raw for others - let sendFormattedMessage handle splitting
          const formatted = filename.endsWith('.md') ?
            this.formatMarkdownForTelegram(content) :
            `<pre>${this.escapeHtml(content)}</pre>`;
          
          await this.sendFormattedMessage(msg.chat.id, 
            `📄 <b>${filename}</b>\n\n${formatted}`
          );
        } else {
          await this.sendFormattedMessage(msg.chat.id, `⚠️ File not found: ${filename}`);
        }
      } catch (error) {
        logger.error('Error in /doc:', error);
        await this.sendFormattedMessage(msg.chat.id, '❌ Error reading document');
      }
    });
    
    // /template command - show request template
    this.telegramBot.onText(/\/template/, async (msg) => {
      const template = `📝 <b>Request Template</b>\n\n` +
        `Copy and fill out this template for best results:\n\n` +
        `<pre>` +
        `/request\n\n` +
        `<b>FEATURE:</b> [Short name]\n\n` +
        `<b>WHAT:</b> [What should be built?]\n\n` +
        `<b>WHY:</b> [Why is this needed?]\n\n` +
        `<b>WHO:</b> [Who will use this?]\n\n` +
        `<b>SUCCESS:</b> [How will we know it works?]\n\n` +
        `<b>NOTES:</b> [Any technical requirements, constraints, or context]` +
        `</pre>\n\n` +
        `<b>Example:</b>\n` +
        `<pre>/request\n\n` +
        `FEATURE: User Authentication\n\n` +
        `WHAT: Email/password login system with JWT tokens\n\n` +
        `WHY: Users need secure accounts to access personalized features\n\n` +
        `WHO: All web app users\n\n` +
        `SUCCESS: Users can register, login, and stay logged in across sessions\n\n` +
        `NOTES: Use bcrypt for passwords, refresh tokens for sessions</pre>`;
      
      await this.sendFormattedMessage(msg.chat.id, template);
    });

    // /help command
    this.telegramBot.onText(/\/help/, async (msg) => {
      const help = `<b>🤖 BuildPlan AI Team</b>\n\n` +
        `💬 <b>Talk to your PM!</b> Just send a message:\n` +
        `   <i>"What blockers do we have?"</i>\n` +
        `   <i>"What's the status of the project?"</i>\n` +
        `   <i>"What should we work on next?"</i>\n\n` +
        `<b>Core Commands:</b>\n` +
        `📝 /request [description] - Submit work request\n` +
        `📑 /template - Get structured request template\n` +
        `✏️ /modify [changes] - Request changes to analysis\n` +
        `✅ /approve - Approve latest request\n` +
        `📝 /provide [info] - Submit required information\n` +
        `📋 /status - Check team progress\n\n` +
        `<b>Info & Reports:</b>\n` +
        `📊 /standup - Daily team report\n` +
        `📋 /todo - View TODO.md\n` +
        `📄 /doc [filename] - Get any document\n\n` +
        `<b>Debugging & Blockers:</b>\n` +
        `🚫 /blockers - List all blocked tasks\n` +
        `🔍 /blocker [task-id] - Get detailed blocker info\n\n` +
        `<b>Quick Start:</b>\n` +
        `1. Type <code>/template</code> to see request format\n` +
        `2. Submit with <code>/request [details]</code>\n` +
        `3. Review analysis, use <code>/modify</code> if needed\n` +
        `4. Approve with <code>/approve</code>\n` +
        `5. Provide any required info if asked\n` +
        `6. Watch agents build it!\n` +
        `7. If tasks are blocked, just ask me!`;
      
      await this.sendFormattedMessage(msg.chat.id, help);
    });
    
    // Catch-all: Handle conversational messages (non-commands)
    this.telegramBot.on('message', async (msg) => {
      try {
        // Always log chat metadata to help configure group chat routing
        // (especially the numeric chat.id for supergroups: -100xxxxxxxxxx)
        const chatTitle = msg.chat && (msg.chat.title || msg.chat.username || msg.chat.first_name);
        logger.info(`[Telegram] inbound chat.id=${msg.chat?.id} type=${msg.chat?.type} title=${chatTitle || ''}`);

        // Skip if it's a command (starts with /)
        if (msg.text && msg.text.startsWith('/')) {
          return;
        }

        // Skip if no text
        if (!msg.text || msg.text.trim().length === 0) {
          return;
        }

        logger.info(`Conversational query from ${msg.from.username}: ${msg.text}`);

        // Show typing indicator
        await this.telegramBot.sendChatAction(msg.chat.id, 'typing');

        // Route to PM Agent for conversational response
        const response = await this.pmAgent.handleConversationalQuery(msg.text);

        // Convert markdown response to HTML
        const formattedResponse = this.pmAgent.convertMarkdownToHtml(response);

        await this.sendFormattedMessage(msg.chat.id, formattedResponse);

      } catch (error) {
        logger.error('Error in conversational handler:', error);
        await this.sendFormattedMessage(msg.chat.id, 
          '❌ Sorry, I encountered an error processing your message. Please try using a specific command like /status or /blockers.'
        );
      }
    });
  }
  
  /**
   * Send formatted message using HTML parse mode
   * Automatically splits long messages to fit Telegram's 4096 char limit
   */
  async sendFormattedMessage(chatId, message) {
    const MAX_LENGTH = 4000; // Leave some margin for safety
    
    try {
      // If message fits in one chunk, send it
      if (message.length <= MAX_LENGTH) {
        await this.telegramBot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        return;
      }
      
      // Split long messages into chunks
      const chunks = this.splitMessage(message, MAX_LENGTH);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prefix = i > 0 ? `<i>(continued ${i + 1}/${chunks.length})</i>\n\n` : '';
        await this.telegramBot.sendMessage(chatId, prefix + chunk, { parse_mode: 'HTML' });
        
        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      logger.error('Failed to send formatted message:', error);
      // Fallback to plain text
      const plainText = message.replace(/<[^>]*>/g, '');
      if (plainText.length <= MAX_LENGTH) {
        await this.telegramBot.sendMessage(chatId, plainText);
      } else {
        // Split plain text too
        const chunks = this.splitMessage(plainText, MAX_LENGTH);
        for (const chunk of chunks) {
          await this.telegramBot.sendMessage(chatId, chunk);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
  }
  
  /**
   * Split message into chunks at natural break points (newlines)
   */
  splitMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';
    const lines = message.split('\n');
    
    for (const line of lines) {
      // If adding this line exceeds max length, save current chunk
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If single line is too long, force split it
        if (line.length > maxLength) {
          const words = line.split(' ');
          for (const word of words) {
            if (currentChunk.length + word.length + 1 > maxLength) {
              chunks.push(currentChunk.trim());
              currentChunk = word;
            } else {
              currentChunk += (currentChunk ? ' ' : '') + word;
            }
          }
        } else {
          currentChunk = line;
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [message];
  }
  
  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  /**
   * Convert markdown to Telegram HTML format
   */
  formatMarkdownForTelegram(markdown) {
    let html = markdown;
    
    // Escape HTML first
    html = this.escapeHtml(html);
    
    // Headers (### Header -> <b>Header</b>)
    html = html.replace(/^###\s+(.+)$/gm, '<b>📌 $1</b>');
    html = html.replace(/^##\s+(.+)$/gm, '<b>🔹 $1</b>');
    html = html.replace(/^#\s+(.+)$/gm, '<b>▪️ $1</b>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__(.+?)__/g, '<b>$1</b>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
    html = html.replace(/_(.+?)_/g, '<i>$1</i>');
    
    // Code blocks (```code```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Bullet points (- item or * item)
    html = html.replace(/^[\*\-]\s+(.+)$/gm, '  • $1');
    
    // Strikethrough (~~text~~)
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
    
    return html;
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
