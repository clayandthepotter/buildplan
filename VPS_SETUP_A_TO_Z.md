# 🚀 BuildPlan VPS Setup - Complete A to Z Guide

**Complete setup from fresh Windows Server to fully operational AI team + auto-deployment**

**Estimated Time**: 60 minutes

---

## 📋 What You'll Get

When finished, you'll have:
- ✅ AI Agent team with PM orchestrator
- ✅ Telegram bot for communication
- ✅ Automatic deployment from GitHub
- ✅ 24/7 operation with PM2
- ✅ Complete monitoring and logs

---

## 🎯 Prerequisites

- Windows Server 2025 VPS with RDP access
- GitHub account (repository already created)
- Telegram account (on your phone)
- VPS public IP address

---

# Part 1: Initial VPS Setup (20 minutes)

## Step 1: Connect to VPS

1. On your local machine, press `Win + R`
2. Type: `mstsc`
3. Enter your VPS IP address
4. Enter Administrator credentials
5. Click Connect

---

## Step 2: Set Execution Policy

**Open PowerShell as Administrator:**

Right-click Start → Windows PowerShell (Admin)

```pwsh
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

Type `Y` and press Enter.

---

## Step 3: Install Python

```pwsh
# Download Python
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe" -OutFile "C:\python-installer.exe"

# Install Python (takes 2-3 minutes)
Start-Process -FilePath "C:\python-installer.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify installation
python --version
```

**Expected output**: `Python 3.12.1`

---

## Step 4: Install Visual Studio Build Tools

```pwsh
# Download VS Build Tools
Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vs_buildtools.exe" -OutFile "C:\vs_buildtools.exe"

# Install C++ build tools (takes 8-10 minutes)
Start-Process -FilePath "C:\vs_buildtools.exe" -ArgumentList "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" -Wait
```

**Wait for completion** - This is the longest step.

---

## Step 5: Install Node.js

Open Edge browser on VPS:

1. Go to: https://nodejs.org
2. Download: **LTS version** (v20.x or higher)
3. Run installer
4. Accept all defaults
5. Click "Install"
6. Wait for completion

**Verify in PowerShell:**

```pwsh
node --version
npm --version
```

**Close and reopen PowerShell** after installing Node.js.

---

## Step 6: Install Git

In Edge browser:

1. Go to: https://git-scm.com/download/win
2. Download: **64-bit Git for Windows Setup**
3. Run installer
4. Accept all defaults
5. Click "Next" through all screens
6. Click "Install"

**Verify:**

```pwsh
git --version
```

---

## Step 7: Install PM2

```pwsh
npm install -g pm2
pm2 --version
```

---

## Step 8: Create Project Directory

```pwsh
mkdir C:\Projects
cd C:\Projects
```

---

# Part 2: Clone and Setup Repository (10 minutes)

## Step 9: Clone Repository

```pwsh
cd C:\Projects
git clone https://github.com/clayandthepotter/buildplan.git
cd buildplan
```

---

## Step 10: Install Agent Dependencies

```pwsh
cd C:\Projects\buildplan\buildplan-agents
npm install
```

**This should complete successfully now** (all prerequisites are installed).

**Expected**: ~285 packages installed in ~1 minute

---

# Part 3: Get Telegram Credentials (5 minutes)

## Step 11: Create Telegram Bot

**On your phone (Telegram app):**

1. Open Telegram
2. Search: `@BotFather`
3. Send: `/newbot`
4. Bot name: `BuildPlan PM Bot` (or any name you want)
5. Username: `buildplan_pm_bot` (must be unique, add numbers if taken)
6. **Copy the token!** (looks like `1234567890:ABCdef...`)

**Write this down somewhere safe!**

---

## Step 12: Get Your Chat ID

**On your phone (Telegram app):**

1. Search: `@userinfobot`
2. Send: `/start`
3. **Copy your ID!** (a number like `123456789`)

**Write this down!**

---

# Part 4: Configure Agent System (5 minutes)

## Step 13: Create Agent .env File

```pwsh
cd C:\Projects\buildplan\buildplan-agents
Copy-Item .env.example .env
notepad .env
```

**In Notepad, update these values:**

```env
OPENAI_API_KEY=your_openai_api_key_here
TELEGRAM_BOT_TOKEN=PASTE_YOUR_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=PASTE_YOUR_CHAT_ID_HERE
PROJECT_ROOT=C:\\Projects\\buildplan
NODE_ENV=production
PORT=3000
```

**Replace:**
- `your_openai_api_key_here` with your OpenAI API key (already in `.env.example`)
- `PASTE_YOUR_BOT_TOKEN_HERE` with your bot token from Step 11
- `PASTE_YOUR_CHAT_ID_HERE` with your chat ID from Step 12

**Important Path Note:**
- If your VPS username is NOT "Administrator", change the paths:
- Use: `C:\\Users\\YourUsername\\Projects\\buildplan`
- Replace `YourUsername` with your actual Windows username
- Use double backslashes (`\\`) in the `.env` file

**Save** (Ctrl+S) and **close** Notepad.

---

## Step 14: Test Agent System

```pwsh
cd C:\Projects\buildplan\buildplan-agents
npm start
```

**Expected output:**
```
🎯 BuildPlan Agent Orchestrator Started
📂 Project root: C:\Projects\buildplan
👀 Watching for new requests...
👀 Watching for task updates...
⏰ Hourly checks scheduled
⏰ Daily standup at 8:00 AM
✅ System ready!
```

**Check Telegram on your phone** - Your bot should send you a welcome message!

If it works, **stop the server** (Ctrl+C).

---

## Step 15: Deploy with PM2

```pwsh
cd C:\Projects\buildplan\buildplan-agents
pm2 start src\index.js --name buildplan-agents

