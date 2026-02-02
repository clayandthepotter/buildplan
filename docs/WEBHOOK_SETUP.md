# GitHub Webhook Auto-Deployment Setup

This guide will set up automatic deployment: when you push to GitHub from your local machine, your VPS automatically pulls the changes and restarts the system.

## 🎯 How It Works

```
Your Local Machine → Push to GitHub → GitHub Webhook → VPS Webhook Server → Auto Deploy
```

1. You push code to GitHub
2. GitHub sends webhook to your VPS
3. VPS pulls changes and restarts services
4. You get notified via Telegram

## 📋 Prerequisites

- ✅ BuildPlan repository on GitHub
- ✅ VPS with public IP address
- ✅ Port 3001 accessible (or any port you choose)

## 🚀 Setup Steps

### Step 1: Generate Webhook Secret

On your **local machine**, generate a random secret:

```pwsh
# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Save this secret!** You'll need it in Steps 2 and 4.

### Step 2: Configure VPS

On your **VPS**, create the `.env` file:

```pwsh
# Navigate to project root
cd C:\Projects\buildplan

# Create .env file
Copy-Item .env.example .env

# Edit .env
notepad .env
```

Add your webhook secret:

```env
GITHUB_WEBHOOK_SECRET=your_secret_from_step_1
WEBHOOK_PORT=3001
PROJECT_ROOT=C:\\Projects\\buildplan
```

Save and close.

### Step 3: Install Dependencies

```pwsh
# In C:\Projects\buildplan (root, not buildplan-agents)
npm install
```

### Step 4: Configure GitHub Webhook

1. Go to your GitHub repository: https://github.com/clayandthepotter/buildplan
2. Click **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `http://YOUR_VPS_IP:3001/webhook`
   - **Content type**: `application/json`
   - **Secret**: Paste the secret from Step 1
   - **Which events**: Select "Just the push event"
   - **Active**: ✅ Check this box
4. Click **Add webhook**

### Step 5: Open Firewall Port

On your **VPS**, allow incoming traffic on port 3001:

```pwsh
# Open Windows Firewall port
New-NetFirewallRule -DisplayName "BuildPlan Webhook" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Step 6: Start Webhook Server

```pwsh
# In C:\Projects\buildplan
cd C:\Projects\buildplan

# Start with PM2
pm2 start webhook-server.js --name buildplan-webhook

# View logs
pm2 logs buildplan-webhook

# Save PM2 configuration
pm2 save
```

### Step 7: Test the Webhook

**Test manually first:**

```pwsh
# On your local machine or VPS
curl -X POST http://YOUR_VPS_IP:3001/deploy
```

You should see deployment logs!

**Test GitHub webhook:**

1. Make a small change locally (e.g., edit README.md)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test webhook deployment"
   git push origin main
   ```
3. Watch PM2 logs on VPS:
   ```pwsh
   pm2 logs buildplan-webhook
   ```

You should see:
- 📨 Webhook received
- 🚀 Deployment started
- ✅ Deployment completed

## 📊 Monitoring

### View Webhook Logs

```pwsh
pm2 logs buildplan-webhook
```

### Check Webhook Status

```pwsh
pm2 list
```

### Test Health Check

```pwsh
curl http://YOUR_VPS_IP:3001/health
```

### View Recent GitHub Deliveries

1. GitHub → Settings → Webhooks → Your webhook
2. Click "Recent Deliveries"
3. See request/response for each push

## 🔧 Troubleshooting

### Webhook Not Triggering

**Check GitHub webhook status:**
- Go to GitHub → Settings → Webhooks
- Check "Recent Deliveries"
- Look for red X (failed) or green checkmark (success)

**Common issues:**
- VPS IP incorrect
- Port 3001 blocked by firewall
- Webhook secret mismatch
- PM2 process not running

### Deployment Failing

**Check logs:**
```pwsh
pm2 logs buildplan-webhook
```

**Common issues:**
- Git authentication failing (set up SSH key)
- File permissions
- PM2 not installed or not in PATH

### Port Already in Use

If port 3001 is taken, change it:

1. Edit `.env`: `WEBHOOK_PORT=3002`
2. Update GitHub webhook URL
3. Update firewall rule
4. Restart: `pm2 restart buildplan-webhook`

## 🎛️ Configuration Options

### Change Webhook Port

Edit `.env`:
```env
WEBHOOK_PORT=8080
```

Update GitHub webhook URL and restart.

### Change Project Path

Edit `.env`:
```env
PROJECT_ROOT=C:\\Different\\Path\\buildplan
```

Restart webhook server.

## 🔐 Security Notes

- ✅ **Webhook secret**: Always use a strong random secret
- ✅ **HTTPS**: Consider using a reverse proxy (nginx) with SSL
- ✅ **Firewall**: Only open necessary ports
- ✅ **Signature verification**: The server verifies GitHub's signature

## 🔄 What Gets Auto-Deployed

When you push to `main`, the webhook server:

1. ✅ Pulls latest code
2. ✅ Installs dependencies (if package.json changed)
3. ✅ Restarts PM2 services
4. ✅ Logs everything

**Files that trigger npm install:**
- `package.json`
- `package-lock.json`

## 📝 Endpoints

### POST /webhook
GitHub sends push events here.

### POST /deploy
Manual deployment trigger (for testing).

```bash
curl -X POST http://YOUR_VPS_IP:3001/deploy
```

### GET /health
Health check endpoint.

```bash
curl http://YOUR_VPS_IP:3001/health
```

## 🎉 Complete Setup

Once everything is running:

```pwsh
pm2 list
```

You should see:
- ✅ `buildplan-agents` (your AI team)
- ✅ `buildplan-webhook` (auto-deployment)

Now when you push from your local machine:
1. GitHub receives your push
2. GitHub sends webhook to VPS
3. VPS deploys automatically
4. Your AI team restarts with new code

**No manual deployment needed!** 🚀

## 🔗 Related Documentation

- `VPS_DEPLOYMENT_GUIDE.md` - Initial VPS setup
- `AI_TEAM_SETUP_COMPLETE.md` - AI agent system
- `AI_TEAM_PROTOCOL.md` - How the PM agent works

## 💡 Tips

1. **Test locally first**: Use the `/deploy` endpoint to test before setting up GitHub
2. **Monitor logs**: Keep `pm2 logs` running during first deploy
3. **Use SSH**: Set up SSH key for GitHub to avoid password prompts
4. **Telegram notifications**: The PM agent will notify you of deployments
