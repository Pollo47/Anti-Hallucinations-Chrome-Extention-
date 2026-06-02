// Anti Hallucinations v11.2 - FIXED
// 1. Key system completely rewritten - 100% reliable
// 2. Prompt rewritten to correctly evaluate negated statements
// License: $9 lifetime unlimited local verifications
// Free: 10 verifications every 3 hours

const OLLAMA = 'http://localhost:11434';
const STORAGE = 'anti-hallucinations-v11';
const FREE_LIMIT = 10;
const FREE_WINDOW_MS = 3 * 60 * 60 * 1000;

const PAID_MODELS = new Set([
  'gpt-4', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o-mini',
  'text-davinci', 'text-curie', 'text-babbage', 'text-ada',
  'claude', 'claude-3', 'claude-3-5', 'claude-3-opus', 'claude-3-sonnet',
  'claude-3-haiku', 'claude-instant',
  'gemini', 'gemini-pro', 'gemini-ultra', 'gemini-1.5', 'gemini-1.5-pro',
  'gemini-1.5-flash',
  'mistral-large', 'mistral-medium', 'mistral-small',
  'codestral', 'mixtral-8x22b',
  'command', 'command-r', 'command-r-plus', 'command-light',
  'j2-ultra', 'j2-mid', 'j2-light', 'jamba',
  'palm', 'bison', 'chat-bison',
  'nova', 'titan', 'jurassic',
  'dbrx', 'solar', 'qwen-72b', 'qwen-110b',
  'yi-34b', 'yi-200k',
  'amazon', 'azure', 'bedrock', 'sagemaker',
  'vertex', 'palm-2',
]);

const LOCAL_FREE_PATTERNS = [
  'llama2', 'llama3', 'llama-2', 'llama-3',
  'llama2:7b', 'llama2:13b', 'llama2:70b',
  'llama3:8b', 'llama3:70b', 'llama3.1', 'llama3.2',
  'gemma', 'gemma:2b', 'gemma:4b', 'gemma:7b',
  'gemma2', 'gemma2:2b', 'gemma2:9b', 'gemma2:27b',
  'mistral', 'mistral:7b', 'mistral-nemo', 'mistral-nemo:12b',
  'mixtral', 'mixtral:8x7b', 'mixtral:8x22b',
  'phi', 'phi2', 'phi3', 'phi3:3.8b', 'phi3:14b', 'phi3.5',
  'qwen', 'qwen2', 'qwen2:0.5b', 'qwen2:1.5b', 'qwen2:7b',
  'qwen2.5', 'qwen2.5:0.5b', 'qwen2.5:1.5b', 'qwen2.5:7b', 'qwen2.5:14b',
  'yi', 'yi:6b', 'yi:9b', 'yi:34b',
  'codellama', 'codellama:7b', 'codellama:13b', 'codellama:34b',
  'codegemma', 'codegemma:2b', 'codegemma:7b',
  'starcoder2', 'starcoder2:3b', 'starcoder2:7b', 'starcoder2:15b',
  'tinyllama', 'tinyllama:1.1b',
  'orca-mini', 'orca-mini:3b', 'orca-mini:7b', 'orca-mini:13b',
  'vicuna', 'vicuna:7b', 'vicuna:13b', 'vicuna:33b',
  'stablelm', 'stablelm-zephyr', 'stablelm-zephyr:3b',
  'neural-chat', 'neural-chat:7b',
  'openchat', 'openchat:3.5', 'openchat:3.6',
  'dolphin-mixtral', 'dolphin-mistral', 'dolphin-llama3',
  'nous-hermes', 'nous-hermes2', 'nous-hermes2-mixtral',
  'solar', 'solar:10.7b',
  'deepseek-coder', 'deepseek-coder:1.3b', 'deepseek-coder:6.7b', 'deepseek-coder:33b',
  'deepseek-llm', 'deepseek-llm:7b', 'deepseek-llm:67b',
  'falcon', 'falcon:7b', 'falcon:40b', 'falcon2',
  'granite-code', 'granite-code:3b', 'granite-code:8b', 'granite-code:20b',
  'wizardlm', 'wizardlm:7b', 'wizardlm:13b', 'wizardlm:30b',
  'wizard-math', 'wizard-math:7b', 'wizard-math:13b', 'wizard-math:70b',
  'everythinglm', 'everythinglm:13b',
  'alfred', 'alfred:40b',
  'moondream', 'moondream:1.6b',
  'llava', 'llava:7b', 'llava:13b', 'llava:34b', 'llava-phi3',
  'bakllava', 'bakllava:7b',
  'llava-llama3', 'llava-llama3:8b',
  'glm4', 'glm-4', 'glm4:9b',
];

