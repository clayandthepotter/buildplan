const logger = require('../utils/logger');
const EventEmitter = require('events');

/**
 * AgentCollaboration
 * Manages communication, coordination, and handoffs between agents
 * Handles dependencies, blockers, and agent-to-agent messaging
 */
class AgentCollaboration extends EventEmitter {
  constructor() {
    super();
    this.messages = [];
    this.dependencies = new Map();
    this.handoffs = new Map();
    this.blockers = new Map();
    this.agentStatus = new Map();
  }

  /**
   * Send message from one agent to another
   * @param {Object} message - Message object
   * @returns {string} Message ID
   */
  sendMessage(message) {
    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullMessage = {
      id: messageId,
      from: message.from,
      to: message.to,
      subject: message.subject,
      body: message.body,
      priority: message.priority || 'normal',
      metadata: message.metadata || {},
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    this.messages.push(fullMessage);
    
    // Emit event for real-time handling
    this.emit('message', fullMessage);
    
    logger.info(`[AgentCollaboration] Message sent: ${message.from} → ${message.to}`);
    return messageId;
  }

  /**
   * Get messages for a specific agent
   * @param {string} agentName - Agent name
   * @param {string} status - Filter by status (sent, read, archived)
   * @returns {Array} Messages
   */
  getMessages(agentName, status = null) {
    let filtered = this.messages.filter(m => m.to === agentName);
    
    if (status) {
      filtered = filtered.filter(m => m.status === status);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @returns {boolean} Success
   */
  markAsRead(messageId) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.status = 'read';
      message.readAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Register task dependency
   * @param {string} taskId - Dependent task ID
   * @param {string} dependsOn - Task ID it depends on
   * @param {string} reason - Dependency reason
   */
  addDependency(taskId, dependsOn, reason = '') {
    if (!this.dependencies.has(taskId)) {
      this.dependencies.set(taskId, []);
    }

    this.dependencies.get(taskId).push({
      taskId: dependsOn,
      reason,
      createdAt: new Date().toISOString(),
      resolved: false
    });

    logger.info(`[AgentCollaboration] Dependency added: ${taskId} → ${dependsOn}`);
  }

  /**
   * Resolve dependency
   * @param {string} taskId - Task ID
   * @param {string} dependsOn - Dependency task ID
   */
  resolveDependency(taskId, dependsOn) {
    const deps = this.dependencies.get(taskId);
    if (deps) {
      const dep = deps.find(d => d.taskId === dependsOn);
      if (dep) {
        dep.resolved = true;
        dep.resolvedAt = new Date().toISOString();
        logger.info(`[AgentCollaboration] Dependency resolved: ${taskId} → ${dependsOn}`);
      }
    }
  }

  /**
   * Check if all dependencies are resolved
   * @param {string} taskId - Task ID
   * @returns {boolean} True if all dependencies resolved
   */
  areDependenciesResolved(taskId) {
    const deps = this.dependencies.get(taskId);
    if (!deps || deps.length === 0) return true;
    return deps.every(d => d.resolved);
  }

  /**
   * Get blocked tasks (dependencies not resolved)
   * @returns {Array} Blocked tasks
   */
  getBlockedTasks() {
    const blocked = [];
    
    for (const [taskId, deps] of this.dependencies.entries()) {
      const unresolvedDeps = deps.filter(d => !d.resolved);
      if (unresolvedDeps.length > 0) {
        blocked.push({
          taskId,
          dependencies: unresolvedDeps,
          blockedSince: deps[0].createdAt
        });
      }
    }

    return blocked;
  }

  /**
   * Create handoff from one agent to another
   * @param {Object} handoff - Handoff details
   * @returns {string} Handoff ID
   */
  createHandoff(handoff) {
    const handoffId = `HANDOFF-${Date.now()}`;
    
    const fullHandoff = {
      id: handoffId,
      from: handoff.from,
      to: handoff.to,
      taskId: handoff.taskId,
      context: handoff.context || {},
      deliverables: handoff.deliverables || [],
      instructions: handoff.instructions || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.handoffs.set(handoffId, fullHandoff);

    // Send notification message
    this.sendMessage({
      from: handoff.from,
      to: handoff.to,
      subject: `Task Handoff: ${handoff.taskId}`,
      body: `Task ${handoff.taskId} has been handed off to you.\n\n${handoff.instructions}`,
      priority: 'high',
      metadata: { handoffId, taskId: handoff.taskId }
    });

    logger.info(`[AgentCollaboration] Handoff created: ${handoff.from} → ${handoff.to} (${handoff.taskId})`);
    return handoffId;
  }

  /**
   * Accept handoff
   * @param {string} handoffId - Handoff ID
   * @param {string} agentName - Agent accepting
   * @returns {Object} Handoff details
   */
  acceptHandoff(handoffId, agentName) {
    const handoff = this.handoffs.get(handoffId);
    
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`);
    }

    if (handoff.to !== agentName) {
      throw new Error(`Handoff not assigned to ${agentName}`);
    }

    handoff.status = 'accepted';
    handoff.acceptedAt = new Date().toISOString();
    this.handoffs.set(handoffId, handoff);

    logger.info(`[AgentCollaboration] Handoff accepted: ${handoffId} by ${agentName}`);
    return handoff;
  }

  /**
   * Complete handoff
   * @param {string} handoffId - Handoff ID
   * @param {Object} result - Completion result
   */
  completeHandoff(handoffId, result) {
    const handoff = this.handoffs.get(handoffId);
    
    if (handoff) {
      handoff.status = 'completed';
      handoff.completedAt = new Date().toISOString();
      handoff.result = result;
      this.handoffs.set(handoffId, handoff);

      // Notify originating agent
      this.sendMessage({
        from: handoff.to,
        to: handoff.from,
        subject: `Handoff Complete: ${handoff.taskId}`,
        body: `Task ${handoff.taskId} handoff has been completed.`,
        metadata: { handoffId, result }
      });

      logger.info(`[AgentCollaboration] Handoff completed: ${handoffId}`);
    }
  }

  /**
   * Report blocker
   * @param {Object} blocker - Blocker details
   * @returns {string} Blocker ID
   */
  reportBlocker(blocker) {
    const blockerId = `BLOCKER-${Date.now()}`;
    
    const fullBlocker = {
      id: blockerId,
      taskId: blocker.taskId,
      agentName: blocker.agentName,
      type: blocker.type, // technical, dependency, information, external
      description: blocker.description,
      severity: blocker.severity || 'medium',
      status: 'open',
      reportedAt: new Date().toISOString(),
      escalated: false
    };

    this.blockers.set(blockerId, fullBlocker);

    // Send to PM-Agent
    this.sendMessage({
      from: blocker.agentName,
      to: 'pm-agent',
      subject: `BLOCKER: ${blocker.taskId}`,
      body: `Task blocked: ${blocker.description}`,
      priority: 'high',
      metadata: { blockerId, type: blocker.type, severity: blocker.severity }
    });

    logger.warn(`[AgentCollaboration] Blocker reported: ${blockerId} by ${blocker.agentName}`);
    return blockerId;
  }

  /**
   * Resolve blocker
   * @param {string} blockerId - Blocker ID
   * @param {string} resolution - How it was resolved
   */
  resolveBlocker(blockerId, resolution) {
    const blocker = this.blockers.get(blockerId);
    
    if (blocker) {
      blocker.status = 'resolved';
      blocker.resolvedAt = new Date().toISOString();
      blocker.resolution = resolution;
      this.blockers.set(blockerId, blocker);

      // Notify agent
      this.sendMessage({
        from: 'pm-agent',
        to: blocker.agentName,
        subject: `Blocker Resolved: ${blocker.taskId}`,
        body: `Your blocker has been resolved: ${resolution}`,
        metadata: { blockerId }
      });

      logger.info(`[AgentCollaboration] Blocker resolved: ${blockerId}`);
    }
  }

  /**
   * Escalate blocker to PM
   * @param {string} blockerId - Blocker ID
   */
  escalateBlocker(blockerId) {
    const blocker = this.blockers.get(blockerId);
    
    if (blocker && !blocker.escalated) {
      blocker.escalated = true;
      blocker.escalatedAt = new Date().toISOString();
      this.blockers.set(blockerId, blocker);

      // Send escalation message
      this.sendMessage({
        from: 'system',
        to: 'pm-agent',
        subject: `ESCALATED BLOCKER: ${blocker.taskId}`,
        body: `Blocker requires immediate attention:\n\nTask: ${blocker.taskId}\nType: ${blocker.type}\nSeverity: ${blocker.severity}\nDescription: ${blocker.description}`,
        priority: 'urgent',
        metadata: { blockerId, escalated: true }
      });

      logger.warn(`[AgentCollaboration] Blocker escalated: ${blockerId}`);
    }
  }

  /**
   * Get all open blockers
   * @returns {Array} Open blockers
   */
  getOpenBlockers() {
    return Array.from(this.blockers.values())
      .filter(b => b.status === 'open')
      .sort((a, b) => {
        const severityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Update agent status
   * @param {string} agentName - Agent name
   * @param {string} status - Status (idle, working, blocked)
   * @param {Object} metadata - Additional info
   */
  updateAgentStatus(agentName, status, metadata = {}) {
    this.agentStatus.set(agentName, {
      status,
      metadata,
      updatedAt: new Date().toISOString()
    });

    logger.info(`[AgentCollaboration] Agent status updated: ${agentName} → ${status}`);
  }

  /**
   * Get agent status
   * @param {string} agentName - Agent name
   * @returns {Object} Status info
   */
  getAgentStatus(agentName) {
    return this.agentStatus.get(agentName) || { status: 'unknown', updatedAt: null };
  }

  /**
   * Get all agent statuses
   * @returns {Object} All agent statuses
   */
  getAllAgentStatuses() {
    const statuses = {};
    for (const [agent, status] of this.agentStatus.entries()) {
      statuses[agent] = status;
    }
    return statuses;
  }

  /**
   * Request help from another agent
   * @param {Object} request - Help request
   * @returns {string} Request ID
   */
  requestHelp(request) {
    const messageId = this.sendMessage({
      from: request.from,
      to: request.to,
      subject: `Help Requested: ${request.topic}`,
      body: `${request.from} needs help with: ${request.description}`,
      priority: 'high',
      metadata: { type: 'help-request', topic: request.topic }
    });

    logger.info(`[AgentCollaboration] Help requested: ${request.from} → ${request.to}`);
    return messageId;
  }

  /**
   * Coordinate multi-agent task
   * @param {Object} coordination - Coordination details
   * @returns {string} Coordination ID
   */
  coordinateTask(coordination) {
    const coordId = `COORD-${Date.now()}`;
    
    // Send messages to all involved agents
    for (const agent of coordination.agents) {
      this.sendMessage({
        from: 'pm-agent',
        to: agent.name,
        subject: `Multi-Agent Task: ${coordination.taskId}`,
        body: `You are part of a coordinated effort for ${coordination.taskId}.\n\nYour role: ${agent.role}\n\nOther agents: ${coordination.agents.map(a => a.name).join(', ')}`,
        priority: 'high',
        metadata: { coordId, taskId: coordination.taskId }
      });
    }

    logger.info(`[AgentCollaboration] Task coordination initiated: ${coordId}`);
    return coordId;
  }

  /**
   * Generate collaboration report
   * @returns {string} Formatted report
   */
  generateReport() {
    let report = '🤝 **Agent Collaboration Report**\n\n';

    // Messages
    const recentMessages = this.messages.slice(-10);
    report += `**Recent Messages**: ${recentMessages.length}\n`;
    report += `**Unread**: ${this.messages.filter(m => m.status === 'sent').length}\n\n`;

    // Dependencies
    const blockedTasks = this.getBlockedTasks();
    report += `**Blocked by Dependencies**: ${blockedTasks.length}\n`;
    if (blockedTasks.length > 0) {
      blockedTasks.slice(0, 3).forEach(t => {
        report += `- ${t.taskId}: ${t.dependencies.length} unresolved dependencies\n`;
      });
      report += '\n';
    }

    // Handoffs
    const activeHandoffs = Array.from(this.handoffs.values())
      .filter(h => h.status !== 'completed');
    report += `**Active Handoffs**: ${activeHandoffs.length}\n\n`;

    // Blockers
    const openBlockers = this.getOpenBlockers();
    report += `**Open Blockers**: ${openBlockers.length}\n`;
    if (openBlockers.length > 0) {
      openBlockers.slice(0, 3).forEach(b => {
        report += `- ${b.taskId} (${b.severity}): ${b.description}\n`;
      });
      report += '\n';
    }

    // Agent Statuses
    report += `**Agent Statuses**:\n`;
    for (const [agent, status] of this.agentStatus.entries()) {
      report += `- ${agent}: ${status.status}\n`;
    }

    return report;
  }
}

module.exports = new AgentCollaboration();
