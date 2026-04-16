'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const Anthropic  = require('@anthropic-ai/sdk');
const OpenAI     = require('openai');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── AI Clients ────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Free tier allows 10 replies per hour. Upgrade to remove this limit.',
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  },
});

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(reviewText, businessType, tone, brandVoice = '') {
  const toneInstructions = {
    Professional: 'Write in a professional, polished, and courteous tone. Be formal but warm.',
    Friendly:     'Write in a friendly, conversational, and personable tone. Feel approachable and genuine.',
    Apologetic:   'Write in a sincere, empathetic, and apologetic tone. Acknowledge the issue without being defensive.',
    Enthusiastic: 'Write in an enthusiastic, upbeat, and positive tone. Express excitement and gratitude.',
  };

  const toneGuide = toneInstructions[tone] || toneInstructions['Professional'];
  const brandVoiceNote = brandVoice
    ? `\nBrand personality: "${brandVoice}" — make sure the reply reflects this personality.`
    : '';

  return `You are an expert reputation manager for local businesses. Write excellent responses to customer reviews.

Business type: ${businessType}
Desired reply tone: ${tone}
Tone instructions: ${toneGuide}${brandVoiceNote}

Customer review:
"""
${reviewText}
"""

Write a reply to this review. Guidelines:
- Keep it between 60–120 words (concise but complete)
- Address the reviewer directly
- If negative: acknowledge the issue, apologize, and invite them back or offer to make it right
- If positive: express genuine thanks and encourage them to return
- Sound like a real human wrote this, not a corporate bot
- Do NOT include a subject line, signature, or placeholder text in brackets
- Output only the reply text — nothing else`;
}

// ── Try Claude first, fall back to OpenAI ────────────────────────────────────
async function generateReply(prompt) {
  // Try Claude (Anthropic) first
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      const reply = message.content[0]?.text?.trim();
      if (reply) {
        console.log('✅ Reply generated via Claude');
        return { reply, provider: 'claude' };
      }
    } catch (err) {
      console.warn(`⚠️ Claude failed (${err.status || err.message}) — falling back to OpenAI`);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      const reply = completion.choices[0]?.message?.content?.trim();
      if (reply) {
        console.log('✅ Reply generated via OpenAI (fallback)');
        return { reply, provider: 'openai' };
      }
    } catch (err) {
      console.error(`❌ OpenAI also failed: ${err.message}`);
      throw new Error('Both AI providers failed. Please try again shortly.');
    }
  }

  throw new Error('No AI provider configured. Please check server environment variables.');
}

// ── Detect sentiment from review text ────────────────────────────────────────
function detectSentiment(reviewText) {
  const text = reviewText.toLowerCase();
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'bad', 'disappointed', 'disgusting', 'rude', 'never again', 'waste', 'poor', 'slow', 'cold', 'dirty', 'wrong', 'mistake', 'unacceptable'];
  const positiveWords = ['amazing', 'excellent', 'fantastic', 'great', 'love', 'wonderful', 'best', 'perfect', 'awesome', 'highly recommend', 'outstanding', 'brilliant', 'superb'];

  const negScore = negativeWords.filter(w => text.includes(w)).length;
  const posScore = positiveWords.filter(w => text.includes(w)).length;

  if (negScore > posScore) return 'negative';
  if (posScore > negScore) return 'positive';
  return 'neutral';
}

// ── POST /api/generate ────────────────────────────────────────────────────────
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { reviewText, businessType, tone, brandVoice, count = 1 } = req.body;

  // Validation
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

  const numVariations = Math.min(Math.max(parseInt(count) || 1, 1), 3);

  try {
    const prompt = buildPrompt(reviewText.trim(), businessType, tone, brandVoice || '');
    const sentiment = detectSentiment(reviewText);

    // Generate requested number of variations in parallel
    const results = await Promise.all(
      Array.from({ length: numVariations }, () => generateReply(prompt))
    );

    const replies = results.map(r => r.reply);
    const provider = results[0].provider;

    // Single reply (backwards compatible)
    if (numVariations === 1) {
      return res.json({ reply: replies[0], sentiment, provider });
    }

    // Multiple variations
    return res.json({ replies, reply: replies[0], sentiment, provider });

  } catch (err) {
    console.error('Generation error:', err.message || err);
    return res.status(500).json({ error: err.message || 'Failed to generate reply. Please try again.' });
  }
});

// ── GET /api/sentiment ────────────────────────────────────────────────────────
app.get('/api/sentiment', (req, res) => {
  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'text query param required' });
  return res.json({ sentiment: detectSentiment(text) });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    }
  });
});

// ── Catch-all: serve index.html ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../app/index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Review Reply AI server running on port ${PORT}`);
  console.log(`   Claude: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ not set'}`);
  console.log(`   OpenAI: ${process.env.OPENAI_API_KEY ? '✓ set (fallback ready)' : '✗ not set'}`);
});
