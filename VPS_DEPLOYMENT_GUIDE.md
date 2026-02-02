# BuildPlan VPS Deployment Guide - Step by Step

**Platform**: Windows Server 2025  
**Time**: 30-45 minutes  
**Prerequisites**: RDP access to your VPS

---

## 📋 Before You Start

**You'll Need:**
1. VPS IP address and RDP credentials
2. Telegram bot token (from @BotFather)
3. Telegram chat ID (from @userinfobot)
4. GitHub account credentials
5. OpenAI API key (you already have this)

---

## Part 1: VPS Initial Setup (10 minutes)

### Step 1: Connect to VPS via RDP

**On your local Windows machine:**

1. Press `Win + R`
2. Type: `mstsc`
3. Click OK
4. Enter your VPS IP address
5. Click "Connect"
6. Enter username: `Administrator` (or provided username)
7. Enter password
8. Click OK

**You're now on your Windows Server!**

---

### Step 2: Install Node.js

**On the VPS:**

1. Open Microsoft Edge browser
2. Navigate to: https://nodejs.org
3. Click "Download Node.js (LTS)" - get version 20.x
4. Run the downloaded `.msi` installer
5. Click "Next" through the installer
6. **Important**: Check "Automatically install necessary tools"
7. Click "Next" and "Install"
8. Wait for installation to complete (2-3 minutes)
9. Click "Finish"

**Verify installation:**
1. Press `Win + X`
2. Click "Windows PowerShell (Admin)"
3. Type: `node --version`
4. Should show: `v20.x.x`
5. Type: `npm --version`
6. Should show: `10.x.x`

✅ **Node.js installed!**

---

### Step 3: Install Git for Windows

**On the VPS:**

1. Open Edge browser
2. Navigate to: https://git-scm.com/download/win
3. Click "64-bit Git for Windows Setup"
4. Run the downloaded `.exe` installer
5. Click "Next" through all options (defaults are fine)
6. Click "Install"
7. Wait 1-2 minutes
8. Click "Finish"

**Verify installation:**
1. In PowerShell (Admin), type: `git --version`
2. Should show: `git version 2.x.x`

✅ **Git installed!**

---

### Step 4: Install PM2 (Process Manager)

**On the VPS:**

In PowerShell (Admin):
```powershell
npm install -g pm2
npm install -g pm2-windows-service
```

Wait 1-2 minutes for installation.

**Verify:**
```powershell
pm2 --version
```
Should show version number.

✅ **PM2 installed!**

---

## Part 2: Clone and Setup Project (10 minutes)

### Step 5: Create Project Directory

**On the VPS:**

In PowerShell:
```powershell
# Create main projects folder
cd C:\
mkdir Projects
cd Projects
```

✅ **Directory created: C:\Projects**

---

### Step 6: Clone Repository from GitHub

**On the VPS:**

```powershell
# Clone your repo
git clone https://github.com/clayandthepotter/buildplan.git
```

If asked for credentials:
- Username: your GitHub username
- Password: use a **Personal Access Token** (not your password)
  - If you don't have a token, create one at: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Give it a name and select "repo" scope
  - Copy the token and use it as the password

**Verify:**
```powershell
cd buildplan
dir
```
Should see all your project files.

✅ **Repository cloned!**

---

### Step 7: Navigate to Agent Directory

```powershell
cd buildplan-agents
dir
```

Should see:
- `package.json`
- `src/` folder
- `.env.example`
- `README.md`
- etc.

---

### Step 8: Install Dependencies

```powershell
npm install
```

This will take 2-3 minutes. You'll see:
- Downloading packages...
- Installing dependencies...
- Building native modules...

**If you see warnings about optional dependencies, that's OK - ignore them.**

When done, you'll see:
```
added XXX packages in XXs
```

✅ **Dependencies installed!**

---

## Part 3: Get Telegram Credentials (5 minutes)

### Step 9: Create Telegram Bot

**On your phone or local computer** (NOT the VPS):

1. Open Telegram
2. Search for: `@BotFather`
3. Click "Start"
4. Send: `/newbot`
5. Bot Father asks for name: `BuildPlan PM Bot`
6. Bot Father asks for username: `buildplan_pm_bot` (or choose your own)
7. **Copy the token** it gives you (looks like: `123456789:ABCdef...`)

**Write this down:**
```
TELEGRAM_BOT_TOKEN: [paste token here]
```

---

### Step 10: Get Your Chat ID

**Still on your phone/local computer:**

1. In Telegram, search for: `@userinfobot`
2. Click "Start"
3. Bot will reply with your ID (a number like: `123456789`)
4. **Copy this number**

**Write this down:**
```
TELEGRAM_CHAT_ID: [paste ID here]
```

✅ **Telegram credentials obtained!**

---

## Part 4: Configure Environment (5 minutes)

### Step 11: Create .env File

**Back on the VPS:**

In PowerShell:
```powershell
# Copy example to actual .env
copy .env.example .env

# Edit .env file
notepad .env
```

Notepad will open.

---

### Step 12: Update .env File

**In Notepad, update these lines:**

Find:
```
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-chat-id
```

