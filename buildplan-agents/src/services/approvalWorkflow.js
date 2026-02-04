const logger = require('../utils/logger');
const workspace = require('./workspaceManager');
const fileOps = require('../utils/file-ops');

/**
 * ApprovalWorkflow
 * Handles iterative approval of R&D outputs (mockups, research)
 * Tracks approval state, iterations, and user feedback
 */
class ApprovalWorkflow {
  constructor() {
    this.pendingApprovals = new Map(); // taskId -> { taskId, researchPath, mockupPath, iterationCount, feedback: [] }
  }

  /**
   * Register an R&D task for approval
   */
  registerForApproval(taskId, { researchPath, mockupPath, mockupUrl }) {
    const entry = {
      taskId,
      researchPath,
      mockupPath,
      mockupUrl,
      iterationCount: 0,
      feedback: [],
      status: 'pending'
    };
    this.pendingApprovals.set(taskId, entry);
    logger.info(`[ApprovalWorkflow] Registered ${taskId} for approval`);
    return entry;
  }

  /**
   * Record user feedback for iteration
   */
  recordFeedback(taskId, feedbackText) {
    const entry = this.pendingApprovals.get(taskId);
    if (!entry) throw new Error(`No pending approval for ${taskId}`);
    entry.feedback.push({ timestamp: new Date().toISOString(), text: feedbackText });
    entry.iterationCount++;
    logger.info(`[ApprovalWorkflow] Feedback recorded for ${taskId}, iteration ${entry.iterationCount}`);
    return entry;
  }

  /**
   * Approve and finalize
   */
  approve(taskId) {
    const entry = this.pendingApprovals.get(taskId);
    if (!entry) throw new Error(`No pending approval for ${taskId}`);
    entry.status = 'approved';
    entry.approvedAt = new Date().toISOString();
    logger.info(`[ApprovalWorkflow] Approved ${taskId} after ${entry.iterationCount} iterations`);
    return entry;
  }

  /**
   * Reject (cancel)
   */
  reject(taskId, reason) {
    const entry = this.pendingApprovals.get(taskId);
    if (!entry) throw new Error(`No pending approval for ${taskId}`);
    entry.status = 'rejected';
    entry.rejectedAt = new Date().toISOString();
    entry.rejectionReason = reason;
    this.pendingApprovals.delete(taskId);
    logger.warn(`[ApprovalWorkflow] Rejected ${taskId}: ${reason}`);
    return entry;
  }

  getPending(taskId) {
    return this.pendingApprovals.get(taskId);
  }

  getAll() {
    return Array.from(this.pendingApprovals.values());
  }
}

module.exports = new ApprovalWorkflow();
