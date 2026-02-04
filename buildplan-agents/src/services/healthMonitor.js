const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * HealthMonitor
 * Diagnostic service to check system health and configuration
 * Used by the `buildplan doctor` command
 */
class HealthMonitor {
  constructor() {
    this.checks = [];
    this.results = [];
  }

  /**
   * Run all health checks
   * @returns {Object} Health check results
   */
  async runAllChecks() {
    this.results = [];
    
    await this.checkGitInstalled();
    await this.checkGitConfig();
    await this.checkGitHubCLI();
    await this.checkNodeVersion();
    await this.checkNpmDependencies();
    await this.checkProjectStructure();
    await this.checkWorkspacePermissions();
    await this.checkEnvironmentVariables();
    await this.checkOpenAIKey();
    await this.checkServicesHealth();

    return this.generateReport();
  }

  /**
   * Check if Git is installed
   */
  async checkGitInstalled() {
    try {
      const version = execSync('git --version', { encoding: 'utf8' }).trim();
      this.addResult('git-installed', 'pass', `Git installed: ${version}`);
    } catch (error) {
      this.addResult('git-installed', 'fail', 'Git is not installed', {
        fix: 'Install Git from https://git-scm.com/'
      });
    }
  }

  /**
   * Check Git configuration
   */
  async checkGitConfig() {
    try {
      const userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
      const userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
      
      if (userName && userEmail) {
        this.addResult('git-config', 'pass', `Git configured: ${userName} <${userEmail}>`);
      } else {
        this.addResult('git-config', 'warn', 'Git user info incomplete', {
          fix: 'Run: git config --global user.name "Your Name" && git config --global user.email "your@email.com"'
        });
      }
    } catch (error) {
      this.addResult('git-config', 'fail', 'Git config not found', {
        fix: 'Configure Git user: git config --global user.name "Your Name"'
      });
    }
  }

  /**
   * Check if GitHub CLI is installed
   */
  async checkGitHubCLI() {
    try {
      const version = execSync('gh --version', { encoding: 'utf8' }).trim();
      this.addResult('github-cli', 'pass', `GitHub CLI installed: ${version.split('\n')[0]}`);
      
      // Check if authenticated
      try {
        execSync('gh auth status', { encoding: 'utf8', stdio: 'pipe' });
        this.addResult('github-auth', 'pass', 'GitHub CLI authenticated');
      } catch {
        this.addResult('github-auth', 'warn', 'GitHub CLI not authenticated', {
          fix: 'Run: gh auth login'
        });
      }
    } catch (error) {
      this.addResult('github-cli', 'warn', 'GitHub CLI not installed', {
        fix: 'Install from https://cli.github.com/ (optional but recommended for PR creation)'
      });
    }
  }

