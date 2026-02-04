const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const openai = require('../utils/openai-client');
const github = require('../utils/github-client');
const fileOps = require('../utils/file-ops');
const ShellExecutor = require('../utils/shell-executor');

/**
 * Base class for all specialist AI agents
 * Provides common functionality for task execution, progress tracking, and GitHub operations
 */
class BaseAgent {
  constructor(orchestrator, role, systemPromptPath) {
    this.orchestrator = orchestrator;
    this.role = role;
    this.systemPrompt = this.loadSystemPrompt(systemPromptPath);
    this.currentTask = null;
    this.workload = 0; // Number of active tasks
    this.maxWorkload = 2; // Maximum concurrent tasks
    this.shell = new ShellExecutor(); // Shell command execution capabilities
  }

  /**
   * Load system prompt from file
   */
  loadSystemPrompt(promptPath) {
    if (!promptPath) {
      return `You are a ${this.role} agent. Execute tasks professionally and autonomously.`;
    }

    const fullPath = path.join(process.env.PROJECT_ROOT, promptPath);
    const content = fileOps.readFile(fullPath);
    
    if (content) {
      logger.info(`${this.role}: Loaded system prompt from ${promptPath}`);
      return content;
    }

    logger.warn(`${this.role}: System prompt not found at ${promptPath}, using default`);
    return `You are a ${this.role} agent. Execute tasks professionally and autonomously.`;
  }

  /**
   * Check if agent is available to take on new work
   */
  isAvailable() {
    return this.workload < this.maxWorkload;
  }

  /**
   * Parse task file frontmatter and content
   */
  parseTaskFile(taskPath) {
    const content = fileOps.readFile(taskPath);
    if (!content) {
      return null;
    }

    // Simple frontmatter parser (YAML between --- markers)
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return {
        metadata: {},
        content: content
      };
    }

    const yamlLines = match[1].split('\n');
    const metadata = {};
    
