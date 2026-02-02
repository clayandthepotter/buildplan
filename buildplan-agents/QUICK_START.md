# BuildPlan AI Team - Quick Start Guide

**Your OpenAI key is already configured!** ✅

Now you just need to set up Telegram and install dependencies.

---

## 🚀 Steps to Get Running (10 minutes)

### Step 1: Create Telegram Bot (2 minutes)

1. Open Telegram on your phone/computer
2. Search for **@BotFather**
3. Send: `/newbot`
4. Name your bot: **BuildPlan PM Bot**
5. Username: **buildplan_pm_bot** (or choose your own)
6. Copy the token (looks like: `123456789:ABCdef...`)

### Step 2: Get Chat ID (2 minutes)

**Option A: Use your personal chat**
1. Search for **@userinfobot** in Telegram
2. Start a conversation
3. It will show your chat ID (a number like `123456789`)

**Option B: Create a group** (recommended)
1. Create a new Telegram group: "BuildPlan Dev Team"
2. Add your bot to the group
3. Send a message in the group
4. Visit this URL in your browser (replace TOKEN with your bot token):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
5. Look for `"chat":{"id":-1001234567890}` and copy the ID

### Step 3: Update .env File (1 minute)

Open `.env` file in this directory and update:

```env
TELEGRAM_BOT_TOKEN=paste-your-bot-token-here
TELEGRAM_CHAT_ID=paste-your-chat-id-here
```

Save the file.

### Step 4: Install Dependencies (2 minutes)

Open PowerShell in this directory and run:

```powershell
npm install
```

Wait for it to finish installing all packages.

### Step 5: Start the System (1 minute)

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

And you'll get a Telegram message: "🚀 BuildPlan AI Team is now online!"

---

## 📱 Using the System via Telegram

### Submit a Request

**Method 1: Send message directly to PM**
```
/request Build a login system with email/password authentication
```

**Method 2: Create file (old way still works)**
Create a file in `requests/pending/REQ-001.md`

### Check Status

```
/status
```

Shows all in-progress tasks and what needs approval.

### Approve Work

```
/approve TASK-XXX
```

When PM Agent completes a task and asks for approval.

### Reject Work

```
/reject TASK-XXX needs more unit tests
```

If you want changes.

### Get Daily Standup

```
/standup
```

See what the team accomplished and what's in progress.

### Get Help

```
/help
```

Lists all available commands.

---

## 🤖 How Communication Works

**You → Telegram → PM Agent → Specialist Agents**

```
You: "/request Build login system"
     ↓
PM Agent: Analyzes request via OpenAI
     ↓
PM Agent: Creates task breakdown
     ↓
PM Agent (Telegram): "I've created these tasks:
                      - DESIGN-001: Login system design
                      - TASK-001-A: Login API  
                      - TASK-001-B: Login UI
                      - QA-001: Test login
                      
                      Approve to begin?"
     ↓
You: "/approve REQ-001"
     ↓
PM Agent: Assigns DESIGN-001 to Technical Architect Agent
     ↓
Tech Architect Agent: Designs solution using OpenAI
     ↓
PM Agent (Telegram): "✅ DESIGN-001 complete. 
                      Design document created.
                      Ready to implement?"
     ↓
You: "/approve DESIGN-001"
     ↓
PM Agent: Assigns backend, frontend, QA tasks
     ↓
Agents execute in parallel
     ↓
PM Agent keeps you updated in Telegram
```

---

## 📊 What PM Agent Does Automatically

### Every Hour
- Checks for new requests in `requests/pending/`
- Checks for tasks ready to assign
- Monitors agent progress
- Resolves blockers

### Daily at 8 AM
- Generates and posts standup report
- Lists completed work
- Lists in-progress work
- Lists work needing approval

### Weekly on Friday 4 PM
- Generates weekly summary
- Reports metrics (velocity, quality)
- Identifies risks

### Real-Time
- Watches for new request files
- Monitors task file changes
- Responds to Telegram commands
- Notifies you of completions
- Escalates blockers

---

## 🎯 First Test

Once running, try this:

**In Telegram, send:**
```
/request Create a simple health check endpoint that returns OK
```

**PM Agent will:**
1. Analyze the request
2. Create tasks
3. Ask for your approval
4. Execute when approved
5. Keep you updated

---

## 🔧 Troubleshooting

### "Cannot find module..."
```powershell
npm install
```

### Telegram bot not responding
1. Check TELEGRAM_BOT_TOKEN is correct in `.env`
2. Make sure bot is started in Telegram
3. Check firewall isn't blocking outbound HTTPS

### PM Agent not detecting files
- Check file paths in `.env` are correct
- Make sure directories exist (requests/pending, tasks/in-progress)

### OpenAI errors
- Your key is already set, should work!
- If issues, check you have credits: https://platform.openai.com/usage

---

## 📂 File Structure

```
buildplan-agents/
├── .env                    ← Your config (Telegram + OpenAI)
├── package.json
├── src/
│   ├── index.js           ← Main orchestrator
│   ├── agents/
│   │   └── pm-agent.js    ← PM Agent logic
│   └── utils/
│       ├── logger.js      ← Logging
│       ├── openai-client.js ← OpenAI wrapper
│       └── file-ops.js    ← File operations
└── logs/                  ← System logs
```

---

## 🎉 You're Ready!

Once you:
1. ✅ Get Telegram bot token
2. ✅ Get chat ID  
3. ✅ Update `.env`
4. ✅ Run `npm install`
5. ✅ Run `npm start`

You'll have a fully functional AI development team responding to your Telegram messages!

---

**Need help?** Check `logs/combined.log` for detailed logs.
