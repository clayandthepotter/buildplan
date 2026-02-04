const path = require('path');
const logger = require('../utils/logger');

/**
 * Permissions
 * Manages file access permissions for agents
 * Prevents agents from accessing files outside their allowed scope
 */
class Permissions {
  constructor() {
    // Define permission levels for each agent type
    this.agentPermissions = {
      'pm-agent': {
        read: ['tasks/**', 'requests/**', 'TODO.md', 'WARP.md', 'standups/**'],
        write: ['tasks/**', 'requests/**', 'TODO.md', 'standups/**'],
        restricted: ['src/**', '.env', 'package.json']
      },
      'rd-agent': {
        read: ['tasks/**', 'requests/**', 'workspace/rd-agent/**', 'docs/**'],
        write: ['workspace/rd-agent/**', 'docs/mockups/**'],
        restricted: ['src/**', 'tasks/completed/**', '.env']
      },
      'backend-agent': {
        read: ['src/**', 'tasks/**', 'workspace/backend-agent/**', 'packages/api/**', 'prisma/**'],
        write: ['src/**', 'packages/api/**', 'prisma/**', 'workspace/backend-agent/**', 'tests/**'],
        restricted: ['.env', 'node_modules/**', 'tasks/completed/**']
      },
      'frontend-agent': {
        read: ['src/**', 'tasks/**', 'workspace/frontend-agent/**', 'packages/web/**', 'public/**'],
        write: ['packages/web/**', 'public/**', 'workspace/frontend-agent/**', 'src/components/**'],
        restricted: ['.env', 'node_modules/**', 'tasks/completed/**', 'packages/api/**']
      },
      'architect-agent': {
        read: ['src/**', 'tasks/**', 'workspace/architect-agent/**', 'docs/**', 'prisma/**'],
        write: ['docs/**', 'workspace/architect-agent/**', 'architecture/**'],
        restricted: ['.env', 'node_modules/**']
      },
      'qa-agent': {
        read: ['src/**', 'tests/**', 'tasks/**', 'workspace/qa-agent/**'],
        write: ['tests/**', 'workspace/qa-agent/**', 'test-results/**'],
        restricted: ['.env', 'node_modules/**', 'src/**', 'tasks/completed/**']
      },
      'devops-agent': {
        read: ['**'],
        write: ['.github/**', 'docker/**', 'deployment/**', 'workspace/devops-agent/**'],
        restricted: ['.env.production', 'secrets/**']
      },
      'docs-agent': {
        read: ['src/**', 'docs/**', 'tasks/**', 'workspace/docs-agent/**', 'README.md'],
        write: ['docs/**', 'README.md', 'workspace/docs-agent/**', 'API.md'],
        restricted: ['.env', 'node_modules/**', 'src/**']
      }
    };

    // System-wide restricted paths (no agent can write)
    this.systemRestricted = [
      '.git/**',
      'node_modules/**',
      '.env',
      '.env.local',
      '.env.production'
    ];
  }

  /**
   * Check if agent can read a file
   * @param {string} agentName - Agent name (e.g., 'backend-agent')
   * @param {string} filePath - File path relative to project root
   * @returns {boolean} True if read is allowed
   */
  canRead(agentName, filePath) {
    const permissions = this.agentPermissions[agentName];
    if (!permissions) {
      logger.warn(`[Permissions] Unknown agent: ${agentName}`);
      return false;
    }

    const normalizedPath = this.normalizePath(filePath);

    // Check if path is in restricted list
    if (this.matchesPatterns(normalizedPath, permissions.restricted)) {
      return false;
    }

    // Check if path matches read patterns
    return this.matchesPatterns(normalizedPath, permissions.read);
  }

  /**
   * Check if agent can write to a file
   * @param {string} agentName - Agent name
   * @param {string} filePath - File path relative to project root
   * @returns {boolean} True if write is allowed
   */
  canWrite(agentName, filePath) {
    const permissions = this.agentPermissions[agentName];
    if (!permissions) {
      logger.warn(`[Permissions] Unknown agent: ${agentName}`);
      return false;
    }

    const normalizedPath = this.normalizePath(filePath);

    // Check system-wide restrictions
    if (this.matchesPatterns(normalizedPath, this.systemRestricted)) {
      logger.warn(`[Permissions] Blocked write to system-restricted path: ${filePath}`);
      return false;
    }

    // Check agent-specific restrictions
    if (this.matchesPatterns(normalizedPath, permissions.restricted)) {
      return false;
    }

    // Check if path matches write patterns
    return this.matchesPatterns(normalizedPath, permissions.write);
  }

