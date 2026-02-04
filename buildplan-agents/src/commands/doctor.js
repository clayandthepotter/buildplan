const HealthMonitor = require('../services/healthMonitor');
const logger = require('../utils/logger');

/**
 * BuildPlan Doctor Command
 * Run comprehensive system health checks
 * Usage: node src/commands/doctor.js [--json] [--verbose]
 */

async function runDoctor(options = {}) {
  const { json = false, verbose = false } = options;

  if (!json) {
    console.log('🏥 Running BuildPlan diagnostics...\n');
  }

  try {
    // Run all health checks
    const report = await HealthMonitor.runAllChecks();

    if (json) {
      // Output as JSON
      console.log(JSON.stringify(report, null, 2));
    } else {
      // Output formatted text
      const formatted = HealthMonitor.formatReport(report);
      console.log(formatted);
      
      // Exit with appropriate code
      if (report.overallStatus === 'unhealthy') {
        console.log('\n❌ System has critical issues. Please address failed checks before proceeding.\n');
        process.exit(1);
      } else if (report.overallStatus === 'degraded') {
        console.log('\n⚠️  System is operational but has warnings. Consider addressing them.\n');
        process.exit(0);
      } else {
        console.log('\n✅ System is healthy and ready to go!\n');
        process.exit(0);
      }
    }
  } catch (error) {
    logger.error('Doctor command failed:', error);
    
    if (json) {
      console.log(JSON.stringify({
        error: true,
        message: error.message,
        stack: error.stack
      }, null, 2));
    } else {
      console.error(`\n❌ Error running diagnostics: ${error.message}\n`);
    }
    
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    json: args.includes('--json'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  runDoctor(options);
}

module.exports = { runDoctor };