# View logs to verify
pm2 logs buildplan-agents
```

Press `Ctrl+C` to exit logs.

**Check Telegram** - You should see another message confirming startup.

```pwsh
# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Copy and run the command PM2 outputs** (it will look like a `pm2` command).

---

# Part 5: Test Agent System (5 minutes)

## Step 16: Test Telegram Commands

**On your phone (Telegram):**

1. Find your bot
2. Send: `/help`
3. You should see a list of commands

**Expected response:**
```
🤖 BuildPlan PM Agent - Available Commands:

/request [description] - Submit a new project request
/status - View current tasks in progress
/approve [task-id] - Approve a task for execution
/reject [task-id] [reason] - Reject a task with feedback
/standup - Get daily standup report
/help - Show this help message
```

---

## Step 17: Submit Test Request

**In Telegram, send:**

```
/request Create a simple hello world API endpoint
```

**What happens:**
1. PM Agent receives request
2. Analyzes with OpenAI GPT-4 (takes ~30 seconds)
3. Sends you task breakdown
4. Creates request file in `/requests/in-analysis/`

**Wait for response** - It should send you a detailed task breakdown!

---

## Step 18: Check Request Files

**On VPS:**

```pwsh
cd C:\Projects\buildplan\requests
dir in-analysis
```

You should see a file like `REQ-2026-02-03-001.md`

```pwsh
notepad in-analysis\REQ-2026-02-03-001.md
```

**Review the analysis** - PM Agent created a detailed breakdown!

---

# Part 6: Setup Auto-Deployment Webhook (15 minutes)

## Step 19: Generate Webhook Secret

**On VPS, in PowerShell:**

```pwsh
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Copy the output!** (a random string like `abc123XYZ...`)

**Write this down - you'll need it in Steps 20 and 22!**

---

## Step 20: Configure Webhook Server

```pwsh
cd C:\Projects\buildplan
Copy-Item .env.example .env
notepad .env
```

**In Notepad, add your secret:**

```env
GITHUB_WEBHOOK_SECRET=PASTE_YOUR_SECRET_HERE
WEBHOOK_PORT=3001
PROJECT_ROOT=C:\\Projects\\buildplan
```

**Replace `PASTE_YOUR_SECRET_HERE`** with the secret from Step 19.

**Save** and **close** Notepad.

---

## Step 21: Install Webhook Dependencies

```pwsh
cd C:\Projects\buildplan
npm install
```

**Expected**: ~20 packages installed (express, dotenv, etc.)

---

## Step 22: Configure GitHub Webhook

**On your local machine (not VPS):**

1. Open browser: https://github.com/clayandthepotter/buildplan/settings/hooks
2. Click **Add webhook**
3. Fill in:
   - **Payload URL**: `http://YOUR_VPS_IP:3001/webhook`
     - Replace `YOUR_VPS_IP` with your actual VPS IP
   - **Content type**: Select `application/json`
   - **Secret**: Paste the secret from Step 19
   - **Which events**: Select "Just the push event"
   - **Active**: ✅ Make sure this is checked
