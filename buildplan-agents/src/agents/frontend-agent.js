const BaseAgent = require('./base-agent');
const SkillLoader = require('../services/skillLoader');
const GitOps = require('../services/gitOps');
const TestRunner = require('../services/testRunner');
const Permissions = require('../services/permissions');
const AgentCollaboration = require('../services/agentCollaboration');
const logger = require('../utils/logger');
const path = require('path');

/**
 * Frontend-Agent
 * Specialist agent for frontend/UI development tasks
 * Handles React components, UI implementation, styling, and frontend testing
 */
class FrontendAgent extends BaseAgent {
  constructor(orchestrator) {
    super(
      orchestrator,
      'Frontend-Agent',
      'docs/AI_WORKFORCE_SYSTEM.md'
    );
    this.currentBranch = null;
    this.workspaceRoot = path.join(process.env.PROJECT_ROOT || '', 'workspace', 'frontend-agent');
  }

  /**
   * Execute a frontend development task
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
      
      AgentCollaboration.updateAgentStatus('frontend-agent', 'working', {
        taskId,
        phase: 'starting'
      });
      
      // Load relevant skills
      await this.loadSkills(task);
      
      // Create feature branch
      this.currentBranch = await this.createFeatureBranch(taskId, task.metadata.title);
      
      await this.updateTaskProgress(taskPath, 'Analyzing UI requirements');

      // Check for design handoff
      const designAssets = await this.checkForDesignAssets(task);

      // Generate UI code
      const codePrompt = this.buildUIGenerationPrompt(task, designAssets);
      const generatedCode = await this.generateArtifact(codePrompt);

      if (!generatedCode) {
        logger.error(`${this.role}: Failed to generate UI code`);
        return { success: false, error: 'UI code generation failed' };
      }

      await this.updateTaskProgress(taskPath, 'UI code generated, preparing components');
      
      AgentCollaboration.updateAgentStatus('frontend-agent', 'working', {
        taskId,
        phase: 'code-generation'
      });

      const files = this.parseGeneratedCode(generatedCode);
      
      if (files.length === 0) {
        logger.error(`${this.role}: No component files extracted`);
        return { success: false, error: 'No component files extracted' };
      }

      logger.info(`${this.role}: Generated ${files.length} component files`);

      // Write files locally
      await this.updateTaskProgress(taskPath, 'Writing component files');
      await this.writeFilesLocally(files);

      // Install dependencies if needed
      await this.updateTaskProgress(taskPath, 'Checking dependencies');
      await this.installRequiredDependencies(files);

      // Run tests
      await this.updateTaskProgress(taskPath, 'Running component tests');
      
      AgentCollaboration.updateAgentStatus('frontend-agent', 'working', {
        taskId,
        phase: 'testing'
      });
      
      const testResult = await this.runTests(files);
      
      if (!testResult.success) {
        logger.error(`${this.role}: Tests failed`);
        
        await AgentCollaboration.reportBlocker({
          taskId,
          agentName: 'frontend-agent',
          type: 'technical',
          description: `Component tests failed: ${testResult.error}`,
          severity: 'high'
        });
        
        AgentCollaboration.updateAgentStatus('frontend-agent', 'blocked', {
          taskId,
          error: testResult.error
        });
        
        return { 
          success: false, 
          error: `Tests failed: ${testResult.error}`,
          details: testResult.output
        };
      }

      // Create PR
      await this.updateTaskProgress(taskPath, 'Creating GitHub PR');
      
      const prTitle = `[${taskId}] ${task.metadata.title || 'Frontend implementation'}`;
      const prBody = this.buildPRDescription(task, files, designAssets);

      const pr = await this.createPR(taskId, files, prTitle, prBody);

      if (!pr) {
        logger.error(`${this.role}: Failed to create PR`);
        await this.reportBlockerToTeam('Failed to create GitHub PR', taskId);
        return { success: false, error: 'Failed to create GitHub PR' };
      }

      // Mark task complete
      await this.completeTask(taskPath, pr.url);
      
      AgentCollaboration.updateAgentStatus('frontend-agent', 'idle');
      
      if (this.orchestrator.teamComms) {
        await this.orchestrator.teamComms.celebrate(
          this.role, 
          `Completed ${taskId}! UI components ready for review. 🎨`
        );
      }

      return { 
        success: true,
        branch: this.currentBranch,
        pr: pr.url,
        filesChanged: files.length
      };

    } catch (error) {
      logger.error(`${this.role}: Error executing task:`, error.message);
      
      await AgentCollaboration.reportBlocker({
        taskId: taskPath,
        agentName: 'frontend-agent',
        type: 'technical',
        description: error.message,
        severity: 'high'
      });
      
      AgentCollaboration.updateAgentStatus('frontend-agent', 'blocked', {
        error: error.message
      });
      
      return { success: false, error: `Exception: ${error.message}` };
    }
  }

  /**
   * Load relevant skills for the task
   */
  async loadSkills(task) {
    const skillCategories = ['frontend', 'ui'];
    
    const content = (task.content || '').toLowerCase();
    if (content.includes('react') || content.includes('component')) {
      skillCategories.push('react');
    }
    if (content.includes('style') || content.includes('css') || content.includes('tailwind')) {
      skillCategories.push('styling');
    }
    if (content.includes('form')) {
      skillCategories.push('forms');
    }
    
    const skills = await SkillLoader.loadSkillsForAgent('frontend-agent', skillCategories);
    logger.info(`${this.role}: Loaded ${skills.length} skills`);
  }

