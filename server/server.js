'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const Anthropic  = require('@anthropic-ai/sdk');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Anthropic client ──────────────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '16kb' }));

// Serve the frontend from /app
app.use(express.static(path.join(__dirname, '../app')));

// ── Rate limiting: 10 requests per hour per IP (free tier) ───────────────────
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Free tier allows 10 replies per hour. Upgrade to remove this limit.',
  },
  keyGenerator: (req) => {
    // Support proxies / Railway / Render
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  },
});

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(reviewText, businessType, tone) {
  const toneInstructions = {
    Professional: 'Write in a professional, polished, and courteous tone. Be formal but warm. Represent the business as a credible, customer-focused establishment.',
    Friendly:     'Write in a friendly, conversational, and personable tone. Feel approachable and genuine — like talking to a real person who cares.',
    Apologetic:   'Write in a sincere, empathetic, and apologetic tone. Acknowledge the customer\'s experience without being defensive. Show genuine remorse for any shortcomings.',
    Enthusiastic: 'Write in an enthusiastic, upbeat, and positive tone. Express excitement and gratitude. Make the customer feel appreciated and valued.',
  };

  const toneGuide = toneInstructions[tone] || toneInstructions['Professional'];

  return `You are an expert reputation manager for local businesses. Your job is to write excellent responses to customer reviews.

Business type: ${businessType}
Desired reply tone: ${tone}

Tone instructions: ${toneGuide}

Customer review:
"""
${reviewText}
"""

Write a reply to this review. Guidelines:
- Keep it between 60–120 words (concise but complete)
- Address the reviewer directly (e.g., "Thank you for your feedback...")
- If the review is negative: acknowledge the issue, apologize, and invite them back or offer to make it right
- If the review is positive: express genuine thanks and encourage them to return
- Do NOT be sycophantic or use hollow phrases like "We value your feedback as a cornerstone of our operation"
- Sound like a real human wrote this, not a corporate bot
- Do NOT include a subject line, signature, or placeholder text in brackets
- Output only the reply text — nothing else`;
}

// ── POST /api/generate ────────────────────────────────────────────────────────
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { reviewText, businessType, tone } = req.body;

  // Input validation
  if (!reviewText || typeof reviewText !== 'string' || reviewText.trim().length < 10) {
    return res.status(400).json({ error: 'reviewText must be at least 10 characters.' });
  }

  if (!businessType || typeof businessType !== 'string') {
    return res.status(400).json({ error: 'businessType is required.' });
  }

  const validTones = ['Professional', 'Friendly', 'Apologetic', 'Enthusiastic'];
  if (!tone || !validTones.includes(tone)) {
    return res.status(400).json({ error: `tone must be one of: ${validTones.join(', ')}` });
  }

  if (reviewText.trim().length > 3000) {
    return res.status(400).json({ error: 'reviewText must be under 3000 characters.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error. API key not set.' });
  }

  try {
    const prompt = buildPrompt(reviewText.trim(), businessType, tone);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 300,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const reply = message.content[0]?.text?.trim();

    if (!reply) {
      return res.status(500).json({ error: 'No reply generated. Please try again.' });
    }

    return res.json({ reply });

  } catch (err) {
    console.error('Anthropic API error:', err.message || err);

    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid API key. Please check server configuration.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'AI service rate limit reached. Please try again shortly.' });
    }

    return res.status(500).json({ error: 'Failed to generate reply. Please try again.' });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Catch-all: serve index.html for SPA routing ───────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../app/index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Review Reply AI server running on port ${PORT}`);
  console.log(`   API key: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ NOT SET — app will not work'}`);
});
