const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const fileOps = require('../utils/file-ops');

/**
 * TestRunner
 * Executes tests and parses results for multiple test frameworks
 * Supports: Jest, Vitest, Playwright, npm scripts
 */
class TestRunner {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.testResultsDir = path.join(this.projectRoot, 'test-results');
    fileOps.ensureDirectory(this.testResultsDir);
  }

  /**
   * Run tests using detected framework
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runTests(options = {}) {
    const {
      type = 'all', // all, unit, integration, e2e
      path: testPath = null,
      bail = false,
      coverage = false,
      updateSnapshots = false
    } = options;

    try {
      // Detect test framework
      const framework = this.detectTestFramework();
      logger.info(`[TestRunner] Running ${type} tests with ${framework}`);

      // Build test command
      const command = this.buildTestCommand(framework, {
        type,
        testPath,
        bail,
        coverage,
        updateSnapshots
      });

      // Execute tests
      const startTime = Date.now();
      const result = await this.executeTests(command);
      const duration = Date.now() - startTime;

      // Parse results
      const parsed = this.parseTestResults(result, framework);

      // Save results
      const resultFile = this.saveTestResults({
        ...parsed,
        framework,
        duration,
        timestamp: new Date().toISOString(),
        command
      });

      logger.info(`[TestRunner] Tests completed: ${parsed.passed}/${parsed.total} passed`);
      return {
        success: parsed.failed === 0,
        ...parsed,
        framework,
        duration,
        resultFile
      };
    } catch (error) {
      logger.error('[TestRunner] Test execution failed:', error);
      return {
        success: false,
        error: error.message,
        failed: 0,
        passed: 0,
        total: 0
      };
    }
  }

  /**
   * Run unit tests only
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runUnitTests(options = {}) {
    return this.runTests({ ...options, type: 'unit' });
  }

  /**
   * Run integration tests only
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runIntegrationTests(options = {}) {
    return this.runTests({ ...options, type: 'integration' });
  }

  /**
   * Run end-to-end tests
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async runE2ETests(options = {}) {
    return this.runTests({ ...options, type: 'e2e' });
  }

  /**
   * Run tests with coverage
   * @param {Object} options - Test options
   * @returns {Object} Test results with coverage
   */
  async runWithCoverage(options = {}) {
    const result = await this.runTests({ ...options, coverage: true });
    
    if (result.success && result.coveragePath) {
      result.coverage = this.parseCoverage(result.coveragePath);
    }

    return result;
  }

  /**
   * Detect which test framework is being used
   * @returns {string} Framework name (jest, vitest, playwright, npm)
   */
  detectTestFramework() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fileOps.readFile(packageJsonPath));
      
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // Check for test frameworks in order of preference
      if (deps['@playwright/test']) return 'playwright';
      if (deps['vitest']) return 'vitest';
      if (deps['jest']) return 'jest';
      
      // Fallback to npm script if test script exists
      if (packageJson.scripts && packageJson.scripts.test) return 'npm';

      throw new Error('No test framework detected');
    } catch (error) {
      logger.warn('[TestRunner] Could not detect test framework:', error);
      return 'npm';
    }
  }

  /**
   * Build test command based on framework
   * @param {string} framework - Test framework
   * @param {Object} options - Test options
   * @returns {string} Command to execute
   */
  buildTestCommand(framework, options) {
    const { type, testPath, bail, coverage, updateSnapshots } = options;

    let command = '';

    switch (framework) {
      case 'jest':
        command = 'npx jest';
        if (type !== 'all') command += ` --testPathPattern="${type}"`;
        if (testPath) command += ` ${testPath}`;
        if (bail) command += ' --bail';
        if (coverage) command += ' --coverage';
        if (updateSnapshots) command += ' --updateSnapshot';
        command += ' --json --outputFile=test-results.json';
        break;

      case 'vitest':
        command = 'npx vitest run';
        if (type !== 'all') command += ` --grep="${type}"`;
        if (testPath) command += ` ${testPath}`;
        if (bail) command += ' --bail=1';
        if (coverage) command += ' --coverage';
        command += ' --reporter=json --outputFile=test-results.json';
        break;

      case 'playwright':
        command = 'npx playwright test';
        if (type !== 'all' && type === 'e2e') command += ' tests/e2e';
        if (testPath) command += ` ${testPath}`;
        if (bail) command += ' --max-failures=1';
        command += ' --reporter=json';
        break;

      case 'npm':
      default:
        command = 'npm test';
        break;
    }

    return command;
  }

  /**
   * Execute test command
   * @param {string} command - Command to execute
   * @returns {Object} Execution result
   */
  async executeTests(command) {
    try {
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return { success: true, output, exitCode: 0 };
    } catch (error) {
      // Tests may fail but we still want to parse results
      return {
        success: false,
        output: error.stdout || error.message,
        error: error.stderr || '',
        exitCode: error.status || 1
      };
    }
  }

  /**
   * Parse test results based on framework
   * @param {Object} result - Execution result
   * @param {string} framework - Test framework
   * @returns {Object} Parsed test results
   */
  parseTestResults(result, framework) {
    try {
      switch (framework) {
        case 'jest':
          return this.parseJestResults(result);
        case 'vitest':
          return this.parseVitestResults(result);
        case 'playwright':
          return this.parsePlaywrightResults(result);
        default:
          return this.parseGenericResults(result);
      }
    } catch (error) {
      logger.error('[TestRunner] Error parsing results:', error);
      return this.parseGenericResults(result);
    }
  }

  /**
   * Parse Jest test results
   * @param {Object} result - Execution result
   * @returns {Object} Parsed results
   */
  parseJestResults(result) {
    try {
      const jsonPath = path.join(this.projectRoot, 'test-results.json');
      if (fileOps.fileExists(jsonPath)) {
        const json = JSON.parse(fileOps.readFile(jsonPath));
        return {
          passed: json.numPassedTests || 0,
          failed: json.numFailedTests || 0,
          total: json.numTotalTests || 0,
          skipped: json.numPendingTests || 0,
          suites: json.numTotalTestSuites || 0,
          failures: (json.testResults || [])
            .filter(t => t.status === 'failed')
            .map(t => ({
              name: t.name,
              message: t.message,
              file: t.name
            }))
        };
      }
    } catch (error) {
      logger.error('[TestRunner] Error parsing Jest results:', error);
    }

    return this.parseGenericResults(result);
  }

  /**
   * Parse Vitest test results
   * @param {Object} result - Execution result
   * @returns {Object} Parsed results
   */
  parseVitestResults(result) {
    // Similar to Jest parsing
    return this.parseJestResults(result);
  }

  /**
   * Parse Playwright test results
   * @param {Object} result - Execution result
   * @returns {Object} Parsed results
   */
  parsePlaywrightResults(result) {
    try {
      // Playwright outputs JSON to stdout
      const json = JSON.parse(result.output);
      const suites = json.suites || [];
      
      let passed = 0;
      let failed = 0;
      const failures = [];

      const countTests = (suite) => {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            if (test.status === 'passed') passed++;
            else if (test.status === 'failed') {
              failed++;
              failures.push({
                name: spec.title,
                message: test.error?.message || 'Test failed',
                file: spec.file
              });
            }
          }
        }
        for (const child of suite.suites || []) {
          countTests(child);
        }
      };

      suites.forEach(countTests);

      return {
        passed,
        failed,
        total: passed + failed,
        skipped: 0,
        suites: suites.length,
        failures
      };
    } catch (error) {
      logger.error('[TestRunner] Error parsing Playwright results:', error);
      return this.parseGenericResults(result);
    }
  }

  /**
   * Parse generic test output
   * @param {Object} result - Execution result
   * @returns {Object} Parsed results
   */
  parseGenericResults(result) {
    const output = result.output || '';
    
    // Try to extract numbers from common patterns
    const passedMatch = output.match(/(\d+)\s+passed/i);
    const failedMatch = output.match(/(\d+)\s+failed/i);
    const totalMatch = output.match(/(\d+)\s+total/i);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : (passed + failed);

    return {
      passed,
      failed,
      total,
      skipped: 0,
      suites: 0,
      failures: []
    };
  }

  /**
   * Parse coverage report
   * @param {string} coveragePath - Path to coverage file
   * @returns {Object} Coverage summary
   */
  parseCoverage(coveragePath) {
    try {
      const summaryPath = path.join(coveragePath, 'coverage-summary.json');
      if (fileOps.fileExists(summaryPath)) {
        const coverage = JSON.parse(fileOps.readFile(summaryPath));
        const total = coverage.total || {};
        
        return {
          lines: total.lines?.pct || 0,
          statements: total.statements?.pct || 0,
          functions: total.functions?.pct || 0,
          branches: total.branches?.pct || 0
        };
      }
    } catch (error) {
      logger.error('[TestRunner] Error parsing coverage:', error);
    }

    return null;
  }

  /**
   * Save test results to file
   * @param {Object} results - Test results
   * @returns {string} Path to result file
   */
  saveTestResults(results) {
    const timestamp = Date.now();
    const filename = `test-results-${timestamp}.json`;
    const filepath = path.join(this.testResultsDir, filename);

    fileOps.writeFile(filepath, JSON.stringify(results, null, 2));
    logger.info(`[TestRunner] Saved results to ${filename}`);

    return filepath;
  }

  /**
   * Get latest test results
   * @returns {Object|null} Latest test results
   */
  getLatestResults() {
    try {
      const files = fileOps.readDir(this.testResultsDir)
        .filter(f => f.startsWith('test-results-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) return null;

      const latestFile = path.join(this.testResultsDir, files[0]);
      return JSON.parse(fileOps.readFile(latestFile));
    } catch (error) {
      logger.error('[TestRunner] Error getting latest results:', error);
      return null;
    }
  }

  /**
   * Format test results for display
   * @param {Object} results - Test results
   * @returns {string} Formatted output
   */
  formatResults(results) {
    let output = '📊 **Test Results**\n\n';
    output += `**Status**: ${results.success ? '✅ PASSED' : '❌ FAILED'}\n`;
    output += `**Framework**: ${results.framework}\n`;
    output += `**Duration**: ${(results.duration / 1000).toFixed(2)}s\n\n`;
    
    output += `**Tests**:\n`;
    output += `- ✅ Passed: ${results.passed}\n`;
    output += `- ❌ Failed: ${results.failed}\n`;
    output += `- ⏭️ Skipped: ${results.skipped}\n`;
    output += `- 📊 Total: ${results.total}\n\n`;

    if (results.coverage) {
      output += `**Coverage**:\n`;
      output += `- Lines: ${results.coverage.lines}%\n`;
      output += `- Statements: ${results.coverage.statements}%\n`;
      output += `- Functions: ${results.coverage.functions}%\n`;
      output += `- Branches: ${results.coverage.branches}%\n\n`;
    }

    if (results.failures && results.failures.length > 0) {
      output += `**Failures** (${results.failures.length}):\n`;
      results.failures.slice(0, 5).forEach(f => {
        output += `- ${f.name}: ${f.message}\n`;
      });
      if (results.failures.length > 5) {
        output += `... and ${results.failures.length - 5} more\n`;
      }
    }

    return output;
  }
}

module.exports = new TestRunner();
