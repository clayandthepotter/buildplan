# Setup Your AI Team RIGHT NOW (10 Minutes)

Your OpenAI API key is already configured! Just need Telegram.

---

## ⚡ Quick Setup (Follow These Steps)

### Step 1: Get Telegram Bot Token (2 min)

1. Open Telegram (phone or computer)
2. Search: **@BotFather**
3. Send: `/start`
4. Send: `/newbot`
5. Bot name: `BuildPlan PM Bot`
6. Bot username: `buildplan_pm_bot` (or any available name)
7. **Copy the token** (looks like: `123456789:ABCdefGHIjkl...`)

### Step 2: Get Your Chat ID (2 min)

**Easy Method - Use Your Personal Chat:**
1. Search in Telegram: **@userinfobot**
2. Send `/start`
3. Bot will reply with your ID (a number like: `123456789`)
4. **Copy this number**

**OR Group Method:**
1. Create new Telegram group: "BuildPlan Dev Team"
2. Add your bot to the group (search for your bot name)
3. Send any message in the group
4. Open browser, visit:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
5. Find `"chat":{"id":-1001234567890}` in the JSON
6. **Copy that ID number** (including the minus sign if present)

### Step 3: Update .env File (1 min)

Open: `buildplan-agents\.env`

Replace these lines:
```
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-chat-id
```

With your actual values:
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjkl...
TELEGRAM_CHAT_ID=123456789
```

**Save the file**

### Step 4: Install Dependencies (3 min)

Open PowerShell in the `buildplan-agents` folder:

```powershell
cd C:\Users\hello\OneDrive\Documents\GitHub\buildplan\buildplan-agents
npm install
```

Wait for it to finish (installs OpenAI, Telegram bot, etc.)

### Step 5: Start the System (1 min)

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

**AND in Telegram you'll get:**
```
🚀 BuildPlan AI Team is now online!

Send /help for available commands.
```

---

## ✅ TEST IT NOW

In Telegram, send:

```
/help
```

You should get a list of commands.

Then try:
```
/request Create a simple hello world API endpoint
```

PM Agent will:
1. Acknowledge your request
2. Analyze it with OpenAI
3. Create a task breakdown
4. Ask for your approval

---

## 🎯 You're Done!

**Your AI team is now running and responding to Telegram commands!**

### What You Can Do Now:

**Submit requests:**
```
/request Build a user authentication system
/request Add a dashboard page showing stats
/request Create API documentation
```

**Check progress:**
```
/status
/standup
```

**Approve work:**
```
/approve REQ-123
```

---

## 🚀 Deploy to Windows Server VPS (Optional)

Want it running 24/7? Just:

1. RDP to your Windows Server
2. Clone this repo
3. Copy `.env` file
4. Run `npm install` and `npm start`
5. Use PM2 to keep it running:
   ```powershell
   npm install -g pm2
   pm2 start src\index.js --name buildplan-agents
   pm2 save
   pm2 startup
   ```

Done! Now it runs 24/7 even when you log out.

---

## 📱 Telegram Commands Reference

| Command | What It Does |
|---------|-------------|
| `/request [text]` | Submit new project request |
| `/status` | Show current tasks |
| `/standup` | Show daily progress report |
| `/approve TASK-ID` | Approve completed work |
| `/reject TASK-ID reason` | Request changes |
| `/help` | Show all commands |

---

## 🎉 Success!

You now have an AI development team that:
- ✅ Responds to your Telegram messages
- ✅ Analyzes requests with OpenAI
- ✅ Creates task breakdowns
- ✅ Reports progress daily
- ✅ Keeps you informed in real-time

**All through Telegram!** 🚀

---

**Questions?** Check:
- `README.md` - Full documentation
- `QUICK_START.md` - Detailed guide
- `logs/combined.log` - System logs
