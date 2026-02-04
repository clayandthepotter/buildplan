const path = require('path');
const fileOps = require('../utils/file-ops');
const workspace = require('./workspaceManager');
const logger = require('../utils/logger');

/**
 * TaskManager
 * Creates task files from sprint definitions, assigns to agents, tracks status
 */
class TaskManager {
  constructor() {
    this.backlogPath = workspace.resolveAgentPath('pm-agent', 'backlog');
  }

  /**
   * Create task files from sprint definitions
   * @param {Array} sprints - Array of sprint objects
   * @param {string} rdTaskId - The R&D task these sprints came from
   * @returns {Array} Created task IDs
   */
  async createTasksFromSprints(sprints, rdTaskId) {
    const createdTasks = [];

    try {
      for (const sprint of sprints) {
        for (const task of sprint.tasks) {
          const taskId = `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const taskSpec = {
            id: taskId,
            sprintId: sprint.id,
            rdTaskId,
            type: task.type,
            title: task.title,
            priority: task.priority || 'medium',
            status: 'pending',
            assignedAgent: this.getAgentForType(task.type),
            createdAt: new Date().toISOString(),
            dependencies: [],
            metadata: {}
          };

          // Write task file to PM backlog
          const taskFilePath = path.join(this.backlogPath, `${taskId}.json`);
          fileOps.writeFile(taskFilePath, JSON.stringify(taskSpec, null, 2));

          createdTasks.push(taskId);
          logger.info(`[TaskManager] Created task ${taskId} for ${task.type} agent`);
        }
      }

      return createdTasks;
    } catch (error) {
      logger.error('[TaskManager] Error creating tasks:', error);
      return createdTasks;
    }
  }

  /**
   * Map task type to agent name
   * @param {string} type - Task type
   * @returns {string} Agent name
   */
  getAgentForType(type) {
    const mapping = {
      'architecture': 'architect-agent',
      'backend': 'backend-agent',
      'frontend': 'frontend-agent',
      'devops': 'devops-agent',
      'qa': 'qa-agent',
      'docs': 'docs-agent'
    };
    return mapping[type] || 'backend-agent';
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Object|null} Task spec or null
   */
  getTask(taskId) {
    try {
      const taskPath = path.join(this.backlogPath, `${taskId}.json`);
      const content = fileOps.readFile(taskPath);
      return content ? JSON.parse(content) : null;
    } catch (error) {
      logger.error(`[TaskManager] Error reading task ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Update task status
   * @param {string} taskId - Task ID
   * @param {string} status - New status (pending, in-progress, completed, blocked)
   * @returns {boolean} Success
   */
  updateTaskStatus(taskId, status) {
    try {
      const task = this.getTask(taskId);
      if (!task) return false;

      task.status = status;
      task.updatedAt = new Date().toISOString();

      const taskPath = path.join(this.backlogPath, `${taskId}.json`);
      fileOps.writeFile(taskPath, JSON.stringify(task, null, 2));

      logger.info(`[TaskManager] Updated ${taskId} status to ${status}`);
      return true;
    } catch (error) {
      logger.error(`[TaskManager] Error updating task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Get all tasks for a specific agent
   * @param {string} agentName - Agent name
   * @returns {Array} Array of task specs
   */
  getTasksForAgent(agentName) {
    try {
      const files = fileOps.readDir(this.backlogPath);
      const tasks = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fileOps.readFile(path.join(this.backlogPath, file));
          const task = JSON.parse(content);
          if (task.assignedAgent === agentName) {
            tasks.push(task);
          }
        }
      }

      return tasks;
    } catch (error) {
      logger.error('[TaskManager] Error getting agent tasks:', error);
      return [];
    }
  }
}

module.exports = new TaskManager();
