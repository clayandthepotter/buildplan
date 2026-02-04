const BaseAgent = require('./base-agent');
const SkillLoader = require('../services/skillLoader');
const GitOps = require('../services/gitOps');
const AgentCollaboration = require('../services/agentCollaboration');
const Permissions = require('../services/permissions');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Docs-Agent
 * Specialist agent for documentation tasks
 * Handles API docs, user guides, README files, and inline code documentation
 */
class DocsAgent extends BaseAgent {
  constructor(orchestrator) {
    super(
      orchestrator,
      'Docs-Agent',
      'docs/AI_WORKFORCE_SYSTEM.md'
    );
    this.currentBranch = null;
    this.workspaceRoot = path.join(process.env.PROJECT_ROOT || '', 'workspace', 'docs-agent');
  }

  /**
   * Execute a documentation task
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
      
      AgentCollaboration.updateAgentStatus('docs-agent', 'working', {
        taskId,
        phase: 'analysis'
      });
      
      // Load documentation skills
      await this.loadSkills(task);
      
      // Determine task type
      const taskType = this.determineTaskType(task);
      
      let result;
      switch (taskType) {
        case 'api-docs':
          result = await this.generateAPIDocs(task, taskId, taskPath);
          break;
        case 'readme':
          result = await this.updateREADME(task, taskId, taskPath);
          break;
        case 'user-guide':
          result = await this.createUserGuide(task, taskId, taskPath);
          break;
        case 'inline-docs':
          result = await this.addInlineDocs(task, taskId, taskPath);
          break;
        default:
          result = await this.handleGeneralDocsTask(task, taskId, taskPath);
      }

      AgentCollaboration.updateAgentStatus('docs-agent', 'idle');
      
      if (this.orchestrator.teamComms) {
        await this.orchestrator.teamComms.celebrate(
          this.role,
          `Completed ${taskId}! Documentation updated. 📚`
        );
      }

      return result;

    } catch (error) {
      logger.error(`${this.role}: Error executing task:`, error.message);
      
      await AgentCollaboration.reportBlocker({
        taskId: taskPath,
        agentName: 'docs-agent',
        type: 'technical',
        description: error.message,
        severity: 'medium'
      });
      
      AgentCollaboration.updateAgentStatus('docs-agent', 'blocked', {
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Load relevant skills
   */
  async loadSkills(task) {
    const skillCategories = ['documentation'];
    
    const content = (task.content || '').toLowerCase();
    if (content.includes('api') || content.includes('endpoint')) {
      skillCategories.push('api-docs');
    }
    if (content.includes('readme')) {
      skillCategories.push('readme');
    }
    if (content.includes('tutorial') || content.includes('guide')) {
      skillCategories.push('technical-writing');
    }
    
    const skills = await SkillLoader.loadSkillsForAgent('docs-agent', skillCategories);
    logger.info(`${this.role}: Loaded ${skills.length} skills`);
  }

  /**
   * Determine task type from content
   */
  determineTaskType(task) {
    const content = (task.content || '').toLowerCase();
    
    if (content.includes('api doc') || content.includes('openapi') || content.includes('swagger')) {
      return 'api-docs';
    }
    if (content.includes('readme')) {
      return 'readme';
    }
    if (content.includes('user guide') || content.includes('tutorial')) {
      return 'user-guide';
    }
    if (content.includes('inline') || content.includes('comment') || content.includes('jsdoc')) {
      return 'inline-docs';
    }
    
    return 'general';
  }

  /**
   * Generate API documentation
   */
  async generateAPIDocs(task, taskId, taskPath) {
    logger.info(`${this.role}: Generating API documentation`);
    
    await this.updateTaskProgress(taskPath, 'Generating API docs');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'api-docs');
    
    const docsPrompt = `You are generating API documentation. Be clear and comprehensive.

## Requirements
${task.content}

## Instructions
Generate API documentation in OpenAPI 3.0 format that includes:
1. Clear endpoint descriptions
2. Request/response schemas
3. Example requests and responses
4. Error codes and descriptions
5. Authentication requirements
6. Rate limiting info if applicable

Provide the complete OpenAPI spec.`;

    const apiDocs = await this.generateArtifact(docsPrompt);
    
