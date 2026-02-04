const path = require('path');
const fileOps = require('../utils/file-ops');
const logger = require('../utils/logger');
const BaseAgent = require('./base-agent');
const figma = require('../services/figmaService');
const workspace = require('../services/workspaceManager');

class RDAgent extends BaseAgent {
  constructor(orchestrator) {
    super(orchestrator, 'RD-Agent', null);
  }

  /**
   * Executes an R&D task: produce research doc + UI mockup
   * Success returns { success: true, researchPath, mockupPath|mockupUrl }
   */
  async executeTask(taskPath) {
    try {
      // Parse task file
      const task = this.parseTaskFile(taskPath);
      if (!task) return { success: false, error: 'Failed to read task' };
      const { metadata, content } = task;
      const taskId = metadata.id || path.basename(taskPath, '.md');
      const title = metadata.title || 'R&D Task';

      // Prepare workspace
      const rdRoot = workspace.ensureAgentWorkspace('rd-agent');
      const researchDir = workspace.resolveAgentPath('rd-agent', 'research');
      const mockupsDir = workspace.resolveAgentPath('rd-agent', 'mockups');
      fileOps.ensureDirectory(researchDir);
      fileOps.ensureDirectory(mockupsDir);

      // Create research document from task content
      const researchMd = `# ${taskId}: ${title}\n\n## Request Context\n${content}\n\n## Findings\n- Summarize requirements\n- Identify constraints\n- Outline architecture impacts\n\n## Proposed Approach\n- Frontend: Components, states, validation\n- Backend: Endpoints, data, errors\n- Database: Models & relations\n\n## Open Questions\n- [ ] TBD\n`;
      const researchPath = workspace.writeAgentFile('rd-agent', `research/${taskId}.md`, researchMd);

      // Create mockup (Figma if token available, otherwise React HTML fallback)
      let mockupUrl = null;
      let mockupPath = null;
      if (figma.isAvailable()) {
        const mock = await figma.createMockupDoc(title, 'Auto-generated from R&D task');
        mockupUrl = mock.url;
      } else {
        const html = this.generateReactMockupHTML(title);
        mockupPath = workspace.writeAgentFile('rd-agent', `mockups/${taskId}.html`, html);
      }

      // Add progress and announce
      await this.updateTaskProgress(taskPath, 'Generated research document and mockup');
      const preview = mockupUrl ? `🔗 <a href=\"${mockupUrl}\">Figma Mockup</a>` : `📄 <code>${mockupPath}</code>`;
      await this.sendToTeam(`R&D deliverables ready for <code>${taskId}</code>\n• Research: <code>${researchPath}</code>\n• Mockup: ${preview}`, { parse_mode: 'HTML' });

      // Mark task complete and move to review
      await this.completeTask(taskPath);

      return { success: true, researchPath, mockupPath, mockupUrl };
    } catch (error) {
      logger.error('RD-Agent error:', error);
      return { success: false, error: error.message };
    }
  }

  generateReactMockupHTML(title) {
    // Lightweight React mockup using CDN, no build step required
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - Mockup</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>body{font-family:Inter,system-ui,Segoe UI,Arial;margin:24px;background:#0b0f1a;color:#e6edf3} .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px;max-width:960px;margin:auto} .row{display:flex;gap:16px;margin-top:16px} .btn{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 14px;cursor:pointer} input,select{background:#0b1220;border:1px solid #243b53;color:#e6edf3;border-radius:8px;padding:10px;width:100%}</style>
  </head>
  <body>
    <div id="root"></div>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script>
      const e = React.createElement;
      function App(){
        return e('div',{className:'card'},[
          e('h2',{key:1},'${title}'),
          e('div',{className:'row',key:2},[
            e('input',{placeholder:'Title',key:21}),
            e('select',{key:22},[
              e('option',{key:'opt1'},'Low'),
              e('option',{key:'opt2'},'Medium'),
              e('option',{key:'opt3'},'High')
            ])
          ]),
          e('div',{className:'row',key:3},[
            e('input',{placeholder:'Description... (static mockup)',key:31})
          ]),
          e('button',{className:'btn',key:4,onClick:()=>alert('Demo only')},'Submit')
        ])
      }
      ReactDOM.createRoot(document.getElementById('root')).render(e(App));
    </script>
  </body>
</html>`;
  }
}

module.exports = RDAgent;
