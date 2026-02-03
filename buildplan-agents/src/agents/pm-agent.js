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
        // Read the request to get the analysis
        const requestContent = fileOps.readFile(requestPath);
        
        // Move request to approved
        const approvedPath = path.join(process.env.REQUESTS_DIR, 'approved', requestFile);
        fileOps.moveFile(requestPath, approvedPath);
        
        await this.notifyTelegram(`✅ Request ${taskId} approved! Creating tasks...`);
        
        // Create task files from the analysis
        const tasksCreated = await this.createTasksFromRequest(taskId, requestContent);
        
        if (tasksCreated.length > 0) {
          await this.notifyTelegram(
            `🎯 Created ${tasksCreated.length} tasks:\n` +
            tasksCreated.map(t => `• ${t}`).join('\n') +
            `\n\nAgents will begin work automatically.`
          );
          
          // Assign tasks to agents
          await this.assignPendingTasks();
        } else {
          await this.notifyTelegram(`⚠️ No tasks created. Please check the request format.`);
        }
        
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

  /**
   * Create task files from approved request
   */
  async createTasksFromRequest(requestId, requestContent) {
    try {
      // Ask OpenAI to extract tasks from the analysis
      const taskPrompt = `Based on this request analysis, create specific task assignments.

${requestContent}

For each task, provide:
1. Task type (design, backend, frontend, devops, qa, docs)
2. Brief title
3. Description

Format each task as:
TASK: [type] - [title]
DESCRIPTION: [description]

Generate the tasks now:`;

      const tasksText = await openai.pmAgentChat(this.systemPrompt, taskPrompt);
      
      // Parse tasks from response
      const tasks = this.parseTasksFromText(tasksText);
      const taskIds = [];
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskId = `TASK-${requestId.replace('REQ-', '')}-${String(i + 1).padStart(2, '0')}`;
        
        // Create task file
        const taskContent = this.formatTaskFile(taskId, requestId, task);
        const taskPath = path.join(process.env.TASKS_DIR, 'backlog', `${taskId}.md`);
        
        fileOps.ensureDirectory(path.dirname(taskPath));
        fileOps.writeFile(taskPath, taskContent);
        
        taskIds.push(taskId);
        logger.info(`Created task: ${taskId} (${task.type})`);
      }
      
      return taskIds;
      
    } catch (error) {
      logger.error('Error creating tasks:', error);
      return [];
    }
  }

  /**
   * Parse tasks from OpenAI response
   */
  parseTasksFromText(text) {
    const tasks = [];
    const taskRegex = /TASK:\s*\[([^\]]+)\]\s*-\s*([^\n]+)\s*DESCRIPTION:\s*([^\n]+(?:\n(?!TASK:)[^\n]+)*)/gi;
    
    let match;
    while ((match = taskRegex.exec(text)) !== null) {
      tasks.push({
        type: match[1].trim().toLowerCase(),
        title: match[2].trim(),
        description: match[3].trim()
      });
    }
    
    // Fallback: if no tasks found, create a generic backend task
    if (tasks.length === 0) {
      logger.warn('No tasks parsed from OpenAI response, creating default task');
      tasks.push({
        type: 'backend',
        title: 'Implement feature',
        description: text.substring(0, 500)
      });
    }
    
    return tasks;
  }

  /**
   * Format task file with metadata
   */
  formatTaskFile(taskId, requestId, task) {
    return `---
id: ${taskId}
request_id: ${requestId}
type: ${task.type}
title: ${task.title}
status: pending
assigned_to: none
created_at: ${new Date().toISOString()}
priority: medium
---

# ${taskId}: ${task.title}

## Description
${task.description}

## Requirements
- Follow project conventions
- Include tests
- Add documentation
- Create PR when complete

## Progress Log
- [${new Date().toISOString()}] PM Agent: Task created from ${requestId}
`;
  }

  /**
   * Assign pending tasks to available agents
   */
  async assignPendingTasks() {
    try {
      const backlogDir = path.join(process.env.TASKS_DIR, 'backlog');
      const backlogTasks = fileOps.listFiles(backlogDir);
      
      for (const taskPath of backlogTasks) {
        // Read task to get type
        const content = fileOps.readFile(taskPath);
        if (!content) continue;
        
        // Extract task type from frontmatter
        const typeMatch = content.match(/type:\s*([^\n]+)/);
        if (!typeMatch) continue;
        
        const taskType = typeMatch[1].trim();
        const taskId = path.basename(taskPath, '.md');
        
        // Get appropriate agent
        const agent = this.orchestrator.getAgentForTask(taskType);
        
        if (!agent) {
          logger.warn(`No available agent for task ${taskId} (type: ${taskType})`);
          continue;
        }
        
        // Move to in-progress
        const inProgressPath = path.join(process.env.TASKS_DIR, 'in-progress', path.basename(taskPath));
        fileOps.moveFile(taskPath, inProgressPath);
        
        logger.info(`Assigned ${taskId} to ${agent.role}`);
        
        // Start agent work asynchronously
        agent.runTaskWorkflow(inProgressPath).catch(err => {
          logger.error(`Agent ${agent.role} failed on ${taskId}:`, err);
        });
        
        await this.notifyTelegram(`🚀 ${agent.role} started working on ${taskId}`);
      }
      
    } catch (error) {
      logger.error('Error assigning tasks:', error);
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
    
    // Check for tasks ready to assign
    await this.assignPendingTasks();
  }

  async notifyTelegram(message, options = {}) {
    return this.orchestrator.notifyTelegram(message, options);
  }
}

module.exports = { PMAgent };
