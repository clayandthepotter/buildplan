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
      
      const content = fileOps.readFile(requestPath);
      if (!content) {
        await this.notifyTelegram('❌ Could not read request file');
        return;
      }

      // Move request to in-analysis while R&D works on it
      const fileName = path.basename(requestPath);
      const inAnalysisPath = path.join(process.env.REQUESTS_DIR, 'in-analysis', fileName);
      fileOps.moveFile(requestPath, inAnalysisPath);

      // Create an R&D task from this request and assign to RD-Agent
      const rdTaskId = await this.createRDTaskFromRequest(fileName.replace('.md',''), content);

      await this.notifyTelegram(
        `🔬 <b>R&D Started</b>\nRequest <code>${fileName}</code> assigned to RD-Agent for prototyping.\n` +
        `You'll receive a mockup and research doc for approval.`,
        { parse_mode: 'HTML' }
      );
      
      logger.info(`R&D task created from ${fileName}: ${rdTaskId}`);
    } catch (error) {
      logger.error('Error processing request:', error);
      await this.notifyTelegram(`❌ Error processing request: ${error.message}`);
    }
  }

  async handleTaskUpdate(taskPath) {
    logger.info(`Task updated: ${taskPath}`);
    
    try {
      // Check if task status changed to review
      const fileName = path.basename(taskPath);
      const reviewPath = path.join(process.env.TASKS_DIR, 'review', fileName);
      
      if (fs.existsSync(reviewPath)) {
        const content = fileOps.readFile(reviewPath);
        const titleMatch = content ? content.match(/title:\s*([^\n]+)/) : null;
        const title = titleMatch ? titleMatch[1].trim() : fileName;
        
        await this.notifyTelegram(
          `👀 <b>Task Ready for Review</b>\n\n` +
          `Task: <code>${fileName.replace('.md', '')}</code>\n` +
          `Title: ${title}\n\n` +
          `Use <code>/approve ${fileName.replace('.md', '')}</code> to approve\n` +
          `Use <code>/reject ${fileName.replace('.md', '')} [reason]</code> to request changes`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      logger.error('Error handling task update:', error);
    }
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
      const progressTracker = require('../services/progressTracker');
      const progress = progressTracker.getOverallProgress();
      
      if (!progress) {
        return 'Error loading project status';
      }

      let status = `📋 **Project Status**\n\n`;
      status += `**Progress**: ${progress.completionPercentage}% complete\n`;
      status += `**Velocity**: ${progress.velocity} tasks/day\n\n`;
      
      status += `**Active Tasks**: ${progress.active}\n`;
      status += `- 📥 Backlog: ${progress.backlog}\n`;
      status += `- 🚧 In Progress: ${progress.inProgress}\n`;
      status += `- 👀 In Review: ${progress.review}\n`;
      status += `- ✅ Completed: ${progress.completed}\n`;
      
      if (progress.blocked > 0) {
        status += `- 🚫 Blocked: ${progress.blocked}\n\n`;
        status += `**⚠️ Blockers**:\n`;
        progress.blockers.slice(0, 3).forEach(blocker => {
          status += `• ${blocker.taskId}: ${blocker.reason}\n`;
        });
        if (progress.blockers.length > 3) {
          status += `... and ${progress.blockers.length - 3} more\n`;
        }
      }
      
      // Check for stale tasks
      const staleTasks = progressTracker.getStaleTasks();
      if (staleTasks.length > 0) {
        status += `\n⏰ **Stale Tasks** (in-progress > 3 days):\n`;
        staleTasks.slice(0, 3).forEach(taskId => {
          status += `• ${taskId}\n`;
        });
      }

      if (progress.total === 0) {
        status += `\nNo active tasks. Submit a request to get started.`;
      }

      return status;
    } catch (error) {
      logger.error('Error getting status:', error);
      return 'Error loading status';
    }
  }

  /**
   * Get detailed progress report
   * @returns {string} Formatted progress report
   */
  async getProgressReport() {
    try {
      const progressTracker = require('../services/progressTracker');
      return progressTracker.generateProgressReport();
    } catch (error) {
      logger.error('Error generating progress report:', error);
      return 'Error generating progress report';
    }
  }

  /**
   * Get blockers list
   * @returns {string} Formatted blockers report
   */
  async getBlockers() {
    try {
      const progressTracker = require('../services/progressTracker');
      const blockers = progressTracker.getBlockersList();
      
      if (blockers.length === 0) {
        return '✅ No blocked tasks';
      }
      
      let report = `🚫 **Blocked Tasks** (${blockers.length})\n\n`;
      for (const blocker of blockers) {
        report += `**${blocker.taskId}**: ${blocker.title}\n`;
        report += `Reason: ${blocker.reason}\n`;
        report += `Since: ${new Date(blocker.blockedSince).toLocaleDateString()}\n\n`;
      }
      
      return report;
    } catch (error) {
      logger.error('Error getting blockers:', error);
      return 'Error loading blockers';
    }
  }

  async approveTask(taskId, username) {
    try {
      logger.info(`Approving ${taskId} by ${username}`);

      // If approving an R&D task in review, finalize and create sprints/tasks
      const rdTaskPath = path.join(process.env.TASKS_DIR, 'review', `${taskId}.md`);
      if (fs.existsSync(rdTaskPath)) {
        const content = fileOps.readFile(rdTaskPath) || '';
        const typeMatch = content.match(/type:\s*([^\n]+)/);
        const type = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
        if (type === 'rd' || type === 'research') {
          // Move to completed first
          const completedPath = path.join(process.env.TASKS_DIR, 'completed', `${taskId}.md`);
          fileOps.moveFile(rdTaskPath, completedPath);
          await this.notifyTelegram(`✅ R&D ${taskId} approved. Creating sprints and tasks from research...`);

          // Generate sprints and tasks
          const sprintPlanner = require('../services/sprintPlanner');
          const taskManager = require('../services/taskManager');
          const sprints = await sprintPlanner.createFromRD(taskId);
          const created = await taskManager.createTasksFromSprints(sprints, taskId);
          await this.notifyTelegram(`🗂️ Created ${created.length} tasks from R&D. Assigning to agents...`);
          await this.assignPendingTasks();
          return;
        }
      }

      // Check if it's a request approval (legacy)
      const requestFile = `${taskId}.md`;
      const requestPath = path.join(process.env.REQUESTS_DIR, 'in-analysis', requestFile);
      if (fs.existsSync(requestPath)) {
        const requestContent = fileOps.readFile(requestPath);
        await this.notifyTelegram(`⏳ <b>Checking for required information...</b>`, { parse_mode: 'HTML' });
        const requiredInfo = await this.identifyRequiredInformation(requestContent);
        if (requiredInfo && requiredInfo.length > 0) {
          this.orchestrator.pendingApproval = { taskId, requestPath, requestContent, requiredInfo };
          const infoRequest = this.formatInformationRequest(requiredInfo);
          await this.notifyTelegram(
            `📝 <b>Information Required</b>\n\nBefore I create tasks, I need some details:\n\n${infoRequest}\n\n👉 Reply with <code>/provide [your answers]</code>`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        await this.proceedWithTaskCreation(taskId, requestPath, requestContent);
        return;
      }

      // Otherwise, approve a normal task in review
      const taskPath = path.join(process.env.TASKS_DIR, 'review', `${taskId}.md`);
      if (fs.existsSync(taskPath)) {
        const completedPath = path.join(process.env.TASKS_DIR, 'completed', `${taskId}.md`);
        fileOps.moveFile(taskPath, completedPath);
        await this.notifyTelegram(`✅ Task ${taskId} approved and completed!`);
      } else {
        await this.notifyTelegram(`❌ Could not find ${taskId} in review or request in analysis`);
      }

    } catch (error) {
      logger.error('Error approving task:', error);
      throw error;
    }
  }

  async rejectTask(taskId, reason, username) {
    try {
      logger.info(`Rejecting ${taskId}: ${reason}`);
      
      // Move task from review back to in-progress
      const reviewPath = path.join(process.env.TASKS_DIR, 'review', `${taskId}.md`);
      const inProgressPath = path.join(process.env.TASKS_DIR, 'in-progress', `${taskId}.md`);
      
      if (fs.existsSync(reviewPath)) {
        // Read task content and append rejection feedback
        let content = fileOps.readFile(reviewPath) || '';
        
        // Add rejection note
        const rejectionNote = `\n\n---\n## Rejection Feedback\n\n**Rejected by**: ${username}\n**Date**: ${new Date().toISOString()}\n**Reason**: ${reason}\n\n**Status**: Needs revision\n`;
        content += rejectionNote;
        
        // Write updated content to in-progress
        fileOps.writeFile(inProgressPath, content);
        
        // Remove from review
        fs.unlinkSync(reviewPath);
        
        await this.notifyTelegram(
          `❌ <b>Task Rejected</b>\n\n` +
          `Task: <code>${taskId}</code>\n` +
          `Reason: ${reason}\n\n` +
          `Task moved back to in-progress for revision.`,
          { parse_mode: 'HTML' }
        );
      } else {
        await this.notifyTelegram(`❌ Could not find task ${taskId} in review`);
      }
      
    } catch (error) {
      logger.error('Error rejecting task:', error);
      throw error;
    }
  }
  
  /**
   * Identify information that needs to be gathered from user
   */
  async identifyRequiredInformation(requestContent) {
    try {
      const prompt = `Analyze this request and identify ANY information that requires human intervention or external setup.

Request:
${requestContent}

Identify:
1. API keys or credentials needed (e.g., Clerk API keys, database connection strings)
2. External service accounts to create (e.g., Clerk account, Supabase account)
3. Configuration values that can't be determined automatically
4. Any other prerequisites that need human action

For each item, provide:
- What is needed
- Why it's needed
- Where to get it

Format as:
ITEM: [description]
WHY: [reason]
WHERE: [how to obtain]

If NO information is needed, respond with: "NONE"`;
      
      const response = await openai.pmAgentChat(this.systemPrompt, prompt);
      
      if (response.trim().toUpperCase() === 'NONE') {
        return [];
      }
      
      // Parse the response
      const items = [];
      const itemRegex = /ITEM:\s*([^\n]+)\nWHY:\s*([^\n]+)\nWHERE:\s*([^\n]+)/g;
      let match;
      
      while ((match = itemRegex.exec(response)) !== null) {
        items.push({
          item: match[1].trim(),
          why: match[2].trim(),
          where: match[3].trim()
        });
      }
      
      return items;
    } catch (error) {
      logger.error('Error identifying required information:', error);
      return [];
    }
  }
  
  /**
   * Format information request for user
   */
  formatInformationRequest(requiredInfo) {
    return requiredInfo.map((info, index) => 
      `<b>${index + 1}. ${this.escapeHtml(info.item)}</b>\n` +
      `   <i>Why:</i> ${this.escapeHtml(info.why)}\n` +
      `   <i>Where:</i> ${this.escapeHtml(info.where)}`
    ).join('\n\n');
  }
  
  /**
   * Proceed with task creation after all info is gathered
   */
  async proceedWithTaskCreation(taskId, requestPath, requestContent) {
    // Move request to approved
    const approvedPath = path.join(process.env.REQUESTS_DIR, 'approved', path.basename(requestPath));
    fileOps.moveFile(requestPath, approvedPath);
    
    await this.notifyTelegram(`✅ Request ${taskId} approved! Creating tasks...`);
    
    // Create task files from the analysis
    const tasksCreated = await this.createTasksFromRequest(taskId, requestContent);
    
    if (tasksCreated.length > 0) {
      await this.notifyTelegram(
        `🎯 <b>Created ${tasksCreated.length} Tasks</b>\n` +
        tasksCreated.map(t => `• <code>${t}</code>`).join('\n') +
        `\n\n🤖 Agents starting work...`,
        { parse_mode: 'HTML' }
      );
      
      // Assign tasks to agents
      await this.assignPendingTasks();
    } else {
      await this.notifyTelegram(`⚠️ No tasks created. Please check the request format.`);
    }
  }
  
  /**
   * Process provided information and proceed with task creation
   */
  async provideInformation(information, username) {
    try {
      const pending = this.orchestrator.pendingApproval;
      
      if (!pending) {
        await this.notifyTelegram('❌ No pending approval waiting for information');
        return;
      }
      
      logger.info(`Information provided by ${username} for ${pending.taskId}`);
      
      // Store the provided information in the request file
      const updatedContent = `${pending.requestContent}\n\n---\n\n## Provided Information\n\n${information}\n`;
      
      // Update the approved request file
      const approvedPath = path.join(process.env.REQUESTS_DIR, 'approved', `${pending.taskId}.md`);
      fileOps.ensureDirectory(path.dirname(approvedPath));
      fileOps.writeFile(approvedPath, updatedContent);
      
      await this.notifyTelegram('✅ <b>Information received!</b> Proceeding with task creation...', { parse_mode: 'HTML' });
      
      // Clear pending state and proceed
      this.orchestrator.pendingApproval = null;
      
      await this.proceedWithTaskCreation(pending.taskId, pending.requestPath, updatedContent);
      
    } catch (error) {
      logger.error('Error processing provided information:', error);
      throw error;
    }
  }
  
  /**
   * Modify pending request based on user feedback
   */
  async modifyRequest(requestId, modifications, username) {
    try {
      logger.info(`Modifying ${requestId} by ${username}: ${modifications}`);
      
      // Find the request in in-analysis
      const requestFile = `${requestId}.md`;
      const requestPath = path.join(process.env.REQUESTS_DIR, 'in-analysis', requestFile);
      
      if (!fs.existsSync(requestPath)) {
        await this.notifyTelegram(`❌ Request ${requestId} not found in analysis`);
        return;
      }
      
      // Read original request
      const originalRequest = fileOps.readFile(requestPath);
      
      await this.notifyTelegram(`⏳ <b>Updating analysis...</b>`, { parse_mode: 'HTML' });
      
      // Re-analyze with modifications
      const modificationPrompt = `The user has requested changes to the analysis.

Original Request:
${originalRequest}

User's Modifications:
${modifications}

Provide an UPDATED analysis (max 400 words) incorporating these changes:
1. High-level goal
2. Key tasks/phases identified (with modifications applied)
3. Any dependencies or blockers
4. Recommended approach

IMPORTANT: Apply the user's modifications exactly as requested.`;
      
      const updatedAnalysis = await openai.pmAgentChat(this.systemPrompt, modificationPrompt);
      
      // Send updated analysis
      const formattedAnalysis = this.convertMarkdownToHtml(updatedAnalysis);
      
      await this.notifyTelegram(
        `✅ <b>Updated Analysis</b>\n\n` +
        `${formattedAnalysis}\n\n` +
        `👉 Type <code>/approve</code> to proceed or <code>/modify</code> again`,
        { parse_mode: 'HTML' }
      );
      
      logger.info(`Request ${requestId} modified`);
      
    } catch (error) {
      logger.error('Error modifying request:', error);
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
  async createRDTaskFromRequest(requestId, content) {
    // Make an RD task in backlog for RD-Agent
    const taskId = `TASK-${requestId.replace('REQ-','')}-RD`;
    const task = {
      type: 'rd',
      title: `R&D for ${requestId}`,
      description: `Create research & mockup for request ${requestId}.\n\n${content.substring(0, 1000)}`
    };
    const taskContent = this.formatTaskFile(taskId, requestId, task);
    const taskPath = path.join(process.env.TASKS_DIR, 'backlog', `${taskId}.md`);
    fileOps.ensureDirectory(path.dirname(taskPath));
    fileOps.writeFile(taskPath, taskContent);
    await this.assignPendingTasks();
    return taskId;
  }

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

  /**
   * Escape HTML special characters for Telegram
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  /**
   * Convert markdown to HTML for Telegram
   */
  convertMarkdownToHtml(markdown) {
    let html = markdown;
    
    // Escape HTML first
    html = this.escapeHtml(html);
    
    // Headers (### Header -> <b>Header</b>)
    html = html.replace(/^####\s+(.+)$/gm, '<b>📍 $1</b>');
    html = html.replace(/^###\s+(.+)$/gm, '<b>📌 $1</b>');
    html = html.replace(/^##\s+(.+)$/gm, '<b>🔹 $1</b>');
    html = html.replace(/^#\s+(.+)$/gm, '<b>▪️ $1</b>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__(.+?)__/g, '<b>$1</b>');
    
    // Italic (*text* or _text_) - be careful not to match ** or __
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');
    html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<i>$1</i>');
    
    // Code blocks (```code```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Bullet points (- item or * item)
    html = html.replace(/^[\*\-]\s+(.+)$/gm, '  • $1');
    
    // Numbered lists (1. item)
    html = html.replace(/^\d+\.\s+(.+)$/gm, '  $1');
    
    return html;
  }

  /**
   * Handle conversational queries from user
   * @param {string} query - The user's natural language question
   * @returns {Promise<string>} - Formatted response
   */
  async handleConversationalQuery(query) {
    try {
      logger.info(`Handling conversational query: ${query}`);
      
      // Gather context for the PM
      const context = await this.gatherProjectContext();
      
      // Build comprehensive prompt
      const conversationalPrompt = `You are the PM for the BuildPlan AI development team. The user is asking you a question. Respond as a real PM would - be helpful, actionable, and use the context provided.

## Current Project Context:
${context}

## User's Question:
${query}

Provide a clear, actionable response. If discussing blockers, provide specific details about what's wrong and what needs to be done. If asked about status, give a comprehensive overview. Be conversational but professional.`;
      
      const response = await openai.pmAgentChat(this.systemPrompt, conversationalPrompt);
      
      return response;
      
    } catch (error) {
      logger.error('Error handling conversational query:', error);
      return `I encountered an error processing your question: ${error.message}. Please try rephrasing or use a specific command like /status or /blockers.`;
    }
  }
  
  /**
   * Gather comprehensive project context for conversational queries
   * @returns {Promise<string>} - Formatted context
   */
  async gatherProjectContext() {
    try {
      const PMConversation = require('../services/pmConversation');
      const pmConvo = new PMConversation();
      
      // Get task counts
      const tasksDir = process.env.TASKS_DIR;
      const inProgress = fileOps.listFiles(path.join(tasksDir, 'in-progress'));
      const review = fileOps.listFiles(path.join(tasksDir, 'review'));
      const blocked = fileOps.listFiles(path.join(tasksDir, 'blocked'));
      const backlog = fileOps.listFiles(path.join(tasksDir, 'backlog'));
      const completed = fileOps.listFiles(path.join(tasksDir, 'completed'));
      
      let context = `### Task Summary:
- In Progress: ${inProgress.length}
- Backlog: ${backlog.length}
- Blocked: ${blocked.length}
- Awaiting Review: ${review.length}
- Completed: ${completed.length}\n\n`;
      
      // Get blocked tasks details
      if (blocked.length > 0) {
        const blockedTasks = await pmConvo.getBlockedTasks();
        context += `### Blocked Tasks Details:\n`;
        
        for (const task of blockedTasks) {
          context += `**${task.taskId}:**\n`;
          context += `- Title: ${task.title}\n`;
          context += `- Reason: ${task.reason}\n`;
          if (task.details) {
            const truncated = task.details.length > 300 
              ? task.details.substring(0, 300) + '...' 
              : task.details;
            context += `- Details: ${truncated}\n`;
          }
          context += `\n`;
        }
      }
      
      // Get in-progress tasks
      if (inProgress.length > 0) {
        context += `### In-Progress Tasks:\n`;
        for (const taskPath of inProgress.slice(0, 5)) {
          const taskId = path.basename(taskPath, '.md');
          const content = fileOps.readFile(taskPath);
          if (content) {
            const titleMatch = content.match(/title:\s*([^\n]+)/);
            const assignedMatch = content.match(/assigned_to:\s*([^\n]+)/);
            context += `- ${taskId}: ${titleMatch ? titleMatch[1] : 'Unknown'} (${assignedMatch ? assignedMatch[1] : 'unassigned'})\n`;
          }
        }
        context += `\n`;
      }
      
      // Get recent requests
      const pendingRequests = fileOps.listFiles(path.join(process.env.REQUESTS_DIR, 'pending'));
      const analysisRequests = fileOps.listFiles(path.join(process.env.REQUESTS_DIR, 'in-analysis'));
      
      if (pendingRequests.length > 0 || analysisRequests.length > 0) {
        context += `### Pending Requests:\n`;
        context += `- Awaiting analysis: ${pendingRequests.length}\n`;
        context += `- In analysis: ${analysisRequests.length}\n\n`;
      }
      
      return context;
      
    } catch (error) {
      logger.error('Error gathering context:', error);
      return 'Unable to gather full context due to an error.';
    }
  }

  async notifyTelegram(message, options = {}) {
    return this.orchestrator.notifyTelegram(message, options);
  }
}

module.exports = { PMAgent };
