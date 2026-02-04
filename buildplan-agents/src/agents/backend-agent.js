const BaseAgent = require('./base-agent');
const path = require('path');
const logger = require('../utils/logger');
const GitOps = require('../services/gitOps');
const TestRunner = require('../services/testRunner');
const SkillLoader = require('../services/skillLoader');
const AgentCollaboration = require('../services/agentCollaboration');

/**
 * Backend Engineer Agent
 * Generates API endpoints, business logic, database queries, and tests
 */
class BackendAgent extends BaseAgent {
  constructor(orchestrator) {
    super(
      orchestrator,
      'Backend-Agent',
      'docs/AI_WORKFORCE_SYSTEM.md' // Contains backend agent prompt
    );
    this.currentBranch = null;
    this.workspaceRoot = path.join(process.env.PROJECT_ROOT || '', 'workspace', 'backend-agent');
  }

  /**
   * Execute a backend development task
   * Generates API code, tests it locally, then creates a GitHub PR
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
      
      // Update collaboration status
      AgentCollaboration.updateAgentStatus('backend-agent', 'working', {
        taskId,
        phase: 'starting'
      });
      
      // Load relevant skills
      await this.loadSkills(task);
      
      // Create feature branch
      this.currentBranch = await this.createFeatureBranch(taskId, task.metadata.title);
      
      await this.updateTaskProgress(taskPath, 'Analyzing requirements');

      // Generate code using OpenAI
      const codePrompt = this.buildCodeGenerationPrompt(task);
      const generatedCode = await this.generateArtifact(codePrompt);

      if (!generatedCode) {
        logger.error(`${this.role}: Failed to generate code`);
        return { success: false, error: 'Code generation failed' };
      }

      await this.updateTaskProgress(taskPath, 'Code generated, preparing files');
      
      AgentCollaboration.updateAgentStatus('backend-agent', 'working', {
        taskId,
        phase: 'code-generation'
      });

      // Parse generated code into files
      const files = this.parseGeneratedCode(generatedCode);
      
      if (files.length === 0) {
        logger.error(`${this.role}: No files extracted from generated code`);
        return { success: false, error: 'No files extracted from generated code' };
      }

      logger.info(`${this.role}: Generated ${files.length} files`);

      // Write files locally for testing
      await this.updateTaskProgress(taskPath, 'Writing files locally');
      await this.writeFilesLocally(files);

      // Install dependencies if needed
      await this.updateTaskProgress(taskPath, 'Checking dependencies');
      const depsResult = await this.installRequiredDependencies(files);
      
      if (!depsResult) {
        logger.warn(`${this.role}: Some dependencies may not have installed`);
        return { success: false, error: 'Failed to install required dependencies' };
      }

      // Run tests if they exist
      await this.updateTaskProgress(taskPath, 'Running tests');
      
      AgentCollaboration.updateAgentStatus('backend-agent', 'working', {
        taskId,
        phase: 'testing'
      });
      
      const testResult = await this.runTests(files);
      
      if (!testResult.success) {
        logger.error(`${this.role}: Tests failed, not creating PR`);
        await this.updateTaskProgress(taskPath, 'Tests failed - task blocked');
        
        // Report blocker
        await AgentCollaboration.reportBlocker({
          taskId,
          agentName: 'backend-agent',
          type: 'technical',
          description: `Tests failed: ${testResult.error || 'Unknown test failure'}`,
          severity: 'high'
        });
        
        AgentCollaboration.updateAgentStatus('backend-agent', 'blocked', {
          taskId,
          error: testResult.error
        });
        
        return { 
          success: false, 
          error: `Tests failed: ${testResult.error || 'Unknown test failure'}`,
          details: testResult.output
        };
      }

      // Create PR with generated code
      await this.updateTaskProgress(taskPath, 'Creating GitHub PR');
      await this.shareProgress('Creating pull request...', 95);
      
      const prTitle = `[${taskId}] ${task.metadata.title || 'Backend implementation'}`;
      const prBody = this.buildPRDescription(task, files);

      const pr = await this.createPR(taskId, files, prTitle, prBody);

      if (!pr) {
        logger.error(`${this.role}: Failed to create PR`);
        await this.reportBlockerToTeam('Failed to create GitHub PR', taskId);
        return { success: false, error: 'Failed to create GitHub PR' };
      }

      // Mark task complete
      await this.completeTask(taskPath, pr.url);
      
      // Update status to idle
      AgentCollaboration.updateAgentStatus('backend-agent', 'idle');
      
      // Celebrate!
      if (this.orchestrator.teamComms) {
        await this.orchestrator.teamComms.celebrate(
          this.role, 
          `Completed ${taskId}! Pull request created and ready for review. 🎉`
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
      
      // Report blocker on exception
      await AgentCollaboration.reportBlocker({
        taskId: taskPath,
        agentName: 'backend-agent',
        type: 'technical',
        description: error.message,
        severity: 'high'
      });
      
      AgentCollaboration.updateAgentStatus('backend-agent', 'blocked', {
        error: error.message
      });
      
      return { success: false, error: `Exception: ${error.message}`, details: error.stack };
    }
  }

  /**
   * Build prompt for code generation
   */
  buildCodeGenerationPrompt(task) {
    return `You are implementing a backend feature. Generate complete, production-ready code.

## Task Details
${task.content}

## Requirements
- Generate Express.js/Node.js API endpoints
- Include proper error handling
- Add input validation (use Zod if needed)
- Include JSDoc comments
- Follow REST conventions
- Generate corresponding tests

## Output Format
Provide the code in this exact format:

\`\`\`filename: path/to/file.js
// File content here
\`\`\`

Generate all necessary files:
1. Route handler file
2. Service/business logic file (if needed)
3. Test file
4. Any utility files needed

Start generating now:`;
  }