Replace with your actual values:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_CHAT_ID=123456789
```

**The OpenAI key is already set - don't change it!**

**Save and close:**
1. File → Save
2. File → Exit

✅ **.env configured!**

---

## Part 5: Start the System (5 minutes)

### Step 13: Test Run (Optional but Recommended)

```powershell
npm start
```

You should see:
```
🚀 Starting BuildPlan Agent Orchestrator
✅ Database initialized
✅ PM Agent loaded
✅ Telegram bot ready
✅ File watchers active
✅ Cron jobs scheduled
✅ PM Agent running
✅ Agent Orchestrator fully operational
```

**AND check your Telegram** - you should receive:
```
🚀 BuildPlan AI Team is now online!

Send /help for available commands.
```

**If you see this, IT WORKS!** 🎉

Press `Ctrl + C` to stop it (we'll run it properly next).

---

### Step 14: Start with PM2 (Production Mode)

**On the VPS:**

```powershell
# Start the service
pm2 start src\index.js --name buildplan-agents

# Save PM2 configuration
pm2 save

# Make PM2 start on Windows boot
pm2-service-install

# Check status
pm2 status
```

You should see:
```
┌─────┬────────────────────┬─────────┬─────────┬──────┐
│ id  │ name               │ status  │ cpu     │ mem  │
├─────┼────────────────────┼─────────┼─────────┼──────┤
│ 0   │ buildplan-agents   │ online  │ 0%      │ 50M  │
└─────┴────────────────────┴─────────┴─────────┴──────┘
```

**Status should be "online"**

✅ **System running with PM2!**

---

## Part 6: Verify Everything Works (5 minutes)

### Step 15: Test Telegram Commands

**On your phone/computer:**

In Telegram, send to your bot:

```
/help
```

You should get a response with command list.

```
/status
```

Should show "No active tasks" (expected - nothing running yet).

---

### Step 16: Test Request Submission

```
/request Create a simple hello world API endpoint that returns OK
```

PM Agent should:
1. Reply: "📝 Creating request..."
2. Reply: "📥 New request detected! Analyzing..."
3. A minute later: "📋 Request Analysis Complete" with task breakdown
4. Ask you to approve

**If this works, everything is perfect!** 🎉

---

## Part 7: Monitoring & Management (Ongoing)

### View Logs

```powershell
# Real-time logs
pm2 logs buildplan-agents

# Show last 50 lines
pm2 logs buildplan-agents --lines 50
```

Press `Ctrl + C` to exit logs.

---

### Check Status

```powershell
pm2 status
```

---

### Restart Service

```powershell
pm2 restart buildplan-agents
```

---

### Stop Service

```powershell
pm2 stop buildplan-agents
```

---

### Start Service

```powershell
pm2 start buildplan-agents
```

---

### Update Code from GitHub

```powershell
# Navigate to project
cd C:\Projects\buildplan

# Pull latest changes
git pull origin main

# Restart service
cd buildplan-agents
pm2 restart buildplan-agents
```

---

## 🔧 Troubleshooting

### Bot Not Responding in Telegram

**Check service is running:**
```powershell
pm2 status
```
Should show "online"

**Check logs:**
```powershell
pm2 logs buildplan-agents --lines 100
```
Look for errors.

**Restart:**
```powershell
pm2 restart buildplan-agents
```

---

### "Cannot find module" Error

```powershell
cd C:\Projects\buildplan\buildplan-agents
npm install
pm2 restart buildplan-agents
```

---

### OpenAI API Errors

Check your API key is correct in `.env`:
```powershell
notepad .env
```

Verify it matches: `sk-proj-VQb3QysqfIGX7H-mDQ7P0RRTe1bzN4V5cKBm7OZfpd8mCVnBJurcUrfAr9XK52-4IC3CEfB08c`

---

### Check if Port is Blocked

Windows Server firewall might block outbound HTTPS. Allow Node.js:
```powershell
New-NetFirewallRule -DisplayName "Node.js" -Direction Outbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

---

## 🎉 SUCCESS!

Your AI team is now running 24/7 on your Windows Server VPS!

### What You Can Do:

**From anywhere (phone, computer):**
- Send `/request` in Telegram to submit work
- Get daily standups automatically at 8 AM
- Check `/status` anytime
- Approve work with `/approve`

**The VPS handles:**
- Running PM Agent 24/7
- Watching for new requests
- Analyzing with OpenAI
- Storing tasks and requests
- Logging everything
- Auto-restart if crashes

---

## 📊 Quick Reference

### PM2 Commands
```powershell
pm2 status           # Check if running
pm2 logs            # View live logs
pm2 restart all     # Restart all services
pm2 stop all        # Stop all services
pm2 start all       # Start all services
```

### File Locations
```
C:\Projects\buildplan\buildplan-agents\     ← Main code
C:\Projects\buildplan\requests\             ← Request files
C:\Projects\buildplan\tasks\                ← Task files
C:\Projects\buildplan\buildplan-agents\logs\ ← System logs
```

### Telegram Commands
```
/request [text]  - Submit new request
/status          - Check progress
/standup         - Daily report
/approve TASK-ID - Approve work
/reject TASK-ID  - Request changes
/help            - Show commands
```

---

## 🚀 You're All Set!

Your AI development team is:
- ✅ Running 24/7 on your VPS
- ✅ Responding to Telegram
- ✅ Auto-starting on server reboot
- ✅ Logging everything
- ✅ Ready to build software!

**Test it now:** Send `/request` in Telegram! 🎉