    if (!apiDocs) {
      return { success: false, error: 'Failed to generate API docs' };
    }

    const files = [{
      path: `docs/api/${taskId}.yml`,
      content: apiDocs
    }];
    
    for (const file of files) {
      const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
      await Permissions.writeFile('docs-agent', fullPath, file.content);
    }
    
    const prTitle = `[${taskId}] API Documentation`;
    const prBody = `## API Documentation\n\n${task.content}\n\n### Generated by\nDocs Agent (AI)`;
    
    const pr = await this.createPR(taskId, files, prTitle, prBody);
    
    await this.completeTask(taskPath, pr.url);
    
    return { success: true, pr: pr.url, branch: this.currentBranch };
  }

  /**
   * Update README
   */
  async updateREADME(task, taskId, taskPath) {
    logger.info(`${this.role}: Updating README`);
    
    await this.updateTaskProgress(taskPath, 'Updating README');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'readme-update');
    
    // Read existing README if it exists
    let existingReadme = '';
    try {
      const readmePath = path.join(process.env.PROJECT_ROOT, 'README.md');
      existingReadme = await Permissions.readFile('docs-agent', readmePath);
    } catch (error) {
      logger.info(`${this.role}: No existing README found, will create new one`);
    }

    const readmePrompt = `You are updating a README file. Be clear and helpful.

## Task
${task.content}

${existingReadme ? `## Existing README\n${existingReadme}\n\n` : ''}

## Instructions
${existingReadme ? 'Update the existing README with the requested changes.' : 'Create a comprehensive README.'}

Include:
1. Project overview
2. Features
3. Installation steps
4. Usage examples
5. Configuration
6. Contributing guidelines
7. License info

