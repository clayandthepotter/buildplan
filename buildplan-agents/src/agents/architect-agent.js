const BaseAgent = require('./base-agent');
const path = require('path');
const logger = require('../utils/logger');
const SkillLoader = require('../services/skillLoader');
const AgentCollaboration = require('../services/agentCollaboration');
const Permissions = require('../services/permissions');

/**
 * Technical Architect Agent
 * Designs solutions, creates specifications, and defines technical approach
 */
class ArchitectAgent extends BaseAgent {
  constructor(orchestrator) {
    super(
      orchestrator,
      'Architect-Agent',
      'docs/AI_WORKFORCE_SYSTEM.md'
    );
    this.workspaceRoot = path.join(process.env.PROJECT_ROOT || '', 'workspace', 'architect-agent');
  }

  /**
   * Execute an architecture/design task
   * Generates technical specifications and design documents
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
      
      AgentCollaboration.updateAgentStatus('architect-agent', 'working', {
        taskId,
        phase: 'analysis'
      });
      
      // Load architecture skills
      await this.loadSkills(task);
      
      await this.updateTaskProgress(taskPath, 'Analyzing requirements and creating design');

      // Generate design document using OpenAI
      const designPrompt = this.buildDesignPrompt(task);
      const design = await this.generateArtifact(designPrompt);

      if (!design) {
        logger.error(`${this.role}: Failed to generate design`);
        return false;
      }

      await this.updateTaskProgress(taskPath, 'Design complete, creating documentation');

      // Create design document as a markdown file
      const designFile = {
        path: `docs/designs/${taskId}-design.md`,
        content: this.formatDesignDocument(taskId, task, design)
      };

      // Create PR with design document
      const prTitle = `[${taskId}] Technical Design`;
      const prBody = this.buildPRDescription(task, design);

      const pr = await this.createPR(taskId, [designFile], prTitle, prBody);

      if (!pr) {
        logger.error(`${this.role}: Failed to create PR`);
        return false;
      }

      // Save design to shared workspace for other agents
      const sharedPath = path.join(process.env.PROJECT_ROOT, 'workspace', 'shared', `${taskId}-design.md`);
      await Permissions.writeFile('architect-agent', sharedPath, designFile.content);
      
      // Mark task complete
      await this.completeTask(taskPath, pr.url);
      
      AgentCollaboration.updateAgentStatus('architect-agent', 'idle');
      
      if (this.orchestrator.teamComms) {
        await this.orchestrator.teamComms.celebrate(
          this.role,
          `Completed ${taskId}! Architecture design ready for review. 🏭️`
        );
      }

      return { success: true, pr: pr.url, designPath: sharedPath };

    } catch (error) {
      logger.error(`${this.role}: Error executing task:`, error.message);
      
      await AgentCollaboration.reportBlocker({
        taskId: taskPath,
        agentName: 'architect-agent',
        type: 'technical',
        description: error.message,
        severity: 'high'
      });
      
      AgentCollaboration.updateAgentStatus('architect-agent', 'blocked', {
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Build prompt for design generation
   */
  buildDesignPrompt(task) {
    return `You are a Technical Architect designing a solution. Create a comprehensive technical design.

## Task Details
${task.content}

## Design Requirements
Create a technical design document that includes:

1. **Overview**: High-level summary of the feature
2. **User Stories**: Key user interactions
3. **API Endpoints**: RESTful API design with request/response schemas
4. **Database Schema**: Tables, fields, relationships, indexes
5. **UI Components**: Component breakdown and data flow
6. **Security Considerations**: Auth, validation, authorization
7. **Testing Strategy**: Unit, integration, E2E test approach
8. **Implementation Plan**: Step-by-step breakdown

## Output Format
Provide a well-structured markdown document with clear sections.
Be specific about:
- Endpoint paths and HTTP methods
- Request/response JSON structures  
- Database field types and constraints
- Component props and state
- Error handling approaches

Generate the complete design now:`;
  }

  /**
   * Format design document
   */
  formatDesignDocument(taskId, task, design) {
    const date = new Date().toISOString().split('T')[0];
    
    return `# Technical Design: ${taskId}

**Date**: ${date}
**Status**: Draft
**Author**: Architect Agent (AI)

---

${design}

---

## Approval

- [ ] Human review completed
- [ ] Ready for implementation

**Next Steps**: Once approved, create implementation tasks for:
- Backend Agent (API development)
- Frontend Agent (UI development)
- DevOps Agent (Database schema)
- QA Agent (Test planning)
`;
  }

  /**
   * Build PR description
   */
  buildPRDescription(task, design) {
    // Extract key sections for PR
    const preview = design.substring(0, 800);
    
    return `## Technical Design Document

**Task ID:** ${task.metadata.id || 'N/A'}

### Design Preview
${preview}${design.length > 800 ? '\n\n*(See full design document in files)*' : ''}

### What's Included
- Solution overview and approach
- API endpoint specifications
- Database schema design
- UI component breakdown
- Security and testing considerations

### Generated by
Architect Agent (AI)

### Review Required
This design document requires human approval before implementation begins.

---
*This PR was automatically generated by the BuildPlan AI team.*`;
  }
  
  /**
   * Load relevant skills for the task
   */
  async loadSkills(task) {
    const skillCategories = ['architecture', 'design-patterns'];
    
    const content = (task.content || '').toLowerCase();
    if (content.includes('database') || content.includes('schema')) {
      skillCategories.push('database-design');
    }
    if (content.includes('api') || content.includes('microservice')) {
      skillCategories.push('api-design');
    }
    if (content.includes('security')) {
      skillCategories.push('security');
    }
    
    const skills = await SkillLoader.loadSkillsForAgent('architect-agent', skillCategories);
    logger.info(`${this.role}: Loaded ${skills.length} skills`);
  }
  
  /**
   * Get current work status
   */
  getStatus() {
    const status = AgentCollaboration.getAgentStatus('architect-agent');
    const messages = AgentCollaboration.getMessages('architect-agent', 'sent');
    
    return {
      agent: 'architect-agent',
      status: status.status,
      unreadMessages: messages.length,
      ...status.metadata
    };
  }
  
  /**
   * Handle handoff from another agent
   */
  async handleHandoff(handoffId) {
    const handoff = await AgentCollaboration.acceptHandoff(handoffId, 'architect-agent');
    
    logger.info(`${this.role}: Accepted handoff for task: ${handoff.taskId}`);
    
    const result = await this.executeTask(handoff.context.taskPath);
    
    await AgentCollaboration.completeHandoff(handoffId, result);
    
    return result;
  }
}

module.exports = ArchitectAgent;
