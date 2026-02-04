const logger = require('../utils/logger');

/**
 * Team Communication Service
 * Enables visible agent-to-agent communication in Telegram
 * All agents can see and respond to each other's messages
 */
class TeamCommsService {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.conversationHistory = []; // Last 50 messages for context
    this.maxHistorySize = 50;
    
    // Agent profiles with emojis for identification
    this.agentProfiles = {
      'PM-Agent': { emoji: '👔', role: 'Project Manager' },
      'RD-Agent': { emoji: '🔬', role: 'Research & Development' },
      'Backend-Agent': { emoji: '⚙️', role: 'Backend Engineer' },
      'Architect-Agent': { emoji: '🏗️', role: 'Technical Architect' },
      'Frontend-Agent': { emoji: '🎨', role: 'Frontend Engineer' },
      'DevOps-Agent': { emoji: '🚀', role: 'DevOps Engineer' },
      'QA-Agent': { emoji: '🧪', role: 'QA Engineer' },
      'Docs-Agent': { emoji: '📚', role: 'Documentation' }
    };
  }

  /**
   * Send a message to the team channel (Telegram)
   * @param {string} agentName - Name of the agent sending message
   * @param {string} message - The message content
   * @param {object} options - Additional options (mention, replyTo, etc.)
   */
  async sendMessage(agentName, message, options = {}) {
    try {
      const profile = this.agentProfiles[agentName] || { emoji: '🤖', role: agentName };
      
      // Format message with agent identification
      let formattedMessage = `${profile.emoji} <b>${agentName}</b>`;
      
      // Add mention if replying to someone
      if (options.replyTo) {
        const replyProfile = this.agentProfiles[options.replyTo] || { emoji: '🤖' };
        formattedMessage += ` → ${replyProfile.emoji} ${options.replyTo}`;
      }
      
      formattedMessage += `\n${message}`;
      
      // Add to conversation history
      this.addToHistory({
        timestamp: new Date().toISOString(),
        agent: agentName,
        message: message,
        replyTo: options.replyTo
      });
      
      // Send to Telegram
      await this.orchestrator.notifyTelegram(formattedMessage, { parse_mode: 'HTML' });
      
      logger.info(`[TeamComms] ${agentName}: ${message.substring(0, 100)}...`);
      
    } catch (error) {
      logger.error(`[TeamComms] Error sending message from ${agentName}:`, error);
    }
  }

  /**
   * Agent asks a question to another agent or the team
   * @param {string} fromAgent - Agent asking the question
   * @param {string} toAgent - Agent being asked (or 'team' for everyone)
   * @param {string} question - The question
   */
  async askQuestion(fromAgent, toAgent, question) {
    const profile = this.agentProfiles[fromAgent] || { emoji: '🤖' };
    const targetEmoji = toAgent === 'team' ? '👥' : 
                       (this.agentProfiles[toAgent] || { emoji: '🤖' }).emoji;
    
    const formattedQuestion = `${profile.emoji} <b>${fromAgent}</b> → ${targetEmoji} <b>${toAgent}</b>\n❓ ${question}`;
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: fromAgent,
      message: question,
      type: 'question',
      target: toAgent
    });
    
    await this.orchestrator.notifyTelegram(formattedQuestion, { parse_mode: 'HTML' });
  }

  /**
   * Agent announces what they're working on
   * @param {string} agentName - Agent making the announcement
   * @param {string} action - What they're doing
   * @param {string} taskId - Optional task ID
   */
  async announceAction(agentName, action, taskId = null) {
    const profile = this.agentProfiles[agentName] || { emoji: '🤖' };
    
    let message = `${profile.emoji} <b>${agentName}</b>\n📢 ${action}`;
    
    if (taskId) {
      message += `\n📋 Task: <code>${taskId}</code>`;
    }
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: agentName,
      message: action,
      type: 'announcement',
      taskId: taskId
    });
    
    await this.orchestrator.notifyTelegram(message, { parse_mode: 'HTML' });
  }

  /**
   * Agent shares progress update
   * @param {string} agentName - Agent providing update
   * @param {string} update - Progress description
   * @param {number} percentComplete - Optional percentage
   */
  async shareProgress(agentName, update, percentComplete = null) {
    const profile = this.agentProfiles[agentName] || { emoji: '🤖' };
    
    let message = `${profile.emoji} <b>${agentName}</b>\n`;
    
    if (percentComplete !== null) {
      const bars = Math.floor(percentComplete / 10);
      const progressBar = '▓'.repeat(bars) + '░'.repeat(10 - bars);
      message += `${progressBar} ${percentComplete}%\n`;
    }
    
    message += `📊 ${update}`;
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: agentName,
      message: update,
      type: 'progress',
      percent: percentComplete
    });
    
    await this.orchestrator.notifyTelegram(message, { parse_mode: 'HTML' });
  }

  /**
   * Agent reports a blocker to the team
   * @param {string} agentName - Agent reporting blocker
   * @param {string} blocker - Description of the blocker
   * @param {string} taskId - Task that's blocked
   */
  async reportBlocker(agentName, blocker, taskId) {
    const profile = this.agentProfiles[agentName] || { emoji: '🤖' };
    
    const message = `${profile.emoji} <b>${agentName}</b>\n` +
                   `🚫 <b>BLOCKER</b>\n` +
                   `📋 Task: <code>${taskId}</code>\n` +
                   `❌ Issue: ${blocker}\n\n` +
                   `👔 <i>@PM-Agent - Need your help!</i>`;
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: agentName,
      message: blocker,
      type: 'blocker',
      taskId: taskId
    });
    
    await this.orchestrator.notifyTelegram(message, { parse_mode: 'HTML' });
  }

  /**
   * Get recent conversation history for context
   * @param {number} count - Number of recent messages to retrieve
   * @returns {Array} Recent messages
   */
  getRecentConversation(count = 10) {
    return this.conversationHistory.slice(-count);
  }

  /**
   * Get conversation history formatted for AI context
   * @param {number} count - Number of recent messages
   * @returns {string} Formatted conversation
   */
  getConversationContext(count = 10) {
    const recent = this.getRecentConversation(count);
    
    if (recent.length === 0) {
      return 'No recent team conversation.';
    }
    
    let context = '### Recent Team Conversation:\n';
    
    for (const msg of recent) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const profile = this.agentProfiles[msg.agent] || { emoji: '🤖' };
      
      context += `[${time}] ${profile.emoji} ${msg.agent}`;
      
      if (msg.replyTo) {
        context += ` → ${msg.replyTo}`;
      }
      
      if (msg.type) {
        context += ` (${msg.type})`;
      }
      
      context += `: ${msg.message}\n`;
    }
    
    return context;
  }

  /**
   * Add message to conversation history
   * @private
   */
  addToHistory(entry) {
    this.conversationHistory.push(entry);
    
    // Keep only last N messages
    if (this.conversationHistory.length > this.maxHistorySize) {
      this.conversationHistory.shift();
    }
  }

  /**
   * Agent requests help from another agent
   * @param {string} fromAgent - Agent requesting help
   * @param {string} toAgent - Agent being asked for help
   * @param {string} request - What help is needed
   */
  async requestHelp(fromAgent, toAgent, request) {
    const fromProfile = this.agentProfiles[fromAgent] || { emoji: '🤖' };
    const toProfile = this.agentProfiles[toAgent] || { emoji: '🤖' };
    
    const message = `${fromProfile.emoji} <b>${fromAgent}</b> → ${toProfile.emoji} <b>${toAgent}</b>\n` +
                   `🆘 ${request}`;
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: fromAgent,
      target: toAgent,
      message: request,
      type: 'help-request'
    });
    
    await this.orchestrator.notifyTelegram(message, { parse_mode: 'HTML' });
  }

  /**
   * Send a team-wide announcement
   * @param {string} message - Announcement message
   */
  async teamAnnouncement(message) {
    const formattedMessage = `👥 <b>Team Announcement</b>\n📢 ${message}`;
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: 'System',
      message: message,
      type: 'team-announcement'
    });
    
    await this.orchestrator.notifyTelegram(formattedMessage, { parse_mode: 'HTML' });
  }

  /**
   * Agent celebrates a win
   * @param {string} agentName - Agent celebrating
   * @param {string} achievement - What was accomplished
   */
  async celebrate(agentName, achievement) {
    const profile = this.agentProfiles[agentName] || { emoji: '🤖' };
    
    const message = `${profile.emoji} <b>${agentName}</b>\n🎉 ${achievement}`;
    
    this.addToHistory({
      timestamp: new Date().toISOString(),
      agent: agentName,
      message: achievement,
      type: 'celebration'
    });
    
    await this.orchestrator.notifyTelegram(message, { parse_mode: 'HTML' });
  }
}

module.exports = TeamCommsService;
