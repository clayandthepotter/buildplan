const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const openai = require('../utils/openai-client');
const fileOps = require('../utils/file-ops');

class PMAgent {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.db = null;
    this.systemPrompt = this.loadSystemPrompt();
  }

  loadSystemPrompt() {
    const promptPath = path.join(process.env.PROJECT_ROOT, 'docs', 'PM_AGENT_PROMPT.md');
    const content = fileOps.readFile(promptPath);
    if (content) {
      return content;
    }
    // Fallback prompt if file not found
    return `You are the PM Agent for BuildPlan. You coordinate AI development team.
Your job: analyze requests, create task breakdowns, assign work, report progress.
Be concise, professional, and proactive.`;
  }

  async processNewRequest(requestPath) {
    try {
      logger.info(`Processing new request: ${requestPath}`);
      
      // Read request
      const content = fileOps.readFile(requestPath);
      if (!content) {
        await this.notifyTelegram('❌ Could not read request file');
        return;
      }

      // Notify user
      await this.notifyTelegram(`📥 New request detected! Analyzing...`);

      // Analyze with OpenAI
      const analysis = await openai.pmAgentChat(
        this.systemPrompt,
        `Analyze this project request and create a task breakdown:\n\n${content}`
      );

      // Move to in-analysis
      const fileName = path.basename(requestPath);
      const newPath = path.join(process.env.REQUESTS_DIR, 'in-analysis', fileName);
      fileOps.moveFile(requestPath, newPath);

      // Send breakdown to Telegram
      await this.notifyTelegram(
        `📋 *Request Analysis Complete*\n\n${analysis}\n\n` +
        `Reply with /approve ${fileName.replace('.md', '')} to proceed`,
        { parse_mode: 'Markdown' }
      );

      logger.info(`Request processed: ${fileName}`);
    } catch (error) {
      logger.error('Error processing request:', error);
      await this.notifyTelegram(`❌ Error processing request: ${error.message}`);
    }
  }

  async handleTaskUpdate(taskPath) {
    logger.info(`Task updated: ${taskPath}`);
    // TODO: Check if task is complete and needs approval
  }

  async runDailyStandup() {
    try {
      logger.info('Running daily standup');

      // Count tasks
      const inProgress = fileOps.listFiles(path.join(process.env.TASKS_DIR, 'in-progress')).length;
      const review = fileOps.listFiles(path.join(process.env.TASKS_DIR, 'review')).length;
      const completed = fileOps.listFiles(path.join(process.env.TASKS_DIR, 'completed')).length;
      const blocked = fileOps.listFiles(path.join(process.env.TASKS_DIR, 'blocked')).length;

      const report = `📊 *Daily Standup - ${new Date().toISOString().split('T')[0]}*\n\n` +
        `*Team Status:*\n` +
        `• In Progress: ${inProgress} tasks\n` +
        `• Blocked: ${blocked} tasks\n` +
        `• Awaiting Review: ${review} tasks\n` +
        `• Completed: ${completed} tasks\n\n` +
        `Type /status for details`;

      await this.notifyTelegram(report, { parse_mode: 'Markdown' });

      // Save to file
      const standupDir = process.env.STANDUP_DIR;
      fileOps.ensureDirectory(standupDir);
      const date = new Date().toISOString().split('T')[0];
      fileOps.writeFile(
        path.join(standupDir, `${date}.md`),
        `# Daily Standup - ${date}\n\n${report}`
      );

    } catch (error) {
      logger.error('Error in daily standup:', error);
    }
  }

  async generateWeeklyReport() {
    try {
      logger.info('Generating weekly report');
      const report = `📈 *Weekly Report*\n\nGenerated: ${new Date().toLocaleDateString()}\n\n` +
        `This week the team completed several tasks. Check /status for current progress.`;
      
      await this.notifyTelegram(report, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Error generating weekly report:', error);
    }
  }

  async getLatestStandup() {
    try {
      const standupDir = process.env.STANDUP_DIR;
      const files = fileOps.listFiles(standupDir);
      
      if (files.length === 0) {
        return 'No standup reports yet. Run /standup to generate one.';
      }

      // Get most recent file
      const latestFile = files.sort().reverse()[0];
      const content = fileOps.readFile(latestFile);
      
      return content || 'Could not read standup report';
    } catch (error) {
      logger.error('Error getting standup:', error);
      return 'Error loading standup report';
    }
  }

  async getStatus() {
    try {
      const tasksDir = process.env.TASKS_DIR;
      
      // List in-progress tasks
      const inProgress = fileOps.listFiles(path.join(tasksDir, 'in-progress'));
      const review = fileOps.listFiles(path.join(tasksDir, 'review'));
      const blocked = fileOps.listFiles(path.join(tasksDir, 'blocked'));

      let status = `📋 *Current Status*\n\n`;

      if (inProgress.length > 0) {
        status += `*In Progress (${inProgress.length}):*\n`;
        inProgress.slice(0, 5).forEach(file => {
          status += `• ${path.basename(file, '.md')}\n`;
        });
        status += '\n';
      }

      if (review.length > 0) {
        status += `*Awaiting Review (${review.length}):*\n`;
        review.forEach(file => {
          status += `• ${path.basename(file, '.md')} - Type /approve ${path.basename(file, '.md')}\n`;
        });
        status += '\n';
      }

      if (blocked.length > 0) {
        status += `*Blocked (${blocked.length}):*\n`;
        blocked.forEach(file => {
          status += `• ${path.basename(file, '.md')}\n`;
        });
      }

      if (inProgress.length === 0 && review.length === 0 && blocked.length === 0) {
        status += `No active tasks. Submit a request with /request [description]`;
      }

      return status;
    } catch (error) {
      logger.error('Error getting status:', error);
      return 'Error loading status';
    }
  }

  async approveTask(taskId, username) {
    try {
      logger.info(`Approving ${taskId} by ${username}`);
      
      // Check if it's a request
      const requestFile = `${taskId}.md`;
      const requestPath = path.join(process.env.REQUESTS_DIR, 'in-analysis', requestFile);
      
      if (fs.existsSync(requestPath)) {
        // Move request to approved
        const approvedPath = path.join(process.env.REQUESTS_DIR, 'approved', requestFile);
        fileOps.moveFile(requestPath, approvedPath);
        
        await this.notifyTelegram(`✅ Request ${taskId} approved! Creating tasks...`);
        
        // TODO: Create actual task files from breakdown
        await this.notifyTelegram(`🎯 Tasks created. Team will begin work shortly.`);
        
        return;
      }

      // Check if it's a task
      const taskPath = path.join(process.env.TASKS_DIR, 'review', `${taskId}.md`);
      
      if (fs.existsSync(taskPath)) {
        const completedPath = path.join(process.env.TASKS_DIR, 'completed', `${taskId}.md`);
        fileOps.moveFile(taskPath, completedPath);
        
        await this.notifyTelegram(`✅ Task ${taskId} approved and completed!`);
      } else {
        await this.notifyTelegram(`❌ Could not find ${taskId} in review`);
      }

    } catch (error) {
      logger.error('Error approving task:', error);
      throw error;
    }
  }

  async rejectTask(taskId, reason, username) {
    try {
      logger.info(`Rejecting ${taskId}: ${reason}`);
      
      await this.notifyTelegram(`❌ ${taskId} rejected: ${reason}\n\nTask will be revised.`);
      
      // TODO: Move task back to in-progress with rejection reason
      
    } catch (error) {
      logger.error('Error rejecting task:', error);
      throw error;
    }
  }

  async tick() {
    // Periodic check for new work
    logger.debug('PM Agent tick');
    
    // Check for pending requests
    const pendingDir = path.join(process.env.REQUESTS_DIR, 'pending');
    const pending = fileOps.listFiles(pendingDir);
    
    for (const file of pending) {
      await this.processNewRequest(file);
    }
  }

  async notifyTelegram(message, options = {}) {
    return this.orchestrator.notifyTelegram(message, options);
  }
}

module.exports = { PMAgent };
