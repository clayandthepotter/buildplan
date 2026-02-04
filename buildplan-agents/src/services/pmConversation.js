const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * PM Conversation Service
 * Handles natural language queries about tasks, blockers, and project status
 */
class PMConversationService {
  constructor(tasksDir) {
    this.tasksDir = tasksDir || process.env.TASKS_DIR || 'tasks';
  }

  /**
   * Query information about a specific task
   * @param {string} taskId - The task ID to query
   * @returns {object} Task details including blocker information
   */
  async queryTask(taskId) {
    try {
      // Search for task in all directories
      const taskFile = await this.findTaskFile(taskId);
      
      if (!taskFile) {
        return {
          found: false,
          message: `❌ Task ${taskId} not found in any directory`
        };
      }

      const taskContent = fs.readFileSync(taskFile.path, 'utf8');
      const taskData = this.parseTaskFile(taskContent);
      
      return {
        found: true,
        taskId: taskId,
        status: taskFile.status,
        location: taskFile.dir,
        metadata: taskData.metadata,
        progressLog: taskData.progressLog,
        blocker: taskData.blocker,
        description: taskData.description
      };
    } catch (error) {
      logger.error('Error querying task:', error.message);
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Get all blocked tasks with details
   * @returns {Array} List of blocked tasks with blocker reasons
   */
  async getBlockedTasks() {
    const blockedDir = path.join(this.tasksDir, 'blocked');
    
    if (!fs.existsSync(blockedDir)) {
      return [];
    }

    const files = fs.readdirSync(blockedDir).filter(f => f.endsWith('.md'));
    const blockedTasks = [];

    for (const file of files) {
      const taskId = file.replace('.md', '');
      const filePath = path.join(blockedDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const taskData = this.parseTaskFile(content);

      blockedTasks.push({
        taskId,
        title: taskData.metadata.title,
        blockedAt: taskData.metadata.created_at,
        reason: taskData.blocker.reason,
        details: taskData.blocker.details,
        progressLog: taskData.progressLog.slice(-5) // Last 5 entries
      });
    }

    return blockedTasks;
  }

  /**
   * Find a task file across all task directories
   * @param {string} taskId - Task ID to find
   * @returns {object|null} File path and status
   */
  async findTaskFile(taskId) {
    const directories = ['inbox', 'backlog', 'in-progress', 'blocked', 'review', 'completed'];
    const fileName = `${taskId}.md`;

    for (const dir of directories) {
      const dirPath = path.join(this.tasksDir, dir);
      const filePath = path.join(dirPath, fileName);
      
      if (fs.existsSync(filePath)) {
        return {
          path: filePath,
          dir: dir,
          status: dir
        };
      }
    }

    return null;
  }

  /**
   * Parse task markdown file
   * @param {string} content - Task file content
   * @returns {object} Parsed task data
   */
  parseTaskFile(content) {
    const lines = content.split('\n');
    const result = {
      metadata: {},
      progressLog: [],
      blocker: { reason: null, details: null },
      description: ''
    };

    // Parse frontmatter metadata
    let inFrontmatter = false;
    let inDescription = false;
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          inFrontmatter = false;
          continue;
        }
      }

      if (inFrontmatter) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          result.metadata[match[1]] = match[2];
        }
      }

      // Parse description section
      if (line.startsWith('## Description')) {
        inDescription = true;
        currentSection = 'description';
        continue;
      }

      if (line.startsWith('## Progress Log')) {
        inDescription = false;
        currentSection = 'progress';
        continue;
      }

      if (line.startsWith('## ')) {
        inDescription = false;
        currentSection = null;
      }

      // Collect description
      if (inDescription && line.trim()) {
        result.description += line + '\n';
      }

      // Parse progress log for blocker info
      if (currentSection === 'progress' && line.trim().startsWith('-')) {
        const logEntry = line.substring(line.indexOf(']') + 1).trim();
        result.progressLog.push(line.trim());

        // Check for blocker entries
        if (logEntry.includes('BLOCKED:')) {
          result.blocker.reason = logEntry.replace(/.*BLOCKED:\s*/, '');
        }

        // Check for error details
        if (logEntry.includes('Error details:')) {
          // Capture multiline error details
          const detailsStart = i + 1;
          let details = '';
          while (i + 1 < lines.length && !lines[i + 1].startsWith('-')) {
            i++;
            details += lines[i] + '\n';
          }
          result.blocker.details = details.trim();
        }
      }
    }

    return result;
  }

  /**
   * Format task information for human-readable output
   * @param {object} taskInfo - Task information from queryTask
   * @returns {string} Formatted message
   */
  formatTaskInfo(taskInfo) {
    if (!taskInfo.found) {
      return taskInfo.message || `Task not found: ${taskInfo.error}`;
    }

    let message = `📋 **${taskInfo.taskId}**\n`;
    message += `📂 Status: ${taskInfo.status.toUpperCase()}\n`;
    message += `📝 Title: ${taskInfo.metadata.title || 'N/A'}\n`;
    message += `👤 Assigned: ${taskInfo.metadata.assigned_to || 'none'}\n`;
    message += `⚡ Priority: ${taskInfo.metadata.priority || 'medium'}\n\n`;

    if (taskInfo.blocker.reason) {
      message += `🚫 **BLOCKER:**\n`;
      message += `Reason: ${taskInfo.blocker.reason}\n\n`;
      
      if (taskInfo.blocker.details) {
        message += `📄 **Error Details:**\n\`\`\`\n${taskInfo.blocker.details}\n\`\`\`\n\n`;
      }
    }

    if (taskInfo.progressLog && taskInfo.progressLog.length > 0) {
      message += `📊 **Recent Progress (last 5):**\n`;
      taskInfo.progressLog.slice(-5).forEach(log => {
        message += `${log}\n`;
      });
    }

    return message;
  }

  /**
   * Format blocked tasks summary
   * @param {Array} blockedTasks - List of blocked tasks
   * @returns {string} Formatted message
   */
  formatBlockedTasksSummary(blockedTasks) {
    if (blockedTasks.length === 0) {
      return '✅ No tasks are currently blocked!';
    }

    let message = `🚫 **${blockedTasks.length} Blocked Task(s)**\n\n`;

    blockedTasks.forEach((task, index) => {
      message += `${index + 1}. **${task.taskId}**\n`;
      message += `   Title: ${task.title}\n`;
      message += `   Reason: ${task.reason}\n`;
      
      if (task.details) {
        // Truncate long details
        const truncated = task.details.length > 200 
          ? task.details.substring(0, 200) + '...\n   (Use /blocker [task-id] for full details)'
          : task.details;
        message += `   Details: ${truncated}\n`;
      }
      message += '\n';
    });

    return message;
  }
}

module.exports = PMConversationService;
