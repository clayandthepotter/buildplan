const { execSync } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

/**
 * GitOps
 * Handles Git operations for agents: branches, commits, PRs
 * Wraps git CLI commands with error handling and validation
 */
class GitOps {
  constructor() {
    this.repoPath = process.env.PROJECT_ROOT || process.cwd();
    this.defaultBranch = 'main';
  }

  /**
   * Execute a git command
   * @param {string} command - Git command to execute
   * @param {Object} options - Execution options
   * @returns {string} Command output
   */
  exec(command, options = {}) {
    try {
      const cwd = options.cwd || this.repoPath;
      const result = execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
        ...options
      });
      return result.trim();
    } catch (error) {
      logger.error(`[GitOps] Command failed: ${command}`, error);
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  /**
   * Get current branch name
   * @returns {string} Current branch name
   */
  getCurrentBranch() {
    return this.exec('git rev-parse --abbrev-ref HEAD', { silent: true });
  }

  /**
   * Check if branch exists locally
   * @param {string} branchName - Branch name
   * @returns {boolean} True if branch exists
   */
  branchExists(branchName) {
    try {
      this.exec(`git rev-parse --verify ${branchName}`, { silent: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if working directory is clean
   * @returns {boolean} True if no uncommitted changes
   */
  isClean() {
    try {
      const status = this.exec('git status --porcelain', { silent: true });
      return status.length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a new branch from base branch
   * @param {string} branchName - New branch name
   * @param {string} baseBranch - Base branch (default: main)
   * @returns {Object} Result object
   */
  createBranch(branchName, baseBranch = this.defaultBranch) {
    try {
      // Validate branch name
      if (!this.isValidBranchName(branchName)) {
        throw new Error(`Invalid branch name: ${branchName}`);
      }

      // Check if branch already exists
      if (this.branchExists(branchName)) {
        logger.warn(`[GitOps] Branch ${branchName} already exists`);
        return { success: false, error: 'Branch already exists', branchName };
      }

      // Fetch latest changes
      this.exec('git fetch origin', { silent: true });

      // Checkout base branch and pull latest
      this.exec(`git checkout ${baseBranch}`, { silent: true });
      this.exec(`git pull origin ${baseBranch}`, { silent: true });

      // Create and checkout new branch
      this.exec(`git checkout -b ${branchName}`, { silent: true });

      logger.info(`[GitOps] Created branch: ${branchName} from ${baseBranch}`);
      return { success: true, branchName, baseBranch };
    } catch (error) {
      logger.error(`[GitOps] Failed to create branch ${branchName}:`, error);
      return { success: false, error: error.message, branchName };
    }
  }

  /**
   * Switch to an existing branch
   * @param {string} branchName - Branch name
   * @returns {Object} Result object
   */
  switchBranch(branchName) {
    try {
      if (!this.branchExists(branchName)) {
        throw new Error(`Branch does not exist: ${branchName}`);
      }

      this.exec(`git checkout ${branchName}`, { silent: true });
      logger.info(`[GitOps] Switched to branch: ${branchName}`);
      return { success: true, branchName };
    } catch (error) {
      logger.error(`[GitOps] Failed to switch to branch ${branchName}:`, error);
      return { success: false, error: error.message, branchName };
    }
  }

  /**
   * Stage files for commit
   * @param {Array<string>} files - File paths to stage (relative to repo root)
   * @returns {Object} Result object
   */
  stageFiles(files) {
    try {
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error('No files provided to stage');
      }

      for (const file of files) {
        this.exec(`git add "${file}"`, { silent: true });
      }

      logger.info(`[GitOps] Staged ${files.length} file(s)`);
      return { success: true, filesStaged: files.length };
    } catch (error) {
      logger.error('[GitOps] Failed to stage files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Commit staged changes
   * @param {string} message - Commit message
   * @param {Object} options - Commit options
   * @returns {Object} Result object with commit hash
   */
  commit(message, options = {}) {
    try {
      if (!message || message.trim().length === 0) {
        throw new Error('Commit message is required');
      }

      // Check if there are staged changes
      const staged = this.exec('git diff --cached --name-only', { silent: true });
      if (!staged) {
        throw new Error('No staged changes to commit');
      }

      // Create commit
      const author = options.author || 'BuildPlan Agent <agent@buildplan.dev>';
      this.exec(`git -c user.name="BuildPlan Agent" -c user.email="agent@buildplan.dev" commit -m "${message}"`, { silent: true });

      // Get commit hash
      const commitHash = this.exec('git rev-parse HEAD', { silent: true });

      logger.info(`[GitOps] Created commit: ${commitHash.substring(0, 7)}`);
      return { success: true, commitHash, message };
    } catch (error) {
      logger.error('[GitOps] Failed to commit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stage and commit files in one operation
   * @param {Array<string>} files - Files to stage and commit
   * @param {string} message - Commit message
   * @returns {Object} Result object
   */
  stageAndCommit(files, message) {
    const stageResult = this.stageFiles(files);
    if (!stageResult.success) {
      return stageResult;
    }

    return this.commit(message);
  }

  /**
   * Push branch to remote
   * @param {string} branchName - Branch name (default: current branch)
   * @param {boolean} setUpstream - Set upstream tracking (default: true)
   * @returns {Object} Result object
   */
  push(branchName = null, setUpstream = true) {
    try {
      const branch = branchName || this.getCurrentBranch();
      const upstreamFlag = setUpstream ? '-u' : '';

      this.exec(`git push ${upstreamFlag} origin ${branch}`, { silent: false });

      logger.info(`[GitOps] Pushed branch: ${branch}`);
      return { success: true, branch };
    } catch (error) {
      logger.error('[GitOps] Failed to push:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a local branch
   * @param {string} branchName - Branch to delete
   * @param {boolean} force - Force delete (default: false)
   * @returns {Object} Result object
   */
  deleteBranch(branchName, force = false) {
    try {
      const currentBranch = this.getCurrentBranch();
      if (currentBranch === branchName) {
        throw new Error('Cannot delete current branch. Switch to another branch first.');
      }

      const flag = force ? '-D' : '-d';
      this.exec(`git branch ${flag} ${branchName}`, { silent: true });

      logger.info(`[GitOps] Deleted branch: ${branchName}`);
      return { success: true, branchName };
    } catch (error) {
      logger.error(`[GitOps] Failed to delete branch ${branchName}:`, error);
      return { success: false, error: error.message, branchName };
    }
  }

  /**
   * Get commit history for current branch
   * @param {number} limit - Number of commits to retrieve
   * @returns {Array} Array of commit objects
   */
  getCommitHistory(limit = 10) {
    try {
      const format = '%H|%an|%ae|%ad|%s';
      const output = this.exec(`git log -n ${limit} --format="${format}"`, { silent: true });

      return output.split('\n').map(line => {
        const [hash, author, email, date, subject] = line.split('|');
        return { hash, author, email, date, subject };
      });
    } catch (error) {
      logger.error('[GitOps] Failed to get commit history:', error);
      return [];
    }
  }

  /**
   * Get diff for uncommitted changes
   * @returns {string} Diff output
   */
  getDiff() {
    try {
      return this.exec('git diff', { silent: true });
    } catch (error) {
      logger.error('[GitOps] Failed to get diff:', error);
      return '';
    }
  }

  /**
   * Get list of changed files
   * @returns {Array} Array of file paths
   */
  getChangedFiles() {
    try {
      const output = this.exec('git status --porcelain', { silent: true });
      return output.split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3).trim());
    } catch (error) {
      logger.error('[GitOps] Failed to get changed files:', error);
      return [];
    }
  }

  /**
   * Validate branch name format
   * @param {string} branchName - Branch name to validate
   * @returns {boolean} True if valid
   */
  isValidBranchName(branchName) {
    // Git branch name rules:
    // - Cannot start with a dot
    // - Cannot contain two consecutive dots
    // - Cannot contain spaces, ~, ^, :, ?, *, [, \
    // - Cannot end with a slash or .lock
    const invalidPattern = /^\.|\.\.|[\s~^:?*\[]|\/\.lock$|\/$|\.$/;
    return !invalidPattern.test(branchName) && branchName.length > 0;
  }

  /**
   * Create a PR using GitHub CLI (if available)
   * @param {Object} options - PR options
   * @returns {Object} Result object with PR URL
   */
  async createPR(options = {}) {
    try {
      const {
        title,
        body = '',
        baseBranch = this.defaultBranch,
        draft = false
      } = options;

      if (!title) {
        throw new Error('PR title is required');
      }

      // Check if gh CLI is available
      try {
        this.exec('gh --version', { silent: true });
      } catch (error) {
        throw new Error('GitHub CLI (gh) is not installed or not in PATH');
      }

      // Create PR using gh CLI
      const draftFlag = draft ? '--draft' : '';
      const command = `gh pr create --title "${title}" --body "${body}" --base ${baseBranch} ${draftFlag}`;
      const output = this.exec(command, { silent: false });

      // Extract PR URL from output
      const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+/);
      const prUrl = urlMatch ? urlMatch[0] : null;

      logger.info(`[GitOps] Created PR: ${prUrl}`);
      return { success: true, prUrl, title };
    } catch (error) {
      logger.error('[GitOps] Failed to create PR:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GitOps();