Provide the complete README.md content.`;

    const readme = await this.generateArtifact(readmePrompt);
    
    if (!readme) {
      return { success: false, error: 'Failed to generate README' };
    }

    const files = [{
      path: 'README.md',
      content: readme
    }];
    
    for (const file of files) {
      const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
      await Permissions.writeFile('docs-agent', fullPath, file.content);
    }
    
    const prTitle = `[${taskId}] README Update`;
    const prBody = `## README Update\n\n${task.content}\n\n### Generated by\nDocs Agent (AI)`;
    
    const pr = await this.createPR(taskId, files, prTitle, prBody);
    
    await this.completeTask(taskPath, pr.url);
    
    return { success: true, pr: pr.url, branch: this.currentBranch };
  }

  /**
   * Create user guide
   */
  async createUserGuide(task, taskId, taskPath) {
    logger.info(`${this.role}: Creating user guide`);
    
    await this.updateTaskProgress(taskPath, 'Creating user guide');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'user-guide');
    
    const guidePrompt = `You are creating a user guide. Be clear, step-by-step, and user-friendly.

## Requirements
${task.content}

## Instructions
Create a comprehensive user guide with:
1. Clear objectives
2. Prerequisites
3. Step-by-step instructions with screenshots references
4. Common issues and solutions
5. Tips and best practices
6. FAQs

Use markdown formatting with clear headings and code examples where appropriate.`;

    const guide = await this.generateArtifact(guidePrompt);
    
    if (!guide) {
      return { success: false, error: 'Failed to generate user guide' };
    }

    const files = [{
      path: `docs/guides/${taskId}.md`,
      content: guide
    }];
    
    for (const file of files) {
      const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
      await Permissions.writeFile('docs-agent', fullPath, file.content);
    }
    
    const prTitle = `[${taskId}] User Guide`;
    const prBody = `## User Guide\n\n${task.content}\n\n### Generated by\nDocs Agent (AI)`;
    
    const pr = await this.createPR(taskId, files, prTitle, prBody);
    
    await this.completeTask(taskPath, pr.url);
    
    return { success: true, pr: pr.url, branch: this.currentBranch };
  }

  /**
   * Add inline documentation to code
   */
  async addInlineDocs(task, taskId, taskPath) {
    logger.info(`${this.role}: Adding inline documentation`);
    
    await this.updateTaskProgress(taskPath, 'Adding inline docs');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'inline-docs');
    
    // Extract file paths from task content if specified
    const filePathMatches = task.content.match(/(?:file|path):\s*([^\n]+)/gi);
    const filesToDocument = [];
    
    if (filePathMatches && filePathMatches.length > 0) {
      // Specific files mentioned
      for (const match of filePathMatches) {
        const filePath = match.split(':')[1].trim();
        filesToDocument.push(filePath);
      }
    }
    
    if (filesToDocument.length === 0) {
      // No specific files - provide guidance
      const guidance = await this.generateArtifact(
        `Provide inline documentation guidance for: ${task.content}\n\n` +
        `Include:\n` +
        `- JSDoc comment structure\n` +
        `- Parameter documentation\n` +
        `- Return type documentation\n` +
        `- Example usage\n` +
        `- Best practices`
      );
      
      await this.completeTask(taskPath, 'Inline documentation guidance provided');
      return { success: true, guidance };
    }
    
    // Read and enhance files with documentation
    const fs = require('fs').promises;
    const updatedFiles = [];
    
    for (const filePath of filesToDocument) {
      try {
        const fullPath = path.join(process.env.PROJECT_ROOT, filePath);
        const content = await Permissions.readFile('docs-agent', fullPath);
        
        // Generate JSDoc comments for this file
        const docPrompt = `Add JSDoc comments to this code file. Include function descriptions, parameters, return types, and examples.\n\nFile: ${filePath}\n\nCode:\n${content}\n\nProvide the complete file with JSDoc comments added.`;
        
        const documented = await this.generateArtifact(docPrompt);
        
        if (documented) {
          await Permissions.writeFile('docs-agent', fullPath, documented);
          updatedFiles.push(filePath);
        }
      } catch (error) {
        logger.error(`${this.role}: Failed to document ${filePath}: ${error.message}`);
      }
    }
    
    if (updatedFiles.length > 0) {
      const prTitle = `[${taskId}] Add Inline Documentation`;
      const prBody = `## Inline Documentation\n\nAdded JSDoc comments to:\n${updatedFiles.map(f => `- ${f}`).join('\\n')}\n\n### Generated by\nDocs Agent (AI)`;
      
      const pr = await this.createPR(taskId, updatedFiles.map(p => ({ path: p })), prTitle, prBody);
      await this.completeTask(taskPath, pr.url);
      
      return { success: true, pr: pr.url, filesDocumented: updatedFiles };
    }
    
    await this.completeTask(taskPath, 'No files could be documented');
    return { success: false, error: 'No files could be documented' };
  }

  /**
   * Handle general documentation task
   */
  async handleGeneralDocsTask(task, taskId, taskPath) {
    logger.info(`${this.role}: Handling general documentation task`);
    
    await this.updateTaskProgress(taskPath, 'Creating documentation');
    
    this.currentBranch = await this.createFeatureBranch(taskId, 'docs');
    
    const docs = await this.generateArtifact(`Create documentation: ${task.content}`);
    
    if (!docs) {
      return { success: false, error: 'Failed to generate documentation' };
    }

    const files = [{
      path: `docs/${taskId}.md`,
      content: docs
    }];
    
    for (const file of files) {
      const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
      await Permissions.writeFile('docs-agent', fullPath, file.content);
    }
    
    const prTitle = `[${taskId}] Documentation`;
    const prBody = `## Documentation\n\n${task.content}\n\n### Generated by\nDocs Agent (AI)`;
    
    const pr = await this.createPR(taskId, files, prTitle, prBody);
    
    await this.completeTask(taskPath, pr.url);
    
    return { success: true, pr: pr.url, branch: this.currentBranch };
  }

  /**
   * Create feature branch
   */
  async createFeatureBranch(taskId, type) {
    const branchName = `docs/${taskId}-${type}`;
    
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
    const status = AgentCollaboration.getAgentStatus('docs-agent');
    const messages = AgentCollaboration.getMessages('docs-agent', 'sent');
    
    return {
      agent: 'docs-agent',
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
    const handoff = await AgentCollaboration.acceptHandoff(handoffId, 'docs-agent');
    
    logger.info(`${this.role}: Accepted handoff for task: ${handoff.taskId}`);
    
    const result = await this.executeTask(handoff.context.taskPath);
    
    await AgentCollaboration.completeHandoff(handoffId, result);
    
    return result;
  }
}

module.exports = DocsAgent;