let state = {
  online: false,
  loading: false,
  premium: false,
  models: [],
  model: '',
  used: 0,
  lastReset: 0,
  theme: 'dark'
};

const d = {};

function $(id) { return document.getElementById(id); }

function cache() {
  d.statusDot = $('statusDot');
  d.statusText = $('statusText');
  d.setupPanel = $('setupPanel');
  d.mainPanel = $('mainPanel');
  d.errorBox = $('errorBox');
  d.codeBlock = $('codeBlock');
  d.modelSelect = $('modelSelect');
  d.textInput = $('textInput');
  d.resultArea = $('resultArea');
  d.badge = $('badge');
  d.footerRight = $('footerRight');
  d.verifyBtn = $('verifyBtn');
  d.upgradeBanner = $('upgradeBanner');
  d.upgradeModal = $('upgradeModal');
  d.keyInput = $('keyInput');
}

// ========== MODEL FILTERING ==========

function isLocalFreeModel(name) {
  const lower = name.toLowerCase();
  for (const paid of PAID_MODELS) {
    if (lower.includes(paid.toLowerCase())) return false;
  }
  for (const pattern of LOCAL_FREE_PATTERNS) {
    if (lower.includes(pattern.toLowerCase())) return true;
  }
  if (/:\d+(\.\d+)?[bkm]?$/.test(lower) || lower.includes(':latest')) return true;
  if (lower.includes('api') || lower.includes('cloud') || lower.includes('pro') ||
      lower.includes('ultra') || lower.includes('enterprise') ||
      lower.includes('azure') || lower.includes('aws') || lower.includes('gcp')) return false;
  return true;
}

// ========== STORAGE ==========

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    state.premium = s.premium || false;
    state.theme = s.theme || 'dark';
    state.used = s.used || 0;
    state.lastReset = s.lastReset || 0;
    state.model = s.model || '';
    
    const now = Date.now();
    if (now - state.lastReset > FREE_WINDOW_MS) {
      state.used = 0;
      state.lastReset = now;
      save();
    }
  } catch(e) {}
}

function save() {
  localStorage.setItem(STORAGE, JSON.stringify({
    premium: state.premium,
    theme: state.theme,
    used: state.used,
    lastReset: state.lastReset,
    model: state.model
  }));
}

// ========== THEME ==========

function applyTheme() {
  document.body.className = state.theme;
  const icon = $('themeBtn').querySelector('svg');
  if (state.theme === 'dark') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  save();
}

// ========== CONNECTION ==========

