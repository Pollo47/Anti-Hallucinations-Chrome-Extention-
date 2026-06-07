// Anti Hallucinations v12.0 — 100% Free, Unlimited
// Verifies facts using your local Ollama models. No limits, no payments, no tracking.

const OLLAMA = 'http://localhost:11434';
const STORAGE_KEY = 'anti-hallucinations-v12';

let state = {
  online:  false,
  loading: false,
  models:  [],
  model:   '',
  theme:   'dark',
  pendingText: ''
};

const d = {};
function $(id) { return document.getElementById(id); }

function cache() {
  d.statusDot  = $('statusDot');
  d.statusText = $('statusText');
  d.setupPanel = $('setupPanel');
  d.mainPanel  = $('mainPanel');
  d.errorBox   = $('errorBox');
  d.codeBlock  = $('codeBlock');
  d.modelSelect= $('modelSelect');
  d.textInput  = $('textInput');
  d.resultArea = $('resultArea');
  d.verifyBtn  = $('verifyBtn');
}

// ========== MODEL FILTERING ==========
// Only show models that run locally via Ollama (not cloud API models)

const CLOUD_KEYWORDS = [
  'gpt-', 'text-davinci', 'text-curie', 'text-babbage', 'text-ada',
  'claude-', 'gemini-', 'mistral-large', 'mistral-medium', 'mistral-small',
  'command-r', 'codestral', 'j2-', 'jamba', 'palm', 'bison',
  'nova', 'titan', 'jurassic', 'dbrx', 'amazon', 'azure',
  'bedrock', 'sagemaker', 'vertex',
];

function isLocalModel(name) {
  const lower = name.toLowerCase();
  for (const kw of CLOUD_KEYWORDS) {
    if (lower.includes(kw)) return false;
  }
  return true;
}

// ========== CHROME STORAGE ==========

function storageGet(key) {
  return new Promise(resolve =>
    chrome.storage.local.get(key, r => resolve(r[key] || null))
  );
}

function storageSet(key, value) {
  return new Promise(resolve =>
    chrome.storage.local.set({ [key]: value }, resolve)
  );
}

async function load() {
  try {
    const s = await storageGet(STORAGE_KEY);
    const data = s ? JSON.parse(s) : {};
    state.theme = data.theme || 'dark';
    state.model = data.model || '';
    const txt = await storageGet(STORAGE_KEY + '-text');
    state.pendingText = txt || '';
  } catch(e) {
    console.error('load error', e);
  }
}