  /**
   * Check Node.js version
   */
  async checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major >= 18) {
      this.addResult('node-version', 'pass', `Node.js ${version} (>= 18 required)`);
    } else {
      this.addResult('node-version', 'fail', `Node.js ${version} is too old`, {
        fix: 'Upgrade to Node.js 18 or higher'
      });
    }
  }

  /**
   * Check npm dependencies
   */
  async checkNpmDependencies() {
    const packageJsonPath = path.join(process.env.PROJECT_ROOT || '', 'buildplan-agents', 'package.json');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const nodeModulesPath = path.join(path.dirname(packageJsonPath), 'node_modules');
      
      if (fs.existsSync(nodeModulesPath)) {
        const installedCount = fs.readdirSync(nodeModulesPath).length;
        this.addResult('npm-deps', 'pass', `Dependencies installed (${installedCount} packages)`);
      } else {
        this.addResult('npm-deps', 'fail', 'Dependencies not installed', {
          fix: 'Run: npm install'
        });
      }
    } catch (error) {
      this.addResult('npm-deps', 'warn', 'Could not check dependencies', {
        reason: error.message
      });
    }
  }

  /**
   * Check project structure
   */
  async checkProjectStructure() {
    const requiredDirs = [
      'buildplan-agents/src/agents',
      'buildplan-agents/src/services',
      'buildplan-agents/src/utils',
      'buildplan-agents/skills',
      'buildplan-agents/workspace',
      'buildplan-agents/tasks',
      'buildplan-agents/requests'
    ];

    const projectRoot = process.env.PROJECT_ROOT || '';
    const missing = [];

    for (const dir of requiredDirs) {
      const fullPath = path.join(projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        missing.push(dir);
      }
    }

    if (missing.length === 0) {
      this.addResult('project-structure', 'pass', 'All required directories present');
    } else {
      this.addResult('project-structure', 'fail', `Missing directories: ${missing.join(', ')}`, {
        fix: 'Run setup wizard or create directories manually'
      });
    }
  }

  /**
   * Check workspace permissions
   */
  async checkWorkspacePermissions() {
    const workspacePath = path.join(process.env.PROJECT_ROOT || '', 'buildplan-agents', 'workspace');
    
    try {
      // Check if workspace exists and is writable
      if (!fs.existsSync(workspacePath)) {
        this.addResult('workspace-perms', 'fail', 'Workspace directory does not exist', {
          fix: 'Create workspace directory'
        });
        return;
      }

      // Try to write a test file
      const testFile = path.join(workspacePath, '.health-check-test');
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);

      this.addResult('workspace-perms', 'pass', 'Workspace is writable');
    } catch (error) {
      this.addResult('workspace-perms', 'fail', 'Workspace is not writable', {
        fix: 'Check file permissions on workspace directory',
        error: error.message
      });
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvironmentVariables() {
    const required = ['PROJECT_ROOT'];
    const optional = ['TASKS_DIR', 'REQUESTS_DIR', 'STANDUP_DIR'];
    
    const missing = required.filter(key => !process.env[key]);
    const missingOptional = optional.filter(key => !process.env[key]);

    if (missing.length === 0) {
      let message = 'Required environment variables set';
      if (missingOptional.length > 0) {
        message += ` (optional missing: ${missingOptional.join(', ')})`;
      }
      this.addResult('env-vars', 'pass', message);
    } else {
      this.addResult('env-vars', 'fail', `Missing: ${missing.join(', ')}`, {
        fix: 'Set environment variables in .env file'
      });
    }
  }

  /**
   * Check OpenAI API key
   */
  async checkOpenAIKey() {
    if (process.env.OPENAI_API_KEY) {
      const keyPreview = process.env.OPENAI_API_KEY.slice(0, 8) + '...';
      this.addResult('openai-key', 'pass', `OpenAI API key configured (${keyPreview})`);
    } else {
      this.addResult('openai-key', 'warn', 'OpenAI API key not set', {
        fix: 'Set OPENAI_API_KEY in .env file (required for AI features)'
      });
    }
  }

  /**
   * Check services health
   */
  async checkServicesHealth() {
    const services = [
      'skillLoader',
      'workspaceManager',
      'gitOps',
      'permissions',
      'testRunner',
      'agentCollaboration'
    ];

    let healthyCount = 0;
    const issues = [];

    for (const service of services) {
      try {
        const servicePath = path.join(__dirname, `${service}.js`);
        if (fs.existsSync(servicePath)) {
          require(servicePath);
          healthyCount++;
        } else {
          issues.push(service);
        }
      } catch (error) {
        issues.push(`${service} (${error.message})`);
      }
    }

    if (issues.length === 0) {
      this.addResult('services', 'pass', `All ${services.length} core services loadable`);
    } else {
      this.addResult('services', 'warn', `${healthyCount}/${services.length} services healthy`, {
        issues: issues.join(', ')
      });
    }
  }

  /**
   * Add a check result
   * @param {string} id - Check ID
   * @param {string} status - pass/warn/fail
   * @param {string} message - Result message
   * @param {Object} metadata - Additional data
   */
  addResult(id, status, message, metadata = {}) {
    this.results.push({
      id,
      status,
      message,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate health report
   * @returns {Object} Report with summary and results
   */
  generateReport() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warn').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;

    const overallStatus = failed > 0 ? 'unhealthy' : warnings > 0 ? 'degraded' : 'healthy';

    return {
      overallStatus,
      summary: {
        total,
        passed,
        warnings,
        failed,
        score: Math.round((passed / total) * 100)
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations based on check results
   * @returns {Array} Recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    const failedChecks = this.results.filter(r => r.status === 'fail');
    const warnChecks = this.results.filter(r => r.status === 'warn');

    if (failedChecks.length > 0) {
      recommendations.push({
        priority: 'high',
        message: `${failedChecks.length} critical issue(s) need immediate attention`,
        actions: failedChecks.map(c => c.metadata.fix).filter(Boolean)
      });
    }

    if (warnChecks.length > 0) {
      recommendations.push({
        priority: 'medium',
        message: `${warnChecks.length} warning(s) should be addressed`,
        actions: warnChecks.map(c => c.metadata.fix).filter(Boolean)
      });
    }

    if (failedChecks.length === 0 && warnChecks.length === 0) {
      recommendations.push({
        priority: 'info',
        message: 'System is healthy! All checks passed.',
        actions: []
      });
    }

    return recommendations;
  }

  /**
   * Format report as text
   * @param {Object} report - Health report
   * @returns {string} Formatted text
   */
  formatReport(report) {
    const statusEmoji = {
      pass: '✅',
      warn: '⚠️',
      fail: '❌'
    };

    const overallEmoji = {
      healthy: '🟢',
      degraded: '🟡',
      unhealthy: '🔴'
    };

    let output = '';
    
    output += `\n${overallEmoji[report.overallStatus]} BuildPlan Health Check\n`;
    output += `\nOverall Status: ${report.overallStatus.toUpperCase()}\n`;
    output += `Score: ${report.summary.score}% (${report.summary.passed}/${report.summary.total} passed)\n`;
    
    if (report.summary.warnings > 0) {
      output += `Warnings: ${report.summary.warnings}\n`;
    }
    if (report.summary.failed > 0) {
      output += `Failed: ${report.summary.failed}\n`;
    }

    output += `\n--- Check Results ---\n`;
    
    for (const result of report.results) {
      output += `\n${statusEmoji[result.status]} ${result.message}\n`;
      
      if (result.metadata.fix) {
        output += `  Fix: ${result.metadata.fix}\n`;
      }
      if (result.metadata.reason) {
        output += `  Reason: ${result.metadata.reason}\n`;
      }
      if (result.metadata.error) {
        output += `  Error: ${result.metadata.error}\n`;
      }
    }

    if (report.recommendations.length > 0) {
      output += `\n--- Recommendations ---\n`;
      for (const rec of report.recommendations) {
        output += `\n[${rec.priority.toUpperCase()}] ${rec.message}\n`;
        if (rec.actions.length > 0) {
          rec.actions.forEach(action => {
            output += `  • ${action}\n`;
          });
        }
      }
    }

    return output;
  }
}

module.exports = new HealthMonitor();
