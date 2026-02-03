const { Octokit } = require('@octokit/rest');
const logger = require('./logger');

class GitHubClient {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER || 'clayandthepotter';
    this.repo = process.env.GITHUB_REPO || 'buildplan';
    this.defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || 'main';
    
    if (!this.token) {
      logger.warn('GITHUB_TOKEN not set - GitHub operations will be disabled');
      this.enabled = false;
      return;
    }
    
    this.octokit = new Octokit({ auth: this.token });
    this.enabled = true;
    logger.info('GitHub client initialized');
  }

  /**
   * Create a new branch from main
   * @param {string} branchName - Name of the new branch
   * @returns {Promise<boolean>} Success status
   */
  async createBranch(branchName) {
    if (!this.enabled) {
      logger.warn('GitHub client disabled');
      return false;
    }

    try {
      // Get main branch reference
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.defaultBranch}`
      });

      // Create new branch from main
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha
      });

      logger.info(`Created branch: ${branchName}`);
      return true;
    } catch (error) {
      if (error.status === 422) {
        logger.warn(`Branch ${branchName} already exists`);
        return true; // Branch exists, that's okay
      }
      logger.error(`Failed to create branch ${branchName}:`, error.message);
      return false;
    }
  }

  /**
   * Commit files to a branch
   * @param {string} branchName - Target branch
   * @param {Array} files - Array of {path, content} objects
   * @param {string} message - Commit message
   * @returns {Promise<string|null>} Commit SHA or null on failure
   */
  async commitFiles(branchName, files, message) {
    if (!this.enabled) {
      logger.warn('GitHub client disabled');
      return null;
    }

    try {
      // Get current commit SHA
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`
      });
      const currentSha = ref.object.sha;

      // Get current tree
      const { data: commit } = await this.octokit.git.getCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha: currentSha
      });
      const currentTreeSha = commit.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data: blob } = await this.octokit.git.createBlob({
            owner: this.owner,
            repo: this.repo,
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64'
          });
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          };
        })
      );

      // Create new tree
      logger.info(`Creating tree with ${blobs.length} blobs`);
      logger.debug('Tree items:', JSON.stringify(blobs.map(b => ({ path: b.path, type: b.type }))));
      
      const { data: tree } = await this.octokit.git.createTree({
        owner: this.owner,
        repo: this.repo,
        base_tree: currentTreeSha,
        tree: blobs
      });

      // Create commit
      const { data: newCommit } = await this.octokit.git.createCommit({
        owner: this.owner,
        repo: this.repo,
        message,
        tree: tree.sha,
        parents: [currentSha]
      });

      // Update branch reference
      await this.octokit.git.updateRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`,
        sha: newCommit.sha
      });

      logger.info(`Committed ${files.length} files to ${branchName}: ${message}`);
      return newCommit.sha;
    } catch (error) {
      logger.error(`Failed to commit files to ${branchName}:`, error.message);
      if (error.response) {
        logger.error('GitHub API response:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.status === 422 && files) {
        logger.error('Files that failed:', files.map(f => f.path).join(', '));
      }
      return null;
    }
  }

  /**
   * Create a pull request
   * @param {string} branchName - Source branch
   * @param {string} title - PR title
   * @param {string} body - PR description
   * @returns {Promise<Object|null>} PR data or null on failure
   */
  async createPullRequest(branchName, title, body) {
    if (!this.enabled) {
      logger.warn('GitHub client disabled');
      return null;
    }

    try {
      const { data: pr } = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head: branchName,
        base: this.defaultBranch
      });

      logger.info(`Created PR #${pr.number}: ${title}`);
      return {
        number: pr.number,
        url: pr.html_url,
        id: pr.id
      };
    } catch (error) {
      logger.error(`Failed to create PR from ${branchName}:`, error.message);
      return null;
    }
  }

  /**
   * Get file content from repository
   * @param {string} path - File path in repo
   * @param {string} branch - Branch name (default: main)
   * @returns {Promise<string|null>} File content or null
   */
  async getFileContent(path, branch = null) {
    if (!this.enabled) {
      logger.warn('GitHub client disabled');
      return null;
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: branch || this.defaultBranch
      });

      if (data.type !== 'file') {
        logger.error(`${path} is not a file`);
        return null;
      }

      // Decode base64 content
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      if (error.status === 404) {
        logger.info(`File not found: ${path}`);
        return null;
      }
      logger.error(`Failed to get file ${path}:`, error.message);
      return null;
    }
  }

  /**
   * Complete workflow: Create branch, commit files, create PR
   * @param {string} taskId - Task identifier (used for branch name)
   * @param {Array} files - Files to commit
   * @param {string} prTitle - Pull request title
   * @param {string} prBody - Pull request description
   * @returns {Promise<Object|null>} PR data or null on failure
   */
  async createFeaturePR(taskId, files, prTitle, prBody) {
    if (!this.enabled) {
      logger.warn('GitHub client disabled');
      return null;
    }

    const branchName = `feature/${taskId.toLowerCase()}`;
    const commitMessage = `[${taskId}] ${prTitle}`;

    try {
      // Create branch
      const branchCreated = await this.createBranch(branchName);
      if (!branchCreated) {
        logger.error('Failed to create branch');
        return null;
      }

      // Commit files
      const commitSha = await this.commitFiles(branchName, files, commitMessage);
      if (!commitSha) {
        logger.error('Failed to commit files');
        return null;
      }

      // Create PR
      const pr = await this.createPullRequest(branchName, prTitle, prBody);
      if (!pr) {
        logger.error('Failed to create PR');
        return null;
      }

      return {
        ...pr,
        branch: branchName,
        commitSha
      };
    } catch (error) {
      logger.error(`Failed to create feature PR for ${taskId}:`, error.message);
      return null;
    }
  }
}

// Singleton instance
let instance = null;

function getGitHubClient() {
  if (!instance) {
    instance = new GitHubClient();
  }
  return instance;
}

module.exports = getGitHubClient();