    yamlLines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        metadata[key.trim()] = value;
      }
    });

    return {
      metadata,
      content: match[2].trim()
    };
  }

  /**
   * Update task file with progress
   */
  async updateTaskProgress(taskPath, update) {
    const task = this.parseTaskFile(taskPath);
    if (!task) {
      logger.error(`${this.role}: Failed to read task ${taskPath}`);
      return false;
    }

    const timestamp = new Date().toISOString();
    const progressEntry = `- [${timestamp}] ${this.role}: ${update}`;

    // Add progress log entry
    let updatedContent = task.content;
    if (updatedContent.includes('## Progress Log')) {
      updatedContent = updatedContent.replace(
        '## Progress Log',
        `## Progress Log\n${progressEntry}`
      );
    } else {
      updatedContent += `\n\n## Progress Log\n${progressEntry}`;
    }

    // Update metadata if provided
    const metadataUpdates = {};
    if (update.includes('started')) {
      metadataUpdates.status = 'in-progress';
      metadataUpdates.started_at = timestamp;
    } else if (update.includes('completed') || update.includes('PR')) {
      metadataUpdates.status = 'completed';
      metadataUpdates.completed_at = timestamp;
    }

    // Rebuild file with metadata
    const metadata = { ...task.metadata, ...metadataUpdates };
    const metadataLines = Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const newContent = `---\n${metadataLines}\n---\n\n${updatedContent}`;
    
    fileOps.writeFile(taskPath, newContent);
    logger.info(`${this.role}: Updated task ${path.basename(taskPath)}`);
    
    return true;
  }

  /**
   * Execute task (to be implemented by subclasses)
   */
  async executeTask(taskPath) {
    throw new Error(`${this.role}: executeTask() must be implemented by subclass`);
  }

  /**
   * Generate code/artifacts using OpenAI
   */
  async generateArtifact(prompt, context = '') {
    try {
      const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
      const response = await openai.pmAgentChat(this.systemPrompt, fullPrompt);
      return response;
    } catch (error) {
      logger.error(`${this.role}: Failed to generate artifact:`, error.message);
      return null;
    }
  }

  /**
   * Create GitHub PR with generated code
   */
  async createPR(taskId, files, title, description) {
    try {
      const pr = await github.createFeaturePR(
        taskId,
        files,
        title,
        description
      );

      if (!pr) {
        logger.error(`${this.role}: Failed to create PR for ${taskId}`);
        return null;
      }

      logger.info(`${this.role}: Created PR #${pr.number} for ${taskId}`);
      return pr;
    } catch (error) {
      logger.error(`${this.role}: Error creating PR:`, error.message);
      return null;
    }
  }

  /**
   * Send message to team channel
   */
  async sendToTeam(message, options = {}) {
    if (this.orchestrator.teamComms) {
      return this.orchestrator.teamComms.sendMessage(this.role, message, options);
    }
    // Fallback if teamComms not available
    return this.orchestrator.notifyTelegram(
      `<b>${this.role}</b>\n${message}`,
      { parse_mode: 'HTML' }
    );
  }
  
  /**
   * Announce what I'm working on
   */
  async announce(action, taskId = null) {
    if (this.orchestrator.teamComms) {
      return this.orchestrator.teamComms.announceAction(this.role, action, taskId);
    }
  }
  
  /**
   * Share progress with the team
   */
  async shareProgress(update, percentComplete = null) {
    if (this.orchestrator.teamComms) {
      return this.orchestrator.teamComms.shareProgress(this.role, update, percentComplete);
    }
  }
  
  /**
   * Report a blocker to the team
   */
  async reportBlockerToTeam(blocker, taskId) {
    if (this.orchestrator.teamComms) {
      return this.orchestrator.teamComms.reportBlocker(this.role, blocker, taskId);
    }
  }
  
  /**
   * Ask for help from another agent
   */
  async askForHelp(toAgent, request) {
    if (this.orchestrator.teamComms) {
      return this.orchestrator.teamComms.requestHelp(this.role, toAgent, request);
    }
  }
  
  /**
   * Legacy method - kept for compatibility
   */
  async notifyPM(message, sendToTelegram = true) {
    return this.sendToTeam(message);
  }

  /**
   * Mark task as complete and move to review
   */
  async completeTask(taskPath, prUrl = null) {
    const fileName = path.basename(taskPath);
    const reviewPath = path.join(process.env.TASKS_DIR, 'review', fileName);

    // Update with completion info
    let completionMsg = 'Task completed';
    if (prUrl) {
      completionMsg += ` - PR: ${prUrl}`;
    }
    
    await this.updateTaskProgress(taskPath, completionMsg);

    // Move to review
    fileOps.moveFile(taskPath, reviewPath);
    
    this.workload = Math.max(0, this.workload - 1);
    this.currentTask = null;

    logger.info(`${this.role}: Completed ${fileName}, moved to review`);
    
    // Send formatted completion message
    const taskId = fileName.replace('.md', '');
    await this.notifyPM(
      prUrl ? 
        `✅ <b>Task Complete:</b> <code>${taskId}</code>\n🔗 <a href="${prUrl}">View PR</a>` :
        `✅ <b>Task Complete:</b> <code>${taskId}</code>`
    );

    return true;
  }

  /**
   * Mark task as blocked
   */
  async blockTask(taskPath, reason) {
    const fileName = path.basename(taskPath);
    const blockedPath = path.join(process.env.TASKS_DIR, 'blocked', fileName);

    await this.updateTaskProgress(taskPath, `BLOCKED: ${reason}`);
    fileOps.moveFile(taskPath, blockedPath);

    this.workload = Math.max(0, this.workload - 1);
    this.currentTask = null;

    logger.warn(`${this.role}: Blocked ${fileName} - ${reason}`);
    await this.notifyPM(`🚫 Blocked ${fileName}: ${reason}`);

    return true;
  }

  /**
   * Standard workflow for task execution
   */
  async runTaskWorkflow(taskPath) {
    try {
      this.currentTask = taskPath;
      this.workload++;

      const taskId = path.basename(taskPath, '.md');
      logger.info(`${this.role}: Starting task ${taskId}`);
      
      // Notify start
      await this.notifyPM(`🚀 <b>Started:</b> <code>${taskId}</code>`);
      await this.updateTaskProgress(taskPath, 'Started working on task');

      // Execute task (implemented by subclass)
      const result = await this.executeTask(taskPath);

      // Handle result - can be boolean (legacy) or object with details
      const success = typeof result === 'object' ? result.success : result;
      
      if (!success) {
        let blockReason = 'Execution failed';
        let blockDetails = null;
        
        if (typeof result === 'object') {
          blockReason = result.error || blockReason;
          blockDetails = result.details;
        }
        
        // Append details to task file if available
        if (blockDetails) {
          await this.updateTaskProgress(taskPath, `Error details:\n${blockDetails}`);
        }
        
        await this.blockTask(taskPath, blockReason);
        return false;
      }

      // Task completed successfully
      return true;

    } catch (error) {
      logger.error(`${this.role}: Error in task workflow:`, error.message);
      await this.blockTask(taskPath, `Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current status of this agent
   */
  getStatus() {
    return {
      role: this.role,
      available: this.isAvailable(),
      workload: this.workload,
      currentTask: this.currentTask ? path.basename(this.currentTask) : null
    };
  }
}

module.exports = BaseAgent;
