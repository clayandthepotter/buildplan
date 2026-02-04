const { execSync } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');
const fileOps = require('../utils/file-ops');

/**
 * FunctionalTesting
 * Playwright-based functional/E2E testing for UI validation
 * Tests user interactions, navigation, forms, and visual regression
 */
class FunctionalTesting {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.resultsDir = path.join(this.projectRoot, 'test-results', 'functional');
    fileOps.ensureDirectory(this.resultsDir);
  }

  /**
   * Run functional tests
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runTests(options = {}) {
    const {
      baseUrl = 'http://localhost:3000',
      browser = 'chromium', // chromium, firefox, webkit
      headed = false,
      project = null, // Test project to run
      grep = null, // Filter tests by pattern
      workers = 4,
      retries = 0,
      timeout = 30000,
      screenshots = 'only-on-failure',
      video = 'retain-on-failure'
    } = options;

    try {
      logger.info('[FunctionalTesting] Starting Playwright tests');

      // Build command
      const command = this.buildPlaywrightCommand({
        baseUrl,
        browser,
        headed,
        project,
        grep,
        workers,
        retries,
        timeout,
        screenshots,
        video
      });

      // Execute tests
      const startTime = Date.now();
      const result = await this.executeTests(command);
      const duration = Date.now() - startTime;

      // Parse results
      const parsed = this.parseResults(result);

      // Save results
      const resultFile = this.saveResults({
        ...parsed,
        duration,
        timestamp: new Date().toISOString(),
        baseUrl,
        browser
      });

      logger.info(`[FunctionalTesting] Tests completed: ${parsed.passed}/${parsed.total} passed`);
      return {
        success: parsed.failed === 0,
        ...parsed,
        duration,
        resultFile
      };
    } catch (error) {
      logger.error('[FunctionalTesting] Test execution failed:', error);
      return {
        success: false,
        error: error.message,
        passed: 0,
        failed: 0,
        total: 0
      };
    }
  }

  /**
   * Build Playwright command
   * @param {Object} options - Command options
   * @returns {string} Command string
   */
  buildPlaywrightCommand(options) {
    let command = 'npx playwright test';

    if (options.project) {
      command += ` --project=${options.project}`;
    }

    if (options.grep) {
      command += ` --grep="${options.grep}"`;
    }

    if (options.headed) {
      command += ' --headed';
    }

    if (options.workers) {
      command += ` --workers=${options.workers}`;
    }

    if (options.retries) {
      command += ` --retries=${options.retries}`;
    }

    command += ' --reporter=json';

    return command;
  }

  /**
   * Execute Playwright tests
   * @param {string} command - Command to execute
   * @returns {Object} Execution result
   */
  async executeTests(command) {
    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CI: 'true'
        }
      });

      return { success: true, output, exitCode: 0 };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.status || 1
      };
    }
  }

  /**
   * Parse test results
   * @param {Object} result - Execution result
   * @returns {Object} Parsed results
   */
  parseResults(result) {
    try {
      // Try to parse JSON output
      const jsonMatch = result.output.match(/\{[\s\S]*"suites"[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        return this.parsePlaywrightJson(json);
      }
    } catch (error) {
      logger.error('[FunctionalTesting] Error parsing JSON results:', error);
    }

    // Fallback to text parsing
    return this.parseTextOutput(result.output);
  }

  /**
   * Parse Playwright JSON output
   * @param {Object} json - JSON report
   * @returns {Object} Parsed results
   */
  parsePlaywrightJson(json) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;
    const failures = [];

    const processSuite = (suite) => {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const status = test.status;
          
          if (status === 'passed' || status === 'expected') {
            passed++;
          } else if (status === 'failed' || status === 'unexpected') {
            failed++;
            failures.push({
              name: spec.title,
              file: spec.file,
              line: spec.line,
              error: test.error?.message || 'Test failed'
            });
          } else if (status === 'skipped') {
            skipped++;
          } else if (status === 'flaky') {
            flaky++;
          }
        }
      }

      for (const child of suite.suites || []) {
        processSuite(child);
      }
    };

    for (const suite of json.suites || []) {
      processSuite(suite);
    }

    return {
      passed,
      failed,
      skipped,
      flaky,
      total: passed + failed + skipped + flaky,
      failures
    };
  }

  /**
   * Parse text output as fallback
   * @param {string} output - Text output
   * @returns {Object} Parsed results
   */
  parseTextOutput(output) {
    const passedMatch = output.match(/(\d+) passed/i);
    const failedMatch = output.match(/(\d+) failed/i);
    const skippedMatch = output.match(/(\d+) skipped/i);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    return {
      passed,
      failed,
      skipped,
      flaky: 0,
      total: passed + failed + skipped,
      failures: []
    };
  }

  /**
   * Run specific test suite
   * @param {string} suiteName - Suite name or pattern
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runSuite(suiteName, options = {}) {
    return this.runTests({
      ...options,
      grep: suiteName
    });
  }

  /**
   * Run UI interaction tests
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runInteractionTests(options = {}) {
    return this.runTests({
      ...options,
      grep: 'interaction|click|form|navigation'
    });
  }

  /**
   * Run visual regression tests
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runVisualTests(options = {}) {
    return this.runTests({
      ...options,
      grep: 'visual|screenshot|appearance',
      screenshots: 'on'
    });
  }

  /**
   * Run mobile responsiveness tests
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runMobileTests(options = {}) {
    return this.runTests({
      ...options,
      project: 'mobile',
      grep: 'mobile|responsive'
    });
  }

  /**
   * Run accessibility tests
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runAccessibilityTests(options = {}) {
    return this.runTests({
      ...options,
      grep: 'accessibility|a11y|aria'
    });
  }

  /**
   * Save test results to file
   * @param {Object} results - Test results
   * @returns {string} Result file path
   */
  saveResults(results) {
    const timestamp = Date.now();
    const filename = `functional-${timestamp}.json`;
    const filepath = path.join(this.resultsDir, filename);

    fileOps.writeFile(filepath, JSON.stringify(results, null, 2));
    logger.info(`[FunctionalTesting] Saved results to ${filename}`);

    return filepath;
  }

  /**
   * Get test coverage from trace files
   * @returns {Object} Coverage information
   */
  async getCoverage() {
    try {
      const tracePath = path.join(this.projectRoot, 'test-results', '.playwright-tracing');
      
      if (!fileOps.fileExists(tracePath)) {
        return { available: false };
      }

      // Count trace files
      const traceFiles = fileOps.readDir(tracePath)
        .filter(f => f.endsWith('.zip'));

      return {
        available: true,
        traceCount: traceFiles.length,
        tracePath
      };
    } catch (error) {
      logger.error('[FunctionalTesting] Error getting coverage:', error);
      return { available: false };
    }
  }

  /**
   * Generate HTML report
   * @returns {Object} Report generation result
   */
  async generateReport() {
    try {
      execSync('npx playwright show-report', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      return {
        success: true,
        message: 'Report opened in browser'
      };
    } catch (error) {
      logger.error('[FunctionalTesting] Error generating report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format test results for display
   * @param {Object} results - Test results
   * @returns {string} Formatted output
   */
  formatResults(results) {
    let output = '🎭 **Functional Test Results**\n\n';
    output += `**Status**: ${results.success ? '✅ PASSED' : '❌ FAILED'}\n`;
    output += `**Duration**: ${(results.duration / 1000).toFixed(2)}s\n`;
    output += `**Environment**: ${results.baseUrl}\n`;
    output += `**Browser**: ${results.browser}\n\n`;

    output += `**Tests**:\n`;
    output += `- ✅ Passed: ${results.passed}\n`;
    output += `- ❌ Failed: ${results.failed}\n`;
    output += `- ⏭️ Skipped: ${results.skipped}\n`;
    if (results.flaky > 0) {
      output += `- ⚠️ Flaky: ${results.flaky}\n`;
    }
    output += `- 📊 Total: ${results.total}\n\n`;

    if (results.failures && results.failures.length > 0) {
      output += `**Failures** (${results.failures.length}):\n`;
      results.failures.slice(0, 5).forEach(f => {
        output += `- ${f.name}\n`;
        output += `  File: ${f.file}:${f.line}\n`;
        output += `  Error: ${f.error}\n\n`;
      });
      if (results.failures.length > 5) {
        output += `... and ${results.failures.length - 5} more\n`;
      }
    }

    return output;
  }

  /**
   * Check if Playwright is installed
   * @returns {boolean} True if installed
   */
  isInstalled() {
    try {
      execSync('npx playwright --version', {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Install Playwright and browsers
   * @returns {Object} Installation result
   */
  async install() {
    try {
      logger.info('[FunctionalTesting] Installing Playwright...');
      
      execSync('npm install -D @playwright/test', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      execSync('npx playwright install', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      return {
        success: true,
        message: 'Playwright installed successfully'
      };
    } catch (error) {
      logger.error('[FunctionalTesting] Installation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new FunctionalTesting();