async function check() {
  setStatus('checking', 'Checking Ollama...');
  hideError();

  try {
    const res = await fetch(OLLAMA + '/api/tags', {
      signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    const allModels = (data.models || []).map(m => m.name).filter(Boolean);
    const localModels = allModels.filter(isLocalFreeModel);
    const filteredCount = allModels.length - localModels.length;

    if (localModels.length === 0) {
      if (allModels.length > 0) {
        throw new Error(`Found ${allModels.length} models but all appear to be paid/API. Install a local model like llama3 or gemma2.`);
      }
      throw new Error('No models installed');
    }

    state.online = true;
    state.models = localModels;
    setStatus('online', `${localModels.length} local model(s) ready${filteredCount > 0 ? ` (${filteredCount} hidden)` : ''}`);
    populateModels();
    showMain();
    console.log('Connected:', localModels);

  } catch (err) {
    console.error('Connection failed:', err.message);
    state.online = false;
    state.models = [];
    setStatus('offline', 'Ollama Offline');
    showSetup();
    showError(getCorsHelp(err));
  }

  updateUI();
}

function getCorsHelp(err) {
  if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('CORS')) {
    return 'CORS blocked. Run the command above and click Connect.';
  }
  if (err.message.includes('HTTP 403')) {
    return 'Ollama rejected the request (403). Set OLLAMA_ORIGINS=* and restart.';
  }
  return err.message;
}

function setStatus(type, text) {
  d.statusDot.className = 'status-dot ' + type;
  d.statusText.textContent = text;
}

function populateModels() {
  d.modelSelect.innerHTML = state.models
    .map(m => `<option value="${m}" ${m === state.model ? 'selected' : ''}>${m}</option>`)
    .join('');

  if (!state.model || !state.models.includes(state.model)) {
    state.model = state.models[0];
    d.modelSelect.value = state.model;
  }
}

function showSetup() {
  d.setupPanel.style.display = 'block';
  d.mainPanel.style.display = 'none';
  d.mainPanel.classList.remove('visible');
}

function showMain() {
  d.setupPanel.style.display = 'none';
  d.mainPanel.style.display = 'block';
  d.mainPanel.classList.add('visible');
}

function showError(msg) {
  d.errorBox.textContent = msg;
  d.errorBox.classList.add('visible');
}

function hideError() {
  d.errorBox.classList.remove('visible');
}

// ========== LICENSE KEY SYSTEM (VALIDATION ONLY) ==========

function validateKey(key) {
  // Clean: remove all non-alphanumeric, uppercase
  let clean = '';
  for (let i = 0; i < key.length; i++) {
    const c = key[i].toUpperCase();
    if (/[A-Z0-9]/.test(c)) clean += c;
  }
  
  if (clean.length !== 16) {
    return { valid: false, reason: 'Key must be 16 characters (format: XXXX-XXXX-XXXX-XXXX)' };
  }
  
  if (clean[0] !== 'L') {
    return { valid: false, reason: 'Not a lifetime key (must start with L)' };
  }
  
  const base = clean.substring(0, 12);
  const checksum = clean.substring(12, 16);
  
  // Generate checksum for validation
  let total = 0;
  for (let i = 0; i < base.length; i++) {
    total += (base.charCodeAt(i) * (i + 1) * 7) % 9973;
  }
  const expected = String(total % 10000).padStart(4, '0').substring(0, 4);
  
  if (checksum !== expected) {
    return { valid: false, reason: 'Invalid checksum' };
  }
  
  return { valid: true };
}

function updatePremium() {
  d.badge.textContent = state.premium ? 'UNLIMITED' : 'FREE';
  d.badge.className = 'badge' + (state.premium ? ' premium' : '');
  
  if (state.premium) {
    d.upgradeBanner.style.display = 'none';
  } else {
    d.upgradeBanner.style.display = 'flex';
  }
}

function openUpgrade() { d.upgradeModal.classList.add('active'); d.keyInput.focus(); }
function closeUpgrade() { d.upgradeModal.classList.remove('active'); d.keyInput.value = ''; }

function activate() {
  const key = (d.keyInput.value || '').trim();
  if (!key) { 
    result('ERROR', 0, 'Enter a license key'); 
    return; 
  }
  
  const validation = validateKey(key);
  
  if (validation.valid) {
    state.premium = true;
    state.used = 0;
    save();
    updatePremium();
    closeUpgrade();
    result('TRUE', 100, 'License activated! Unlimited local verifications forever.');
    updateUI();
  } else {
    result('FALSE', 0, 'Invalid key: ' + validation.reason);
  }
}

// ========== VERIFY ==========

function getRemaining() {
  return Math.max(0, FREE_LIMIT - state.used);
}

function getTimeUntilReset() {
  const now = Date.now();
  const elapsed = now - state.lastReset;
  const remaining = FREE_WINDOW_MS - elapsed;
  if (remaining <= 0) return '0m';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function canVerify() {
  if (state.premium) return true;
  
  const now = Date.now();
  if (now - state.lastReset > FREE_WINDOW_MS) {
    state.used = 0;
    state.lastReset = now;
    save();
    return true;
  }
  
  if (state.used >= FREE_LIMIT) {
    const waitTime = getTimeUntilReset();
    result('ERROR', 0, `Free limit reached. ${waitTime} until next 10 verifications. Upgrade to $9 lifetime for unlimited access.`);
    return false;
  }
  return true;
}

function parseRaw(raw) {
  let t = (raw || '').trim();
  
  // Try to find JSON object
  const m = t.match(/\{[\s\S]*?\}/);
  if (m) t = m[0];
  
  try {
    const p = JSON.parse(t);
    const v = String(p.verdict || '').toUpperCase().trim();
    const c = Math.min(100, Math.max(0, parseInt(p.confidence) || 50));
    const r = String(p.reasoning || 'No explanation').trim();
    if (['TRUE','FALSE','UNKNOWN'].includes(v)) return { verdict: v, confidence: c, reasoning: r };
  } catch(e) {}
  
  // Fallback parsing
  const u = t.toUpperCase();
  if (u.includes('TRUE') && !u.includes('FALSE')) return { verdict: 'TRUE', confidence: 70, reasoning: 'Detected TRUE (fallback)' };
  if (u.includes('FALSE') && !u.includes('TRUE')) return { verdict: 'FALSE', confidence: 30, reasoning: 'Detected FALSE (fallback)' };
  return { verdict: 'UNKNOWN', confidence: 50, reasoning: 'Unclear response' };
}

// ========== FIXED PROMPT V2 ==========
// Explicitly evaluates the STATEMENT, not the underlying facts
async function verifyOne(text, model) {
  const prompt = `You are a strict fact-checking engine. Your job is to evaluate whether a STATEMENT is factually correct.

TASK: Determine if the following STATEMENT is TRUE or FALSE.

STATEMENT: "${text.trim().substring(0, 800)}"

IMPORTANT RULES:
- TRUE means the STATEMENT itself is factually correct
- FALSE means the STATEMENT contains factual errors or is misleading
- Evaluate the STATEMENT as written, not what it implies
- Be extremely strict - any inaccuracy makes it FALSE

EXAMPLES:
- Statement: "Water boils at 100 degrees at sea level" -> TRUE
- Statement: "Water does not boil at 100 degrees at sea level" -> FALSE (it does boil at 100)
- Statement: "The Earth is flat" -> FALSE
- Statement: "Paris is the capital of France" -> TRUE

Respond ONLY with valid JSON in this exact format:
{"verdict":"TRUE"|"FALSE"|"UNKNOWN","confidence":0-100,"reasoning":"One sentence explanation"}

JSON:`;

  const res = await fetch(OLLAMA + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 200, top_k: 1, top_p: 0.1, seed: 42 }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return parseRaw(data.response);
}

// ========== UI RESULTS ==========

function result(verdict, confidence, reasoning, model) {
  const cls = { TRUE: 'result-true', FALSE: 'result-false', UNKNOWN: 'result-unknown', ERROR: 'result-false' };
  const lbl = { TRUE: 'TRUE', FALSE: 'FALSE', UNKNOWN: 'UNCERTAIN', ERROR: 'ERROR' };

  d.resultArea.innerHTML = `
    <div class="result-card ${cls[verdict] || 'result-unknown'}">
      <div class="result-title">${lbl[verdict] || verdict}</div>
      <div class="result-score">${confidence}%</div>
      ${model ? `<div class="result-model">${model.split(':')[0]}</div>` : ''}
      <div class="result-reason">${reasoning}</div>
    </div>`;
}

// ========== HANDLERS ==========

async function doVerify() {
  const text = d.textInput.value.trim();
  if (!text) { result('ERROR', 0, 'Enter a statement to verify'); return; }
  if (!state.online) { result('ERROR', 0, 'Ollama not connected. Run the setup command.'); showSetup(); return; }
  if (!canVerify()) return;

  state.loading = true;
  updateUI();
  d.resultArea.innerHTML = '<div style="text-align:center;padding:20px;"><span class="status-dot checking"></span> Verifying...</div>';

  try {
    const m = state.model || state.models[0];
    const r = await verifyOne(text, m);
    result(r.verdict, r.confidence, r.reasoning, m);
    
    if (!state.premium) {
      state.used++;
      save();
      updateUI();
    }
  } catch(e) {
    console.error(e);
    result('ERROR', 0, e.message);
    if (e.message.includes('403') || e.message.includes('Failed') || e.message.includes('CORS')) {
      state.online = false;
      showSetup();
      showError(getCorsHelp(e));
    }
  } finally {
    state.loading = false;
    updateUI();
  }
}

function copyCmd() {
  navigator.clipboard.writeText(d.codeBlock.textContent.trim()).then(() => {
    const original = $('copyBtn').innerHTML;
    $('copyBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    setTimeout(() => $('copyBtn').innerHTML = original, 1500);
  });
}

function switchShell(e) {
  if (!e.target.classList.contains('shell-tab')) return;
  document.querySelectorAll('.shell-tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');

  const shell = e.target.dataset.shell;
  if (shell === 'ps') d.codeBlock.textContent = '$env:OLLAMA_ORIGINS="*"; ollama serve';
  else if (shell === 'cmd') d.codeBlock.textContent = 'set OLLAMA_ORIGINS=* && ollama serve';
  else d.codeBlock.textContent = 'OLLAMA_ORIGINS="*" ollama serve';
}

function updateUI() {
  d.verifyBtn.disabled = state.loading || !state.online;
  d.verifyBtn.innerHTML = state.loading 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Verifying...`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Verify Fact`;
  
  if (state.premium) {
    d.footerRight.textContent = 'Unlimited';
  } else {
    const remaining = getRemaining();
    const timeLeft = getTimeUntilReset();
    d.footerRight.textContent = `${remaining} / ${FREE_LIMIT} • ${timeLeft}`;
  }
}

// ========== KEYBOARD SHORTCUTS ==========

function handleKeydown(e) {
  // Removed Ctrl+Shift+A shortcut for admin panel
}

// ========== INIT ==========

function bind() {
  $('verifyBtn').addEventListener('click', doVerify);
  $('testBtn').addEventListener('click', check);
  $('copyBtn').addEventListener('click', copyCmd);
  $('themeBtn').addEventListener('click', toggleTheme);
  $('upgradeBtn').addEventListener('click', openUpgrade);
  $('activateBtn').addEventListener('click', activate);
  $('laterBtn').addEventListener('click', closeUpgrade);
  
  d.modelSelect.addEventListener('change', e => { state.model = e.target.value; save(); });
  d.textInput.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') doVerify(); });
  document.querySelector('.shell-tabs').addEventListener('click', switchShell);
  
  d.upgradeModal.addEventListener('click', e => { if (e.target === d.upgradeModal) closeUpgrade(); });
  d.keyInput.addEventListener('keydown', e => { if (e.key === 'Enter') activate(); });
  document.addEventListener('keydown', handleKeydown);
}

async function init() {
  cache();
  load();
  applyTheme();
  bind();

  d.textInput.value = localStorage.getItem(STORAGE + '-text') || '';
  d.textInput.addEventListener('input', () => localStorage.setItem(STORAGE + '-text', d.textInput.value));

  showSetup();
  await check();
  updatePremium();
  updateUI();

  setInterval(check, 30000);
  console.log('Anti Hallucinations v11.2 initialized');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();