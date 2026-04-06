# 🚀 Deployment Guide — Review Reply AI

This guide covers deploying to **Railway** (recommended) and **Render**.

---

## Option A: Railway (Recommended)

Railway offers a free tier and is the fastest way to deploy a Node.js app. No Docker knowledge required.

### Prerequisites

- A Railway account: https://railway.app (sign up with GitHub)
- Your project pushed to a GitHub repository

### Step 1: Push to GitHub

```bash
cd review-reply-ai

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/review-reply-ai.git
git branch -M main
git push -u origin main
```

### Step 2: Create a Railway project

1. Go to https://railway.app and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `review-reply-ai` repository
5. Railway will detect it's a Node.js project automatically

### Step 3: Configure the root directory

Since the `package.json` is in the `server/` subfolder:

1. In your Railway project, click on the service
2. Go to **Settings → Build**
3. Set **Root Directory** to: `server`
4. Set **Start Command** to: `node server.js`

### Step 4: Set environment variables

1. In your Railway project, go to **Variables**
2. Add the following:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-your-key-here` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGIN` | `https://yourdomain.com` |

Railway automatically sets `PORT` — don't override it.

### Step 5: Deploy

Railway will automatically deploy on every push to `main`. To trigger a manual deploy:

1. Go to your project on Railway
2. Click **"Deploy"** or push a commit

### Step 6: View your app

1. In Railway, click on your service
2. Go to **Settings → Networking**
3. Click **"Generate Domain"** — Railway gives you a free `*.railway.app` subdomain
4. Your app is live at: `https://your-app.railway.app`

---

## Connecting a Custom Domain (Railway)

1. In Railway, go to your service → **Settings → Networking**
2. Click **"Custom Domain"**
3. Enter your domain: `reviewreplyai.com` (or whatever you own)
4. Railway will show you a **CNAME record** to add to your DNS

### DNS setup (example with Namecheap / Cloudflare):

Add a **CNAME record**:
- **Host:** `@` (or `www`)
- **Value:** `your-app.up.railway.app`
- **TTL:** Auto

For root domain (`@`), some registrars require an **A record** instead. Use the IP Railway provides.

SSL/HTTPS is automatic — Railway handles it via Let's Encrypt.

---

## Option B: Render

### Step 1: Create account and new Web Service

1. Go to https://render.com and sign up
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repo

### Step 2: Configure

| Setting | Value |
|---------|-------|
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

### Step 3: Environment variables

In Render, go to **Environment** and add:

```
ANTHROPIC_API_KEY = sk-ant-your-key-here
NODE_ENV = production
```

### Step 4: Deploy

Click **"Create Web Service"**. Render will build and deploy automatically.

**Note:** On Render's free tier, the service spins down after 15 minutes of inactivity and takes ~30 seconds to cold-start. For production use, upgrade to the $7/month plan.

---

## Deploying the Landing Page Separately

For best performance, deploy `landing/index.html` as a static site:

### Netlify (free):

```bash
# Install Netlify CLI
npm install -g netlify-cli

cd landing/
netlify deploy --prod --dir .
```

Or drag-and-drop the `landing/` folder at https://app.netlify.com

### Vercel (free):

```bash
npm install -g vercel
cd landing/
vercel --prod
```

Point your marketing domain (e.g., `reviewreplyai.com`) to the landing page, and your app subdomain (e.g., `app.reviewreplyai.com`) to the Railway deployment.

---

## Production Checklist

Before going live:

- [ ] `ANTHROPIC_API_KEY` is set correctly
- [ ] `ALLOWED_ORIGIN` is set to your actual domain (not `*`)
- [ ] Custom domain is connected and HTTPS works
- [ ] Test the `/api/health` endpoint: `curl https://yourdomain.com/api/health`
- [ ] Test generating a reply end-to-end
- [ ] Stripe integration is configured (replace placeholder links)
- [ ] Landing page CTA buttons point to your Stripe payment link
- [ ] Rate limit is tuned appropriately for your expected traffic

---

## Monitoring

Railway and Render both provide basic logs in their dashboards. For production monitoring, consider adding:

- **Sentry** (free tier) for error tracking
- **Uptime monitoring** via UptimeRobot (free)

To view Railway logs:
```bash
# Install Railway CLI
npm install -g @railway/cli
railway logs
```

---

## Updating Your Deployment

Any push to `main` on GitHub triggers an automatic redeploy on Railway/Render.

```bash
git add .
git commit -m "Update reply prompt"
git push
```

That's it.
