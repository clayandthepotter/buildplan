const path = require('path');
const fileOps = require('../utils/file-ops');
const workspace = require('./workspaceManager');
const logger = require('../utils/logger');
const openai = require('../utils/openai-client');

/**
 * SprintPlanner
 * Reads approved R&D research and generates agile sprint definitions
 * Updates TODO.md with new sprint tasks
 */
class SprintPlanner {
  /**
   * Create sprints from an approved R&D task
   * @param {string} rdTaskId - The R&D task ID that was approved
   * @returns {Array} Array of sprint definitions
   */
  async createFromRD(rdTaskId) {
    try {
      // Read RD research document from workspace
      const researchPath = workspace.resolveAgentPath('rd-agent', `research/${rdTaskId}.md`);
      const researchContent = fileOps.readFile(researchPath);
      if (!researchContent) {
        logger.warn(`[SprintPlanner] No research found for ${rdTaskId}`);
        return [];
      }

      logger.info(`[SprintPlanner] Parsing research for ${rdTaskId}`);

      // Use AI to extract tasks from research
      const tasks = await this.parseResearchIntoTasks(researchContent);

      if (tasks.length === 0) {
        logger.warn(`[SprintPlanner] No tasks extracted from research`);
        return [];
      }

      // Create sprint with parsed tasks
      const sprint = {
        id: `SPRINT-${Date.now()}`,
        rdTaskId,
        title: this.extractSprintTitle(researchContent, rdTaskId),
        tasks,
        createdAt: new Date().toISOString()
      };

      // Update TODO.md with structured sprint
      this.updateTodoMd(sprint);

      logger.info(`[SprintPlanner] Created sprint ${sprint.id} with ${tasks.length} tasks`);
      return [sprint];
    } catch (error) {
      logger.error('[SprintPlanner] Error:', error);
      return [];
    }
  }

  /**
   * Parse research document into actionable tasks using AI
   * @param {string} researchContent - The research markdown content
   * @returns {Array} Array of task objects
   */
  async parseResearchIntoTasks(researchContent) {
    try {
      const prompt = `Analyze this R&D research document and extract specific, actionable implementation tasks.

Research Document:
${researchContent}

For each task, provide:
1. Task type (architecture, backend, frontend, devops, qa, docs)
2. Clear, actionable title (verb-noun format: "Implement X", "Create Y", "Build Z")
3. Brief description of what needs to be done
4. Priority (high, medium, low) based on dependencies and criticality
5. Estimated complexity (1-5, where 1=simple, 5=complex)

Format each task as:
TASK: [type] - [title]
DESCRIPTION: [description]
PRIORITY: [priority]
COMPLEXITY: [1-5]

Focus on:
- Breaking down high-level features into concrete implementation steps
- Ordering tasks by dependency (architecture → backend → frontend)
- Including testing and documentation tasks
- Being specific about what code/files need to be created or modified

Generate the tasks now:`;

      const response = await openai.pmAgentChat(
        'You are a technical project manager breaking down R&D research into implementation tasks.',
        prompt
      );

      return this.parseTasksFromAIResponse(response);
    } catch (error) {
      logger.error('[SprintPlanner] Error parsing research with AI:', error);
      // Fallback to basic tasks if AI fails
      return [
        { type: 'architecture', title: 'Define system architecture', description: 'Create architecture diagram and API contracts', priority: 'high', complexity: 3 },
        { type: 'backend', title: 'Implement backend logic', description: 'Build backend services and APIs', priority: 'high', complexity: 4 },
        { type: 'frontend', title: 'Build user interface', description: 'Create frontend components', priority: 'medium', complexity: 3 }
      ];
    }
  }

  /**
   * Parse AI response into structured task objects
   * @param {string} aiResponse - Raw AI response text
   * @returns {Array} Array of task objects
   */
  parseTasksFromAIResponse(aiResponse) {
    const tasks = [];
    const taskBlocks = aiResponse.split(/\n(?=TASK:)/g);

    for (const block of taskBlocks) {
      if (!block.trim().startsWith('TASK:')) continue;

      const typeMatch = block.match(/TASK:\s*\[?([^\]\-]+)\]?\s*-\s*(.+?)\n/i);
      const descMatch = block.match(/DESCRIPTION:\s*(.+?)(?=\n[A-Z]+:|$)/is);
      const priorityMatch = block.match(/PRIORITY:\s*(high|medium|low)/i);
      const complexityMatch = block.match(/COMPLEXITY:\s*(\d)/i);

      if (typeMatch) {
        tasks.push({
          type: typeMatch[1].trim().toLowerCase(),
          title: typeMatch[2].trim(),
          description: descMatch ? descMatch[1].trim() : '',
          priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
          complexity: complexityMatch ? parseInt(complexityMatch[1]) : 3
        });
      }
    }

    // If parsing failed, return empty (will use fallback)
    return tasks;
  }

  /**
   * Extract a meaningful sprint title from research
   * @param {string} researchContent - Research document content
   * @param {string} rdTaskId - Fallback task ID
   * @returns {string} Sprint title
   */
  extractSprintTitle(researchContent, rdTaskId) {
    // Try to extract title from markdown heading
    const titleMatch = researchContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].replace(/R&D Research:\s*/i, '').trim();
    }

    // Try summary section
    const summaryMatch = researchContent.match(/##\s*Summary\s*\n+(.+?)(?=\n#|$)/is);
    if (summaryMatch) {
      const firstLine = summaryMatch[1].split('\n')[0].trim();
      if (firstLine.length < 80) {
        return firstLine;
      }
    }

    // Fallback
    return `Implementation Sprint for ${rdTaskId}`;
  }

  /**
   * Update TODO.md with new sprint and tasks
   * @param {Object} sprint - Sprint object with tasks
   */
  updateTodoMd(sprint) {
    try {
      const todoPath = path.join(process.env.PROJECT_ROOT, 'TODO.md');
      const currentTodo = fileOps.readFile(todoPath) || '';

      // Group tasks by priority
      const highPriority = sprint.tasks.filter(t => t.priority === 'high');
      const mediumPriority = sprint.tasks.filter(t => t.priority === 'medium');
      const lowPriority = sprint.tasks.filter(t => t.priority === 'low');

      let newSection = `\n\n## ${sprint.title}\n`;
      newSection += `**Sprint ID**: ${sprint.id}\n`;
      newSection += `**Created**: ${new Date(sprint.createdAt).toLocaleDateString()}\n\n`;

      if (highPriority.length > 0) {
        newSection += `### High Priority\n`;
        newSection += highPriority.map(t => `- [ ] **${t.title}** (${t.type}) - Complexity: ${t.complexity}/5\n  ${t.description}`).join('\n');
        newSection += '\n\n';
      }

      if (mediumPriority.length > 0) {
        newSection += `### Medium Priority\n`;
        newSection += mediumPriority.map(t => `- [ ] ${t.title} (${t.type}) - Complexity: ${t.complexity}/5`).join('\n');
        newSection += '\n\n';
      }

      if (lowPriority.length > 0) {
        newSection += `### Low Priority\n`;
        newSection += lowPriority.map(t => `- [ ] ${t.title} (${t.type})`).join('\n');
        newSection += '\n';
      }

      fileOps.writeFile(todoPath, currentTodo + newSection);
      logger.info(`[SprintPlanner] Updated TODO.md with sprint ${sprint.id}`);
    } catch (error) {
      logger.error('[SprintPlanner] Error updating TODO.md:', error);
    }
  }
}

module.exports = new SprintPlanner();
