# 🚀 Webhook Auto-Deployment - Quick Start

**Set up automatic deployment in 10 minutes!**

When you push to GitHub, your VPS automatically pulls and deploys changes.

---

## 📋 What You Need

- Your VPS IP address
- GitHub repository admin access

---

## ⚡ 5-Minute Setup

### 1. Generate Secret (Local Machine)

```pwsh
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Copy the output!** (e.g., `abc123XYZ...`)

---

### 2. Setup VPS

**Connect to VPS via RDP, then:**

```pwsh
# Navigate to project
cd C:\Projects\buildplan

# Pull latest code (includes webhook files)
git pull origin main

# Install webhook dependencies
npm install

# Create .env file
Copy-Item .env.example .env
notepad .env
```

**In Notepad, paste your secret:**

```env
GITHUB_WEBHOOK_SECRET=abc123XYZ...
WEBHOOK_PORT=3001
PROJECT_ROOT=C:\\Projects\\buildplan
```

Save and close.

**Open firewall port:**

```pwsh
New-NetFirewallRule -DisplayName "BuildPlan Webhook" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Start webhook server:**

```pwsh
pm2 start webhook-server.js --name buildplan-webhook
pm2 save
```

---

### 3. Configure GitHub

1. Go to: https://github.com/clayandthepotter/buildplan/settings/hooks
2. Click **Add webhook**
3. Fill in:
   - **Payload URL**: `http://YOUR_VPS_IP:3001/webhook`
   - **Content type**: `application/json`
   - **Secret**: Paste the secret from Step 1
   - **Events**: "Just the push event"
   - ✅ **Active**
4. Click **Add webhook**

---

### 4. Test It!

**On your local machine:**

```bash
# Make a test change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "Test auto-deployment"
git push origin main
```

**On your VPS, watch the logs:**

```pwsh
pm2 logs buildplan-webhook
```

You should see:
- 📨 Webhook received
- 🚀 Deployment started
- ✅ Deployment completed

---

## 🎉 Done!

Now every time you push to `main`:

1. GitHub notifies your VPS
2. VPS pulls latest code
3. VPS installs dependencies (if needed)
4. VPS restarts services
5. **You're deployed!**

---

## 🔍 Verify Setup

```pwsh
# Check both services are running
pm2 list

# Should see:
# buildplan-agents     ✅ online
# buildplan-webhook    ✅ online
```

---

## 🆘 Troubleshooting

**Webhook not triggering?**

Check GitHub: Settings → Webhooks → Recent Deliveries

**Deployment failing?**

```pwsh
pm2 logs buildplan-webhook
```

**Need detailed help?**

See: `docs/WEBHOOK_SETUP.md`

---

## 📝 Useful Commands

```pwsh
# View logs
pm2 logs buildplan-webhook

# Restart webhook
pm2 restart buildplan-webhook

# Stop webhook
pm2 stop buildplan-webhook

# Test manual deploy
curl -X POST http://YOUR_VPS_IP:3001/deploy

# Health check
curl http://YOUR_VPS_IP:3001/health
```

---

**That's it! You now have continuous deployment! 🚀**
