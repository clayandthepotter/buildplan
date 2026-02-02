# BuildPlan AI Agent Orchestrator

**Telegram-first AI development team that builds software for you.**

---

## ✅ What's Already Configured

- ✅ OpenAI API key (configured)
- ✅ Project paths (configured)
- ✅ PM Agent system prompt (loaded from docs/)
- ✅ File watchers (requests & tasks)
- ✅ Daily standups (8 AM)
- ✅ Weekly reports (Friday 4 PM)

## 🚀 Quick Start (5 Steps)

### 1. Create Telegram Bot
- Open Telegram → search **@BotFather**
- Send `/newbot`
- Name: **BuildPlan PM Bot**
- Copy the token

### 2. Get Chat ID
- Search **@userinfobot** → get your chat ID
- OR create group → add bot → get group ID from `/getUpdates`

### 3. Update .env
```env
TELEGRAM_BOT_TOKEN=your-token-here
TELEGRAM_CHAT_ID=your-chat-id-here
```

### 4. Install & Run
```powershell
npm install
npm start
```

### 5. Test in Telegram
```
/help
/request Build a simple health check API endpoint
```

---

## 📱 Telegram Commands

### Submit Requests
```
/request Build a login system with email/password authentication
```
PM Agent will:
1. Create request file
2. Analyze with OpenAI
3. Create task breakdown
4. Ask for your approval

### Check Status
```
/status
```
Shows all in-progress tasks and what needs approval.

### Daily Standup
```
/standup
```
See team progress, completed work, blockers.

### Approve Work
```
/approve REQ-001
/approve TASK-045
```

### Reject Work
```
/reject TASK-045 needs more unit tests
```

### Get Help
```
/help
```

---

## 🤖 How It Works

**You communicate ONLY with PM Agent via Telegram**:

```
You → Telegram → PM Agent
                    ↓
            PM analyzes with OpenAI
                    ↓
            Creates task breakdown
                    ↓
            Asks for approval
                    ↓
            Assigns to specialist agents
                    ↓
            Agents execute (future)
                    ↓
            Updates you via Telegram
```

---

## 📂 File Structure

```
buildplan-agents/
├── .env                    ← Config (you need to add Telegram details)
├── package.json
├── QUICK_START.md          ← Detailed setup guide
├── src/
│   ├── index.js           ← Main orchestrator
│   ├── agents/
│   │   └── pm-agent.js    ← PM Agent (talks to you via Telegram)
│   └── utils/
│       ├── logger.js      ← Logging
│       ├── openai-client.js ← OpenAI wrapper
│       └── file-ops.js    ← File operations
└── logs/                  ← All logs here
```

---

## 🎯 What PM Agent Does

### Automatically
- **Every hour**: Checks for new requests in `requests/pending/`
- **Daily 8 AM**: Posts standup report to Telegram
- **Weekly Friday**: Posts weekly summary
- **Real-time**: Watches for file changes

### When You Command
- `/request` → Analyzes and creates task breakdown
- `/status` → Shows current progress
- `/approve` → Moves work forward
- `/reject` → Sends back for revision
- `/standup` → Generates report

---

## 🔧 Configuration

### Environment Variables (.env)

**Required**:
- `OPENAI_API_KEY` - ✅ Already set
- `TELEGRAM_BOT_TOKEN` - ⚠️ You need to add
- `TELEGRAM_CHAT_ID` - ⚠️ You need to add

**Optional** (already configured):
- `PROJECT_ROOT` - Path to buildplan repo
- `REQUESTS_DIR` - Where requests are stored
- `TASKS_DIR` - Where tasks are stored
- `PM_AGENT_INTERVAL` - How often PM checks (default: 1 hour)
- `STANDUP_CRON` - When to run standup (default: 8 AM)

---

## 📊 Monitoring

### View Logs
```powershell
# Real-time logs
Get-Content logs\combined.log -Wait -Tail 50

# Error logs only
Get-Content logs\error.log -Wait -Tail 20
```

### Check Process
```powershell
# If using PM2
pm2 status
pm2 logs buildplan-agents

# Check if running
Get-Process node
```

---

## 🚨 Troubleshooting

### Bot Not Responding
1. Check `TELEGRAM_BOT_TOKEN` in `.env`
2. Make sure bot is added to your chat/group
3. Check logs: `logs\combined.log`

### OpenAI Errors
- Should work - key is configured!
- Check usage: https://platform.openai.com/usage
- Check logs for specific error messages

### File Watcher Not Detecting
- Check paths in `.env` are correct
- Make sure directories exist
- Restart the service: `npm start`

### Cannot Find Module
```powershell
npm install
```

---

## 🎉 Example Workflow

**In Telegram**:
```
You: /request Build a simple /health endpoint that returns OK

PM Agent: 📥 New request detected! Analyzing...

PM Agent: 📋 Request Analysis Complete

Task Breakdown:
- DESIGN-001: API endpoint design (1 hour)
- TASK-001: Implement /health endpoint (30 min)
- QA-001: Test endpoint (15 min)

Total estimate: 2 hours

Reply with /approve REQ-1707845678 to proceed

You: /approve REQ-1707845678

PM Agent: ✅ Request approved! Creating tasks...
PM Agent: 🎯 Tasks created. Team will begin work shortly.
```

---

## 📈 Next Steps

1. **Get Telegram working** (see QUICK_START.md)
2. **Test with simple request**
3. **Add specialist agents** (future enhancement)
4. **Deploy to Windows Server VPS** (optional)

---

## 🔗 Links

- OpenAI Platform: https://platform.openai.com
- Telegram Bots: https://core.telegram.org/bots
- Project Docs: `../docs/`

---

**Status**: ✅ PM Agent ready  
**Next**: Add Telegram credentials and `npm start`!
