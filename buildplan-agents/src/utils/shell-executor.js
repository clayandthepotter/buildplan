const { exec, spawn } = require('child_process');
const path = require('path');
const logger = require('./logger');

/**
 * Shell Executor for AI Agents
 * Allows agents to run commands with safety controls
 */
class ShellExecutor {
  constructor(workingDir = null) {
    this.workingDir = workingDir || process.env.PROJECT_ROOT;
    this.allowedCommands = this.loadAllowedCommands();
  }

  /**
   * Define which commands agents are allowed to run
   */
  loadAllowedCommands() {
    return {
      // Package management
      'npm': ['install', 'run', 'test', 'build', 'start'],
      'pnpm': ['install', 'run', 'test', 'build'],
      'yarn': ['install', 'run', 'test', 'build'],
      
      // Database
      'npx': ['prisma'], // For prisma commands
      
      // Git operations
      'git': ['status', 'log', 'diff', 'branch'],
      
      // File operations
      'ls': true,
      'dir': true,
      'cat': true,
      'type': true, // Windows equivalent of cat
      'mkdir': true,
      'echo': true,
      
      // Testing
      'jest': true,
      'mocha': true,
      'vitest': true,
      
      // Node
      'node': true,
      
      // Process management (read-only)
      'pm2': ['list', 'logs', 'describe']
    };
  }

  /**
   * Check if a command is allowed
   */
  isCommandAllowed(command, args = []) {
    const [cmd, ...cmdArgs] = command.split(' ');
    const baseCmd = cmd.toLowerCase();
    
    const allowed = this.allowedCommands[baseCmd];
    
    if (!allowed) {
      return { allowed: false, reason: `Command '${baseCmd}' not in whitelist` };
    }
    
    if (allowed === true) {
      return { allowed: true };
    }
    
    // Check if subcommand is allowed
    if (Array.isArray(allowed)) {
      const subCmd = (cmdArgs[0] || args[0] || '').toLowerCase();
      if (allowed.includes(subCmd)) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        reason: `Subcommand '${subCmd}' not allowed for '${baseCmd}'. Allowed: ${allowed.join(', ')}` 
      };
    }
    
    return { allowed: true };
  }

  /**
   * Execute a command safely
   * @param {string} command - Command to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - { success, stdout, stderr, exitCode }
   */
  async execute(command, options = {}) {
    const {
      timeout = 300000, // 5 minutes default
      cwd = this.workingDir,
      env = process.env
    } = options;

    logger.info(`[ShellExecutor] Executing: ${command}`);
    
    // Security check
    const securityCheck = this.isCommandAllowed(command);
    if (!securityCheck.allowed) {
      logger.error(`[ShellExecutor] Command blocked: ${securityCheck.reason}`);
      return {
        success: false,
        stdout: '',
        stderr: `Security: ${securityCheck.reason}`,
        exitCode: -1
      };
    }

    return new Promise((resolve) => {
      const execOptions = {
        cwd,
        env: { ...env },
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
      };

      exec(command, execOptions, (error, stdout, stderr) => {
        if (error) {
          logger.warn(`[ShellExecutor] Command failed: ${command}`, {
            exitCode: error.code,
            stderr: stderr.substring(0, 500)
          });
          
          resolve({
            success: false,
            stdout: stdout || '',
            stderr: stderr || error.message,
            exitCode: error.code || 1
          });
          return;
        }

        logger.info(`[ShellExecutor] Command succeeded: ${command}`);
        resolve({
          success: true,
          stdout,
          stderr,
          exitCode: 0
        });
      });
    });
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence(commands, options = {}) {
    const results = [];
    
    for (const cmd of commands) {
      const result = await this.execute(cmd, options);
      results.push({ command: cmd, ...result });
      
      // Stop on first failure unless continueOnError is set
      if (!result.success && !options.continueOnError) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Execute a command and stream output
   * Useful for long-running commands
   */
  async executeStream(command, options = {}) {
    const {
      cwd = this.workingDir,
      env = process.env,
      onStdout = null,
      onStderr = null
    } = options;

    logger.info(`[ShellExecutor] Streaming: ${command}`);
    
    const securityCheck = this.isCommandAllowed(command);
    if (!securityCheck.allowed) {
      logger.error(`[ShellExecutor] Command blocked: ${securityCheck.reason}`);
      throw new Error(`Security: ${securityCheck.reason}`);
    }

    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      
      const child = spawn(cmd, args, {
        cwd,
        env: { ...env },
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (onStdout) onStdout(text);
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (onStderr) onStderr(text);
      });

      child.on('close', (exitCode) => {
        resolve({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Install npm packages
   */
  async installPackages(packages, options = {}) {
    const { dev = false } = options;
    const devFlag = dev ? '--save-dev' : '';
    const packageList = Array.isArray(packages) ? packages.join(' ') : packages;
    
    return this.execute(`npm install ${devFlag} ${packageList}`);
  }

  /**
   * Run npm script
   */
  async runScript(scriptName) {
    return this.execute(`npm run ${scriptName}`);
  }

  /**
   * Run tests
   */
  async runTests(testPath = '') {
    return this.execute(`npm test ${testPath}`);
  }

  /**
   * Build project
   */
  async build() {
    return this.execute('npm run build');
  }

  /**
   * Run database migration
   */
  async runMigration(name = null) {
    const cmd = name 
      ? `npx prisma migrate dev --name ${name}`
      : 'npx prisma migrate dev';
    return this.execute(cmd);
  }

  /**
   * Generate Prisma client
   */
  async generatePrismaClient() {
    return this.execute('npx prisma generate');
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    const fullPath = path.join(this.workingDir, filePath);
    const cmd = process.platform === 'win32'
      ? `Test-Path "${fullPath}"`
      : `test -f "${fullPath}" && echo "exists"`;
    
    const result = await this.execute(cmd);
    return result.success && (result.stdout.includes('True') || result.stdout.includes('exists'));
  }

  /**
   * Read file content
   */
  async readFile(filePath) {
    const fullPath = path.join(this.workingDir, filePath);
    const cmd = process.platform === 'win32'
      ? `Get-Content "${fullPath}"`
      : `cat "${fullPath}"`;
    
    const result = await this.execute(cmd);
    return result.success ? result.stdout : null;
  }
}

module.exports = ShellExecutor;
