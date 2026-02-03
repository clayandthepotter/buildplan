/**
 * GitHub Webhook Server for BuildPlan Auto-Deployment
 * 
 * This server listens for GitHub push events and automatically:
 * 1. Pulls latest code from main branch
 * 2. Installs dependencies if package.json changed
 * 3. Restarts the agent system with PM2
 */

const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

require('dotenv').config();

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PROJECT_PATH = process.env.PROJECT_ROOT || 'C:\\Projects\\buildplan';

// Middleware to parse JSON and raw body for signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

/**
 * Verify GitHub webhook signature
 */
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature || !WEBHOOK_SECRET) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(digest, 'utf8')
    );
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
}

/**
 * Execute shell command and log output
 */
async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  console.log(`   Command: ${command}`);
  
  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd: PROJECT_PATH,
      shell: 'powershell.exe'
    });
    
    if (stdout) console.log(`   ✅ ${stdout.trim()}`);
    if (stderr) console.log(`   ⚠️  ${stderr.trim()}`);
    
    return { success: true, stdout, stderr };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Deploy latest changes
 */
async function deploy() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 DEPLOYMENT STARTED');
  console.log('='.repeat(60));
  console.log(`   Time: ${new Date().toLocaleString()}`);
  console.log(`   Path: ${PROJECT_PATH}`);
  
  const results = [];

  // 1. Fetch latest changes
  let result = await runCommand(
    'git fetch origin main',
    'Fetching latest changes from GitHub'
  );
  results.push({ step: 'fetch', ...result });

  // 2. Check for new commits
  result = await runCommand(
    'git rev-parse HEAD; git rev-parse origin/main',
    'Checking for new commits'
  );
  
  if (result.success) {
    const [localHash, remoteHash] = result.stdout.trim().split('\n');
    
    if (localHash === remoteHash) {
      console.log('\n✅ Already up to date. No deployment needed.');
      return { deployed: false, reason: 'No new commits' };
    }
    
    console.log(`\n📦 New commits detected:`);
    console.log(`   Local:  ${localHash.substring(0, 7)}`);
    console.log(`   Remote: ${remoteHash.substring(0, 7)}`);
  }

  // 3. Pull changes
  result = await runCommand(
    'git pull origin main',
    'Pulling changes from GitHub'
  );
  results.push({ step: 'pull', ...result });

  if (!result.success) {
    console.error('\n❌ DEPLOYMENT FAILED: Could not pull changes');
    return { deployed: false, error: 'Git pull failed', results };
  }

  // 4. Check if package.json changed
  result = await runCommand(
    'git diff HEAD@{1} HEAD --name-only',
    'Checking changed files'
  );
  
  const changedFiles = result.stdout ? result.stdout.toLowerCase() : '';
  const needsInstall = changedFiles.includes('package.json') || 
                       changedFiles.includes('package-lock.json');

  // 5. Install dependencies if needed
  if (needsInstall) {
    result = await runCommand(
      'cd buildplan-agents; npm install',
      'Installing dependencies'
    );
    results.push({ step: 'install', ...result });
  } else {
    console.log('\n⏭️  Skipping npm install (no package changes)');
  }

  // 6. Restart PM2
  result = await runCommand(
    'pm2 restart buildplan-agents',
    'Restarting agent system'
  );
  results.push({ step: 'restart', ...result });

  // 7. Get PM2 status
  result = await runCommand(
    'pm2 list',
    'Checking PM2 status'
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ DEPLOYMENT COMPLETED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`   Time: ${new Date().toLocaleString()}`);
  console.log('\n');

  return { deployed: true, results };
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'buildplan-webhook',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GitHub webhook endpoint
 */
app.post('/webhook', async (req, res) => {
  console.log('\n📨 Webhook received');
  console.log(`   Event: ${req.headers['x-github-event']}`);
  console.log(`   Delivery: ${req.headers['x-github-delivery']}`);

  // Verify signature
  if (!verifySignature(req)) {
    console.error('❌ Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Only process push events to main branch
  const event = req.headers['x-github-event'];
  
  if (event !== 'push') {
    console.log(`⏭️  Ignoring ${event} event`);
    return res.json({ message: 'Event ignored', event });
  }

  const branch = req.body.ref?.split('/').pop();
  
  if (branch !== 'main') {
    console.log(`⏭️  Ignoring push to ${branch} branch`);
    return res.json({ message: 'Branch ignored', branch });
  }

  console.log(`✅ Valid push event to main branch`);
  console.log(`   Commits: ${req.body.commits?.length || 0}`);
  console.log(`   Pusher: ${req.body.pusher?.name || 'unknown'}`);

  // Respond immediately to GitHub (don't make them wait)
  res.json({ 
    message: 'Deployment started',
    timestamp: new Date().toISOString()
  });

  // Deploy asynchronously
  try {
    const result = await deploy();
    console.log('\n📊 Deployment result:', result);
  } catch (error) {
    console.error('\n❌ Deployment error:', error);
  }
});

/**
 * Manual deployment trigger (for testing)
 */
app.post('/deploy', async (req, res) => {
  console.log('\n🔧 Manual deployment triggered');
  
  try {
    const result = await deploy();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ Manual deployment failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 BuildPlan Webhook Server Started');
  console.log('='.repeat(60));
  console.log(`   Port: ${PORT}`);
  console.log(`   Project: ${PROJECT_PATH}`);
  console.log(`   Webhook: http://YOUR_VPS_IP:${PORT}/webhook`);
  console.log(`   Health: http://YOUR_VPS_IP:${PORT}/health`);
  console.log(`   Manual Deploy: POST http://YOUR_VPS_IP:${PORT}/deploy`);
  console.log('='.repeat(60));
  console.log('\n✅ Ready to receive GitHub webhooks!\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down webhook server...');
  process.exit(0);
});
