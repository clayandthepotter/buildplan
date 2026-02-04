const fs = require('fs');
const path = require('path');
const fileOps = require('../utils/file-ops');

class WorkspaceManager {
  constructor(root = path.join(process.cwd(), 'workspace')) {
    this.root = root;
  }

  ensureAgentWorkspace(agentKey) {
    const dir = path.join(this.root, agentKey);
    fileOps.ensureDirectory(dir);
    return dir;
  }

  resolveAgentPath(agentKey, relativePath) {
    const base = this.ensureAgentWorkspace(agentKey);
    const target = path.resolve(base, relativePath);
    if (!target.startsWith(base)) {
      throw new Error('Invalid path outside workspace');
    }
    return target;
  }

  writeAgentFile(agentKey, relativePath, content) {
    const p = this.resolveAgentPath(agentKey, relativePath);
    fileOps.writeFile(p, content);
    return p;
  }
}

module.exports = new WorkspaceManager();