async function save() {
  await storageSet(STORAGE_KEY, JSON.stringify({
    theme: state.theme,
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

async function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  await save();
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

    const data      = await res.json();
    const allModels = (data.models || []).map(m => m.name).filter(Boolean);
    const local     = allModels.filter(isLocalModel);

    if (local.length === 0) {
      if (allModels.length > 0) {
        throw new Error(`No local models found. Install one with: ollama pull llama3`);
      }
      throw new Error('No models installed. Run: ollama pull llama3');
    }

    state.online = true;
    state.models = local;
    setStatus('online', `${local.length} local model(s) ready`);
    populateModels();
    showMain();

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
  const m = err.message || '';
  if (m.includes('Failed to fetch') || m.includes('NetworkError') || m.includes('CORS'))
    return 'CORS blocked. Run the command above then click Connect.';
  if (m.includes('HTTP 403'))
    return 'Ollama rejected the request (403). Set OLLAMA_ORIGINS=* and restart.';
  return m;
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
  d.mainPanel.style.display  = 'none';
  d.mainPanel.classList.remove('visible');
}

function showMain() {
  d.setupPanel.style.display = 'none';
  d.mainPanel.style.display  = 'block';
  d.mainPanel.classList.add('visible');
}

function showError(msg) {
  d.errorBox.textContent = msg;
  d.errorBox.classList.add('visible');
}

function hideError() {
  d.errorBox.classList.remove('visible');
}

// ========== VERIFY ==========

function parseRaw(raw) {
  let t = (raw || '').trim();
  const m = t.match(/\{[\s\S]*?\}/);
  if (m) t = m[0];

  try {
    const p = JSON.parse(t);
    const v = String(p.verdict || '').toUpperCase().trim();
    const c = Math.min(100, Math.max(0, parseInt(p.confidence) || 50));
    const r = String(p.reasoning || 'No explanation').trim();
    if (['TRUE','FALSE','UNKNOWN'].includes(v)) return { verdict: v, confidence: c, reasoning: r };
  } catch(e) {}

  const u = t.toUpperCase();
  if (u.includes('TRUE')  && !u.includes('FALSE')) return { verdict: 'TRUE',    confidence: 70, reasoning: 'Detected TRUE (fallback)' };
  if (u.includes('FALSE') && !u.includes('TRUE'))  return { verdict: 'FALSE',   confidence: 30, reasoning: 'Detected FALSE (fallback)' };
  return { verdict: 'UNKNOWN', confidence: 50, reasoning: 'Could not determine' };
}

async function verifyOne(text, model) {
  const prompt = `You are a strict fact-checking engine. Evaluate whether the STATEMENT is factually correct.

STATEMENT: "${text.trim().substring(0, 800)}"

RULES:
- TRUE = the statement is factually correct
- FALSE = the statement contains factual errors or is misleading
- UNKNOWN = cannot be determined from general knowledge
- Evaluate EXACTLY what is written, not what it implies

EXAMPLES:
- "Water boils at 100°C at sea level" -> TRUE
- "Water does not boil at 100°C at sea level" -> FALSE
- "The Earth is flat" -> FALSE
- "Paris is the capital of France" -> TRUE

Respond ONLY with valid JSON:
{"verdict":"TRUE"|"FALSE"|"UNKNOWN","confidence":0-100,"reasoning":"One sentence explanation"}

JSON:`;

  const res = await fetch(OLLAMA + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 200, top_k: 1, top_p: 0.1, seed: 42 }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return parseRaw(data.response);
}

function showResult(verdict, confidence, reasoning, model) {
  const cls = { TRUE: 'result-true', FALSE: 'result-false', UNKNOWN: 'result-unknown', ERROR: 'result-false' };
  const lbl = { TRUE: '✓ TRUE', FALSE: '✗ FALSE', UNKNOWN: '? UNCERTAIN', ERROR: 'ERROR' };
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
  if (!text)         { showResult('ERROR', 0, 'Enter a statement to verify'); return; }
  if (!state.online) { showResult('ERROR', 0, 'Ollama not connected. Run the setup command.'); showSetup(); return; }

  state.loading = true;
  updateUI();
  d.resultArea.innerHTML = '<div style="text-align:center;padding:20px;"><span class="status-dot checking"></span> Verifying...</div>';

  try {
    const m = state.model || state.models[0];
    const r = await verifyOne(text, m);
    showResult(r.verdict, r.confidence, r.reasoning, m);
  } catch(e) {
    console.error(e);
    showResult('ERROR', 0, e.message);
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
  if      (shell === 'ps')  d.codeBlock.textContent = '$env:OLLAMA_ORIGINS="*"; ollama serve';
  else if (shell === 'cmd') d.codeBlock.textContent = 'set OLLAMA_ORIGINS=* && ollama serve';
  else                      d.codeBlock.textContent = 'OLLAMA_ORIGINS="*" ollama serve';
}

function updateUI() {
  d.verifyBtn.disabled = state.loading || !state.online;
  d.verifyBtn.innerHTML = state.loading
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Verifying...`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Verify Fact`;
}

// ========== INIT ==========

function bind() {
  $('verifyBtn').addEventListener('click', doVerify);
  $('testBtn').addEventListener('click', check);
  $('copyBtn').addEventListener('click', copyCmd);
  $('themeBtn').addEventListener('click', toggleTheme);
  d.modelSelect.addEventListener('change', async e => { state.model = e.target.value; await save(); });
  d.textInput.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') doVerify(); });
  d.textInput.addEventListener('input', () => storageSet(STORAGE_KEY + '-text', d.textInput.value));
  document.querySelector('.shell-tabs').addEventListener('click', switchShell);
}

async function init() {
  cache();
  await load();
  applyTheme();
  bind();

  if (state.pendingText) d.textInput.value = state.pendingText;

  showSetup();
  await check();
  updateUI();

  setInterval(check, 30000);
  console.log('Anti Hallucinations v12.0 — Free & Unlimited');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