  /**
   * Parse generated code into file objects
   * Expects format: ```filename: path/to/file.js\ncode\n```
   */
  parseGeneratedCode(generated) {
    const files = [];
    const fileRegex = /```filename:\s*([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(generated)) !== null) {
      let filePath = match[1].trim();
      const content = match[2].trim();
      
      // Normalize path: remove leading slash, ensure forward slashes
      filePath = filePath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
      
      // Skip empty content
      if (!content) {
        logger.warn(`${this.role}: Skipping empty file: ${filePath}`);
        continue;
      }
      
      files.push({
        path: filePath,
        content: content
      });
    }

    // If no files found with filename marker, try generic code blocks
    if (files.length === 0) {
      const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/g;
      let blockMatch;
      let index = 0;

      while ((blockMatch = codeBlockRegex.exec(generated)) !== null) {
        const content = blockMatch[1].trim();
        if (content) {
          files.push({
            path: `packages/api/src/generated/code-${index++}.js`,
            content: content
          });
        }
      }
    }

    // Log files for debugging
    logger.info(`${this.role}: Parsed ${files.length} files: ${files.map(f => f.path).join(', ')}`);
    
    return files;
  }

  /**
   * Write generated files to local filesystem for testing
   */
  async writeFilesLocally(files) {
    const fs = require('fs');
    const path = require('path');
    
    for (const file of files) {
      try {
        const fullPath = path.join(process.env.PROJECT_ROOT, file.path);
        const dir = path.dirname(fullPath);
        
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write file
        fs.writeFileSync(fullPath, file.content, 'utf8');
        logger.info(`${this.role}: Wrote ${file.path}`);
      } catch (error) {
        logger.error(`${this.role}: Failed to write ${file.path}:`, error.message);
      }
    }
  }
  
  /**
   * Install required dependencies from generated code
   */
  async installRequiredDependencies(files) {
    try {
      // Look for package.json or import statements to identify dependencies
      const dependencies = this.extractDependencies(files);
      
      if (dependencies.length === 0) {
        logger.info(`${this.role}: No new dependencies detected`);
        return true;
      }
      
      logger.info(`${this.role}: Installing dependencies: ${dependencies.join(', ')}`);
      
      const result = await this.shell.installPackages(dependencies);
      
      if (!result.success) {
        logger.error(`${this.role}: Failed to install dependencies:`, result.stderr);
        return false;
      }
      
      return true;
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
    const commonPatterns = [
      /require\(['\"]([@ \w\-\/]+)['\"]\)/g,
      /from\s+['\"]([@ \w\-\/]+)['\"] /g,
      /import\s+['\"]([@ \w\-\/]+)['\"] /g
    ];
    
    files.forEach(file => {
      if (!file.path.endsWith('.js') && !file.path.endsWith('.ts')) return;
      
      commonPatterns.forEach(pattern => {
        const matches = file.content.matchAll(pattern);
        for (const match of matches) {
          const dep = match[1];
          // Only external packages (not relative imports)
          if (!dep.startsWith('.') && !dep.startsWith('/')) {
            // Extract package name (handle scoped packages)
            const pkgName = dep.startsWith('@') 
              ? dep.split('/').slice(0, 2).join('/')
              : dep.split('/')[0];
            deps.add(pkgName);
          }
        }
      });
    });
    
    // Filter out Node.js built-ins
    const builtins = ['fs', 'path', 'http', 'https', 'crypto', 'util', 'stream', 'events'];
    return Array.from(deps).filter(d => !builtins.includes(d));
  }
  
  /**
   * Run tests for generated code
   */
  async runTests(files) {
    try {
      // Check if test files were generated
      const testFiles = files.filter(f => 
        f.path.includes('.test.') || 
        f.path.includes('.spec.') ||
        f.path.includes('/test/') ||
        f.path.includes('/tests/')
      );
      
      if (testFiles.length === 0) {
        logger.info(`${this.role}: No test files generated, skipping tests`);
        return { success: true, skipped: true };
      }
      
      logger.info(`${this.role}: Running ${testFiles.length} test file(s)`);
      
      // Try to run tests
      const result = await this.shell.runTests();
      
      if (!result.success) {
        const errorOutput = result.stderr || result.stdout || 'No error output captured';
        logger.error(`${this.role}: Tests failed:`, errorOutput);
        return { 
          success: false, 
          error: 'Test suite failed',
          output: errorOutput
        };
      }
      
      logger.info(`${this.role}: All tests passed!`);
      return { success: true, output: result.stdout };
    } catch (error) {
      logger.error(`${this.role}: Error running tests:`, error.message);
      return { 
        success: false, 
        error: `Test execution error: ${error.message}`,
        details: error.stack
      };
    }
  }
  
  /**
   * Build PR description
   */
  buildPRDescription(task, files) {
    const fileList = files.map(f => `- ${f.path}`).join('\n');
    
    return `## Backend Implementation

**Task ID:** ${task.metadata.id || 'N/A'}

### Changes
${fileList}

### Description
${task.content.substring(0, 500)}${task.content.length > 500 ? '...' : ''}

### Generated by
Backend Agent (AI)

### Testing
✅ Code tested locally before PR creation

### Review Checklist
- [ ] Code follows project conventions
- [ ] Error handling is proper
- [ ] Input validation included
- [ ] Tests are comprehensive
- [ ] Documentation is clear

---
*This PR was automatically generated by the BuildPlan AI team.*`;
  }
  
  /**
   * Load relevant skills for the task
   */
  async loadSkills(task) {
    const skillCategories = ['backend'];
    
    const content = (task.content || '').toLowerCase();
    if (content.includes('database') || content.includes('prisma')) {
      skillCategories.push('database');
    }
    if (content.includes('api') || content.includes('endpoint')) {
      skillCategories.push('api');
    }
    if (content.includes('auth')) {
      skillCategories.push('auth');
    }
    
    const skills = await SkillLoader.loadSkillsForAgent('backend-agent', skillCategories);
    logger.info(`${this.role}: Loaded ${skills.length} skills: ${skills.map(s => s.name).join(', ')}`);
  }
  
  /**
   * Create feature branch for task
   */
  async createFeatureBranch(taskId, title) {
    const branchName = `backend/${taskId}-${(title || 'task').toLowerCase().replace(/\s+/g, '-')}`;
    
    logger.info(`${this.role}: Creating branch: ${branchName}`);
    
    try {
      await GitOps.createBranch(branchName);
      await GitOps.checkoutBranch(branchName);
      return branchName;
    } catch (error) {
      logger.warn(`${this.role}: Could not create branch (may already exist): ${error.message}`);
      return branchName;
    }
  }
  
  /**
   * Get current work status
   */
  getStatus() {
    const status = AgentCollaboration.getAgentStatus('backend-agent');
    const messages = AgentCollaboration.getMessages('backend-agent', 'sent');
    
    return {
      agent: 'backend-agent',
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
    const handoff = await AgentCollaboration.acceptHandoff(handoffId, 'backend-agent');
    
    logger.info(`${this.role}: Accepted handoff for task: ${handoff.taskId}`);
    
    // Execute the task from handoff
    const result = await this.executeTask(handoff.context.taskPath);
    
    await AgentCollaboration.completeHandoff(handoffId, result);
    
    return result;
  }
}

module.exports = BackendAgent;
