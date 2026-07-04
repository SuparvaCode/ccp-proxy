```
  ██████╗ ██████╗██████╗ 
 ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
 ██║     ██║     ██████╔╝   Powered by SuparvaCode
 ██║     ██║     ██╔═══╝ 
 ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
  ╚═════╝ ╚═════╝╚═╝ 
```

# ⚡ Claude Code Proxy (CCP)

A high-performance Node.js proxy server that mimics Anthropic and OpenAI API endpoints, allowing you to use **any AI provider** with Claude Code or Codex CLI.

Developed and maintained by **Suparva (SuparvaCodes)**.

## Features
- 🔌 **15 Providers Supported**: Google AI Studio, DeepSeek, OpenRouter, Groq, Mistral, Codestral, Cerebras, Fireworks, NVIDIA NIM, Together AI, xAI, Cohere, Ollama, LM Studio, llama.cpp
- 🔄 **SSE Streaming**: Full server-sent event (SSE) translation to Anthropic format
- 🧠 **Reasoning/Thinking Blocks**: Support for DeepSeek R1 and Gemini Thinking outputs
- 🛠️ **Function Calling**: Full tool call compatibility
- 🎯 **Model Routing**: Dynamic variant mapping (Opus/Sonnet/Haiku) to any custom provider model
- 📋 **Request Logging**: Complete request histories with input/output token counts and latency metrics
- 📊 **Analytics Dashboard**: Visual charts for tokens, requests, and latency
- 🎮 **Playground**: Built-in chat panel to test models with custom parameters and real-time statistics
- 🔒 **At-Rest Security**: Strong AES-256-CBC encryption for stored API keys
- 🌙 **Persistent Theme**: Dark/Light mode selector with localStorage caching

## Installation & Setup

Choose the quick installer command below matching your operating system. Ensure you have **Node.js (v18+)** installed.

### 🪟 Windows (PowerShell)
Install and configure CCP instantly:
```powershell
# Run installer from GitHub (replace with your repo URL once uploaded)
irm -useb https://raw.githubusercontent.com/suparva/ccp-proxy/main/install.ps1 | iex
```

### 🍎 macOS & 🐧 Linux (Bash)
Install and configure CCP instantly:
```bash
# Run installer from GitHub (replace with your repo URL once uploaded)
curl -fsSL https://raw.githubusercontent.com/suparva/ccp-proxy/main/install.sh | bash
```

### ⚙️ Alternative (Manual Clone)
If you prefer to configure manually:
```bash
git clone https://github.com/suparva/ccp-proxy.git
cd ccp-proxy
npm run install:all
cp server/.env.example server/.env
# Edit server/.env and set CCP_ENCRYPTION_SECRET and CCP_AUTH_TOKEN
npm run build:admin
```

---

## Usage

### Start the Proxy Server
Once installed, execute the launch command in the project root:
- Windows: `.\ccp.cmd`
- macOS/Linux: `./ccp`

Open **http://localhost:5173** (development) or **http://127.0.0.1:8082/admin** (production) to manage providers and route models.

### 🗑️ Uninstalling
To completely clean up and remove the application:
- Windows: `.\uninstall.ps1`
- macOS/Linux: `./uninstall.sh`

## Client Setup

### Claude Code
Set the environment variables before running `claude`:
```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8082
export ANTHROPIC_AUTH_TOKEN=super
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
claude
```

### Codex CLI
Run `codex` with the following configuration parameter mapping:
```bash
export CCP_CODEX_API_KEY=super

codex \
  -c model_provider="ccp" \
  -c model_providers.ccp.base_url="http://127.0.0.1:8082/v1" \
  -c model_providers.ccp.env_key="CCP_CODEX_API_KEY" \
  -c model_providers.ccp.wire_api="responses"
```

## Model Format
Address models directly by formatting the model name as `{PROVIDER_ID}/{MODEL_ID}`:
- `google/gemini-2.5-pro`
- `groq/llama-3.3-70b-versatile`
- `deepseek/deepseek-chat`

Or configure custom routing rules inside the admin panel.

## Admin Panel
Access the management dashboard at:
- Development: **http://localhost:5173**
- Production: **http://127.0.0.1:8082/admin**

## Provider Registry

| Provider | ID | Type |
|---|---|---|
| Google AI Studio | `google` | Cloud |
| DeepSeek | `deepseek` | Cloud |
| OpenRouter | `openrouter` | Cloud |
| Groq | `groq` | Cloud |
| Mistral AI | `mistral` | Cloud |
| Mistral Codestral | `codestral` | Cloud |
| Cerebras | `cerebras` | Cloud |
| Fireworks AI | `fireworks` | Cloud |
| NVIDIA NIM | `nvidia` | Cloud |
| Together AI | `together` | Cloud |
| xAI (Grok) | `xai` | Cloud |
| Cohere | `cohere` | Cloud |
| Ollama | `ollama` | Local |
| LM Studio | `lmstudio` | Local |
| llama.cpp | `llamacpp` | Local |

## API Endpoints
- `POST /v1/messages` — Anthropic Messages (Claude Code)
- `POST /v1/messages/count_tokens` — Token counter
- `GET /v1/models` — Model list
- `POST /v1/responses` — OpenAI Responses (Codex CLI)
