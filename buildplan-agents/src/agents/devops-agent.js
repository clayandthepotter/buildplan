const BaseAgent = require('./base-agent');
const SkillLoader = require('../services/skillLoader');
const GitOps = require('../services/gitOps');
const AgentCollaboration = require('../services/agentCollaboration');
const Permissions = require('../services/permissions');
const logger = require('../utils/logger');
const path = require('path');

/**
 * DevOps-Agent
 * Specialist agent for infrastructure, deployment, and DevOps tasks
 * Handles CI/CD, database migrations, environment setup, and deployment automation
 */
class DevOpsAgent extends BaseAgent {
  constructor(orchestrator) {
    super(
      orchestrator,
      'DevOps-Agent',
      'docs/AI_WORKFORCE_SYSTEM.md'
    );
    this.currentBranch = null;
    this.workspaceRoot = path.join(process.env.PROJECT_ROOT || '', 'workspace', 'devops-agent');
  }

  /**
   * Execute a DevOps task
   */
  async executeTask(taskPath) {
    try {
      const task = this.parseTaskFile(taskPath);
      if (!task) {
        logger.error(`${this.role}: Could not parse task file`);
        return false;
      }

      const taskId = task.metadata.id || path.basename(taskPath, '.md');
      
      logger.info(`${this.role}: Executing task ${taskId}`);
      
      AgentCollaboration.updateAgentStatus('devops-agent', 'working', {
        taskId,
        phase: 'analysis'
      });
      
      // Load DevOps skills
      await this.loadSkills(task);
      
      // Determine task type
      const taskType = this.determineTaskType(task);
      
      let result;
      switch (taskType) {
        case 'migration':
          result = await this.handleDatabaseMigration(task, taskId, taskPath);
          break;
        case 'ci-cd':
          result = await this.handleCICDTask(task, taskId, taskPath);
          break;
        case 'deployment':
          result = await this.handleDeploymentTask(task, taskId, taskPath);
          break;
        case 'infrastructure':
          result = await this.handleInfrastructureTask(task, taskId, taskPath);
          break;
        default:
          result = await this.handleGeneralDevOpsTask(task, taskId, taskPath);
      }

      AgentCollaboration.updateAgentStatus('devops-agent', 'idle');
      
      if (this.orchestrator.teamComms) {
        await this.orchestrator.teamComms.celebrate(
          this.role,
          `Completed ${taskId}! DevOps changes ready. 🚀`
        );
      }

      return result;

    } catch (error) {
      logger.error(`${this.role}: Error executing task:`, error.message);
      
      await AgentCollaboration.reportBlocker({
        taskId: taskPath,
        agentName: 'devops-agent',
        type: 'technical',
        description: error.message,
        severity: 'high'
      });
      
      AgentCollaboration.updateAgentStatus('devops-agent', 'blocked', {
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Load relevant skills
   */
  async loadSkills(task) {
    const skillCategories = ['devops'];
    
    const content = (task.content || '').toLowerCase();
    if (content.includes('database') || content.includes('migration') || content.includes('prisma')) {
      skillCategories.push('database');
    }
    if (content.includes('ci') || content.includes('github actions') || content.includes('workflow')) {
      skillCategories.push('ci-cd');
    }
    if (content.includes('deploy') || content.includes('vercel')) {
      skillCategories.push('deployment');
    }
    if (content.includes('docker') || content.includes('infrastructure')) {
      skillCategories.push('infrastructure');
    }
    
    const skills = await SkillLoader.loadSkillsForAgent('devops-agent', skillCategories);
    logger.info(`${this.role}: Loaded ${skills.length} skills`);
  }

  /**
   * Determine task type from content
   */
  determineTaskType(task) {
    const content = (task.content || '').toLowerCase();
    
    if (content.includes('migration') || content.includes('schema') || content.includes('database')) {
      return 'migration';
    }
    if (content.includes('ci/cd') || content.includes('github actions') || content.includes('workflow')) {
      return 'ci-cd';
    }
    if (content.includes('deploy') || content.includes('deployment')) {
      return 'deployment';
    }
    if (content.includes('infrastructure') || content.includes('docker') || content.includes('kubernetes')) {
      return 'infrastructure';
    }
    
    return 'general';
  }

  /**
   * Handle database migration task
   */
  async handleDatabaseMigration(task, taskId, taskPath) {
    logger.info(`${this.role}: Handling database migration`);
    
    await this.updateTaskProgress(taskPath, 'Creating database migration');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'database-migration');
    
    const migrationPrompt = `You are creating a Prisma database migration. Be precise and safe.

## Requirements
${task.content}

## Instructions
Generate a Prisma migration file that:
1. Follows Prisma naming conventions
2. Includes proper indexes
3. Has appropriate constraints
4. Uses correct field types
5. Includes migration timestamps
6. Is reversible when possible

Provide the migration SQL and any necessary schema.prisma changes.`;

    const migration = await this.generateArtifact(migrationPrompt);
    
    if (!migration) {
      return { success: false, error: 'Failed to generate migration' };
    }

    // Parse migration files
    const files = this.parseMigrationFiles(migration, taskId);
    
    // Write migration files
    for (const file of files) {
      const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
      await Permissions.writeFile('devops-agent', fullPath, file.content);
    }
    
    // Create PR
    const prTitle = `[${taskId}] Database Migration`;
    const prBody = this.buildMigrationPRDescription(task, files);
    
    const pr = await this.createPR(taskId, files, prTitle, prBody);
    
    if (!pr) {
      return { success: false, error: 'Failed to create PR' };
    }
    
    await this.completeTask(taskPath, pr.url);
    
    return { success: true, pr: pr.url, branch: this.currentBranch };
  }

  /**
   * Parse migration files from generated content
   */
  parseMigrationFiles(content, taskId) {
    const files = [];
    const timestamp = Date.now();
    
    // Extract SQL migration
    const sqlMatch = content.match(/```sql\n([\s\S]*?)```/);
    if (sqlMatch) {
      files.push({
        path: `packages/api/prisma/migrations/${timestamp}_${taskId}/migration.sql`,
        content: sqlMatch[1].trim()
      });
    }
    
    // Extract schema changes
    const schemaMatch = content.match(/```prisma\n([\s\S]*?)```/);
    if (schemaMatch) {
      files.push({
        path: 'packages/api/prisma/schema.prisma',
        content: schemaMatch[1].trim()
      });
    }
    
    return files;
  }

  /**
   * Build migration PR description
   */
  buildMigrationPRDescription(task, files) {
    return `## Database Migration

**Task ID:** ${task.metadata.id}

### Changes
${files.map(f => `- ${f.path}`).join('\n')}

### Description
${task.content.substring(0, 500)}

### Generated by
DevOps Agent (AI)

### ⚠️ Important
- Review migration SQL carefully
- Test on staging before production
- Ensure database backups are current

---
*This PR was automatically generated by the BuildPlan AI team.*`;
  }

  /**
   * Handle CI/CD task
   */
  async handleCICDTask(task, taskId, taskPath) {
    logger.info(`${this.role}: Handling CI/CD task`);
    
    await this.updateTaskProgress(taskPath, 'Creating CI/CD workflow');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'ci-cd');
    
    const workflowPrompt = `You are creating a GitHub Actions workflow. Be efficient and secure.

## Requirements
${task.content}

## Instructions
Generate a GitHub Actions workflow file (.yml) that:
1. Uses appropriate triggers
2. Has proper job dependencies
3. Includes caching where appropriate
4. Has security best practices
5. Includes error handling
6. Has clear step names

Provide the complete workflow file.`;

    const workflow = await this.generateArtifact(workflowPrompt);
    
    if (!workflow) {
      return { success: false, error: 'Failed to generate workflow' };
    }

    const files = [{
      path: `.github/workflows/${taskId}.yml`,
      content: workflow
    }];
    
    for (const file of files) {
      const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
      await Permissions.writeFile('devops-agent', fullPath, file.content);
    }
    
    const prTitle = `[${taskId}] CI/CD Workflow`;
    const prBody = `## CI/CD Workflow\n\n${task.content}\n\n### Generated by\nDevOps Agent (AI)`;
    
    const pr = await this.createPR(taskId, files, prTitle, prBody);
    
    await this.completeTask(taskPath, pr.url);
    
    return { success: true, pr: pr.url, branch: this.currentBranch };
  }

  /**
   * Handle deployment task
   */
  async handleDeploymentTask(task, taskId, taskPath) {
    logger.info(`${this.role}: Handling deployment task`);
    
    await this.updateTaskProgress(taskPath, 'Configuring deployment');
    
    // Deployment tasks might not need PRs - they could be config changes
    const result = await this.generateArtifact(`Handle deployment task: ${task.content}`);
    
    await this.completeTask(taskPath, 'Deployment configured');
    
    return { success: true, result };
  }

  /**
   * Handle infrastructure task
   */
  async handleInfrastructureTask(task, taskId, taskPath) {
    logger.info(`${this.role}: Handling infrastructure task`);
    
    await this.updateTaskProgress(taskPath, 'Setting up infrastructure');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'infrastructure');
    
    const result = await this.generateArtifact(`Handle infrastructure task: ${task.content}`);
    
    await this.completeTask(taskPath, 'Infrastructure configured');
    
    return { success: true, result };
  }

  /**
   * Handle general DevOps task
   */
  async handleGeneralDevOpsTask(task, taskId, taskPath) {
    logger.info(`${this.role}: Handling general DevOps task`);
    
    const result = await this.generateArtifact(`Handle DevOps task: ${task.content}`);
    
    await this.completeTask(taskPath, 'Task completed');
    
    return { success: true, result };
  }

  /**
   * Create feature branch
   */
  async createFeatureBranch(taskId, type) {
    const branchName = `devops/${taskId}-${type}`;
    
    logger.info(`${this.role}: Creating branch: ${branchName}`);
    
    try {
      await GitOps.createBranch(branchName);
      await GitOps.checkoutBranch(branchName);
      return branchName;
    } catch (error) {
      logger.warn(`${this.role}: Could not create branch: ${error.message}`);
      return branchName;
    }
  }

  /**
   * Get current work status
   */
  getStatus() {
    const status = AgentCollaboration.getAgentStatus('devops-agent');
    const messages = AgentCollaboration.getMessages('devops-agent', 'sent');
    
    return {
      agent: 'devops-agent',
      status: status.status,
      currentBranch: this.currentBranch,
      unreadMessages: messages.length,
      ...status.metadata
    };
  }

  /**
   * Handle handoff from another agent
   */
  async handleHandoff(handoffId) {
    const handoff = await AgentCollaboration.acceptHandoff(handoffId, 'devops-agent');
    
    logger.info(`${this.role}: Accepted handoff for task: ${handoff.taskId}`);
    
    const result = await this.executeTask(handoff.context.taskPath);
    
    await AgentCollaboration.completeHandoff(handoffId, result);
    
    return result;
  }
}

module.exports = DevOpsAgent;
