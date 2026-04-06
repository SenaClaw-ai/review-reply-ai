# 💬 Review Reply AI

> Generate professional, personalized responses to Google and Yelp reviews in seconds using AI.

**Tech stack:** Node.js · Express · Anthropic Claude · Vanilla HTML/CSS/JS

---

## What it does

Local business owners (restaurants, salons, gyms, retail) paste a customer review, choose a reply tone, and get a professional AI-generated response they can post immediately. No templates. No copy-paste robots. Just good replies, fast.

---

## Project Structure

```
review-reply-ai/
├── app/                  # Frontend SPA
│   ├── index.html
│   ├── style.css
│   └── script.js
├── landing/              # Marketing landing page
│   └── index.html
├── server/               # Node.js backend
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── marketing/
│   └── launch-plan.md
├── README.md
└── DEPLOY.md
```

---

## Quick Start

### 1. Clone / download the project

```bash
cd /path/to/your/projects
# already downloaded? just cd into it:
cd review-reply-ai
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3000
```

Get your Anthropic API key at: https://console.anthropic.com

### 4. Run the server

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

### 5. Open the app

Visit: **http://localhost:3000**

The Express server serves the `app/` folder as static files, so both the frontend and API run on the same port.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic Claude API key |
| `PORT` | No (default: 3000) | Port for the server |
| `STRIPE_KEY` | No | Stripe secret key (for subscriptions) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook secret |
| `ALLOWED_ORIGIN` | No (default: *) | CORS origin for production |

---

## API Reference

### `POST /api/generate`

Generate a reply for a given review.

**Request body:**
```json
{
  "reviewText": "The food was cold and the waiter was rude.",
  "businessType": "Restaurant",
  "tone": "Apologetic"
}
```

**Response:**
```json
{
  "reply": "Thank you for sharing this — I'm truly sorry to hear about your experience..."
}
```

**Supported tones:** `Professional` · `Friendly` · `Apologetic` · `Enthusiastic`

**Supported business types:** `Restaurant` · `Salon` · `Gym` · `Retail` · `Service Business` · `Other`

**Rate limit:** 10 requests per hour per IP (free tier). Returns HTTP 429 if exceeded.

---

### `GET /api/health`

Returns server status.

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Landing Page

The `landing/` folder contains a standalone marketing page. Deploy it separately (e.g., on Vercel or Netlify) or serve it from the same Express app.

To serve the landing page from Express, add this to `server.js`:

```js
app.use('/landing', express.static(path.join(__dirname, '../landing')));
```

---

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step deployment instructions for:
- Railway (recommended, free tier)
- Render (free tier)
- Custom domain setup

---

## Local Development Tips

- Use `npm run dev` (nodemon) during development — it auto-restarts when you change server files.
- Frontend changes (HTML/CSS/JS in `app/`) take effect immediately on refresh.
- Check the browser console and server terminal for errors.
- The rate limiter uses in-memory storage — it resets when you restart the server.

---

## Costs

- **Anthropic API:** ~$0.003–0.005 per reply (Claude Sonnet). At 1,000 replies/month → ~$3–5 in API costs.
- **Hosting:** Free tier on Railway/Render.
- **Revenue:** $19/month per user. Very healthy margins.

---

## License

MIT — do whatever you want with this.
