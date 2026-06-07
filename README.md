# Anti Hallucinations

**Fact-check any statement using your own local AI models. Free, unlimited, and 100% private.**

---

## What it does

Anti Hallucinations is a Chrome extension that connects to [Ollama](https://ollama.com) running on your computer and uses local AI models to verify factual statements. Enter any claim, click **Verify Fact**, and get a TRUE / FALSE / UNCERTAIN verdict with a confidence score and explanation.

Everything runs on your machine. No internet connection required after setup. No accounts. No limits.

---

## Requirements

- **Google Chrome** (or any Chromium-based browser)
- **[Ollama](https://ollama.com)** installed and running locally
- At least one local model pulled (e.g. `ollama pull llama3`)

---

## Installation

### From Chrome Web Store
Search for **Anti Hallucinations** in the [Chrome Web Store](https://chrome.google.com/webstore) and click Install.

### Manual (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this folder

---

## Setup — Enabling CORS in Ollama

The extension talks to Ollama on `localhost:11434`. Ollama requires CORS to be enabled to allow browser extensions to connect. Run **one** of these commands before starting Ollama:

| Shell | Command |
|---|---|
| PowerShell | `$env:OLLAMA_ORIGINS="*"; ollama serve` |
| CMD | `set OLLAMA_ORIGINS=* && ollama serve` |
| Bash / macOS | `OLLAMA_ORIGINS="*" ollama serve` |

**Permanent setup (recommended):** Add `OLLAMA_ORIGINS=*` as a system environment variable so you never need to remember the command.

---

## Usage

1. Start Ollama with CORS enabled (see above)
2. Click the extension icon in Chrome's toolbar
3. Click **Connect** — it will detect your installed models automatically
4. Select a model from the dropdown
5. Type a factual statement in the text box
6. Click **Verify Fact** (or press **Ctrl+Enter**)
7. Read the verdict: **TRUE**, **FALSE**, or **UNCERTAIN**

---

## Supported Models

Any model installed locally via Ollama works. Recommended options:

| Model | Size | Notes |
|---|---|---|
| `llama3` | 4.7 GB | Good general-purpose fact-checker |
| `llama3.1` | 4.7 GB | Improved reasoning |
| `gemma2` | 5.4 GB | Strong factual accuracy |
| `mistral` | 4.1 GB | Fast and efficient |
| `phi3` | 2.2 GB | Lightweight, good for slower hardware |
| `deepseek-r1` | varies | Strong reasoning chain |

Install any of them with:
```
ollama pull llama3
```

---

## Privacy

- All text you enter stays on your computer
- The extension only communicates with `localhost:11434` (your local Ollama instance)
- No analytics, no telemetry, no external servers
- No account required, no sign-up, no email

See [privacy_policy.html](privacy_policy.html) for the full policy.

---

## Free & Open

This extension is completely free with no limits. Every feature works without payment, registration, or subscriptions.

---

## Troubleshooting

**"CORS blocked" error**
Ollama is running but without CORS enabled. Re-launch it using the command shown in the extension popup.

**"No models installed"**
Run `ollama pull llama3` (or any other model) in your terminal.

**Verdict seems wrong**
Results depend on the model's training data and knowledge cutoff. Smaller models may be less accurate on niche or recent topics. Try a larger model for better results.

**Extension can't connect**
Make sure Ollama is running (`ollama serve`) and that no firewall blocks `localhost:11434`.

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves your preferred model and theme across sessions |
| `host_permissions: localhost:11434` | Connects to your local Ollama instance |

No other permissions are requested or used.

contact: contactoneuralminds@gmail.com

---

## License

MIT License — free to use, modify, and distribute.
