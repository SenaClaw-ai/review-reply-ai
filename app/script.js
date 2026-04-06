/**
 * Review Reply AI — Frontend Logic
 * Handles form submission, API calls, loading states, and clipboard.
 */

const API_URL = '/api/generate';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const form        = document.getElementById('replyForm');
const reviewText  = document.getElementById('reviewText');
const businessType = document.getElementById('businessType');
const toneSelect  = document.getElementById('tone');
const generateBtn = document.getElementById('generateBtn');
const btnText     = generateBtn.querySelector('.btn-text');
const btnLoading  = generateBtn.querySelector('.btn-loading');

const outputEmpty  = document.getElementById('outputEmpty');
const outputResult = document.getElementById('outputResult');
const outputError  = document.getElementById('outputError');
const outputBody   = document.getElementById('outputBody');
const toneBadge    = document.getElementById('toneBadge');
const typeBadge    = document.getElementById('typeBadge');
const copyBtn      = document.getElementById('copyBtn');
const copyBtnText  = document.getElementById('copyBtnText');

const reviewError  = document.getElementById('reviewError');
const typeError    = document.getElementById('typeError');
const toneError    = document.getElementById('toneError');

// ── Validation ────────────────────────────────────────────────────────────────
function validate() {
  let valid = true;

  // Clear previous errors
  reviewError.textContent = '';
  typeError.textContent   = '';
  toneError.textContent   = '';

  if (!reviewText.value.trim()) {
    reviewError.textContent = 'Please paste a review to respond to.';
    reviewText.classList.add('input-error');
    valid = false;
  } else if (reviewText.value.trim().length < 10) {
    reviewError.textContent = 'Review seems too short — paste the full text.';
    valid = false;
  } else {
    reviewText.classList.remove('input-error');
  }

  if (!businessType.value) {
    typeError.textContent = 'Select your business type.';
    valid = false;
  }

  if (!toneSelect.value) {
    toneError.textContent = 'Choose a reply tone.';
    valid = false;
  }

  return valid;
}

// ── UI state helpers ──────────────────────────────────────────────────────────
function setLoading(loading) {
  generateBtn.disabled = loading;
  btnText.classList.toggle('hidden', loading);
  btnLoading.classList.toggle('hidden', !loading);
}

function showEmpty() {
  outputEmpty.classList.remove('hidden');
  outputResult.classList.add('hidden');
  outputError.classList.add('hidden');
}

function showResult(text, tone, type) {
  outputEmpty.classList.add('hidden');
  outputError.classList.add('hidden');
  outputResult.classList.remove('hidden');

  outputBody.textContent = text;
  toneBadge.textContent  = tone;
  typeBadge.textContent  = type;
}

function showError(msg) {
  outputEmpty.classList.add('hidden');
  outputResult.classList.add('hidden');
  outputError.classList.remove('hidden');
  document.getElementById('outputErrorMsg').textContent = msg || 'Something went wrong. Please try again.';
}

// ── API call ──────────────────────────────────────────────────────────────────
async function generateReply(reviewTextVal, businessTypeVal, toneVal) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reviewText: reviewTextVal,
      businessType: businessTypeVal,
      tone: toneVal,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Rate limit reached — please wait a few minutes before trying again.');
    }
    throw new Error(err.error || `Server error (${response.status})`);
  }

  const data = await response.json();
  return data.reply;
}

// ── Form submit ───────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validate()) return;

  const reviewVal = reviewText.value.trim();
  const typeVal   = businessType.value;
  const toneVal   = toneSelect.value;

  setLoading(true);

  try {
    const reply = await generateReply(reviewVal, typeVal, toneVal);
    showResult(reply, toneVal, typeVal);
    // Reset copy button in case they generate again
    copyBtnText.textContent = '📋 Copy';
  } catch (err) {
    console.error('Generation error:', err);
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

// ── Copy to clipboard ─────────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  const text = outputBody.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtnText.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtnText.textContent = '📋 Copy';
    }, 2500);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity  = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copyBtnText.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtnText.textContent = '📋 Copy';
    }, 2500);
  }
});

// ── Live validation (clear errors on input) ───────────────────────────────────
reviewText.addEventListener('input', () => {
  if (reviewText.value.trim().length >= 10) {
    reviewError.textContent = '';
    reviewText.classList.remove('input-error');
  }
});

businessType.addEventListener('change', () => {
  typeError.textContent = '';
});

toneSelect.addEventListener('change', () => {
  toneError.textContent = '';
});