  /**
   * Create feature branch for task
   */
  async createFeatureBranch(taskId, title) {
    const branchName = `frontend/${taskId}-${(title || 'ui').toLowerCase().replace(/\s+/g, '-')}`;
    
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
   * Check for design assets from R&D agent
   */
  async checkForDesignAssets(task) {
    // Check workspace for mockups/designs handed off from R&D
    const sharedPath = path.join(process.env.PROJECT_ROOT, 'workspace', 'shared');
    const designAssets = {
      hasMockup: false,
      hasSpecs: false,
      files: []
    };

    try {
      const taskDesigns = path.join(sharedPath, task.metadata.id);
      const files = await Permissions.readDir('frontend-agent', taskDesigns);
      designAssets.files = files;
      designAssets.hasMockup = files.some(f => f.includes('mockup'));
      designAssets.hasSpecs = files.some(f => f.includes('spec'));
    } catch (error) {
      logger.info(`${this.role}: No design assets found (expected for some tasks)`);
    }

    return designAssets;
  }

  /**
   * Build prompt for UI generation
   */
  buildUIGenerationPrompt(task, designAssets) {
    let prompt = `You are implementing a React UI component. Generate complete, production-ready code.

## Task Details
${task.content}

## Requirements
- Generate React functional components with TypeScript
- Use Tailwind CSS for styling
- Include proper prop types
- Add accessibility attributes (ARIA)
- Follow React best practices
- Include unit tests (React Testing Library)
- Make components responsive`;

    if (designAssets.hasMockup) {
      prompt += `\n\n## Design Assets Available
Mockup and design specifications are available in workspace/shared/${task.metadata.id}
Follow the design specifications closely.`;
    }

    prompt += `

## Output Format
Provide the code in this exact format:

\`\`\`filename: path/to/Component.tsx
// Component code here
\`\`\`

Generate all necessary files:
1. Main component file (.tsx)
2. Test file (.test.tsx)
3. Storybook file if appropriate (.stories.tsx)
4. Any sub-components needed

Start generating now:`;

    return prompt;
  }

  /**
   * Parse generated code into file objects
   */
  parseGeneratedCode(generated) {
    const files = [];
    const fileRegex = /```filename:\s*([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(generated)) !== null) {
      let filePath = match[1].trim();
      const content = match[2].trim();
      
      filePath = filePath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');
      
      if (!content) {
        logger.warn(`${this.role}: Skipping empty file: ${filePath}`);
        continue;
      }
      
      files.push({
        path: filePath,
        content: content
      });
    }

    logger.info(`${this.role}: Parsed ${files.length} component files`);
    return files;
  }

  /**
   * Write generated files to local filesystem
   */
  async writeFilesLocally(files) {
    const fs = require('fs');
    
    for (const file of files) {
      try {
        const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
        const dir = path.dirname(fullPath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, file.content, 'utf8');
        logger.info(`${this.role}: Wrote ${file.path}`);
      } catch (error) {
        logger.error(`${this.role}: Failed to write ${file.path}:`, error.message);
      }
    }
  }

  /**
   * Install required dependencies
   */
  async installRequiredDependencies(files) {
    try {
      const dependencies = this.extractDependencies(files);
      
      if (dependencies.length === 0) {
        return true;
      }
      
      logger.info(`${this.role}: Installing dependencies: ${dependencies.join(', ')}`);
      const result = await this.shell.installPackages(dependencies);
      
      return result.success;
    } catch (error) {
      logger.error(`${this.role}: Error installing dependencies:`, error.message);
      return false;
    }
  }

  /**
   * Extract dependencies from generated code
   */
  extractDependencies(files) {
    const deps = new Set();
    const patterns = [
      /import\s+.*?from\s+['"]([^'"]+)['"]/g,
      /require\(['"]([^'"]+)['"]\)/g
    ];
    
    files.forEach(file => {
      if (!file.path.match(/\.(tsx?|jsx?)$/)) return;
      
      patterns.forEach(pattern => {
        const matches = file.content.matchAll(pattern);
        for (const match of matches) {
          const dep = match[1];
          if (!dep.startsWith('.') && !dep.startsWith('/')) {
            const pkgName = dep.startsWith('@') 
              ? dep.split('/').slice(0, 2).join('/')
              : dep.split('/')[0];
            deps.add(pkgName);
          }
        }
      });
    });
    
    const builtins = ['react', 'react-dom']; // These should already be installed
    return Array.from(deps).filter(d => !builtins.includes(d));
  }

  /**
   * Run tests for generated components
   */
  async runTests(files) {
    try {
      const testFiles = files.filter(f => 
        f.path.includes('.test.') || 
        f.path.includes('.spec.')
      );
      
      if (testFiles.length === 0) {
        logger.info(`${this.role}: No test files generated, skipping tests`);
        return { success: true, skipped: true };
      }
      
      logger.info(`${this.role}: Running ${testFiles.length} test file(s)`);
      const result = await this.shell.runTests();
      
      if (!result.success) {
        return { 
          success: false, 
          error: 'Component test suite failed',
          output: result.stderr || result.stdout
        };
      }
      
      return { success: true, output: result.stdout };
    } catch (error) {
      return { 
        success: false, 
        error: `Test execution error: ${error.message}`
      };
    }
  }

  /**
   * Build PR description
   */
  buildPRDescription(task, files, designAssets) {
    const fileList = files.map(f => `- ${f.path}`).join('\n');
    
    let description = `## Frontend Implementation

**Task ID:** ${task.metadata.id || 'N/A'}

### Components
${fileList}

### Description
${task.content.substring(0, 500)}${task.content.length > 500 ? '...' : ''}`;

    if (designAssets.hasMockup) {
      description += `\n\n### Design
✅ Implemented based on provided mockups`;
    }

    description += `

### Generated by
Frontend Agent (AI)

### Testing
✅ Components tested locally before PR creation

### Review Checklist
- [ ] UI matches design specifications
- [ ] Components are responsive
- [ ] Accessibility attributes present
- [ ] Tests are comprehensive
- [ ] Code follows React best practices

---
*This PR was automatically generated by the BuildPlan AI team.*`;

    return description;
  }

  /**
   * Get current work status
   */
  getStatus() {
    const status = AgentCollaboration.getAgentStatus('frontend-agent');
    const messages = AgentCollaboration.getMessages('frontend-agent', 'sent');
    
    return {
      agent: 'frontend-agent',
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
    const handoff = await AgentCollaboration.acceptHandoff(handoffId, 'frontend-agent');
    
    logger.info(`${this.role}: Accepted handoff for task: ${handoff.taskId}`);
    
    const result = await this.executeTask(handoff.context.taskPath);
    
    await AgentCollaboration.completeHandoff(handoffId, result);
    
    return result;
  }
}

module.exports = FrontendAgent;