4. Click **Add webhook**

**You should see a green checkmark** after GitHub pings your server.

---

## Step 23: Open Firewall Port

**On VPS:**

```pwsh
New-NetFirewallRule -DisplayName "BuildPlan Webhook" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

---

## Step 24: Start Webhook Server

```pwsh
cd C:\Projects\buildplan
pm2 start webhook-server.js --name buildplan-webhook

# View logs
pm2 logs buildplan-webhook
```

**Expected output:**
```
🎯 BuildPlan Webhook Server Started
   Port: 3001
   Webhook: http://YOUR_VPS_IP:3001/webhook
✅ Ready to receive GitHub webhooks!
```

Press `Ctrl+C` to exit logs.

```pwsh
pm2 save
```

---

## Step 25: Verify Both Services Running

```pwsh
pm2 list
```

**Expected output:**

```
┌────┬─────────────────────┬─────────┬──────┐
│ id │ name                │ status  │ cpu  │
├────┼─────────────────────┼─────────┼──────┤
│ 0  │ buildplan-agents    │ online  │ 0%   │
│ 1  │ buildplan-webhook   │ online  │ 0%   │
└────┴─────────────────────┴─────────┴──────┘
```

**Both should show "online"!** ✅

---

# Part 7: Test Auto-Deployment (5 minutes)

## Step 26: Test Webhook from Local Machine

**On your local machine** (not VPS):

```bash
cd path/to/buildplan

# Make a small test change
echo "# Test webhook" >> README.md

# Commit and push
git add README.md
git commit -m "Test auto-deployment webhook"
git push origin main
```

---

## Step 27: Watch Deployment on VPS

**On VPS:**

```pwsh
pm2 logs buildplan-webhook
```

**You should see:**
```
📨 Webhook received
   Event: push
✅ Valid push event to main branch
   Commits: 1
   Pusher: your-github-username

🚀 DEPLOYMENT STARTED
🔄 Fetching latest changes from GitHub...
🔄 Pulling changes from GitHub...
🔄 Restarting agent system...
✅ DEPLOYMENT COMPLETED SUCCESSFULLY
```

**Your changes are now live!** 🎉

---

# Part 8: Verification and Monitoring (5 minutes)

## Step 28: Verify Everything Works

### Check Services
```pwsh
pm2 list
```
Both should be **online**.

### Check Agent Logs
```pwsh
pm2 logs buildplan-agents --lines 50
```

### Check Webhook Logs
```pwsh
pm2 logs buildplan-webhook --lines 50
```

### Test Telegram Commands
On your phone, send:
- `/help` - Should list commands
- `/status` - Should show current tasks
- `/standup` - Should show daily report

---

## Step 29: Check GitHub Webhook Status

**On your local machine:**

1. Go to: https://github.com/clayandthepotter/buildplan/settings/hooks
2. Click on your webhook
3. Click **Recent Deliveries**
4. You should see green checkmarks ✅

---

# 🎉 Setup Complete!

## Your System is Now:

✅ **AI Agent Team Running**
- PM Agent orchestrator with OpenAI GPT-4
- Telegram bot responding to commands
- File watchers monitoring for new tasks
- Automated cron jobs (hourly + daily)

✅ **Auto-Deployment Active**
- Push to GitHub from local machine
- VPS automatically pulls changes
- Services restart automatically
- Full logging of all deployments

✅ **24/7 Operation**
- PM2 keeps services running
- Auto-restart on crashes
- Auto-start on VPS reboot

---

## 🎯 Your Workflow Now

### Submitting Requests
**On your phone (Telegram):**
```
/request Build a user authentication system with email/password
```

PM Agent will:
1. Analyze your request with GPT-4
2. Create task breakdown
3. Ask for approval
4. Create task files
5. (Future) Assign to specialist agents

### Deploying Code
**On your local machine:**
```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main
```

VPS will:
1. Receive webhook from GitHub
2. Pull latest code
3. Install dependencies if needed
4. Restart services
5. Notify you (via logs)

---

## 📱 Telegram Commands Reference

- `/request [description]` - Submit project request
- `/status` - View current tasks
- `/approve REQ-ID` - Approve request
- `/reject REQ-ID [reason]` - Reject request
- `/standup` - Get daily standup
- `/help` - Show commands

---

## 🔧 Useful Commands

### Monitor Services
```pwsh
pm2 list                          # List all services
pm2 logs                          # View all logs
pm2 logs buildplan-agents         # View agent logs only
pm2 logs buildplan-webhook        # View webhook logs only
```

### Restart Services
```pwsh
pm2 restart buildplan-agents      # Restart agents
pm2 restart buildplan-webhook     # Restart webhook
pm2 restart all                   # Restart everything
```

### Stop Services
```pwsh
pm2 stop buildplan-agents
pm2 stop buildplan-webhook
pm2 stop all
```

### View Configuration
```pwsh
# Agent config
notepad C:\Projects\buildplan\buildplan-agents\.env

