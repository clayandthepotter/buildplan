const path = require('path');
const fileOps = require('../utils/file-ops');
const logger = require('../utils/logger');
const taskManager = require('./taskManager');

/**
 * ProgressTracker
 * Monitors task progress, calculates completion metrics, identifies blockers
 */
class ProgressTracker {
  /**
   * Get progress summary for a sprint
   * @param {string} sprintId - Sprint ID
   * @returns {Object} Progress summary
   */
  getSprintProgress(sprintId) {
    try {
      // Get all tasks for this sprint (would need to query by sprintId)
      // For now, get all tasks and filter
      const backlogPath = path.join(process.env.TASKS_DIR || '', 'backlog');
      const inProgressPath = path.join(process.env.TASKS_DIR || '', 'in-progress');
      const reviewPath = path.join(process.env.TASKS_DIR || '', 'review');
      const completedPath = path.join(process.env.TASKS_DIR || '', 'completed');
      const blockedPath = path.join(process.env.TASKS_DIR || '', 'blocked');

      const backlog = this.countTasksInDirectory(backlogPath);
      const inProgress = this.countTasksInDirectory(inProgressPath);
      const review = this.countTasksInDirectory(reviewPath);
      const completed = this.countTasksInDirectory(completedPath);
      const blocked = this.countTasksInDirectory(blockedPath);

      const total = backlog + inProgress + review + completed + blocked;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        sprintId,
        total,
        backlog,
        inProgress,
        review,
        completed,
        blocked,
        completionPercentage,
        status: this.determineSprintStatus(completionPercentage, blocked, inProgress)
      };
    } catch (error) {
      logger.error('[ProgressTracker] Error getting sprint progress:', error);
      return null;
    }
  }

  /**
   * Get overall project progress
   * @returns {Object} Project-wide progress metrics
   */
  getOverallProgress() {
    try {
      const tasksDir = process.env.TASKS_DIR || '';
      
      const backlog = this.countTasksInDirectory(path.join(tasksDir, 'backlog'));
      const inProgress = this.countTasksInDirectory(path.join(tasksDir, 'in-progress'));
      const review = this.countTasksInDirectory(path.join(tasksDir, 'review'));
      const completed = this.countTasksInDirectory(path.join(tasksDir, 'completed'));
      const blocked = this.countTasksInDirectory(path.join(tasksDir, 'blocked'));

      const total = backlog + inProgress + review + completed + blocked;
      const active = inProgress + review;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        backlog,
        inProgress,
        review,
        completed,
        blocked,
        active,
        completionPercentage,
        velocity: this.calculateVelocity(),
        blockers: this.getBlockersList()
      };
    } catch (error) {
      logger.error('[ProgressTracker] Error getting overall progress:', error);
      return null;
    }
  }

  /**
   * Count tasks in a directory
   * @param {string} directory - Directory path
   * @returns {number} Count of .md or .json files
   */
  countTasksInDirectory(directory) {
    try {
      if (!fileOps.fileExists(directory)) return 0;
      const files = fileOps.readDir(directory);
      return files.filter(f => f.endsWith('.md') || f.endsWith('.json')).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Determine sprint status based on metrics
   * @param {number} completionPercentage - Completion percentage
   * @param {number} blockedCount - Number of blocked tasks
   * @param {number} inProgressCount - Number of in-progress tasks
   * @returns {string} Status (on-track, at-risk, blocked, complete)
   */
  determineSprintStatus(completionPercentage, blockedCount, inProgressCount) {
    if (completionPercentage === 100) return 'complete';
    if (blockedCount > 0) return 'blocked';
    if (inProgressCount === 0 && completionPercentage < 100) return 'stalled';
    if (completionPercentage < 30) return 'at-risk';
    return 'on-track';
  }

  /**
   * Calculate velocity (tasks completed per day)
   * @returns {number} Tasks per day
   */
  calculateVelocity() {
    try {
      // Simple velocity calculation: count completed tasks in last 7 days
      const completedPath = path.join(process.env.TASKS_DIR || '', 'completed');
      if (!fileOps.fileExists(completedPath)) return 0;

      const files = fileOps.readDir(completedPath).filter(f => f.endsWith('.md') || f.endsWith('.json'));
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      let recentCount = 0;
      for (const file of files) {
        const filePath = path.join(completedPath, file);
        const stats = require('fs').statSync(filePath);
        if (stats.mtimeMs > sevenDaysAgo) {
          recentCount++;
        }
      }

      return (recentCount / 7).toFixed(1);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get list of blocked tasks with details
   * @returns {Array} Array of blocker objects
   */
  getBlockersList() {
    try {
      const blockedPath = path.join(process.env.TASKS_DIR || '', 'blocked');
      if (!fileOps.fileExists(blockedPath)) return [];

      const files = fileOps.readDir(blockedPath).filter(f => f.endsWith('.md') || f.endsWith('.json'));
      const blockers = [];

      for (const file of files) {
        const filePath = path.join(blockedPath, file);
        const content = fileOps.readFile(filePath);
        if (!content) continue;

        const taskId = file.replace(/\.(md|json)$/, '');
        const titleMatch = content.match(/title:\s*(.+)/i);
        const reasonMatch = content.match(/blocked_reason:\s*(.+)/i) || content.match(/## Blocker\s*\n+(.+)/i);

        blockers.push({
          taskId,
          title: titleMatch ? titleMatch[1].trim() : taskId,
          reason: reasonMatch ? reasonMatch[1].trim() : 'Unknown reason',
          blockedSince: this.getFileModifiedDate(filePath)
        });
      }

      return blockers;
    } catch (error) {
      logger.error('[ProgressTracker] Error getting blockers:', error);
      return [];
    }
  }

  /**
   * Get file modified date
   * @param {string} filePath - Path to file
   * @returns {string} ISO date string
   */
  getFileModifiedDate(filePath) {
    try {
      const stats = require('fs').statSync(filePath);
      return new Date(stats.mtime).toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Generate progress report text
   * @returns {string} Formatted progress report
   */
  generateProgressReport() {
    const progress = this.getOverallProgress();
    if (!progress) return 'Unable to generate progress report';

    let report = `📊 **Project Progress Report**\n\n`;
    report += `**Overall Completion**: ${progress.completionPercentage}%\n`;
    report += `**Velocity**: ${progress.velocity} tasks/day\n\n`;

    report += `**Task Breakdown**:\n`;
    report += `- 📥 Backlog: ${progress.backlog}\n`;
    report += `- 🚧 In Progress: ${progress.inProgress}\n`;
    report += `- 👀 In Review: ${progress.review}\n`;
    report += `- ✅ Completed: ${progress.completed}\n`;
    
    if (progress.blocked > 0) {
      report += `- 🚫 Blocked: ${progress.blocked}\n\n`;
      report += `**⚠️ Blockers**:\n`;
      for (const blocker of progress.blockers) {
        report += `- ${blocker.taskId}: ${blocker.reason}\n`;
      }
    }

    return report;
  }

  /**
   * Check for stale tasks (in-progress for > 3 days)
   * @returns {Array} Array of stale task IDs
   */
  getStaleTasks() {
    try {
      const inProgressPath = path.join(process.env.TASKS_DIR || '', 'in-progress');
      if (!fileOps.fileExists(inProgressPath)) return [];

      const files = fileOps.readDir(inProgressPath).filter(f => f.endsWith('.md') || f.endsWith('.json'));
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      const staleTasks = [];

      for (const file of files) {
        const filePath = path.join(inProgressPath, file);
        const stats = require('fs').statSync(filePath);
        
        if (stats.mtimeMs < threeDaysAgo) {
          staleTasks.push(file.replace(/\.(md|json)$/, ''));
        }
      }

      return staleTasks;
    } catch (error) {
      logger.error('[ProgressTracker] Error checking stale tasks:', error);
      return [];
    }
  }
}

module.exports = new ProgressTracker();