  /**
   * Check if agent can execute a command
   * @param {string} agentName - Agent name
   * @param {string} command - Command to execute
   * @returns {boolean} True if execution is allowed
   */
  canExecute(agentName, command) {
    // Define allowed commands per agent type
    const allowedCommands = {
      'pm-agent': ['node', 'npm'],
      'backend-agent': ['node', 'npm', 'npx', 'prisma'],
      'frontend-agent': ['node', 'npm', 'npx'],
      'qa-agent': ['node', 'npm', 'npx', 'playwright', 'jest', 'vitest'],
      'devops-agent': ['docker', 'kubectl', 'terraform', 'gh'],
      'docs-agent': ['node', 'npm']
    };

    const agentCommands = allowedCommands[agentName] || [];
    const commandName = command.split(' ')[0];

    // Check if command is in allowed list
    const isAllowed = agentCommands.some(cmd => commandName.includes(cmd));
    
    if (!isAllowed) {
      logger.warn(`[Permissions] ${agentName} attempted to execute disallowed command: ${commandName}`);
    }

    return isAllowed;
  }

  /**
   * Normalize file path for pattern matching
   * @param {string} filePath - File path
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    // Convert Windows paths to Unix style for pattern matching
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Check if path matches any pattern
   * @param {string} filePath - Normalized file path
   * @param {Array<string>} patterns - Glob patterns
   * @returns {boolean} True if matches any pattern
   */
  matchesPatterns(filePath, patterns) {
    return patterns.some(pattern => this.matchPattern(filePath, pattern));
  }

  /**
   * Match a file path against a glob pattern
   * @param {string} filePath - File path
   * @param {string} pattern - Glob pattern
   * @returns {boolean} True if matches
   */
  matchPattern(filePath, pattern) {
    // Simple glob pattern matching
    // Supports: *, **, exact matches
    
    // Exact match
    if (pattern === filePath) return true;

    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*\*/g, '.*')  // ** matches any path
      .replace(/\*/g, '[^/]*'); // * matches within directory

    // Add anchors
    regexPattern = `^${regexPattern}$`;

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }

  /**
   * Get readable paths for an agent
   * @param {string} agentName - Agent name
   * @returns {Array<string>} Array of readable path patterns
   */
  getReadablePaths(agentName) {
    const permissions = this.agentPermissions[agentName];
    return permissions ? permissions.read : [];
  }

  /**
   * Get writable paths for an agent
   * @param {string} agentName - Agent name
   * @returns {Array<string>} Array of writable path patterns
   */
  getWritablePaths(agentName) {
    const permissions = this.agentPermissions[agentName];
    return permissions ? permissions.write : [];
  }

  /**
   * Log permission check for audit trail
   * @param {string} agentName - Agent name
   * @param {string} action - Action type (read, write, execute)
   * @param {string} resource - Resource being accessed
   * @param {boolean} allowed - Whether action was allowed
   */
  logAccess(agentName, action, resource, allowed) {
    const status = allowed ? 'ALLOWED' : 'DENIED';
    logger.info(`[Permissions] ${status} - ${agentName} ${action} ${resource}`);
  }

  /**
   * Validate path doesn't escape project root
   * @param {string} filePath - File path to validate
   * @param {string} projectRoot - Project root directory
   * @returns {boolean} True if path is safe
   */
  isPathSafe(filePath, projectRoot) {
    const resolvedPath = path.resolve(projectRoot, filePath);
    const normalizedRoot = path.resolve(projectRoot);
    
    // Check if resolved path starts with project root
    const isSafe = resolvedPath.startsWith(normalizedRoot);
    
    if (!isSafe) {
      logger.warn(`[Permissions] Path traversal attempt blocked: ${filePath}`);
    }
    
    return isSafe;
  }
}

module.exports = new Permissions();