# Webhook config
notepad C:\Projects\buildplan\.env

# PM Agent prompt
notepad C:\Projects\buildplan\docs\PM_AGENT_PROMPT.md
```

### Update from GitHub
```pwsh
cd C:\Projects\buildplan
git pull origin main
pm2 restart all
```

---

## 📁 Important Directories

```
C:\Projects\buildplan\
│
├── buildplan-agents/           # Agent system
│   ├── src/
│   │   ├── index.js           # Main orchestrator
│   │   └── agents/
│   │       └── pm-agent.js    # PM Agent
│   ├── logs/                  # Agent logs
│   ├── agents.db              # SQLite database
│   └── .env                   # Agent configuration
│
├── webhook-server.js          # Auto-deployment server
├── .env                       # Webhook configuration
│
├── requests/                  # Project requests
│   ├── pending/
│   ├── in-analysis/
│   └── approved/
│
├── tasks/                     # Task management
│   ├── inbox/
│   ├── in-progress/
│   ├── review/
│   └── completed/
│
└── docs/                      # Documentation
    ├── AI_TEAM_PROTOCOL.md
    ├── PM_AGENT_PROMPT.md
    └── VPS_DEPLOYMENT_GUIDE.md
```

---

## 🆘 Troubleshooting

### Telegram Bot Not Responding

**Check logs:**
```pwsh
pm2 logs buildplan-agents
```

**Common issues:**
- Wrong bot token or chat ID in `.env`
- Process crashed (check logs)
- Network connectivity

**Fix:**
```pwsh
# Verify .env file
notepad C:\Projects\buildplan\buildplan-agents\.env

# Restart
pm2 restart buildplan-agents
```

---

### Webhook Not Deploying

**Check GitHub webhook status:**
1. GitHub → Settings → Webhooks
2. Check "Recent Deliveries"
3. Look for errors

**Check logs:**
```pwsh
pm2 logs buildplan-webhook
```

**Common issues:**
- Wrong webhook secret
- Port 3001 blocked
- VPS IP incorrect in GitHub
- Webhook server not running

**Fix:**
```pwsh
# Verify webhook is running
pm2 list

# Check firewall
Get-NetFirewallRule -DisplayName "BuildPlan Webhook"

# Restart
pm2 restart buildplan-webhook
```

---

### PM Agent Not Analyzing Requests

**Check logs:**
```pwsh
pm2 logs buildplan-agents --lines 100
```

**Common issues:**
- OpenAI API key invalid or expired
- Rate limits exceeded
- Network connectivity

**Fix:**
```pwsh
# Check OpenAI key
notepad C:\Projects\buildplan\buildplan-agents\.env

# Restart
pm2 restart buildplan-agents
```

---

### Missing Module Errors (MODULE_NOT_FOUND)

**Error:** `Cannot find module 'node-telegram-bot-api'` or similar

**Fix:**
```pwsh
cd C:\Users\Administrator\Projects\buildplan\buildplan-agents
npm install
```

**Note**: Make sure you run `npm install` in the `buildplan-agents` folder, not the project root.

---

### PROJECT_ROOT Error ("path" argument must be of type string)

**Error:** `The "path" argument must be of type string. Received undefined`

**Cause:** The `.env` file is missing or in the wrong location.

**Fix:**
```pwsh
cd C:\Users\Administrator\Projects\buildplan\buildplan-agents

