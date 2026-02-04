const BaseAgent = require('./base-agent');
const logger = require('../utils/logger');
const testRunner = require('../services/testRunner');
const functionalTesting = require('../services/functionalTesting');

/**
 * QA Agent
 * Orchestrates all testing activities: functional, performance, security
 * Generates comprehensive test reports and blocks promotions on failures
 */
class QAAgent extends BaseAgent {
  constructor(orchestrator) {
    super('qa-agent', orchestrator);
    this.systemPrompt = `You are the QA Agent for BuildPlan. 
Your role is to ensure quality through comprehensive testing.
Run tests, analyze results, report issues, and block deployments when tests fail.
Be thorough, detail-oriented, and proactive about identifying potential issues.`;
  }

  /**
   * Execute a task assigned to QA Agent
   * @param {Object} task - Task specification
   * @returns {Object} Execution result
   */
  async executeTask(task) {
    try {
      logger.info(`[QA-Agent] Executing task: ${task.id}`);

      const taskType = this.extractTaskType(task);

      switch (taskType) {
        case 'functional':
          return await this.runFunctionalTests(task);
        case 'unit':
          return await this.runUnitTests(task);
        case 'integration':
          return await this.runIntegrationTests(task);
        case 'e2e':
          return await this.runE2ETests(task);
        case 'full-suite':
          return await this.runFullTestSuite(task);
        default:
          return await this.runFullTestSuite(task);
      }
    } catch (error) {
      logger.error('[QA-Agent] Task execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run functional tests
   * @param {Object} task - Task details
   * @returns {Object} Test results
   */
  async runFunctionalTests(task) {
    logger.info('[QA-Agent] Running functional tests');

    const options = {
      baseUrl: task.baseUrl || process.env.BASE_URL || 'http://localhost:3000',
      browser: task.browser || 'chromium',
      workers: 4,
      retries: 2
    };

    const results = await functionalTesting.runTests(options);
    
    return {
      success: results.success,
      testType: 'functional',
      results,
      report: functionalTesting.formatResults(results)
    };
  }

  /**
   * Run unit tests
   * @param {Object} task - Task details
   * @returns {Object} Test results
   */
  async runUnitTests(task) {
    logger.info('[QA-Agent] Running unit tests');

    const results = await testRunner.runUnitTests({
      coverage: true
    });

    return {
      success: results.success,
      testType: 'unit',
      results,
      report: testRunner.formatResults(results)
    };
  }

  /**
   * Run integration tests
   * @param {Object} task - Task details
   * @returns {Object} Test results
   */
  async runIntegrationTests(task) {
    logger.info('[QA-Agent] Running integration tests');

    const results = await testRunner.runIntegrationTests({
      bail: false
    });

    return {
      success: results.success,
      testType: 'integration',
      results,
      report: testRunner.formatResults(results)
    };
  }

  /**
   * Run end-to-end tests
   * @param {Object} task - Task details
   * @returns {Object} Test results
   */
  async runE2ETests(task) {
    logger.info('[QA-Agent] Running E2E tests');

    const results = await functionalTesting.runTests({
      baseUrl: task.baseUrl || process.env.BASE_URL,
      browser: 'chromium',
      workers: 2,
      retries: 1
    });

    return {
      success: results.success,
      testType: 'e2e',
      results,
      report: functionalTesting.formatResults(results)
    };
  }

  /**
   * Run full test suite (all test types)
   * @param {Object} task - Task details
   * @returns {Object} Aggregated results
   */
  async runFullTestSuite(task) {
    logger.info('[QA-Agent] Running full test suite');

    const suiteResults = {
      unit: null,
      integration: null,
      functional: null,
      overallSuccess: true,
      startTime: new Date().toISOString()
    };

    // Run unit tests
    try {
      suiteResults.unit = await testRunner.runUnitTests({ coverage: true });
      if (!suiteResults.unit.success) {
        suiteResults.overallSuccess = false;
      }
    } catch (error) {
      logger.error('[QA-Agent] Unit tests failed:', error);
      suiteResults.unit = { success: false, error: error.message };
      suiteResults.overallSuccess = false;
    }

    // Run integration tests
    try {
      suiteResults.integration = await testRunner.runIntegrationTests();
      if (!suiteResults.integration.success) {
        suiteResults.overallSuccess = false;
      }
    } catch (error) {
      logger.error('[QA-Agent] Integration tests failed:', error);
      suiteResults.integration = { success: false, error: error.message };
      suiteResults.overallSuccess = false;
    }

    // Run functional tests if available
    if (functionalTesting.isInstalled()) {
      try {
        suiteResults.functional = await functionalTesting.runTests({
          baseUrl: task.baseUrl || 'http://localhost:3000',
          workers: 4
        });
        if (!suiteResults.functional.success) {
          suiteResults.overallSuccess = false;
        }
      } catch (error) {
        logger.error('[QA-Agent] Functional tests failed:', error);
        suiteResults.functional = { success: false, error: error.message };
        suiteResults.overallSuccess = false;
      }
    }

    suiteResults.endTime = new Date().toISOString();
    suiteResults.report = this.generateSuiteReport(suiteResults);

    return {
      success: suiteResults.overallSuccess,
      testType: 'full-suite',
      results: suiteResults,
      report: suiteResults.report
    };
  }

  /**
   * Generate comprehensive test suite report
   * @param {Object} suiteResults - All test results
   * @returns {string} Formatted report
   */
  generateSuiteReport(suiteResults) {
    let report = '📊 **QA Test Suite Report**\n\n';
    report += `**Overall Status**: ${suiteResults.overallSuccess ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Started**: ${suiteResults.startTime}\n`;
    report += `**Completed**: ${suiteResults.endTime}\n\n`;

    // Unit tests
    if (suiteResults.unit) {
      report += '## Unit Tests\n';
      if (suiteResults.unit.success) {
        report += `✅ PASSED - ${suiteResults.unit.passed}/${suiteResults.unit.total} tests\n`;
        if (suiteResults.unit.coverage) {
          report += `Coverage: ${suiteResults.unit.coverage.lines}% lines\n`;
        }
      } else {
        report += `❌ FAILED - ${suiteResults.unit.failed} failures\n`;
      }
      report += '\n';
    }

    // Integration tests
    if (suiteResults.integration) {
      report += '## Integration Tests\n';
      if (suiteResults.integration.success) {
        report += `✅ PASSED - ${suiteResults.integration.passed}/${suiteResults.integration.total} tests\n`;
      } else {
        report += `❌ FAILED - ${suiteResults.integration.failed} failures\n`;
      }
      report += '\n';
    }

    // Functional tests
    if (suiteResults.functional) {
      report += '## Functional Tests\n';
      if (suiteResults.functional.success) {
        report += `✅ PASSED - ${suiteResults.functional.passed}/${suiteResults.functional.total} tests\n`;
      } else {
        report += `❌ FAILED - ${suiteResults.functional.failed} failures\n`;
        if (suiteResults.functional.flaky > 0) {
          report += `⚠️ Flaky: ${suiteResults.functional.flaky} tests\n`;
        }
      }
      report += '\n';
    }

    // Summary
    const totalTests = (suiteResults.unit?.total || 0) + 
                       (suiteResults.integration?.total || 0) + 
                       (suiteResults.functional?.total || 0);
    
    const totalPassed = (suiteResults.unit?.passed || 0) + 
                        (suiteResults.integration?.passed || 0) + 
                        (suiteResults.functional?.passed || 0);

    report += '## Summary\n';
    report += `**Total Tests**: ${totalTests}\n`;
    report += `**Passed**: ${totalPassed}\n`;
    report += `**Pass Rate**: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%\n\n`;

    if (!suiteResults.overallSuccess) {
      report += '⚠️ **Deployment BLOCKED** - Tests must pass before promotion\n';
    }

    return report;
  }

  /**
   * Extract task type from task object
   * @param {Object} task - Task object
   * @returns {string} Task type
   */
  extractTaskType(task) {
    // Check task description or title for keywords
    const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    
    if (text.includes('functional') || text.includes('e2e') || text.includes('ui')) {
      return 'functional';
    }
    if (text.includes('unit')) {
      return 'unit';
    }
    if (text.includes('integration')) {
      return 'integration';
    }
    if (text.includes('full') || text.includes('all')) {
      return 'full-suite';
    }

    return 'full-suite'; // Default to full suite
  }

  /**
   * Analyze test results and provide recommendations
   * @param {Object} results - Test results
   * @returns {string} Analysis and recommendations
   */
  async analyzeResults(results) {
    const issues = [];
    const recommendations = [];

    // Check for high failure rate
    if (results.results) {
      const { unit, integration, functional } = results.results;
      
      if (unit && unit.failed > 0) {
        issues.push(`${unit.failed} unit test failures`);
        recommendations.push('Review failing unit tests - these are foundational issues');
      }

      if (integration && integration.failed > 0) {
        issues.push(`${integration.failed} integration test failures`);
        recommendations.push('Check integration points between components');
      }

      if (functional && functional.failed > 0) {
        issues.push(`${functional.failed} functional test failures`);
        recommendations.push('Investigate UI/UX issues and user flows');
      }

      if (functional && functional.flaky > 0) {
        issues.push(`${functional.flaky} flaky tests detected`);
        recommendations.push('Stabilize flaky tests to improve reliability');
      }
    }

    let analysis = '🔍 **Test Analysis**\n\n';
    
    if (issues.length === 0) {
      analysis += '✅ No issues detected. All tests passing.\n';
    } else {
      analysis += '**Issues Found**:\n';
      issues.forEach(issue => {
        analysis += `- ${issue}\n`;
      });
      analysis += '\n**Recommendations**:\n';
      recommendations.forEach(rec => {
        analysis += `- ${rec}\n`;
      });
    }

    return analysis;
  }

  /**
   * Get test status for reporting
   * @returns {Object} Test status
   */
  async getTestStatus() {
    const latestResults = testRunner.getLatestResults();
    
    if (!latestResults) {
      return {
        status: 'no-tests',
        message: 'No test results available'
      };
    }

    return {
      status: latestResults.success ? 'passing' : 'failing',
      timestamp: latestResults.timestamp,
      passed: latestResults.passed,
      failed: latestResults.failed,
      total: latestResults.total
    };
  }
}

module.exports = QAAgent;