# Create .env file with correct paths
@"
OPENAI_API_KEY=your_openai_key_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
PROJECT_ROOT=C:\\Users\\Administrator\\Projects\\buildplan
REQUESTS_DIR=C:\\Users\\Administrator\\Projects\\buildplan\\requests
TASKS_DIR=C:\\Users\\Administrator\\Projects\\buildplan\\tasks
STANDUP_DIR=C:\\Users\\Administrator\\Projects\\buildplan\\standup
PM_AGENT_INTERVAL=3600000
STANDUP_CRON=0 8 * * *
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
"@ | Out-File -FilePath .env -Encoding utf8

# Verify
Get-Content .env
```

**Important:** There are TWO `.env` files:
1. `C:\Users\Administrator\Projects\buildplan\.env` - For webhook server
2. `C:\Users\Administrator\Projects\buildplan\buildplan-agents\.env` - For agent system

---

### Services Not Starting on VPS Reboot

**On Windows Server, use pm2-windows-service:**

```pwsh
# Install PM2 Windows Service
npm install -g pm2-windows-service

# Install the service (run as Administrator)
pm2-service-install -n PM2
```

**When prompted:**
- PM2_HOME: Press Enter (use default)
- PM2_SERVICE_SCRIPTS: Press Enter (use default)
- PM2_SERVICE_PM2_DIR: Press Enter (use default)

**Start the service:**
```pwsh
pm2-service-start

# Verify
pm2 list
```

**Alternative: Task Scheduler**

If pm2-windows-service doesn't work:

```pwsh
# Create startup script
@"
cd C:\Users\Administrator\Projects\buildplan\buildplan-agents
pm2 resurrect
"@ | Out-File -FilePath "C:\startup-pm2.bat" -Encoding ASCII

# Create scheduled task
$action = New-ScheduledTaskAction -Execute "pm2" -Argument "resurrect"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "Administrator" -RunLevel Highest
Register-ScheduledTask -TaskName "PM2-Startup" -Action $action -Trigger $trigger -Principal $principal
```

---

## 📊 Monitoring

### Real-time Monitoring
```pwsh
pm2 monit
```

Shows CPU, memory, logs in real-time.

### View Specific Logs
```pwsh
pm2 logs buildplan-agents --lines 100 --raw
```

### Export Logs
```pwsh
pm2 logs buildplan-agents > C:\logs-export.txt
```

---

## 🚀 Next Steps

Now that your system is running:

1. **Customize PM Agent** - Edit `docs/PM_AGENT_PROMPT.md`
2. **Add More Agents** - Create specialist agents (backend, frontend, etc.)
3. **Build Features** - Use Telegram to request new features
4. **Monitor Performance** - Watch logs and optimize

---

## 📚 Additional Documentation

- **AI Team Protocol**: `docs/AI_TEAM_PROTOCOL.md`
- **PM Agent Prompt**: `docs/PM_AGENT_PROMPT.md`
- **Webhook Setup**: `docs/WEBHOOK_SETUP.md`
- **Complete Summary**: `DEPLOYMENT_COMPLETE.md`

---

## ✅ Success Checklist

- [ ] Python installed and verified
- [ ] Visual Studio Build Tools installed
- [ ] Node.js installed and verified
- [ ] Git installed and verified
- [ ] PM2 installed globally
- [ ] Repository cloned
- [ ] Agent dependencies installed
- [ ] Telegram bot created
- [ ] Chat ID obtained
- [ ] Agent .env configured
- [ ] Agent system tested
- [ ] PM2 running buildplan-agents
- [ ] Webhook secret generated
- [ ] Webhook .env configured
- [ ] GitHub webhook configured
- [ ] Firewall port opened
- [ ] PM2 running buildplan-webhook
- [ ] Auto-deployment tested
- [ ] Both services online in PM2
- [ ] Telegram commands working
- [ ] System monitoring verified
- [ ] PM2 auto-start configured (pm2-windows-service or Task Scheduler)
- [ ] VPS reboot tested (optional but recommended)

---

## 🎉 You're Done!

You now have a fully operational AI development team with:
- 24/7 AI agent orchestrator
- Telegram-based communication
- Automatic deployment from GitHub
- Complete monitoring and logging

**Start building!** 🚀

---

**Questions or issues?** Check the troubleshooting section above or review the detailed docs in `/docs`.

**Last Updated**: February 2, 2026
