```
  ██████╗ ██████╗██████╗ 
 ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
 ██║     ██║     ██████╔╝   by SuparvaCode
 ██║     ██║     ██╔═══╝ 
 ╚██████╗╚██████╗██║
  ╚═════╝ ╚═════╝╚═╝ 
```

# ⚡ CCP — Claude Code Proxy

**Route Claude Code and Codex CLI through any AI provider — Groq, Gemini, DeepSeek, Bedrock, Ollama, and more.**

CCP is a self-hosted Node.js proxy server that speaks the Anthropic and OpenAI API wire formats. It intercepts requests from Claude Code or Codex CLI and forwards them to whichever backend AI provider you configure — with streaming, tool calling, and model routing all handled transparently.

> Built and maintained by **[Suparva](https://github.com/SuparvaCode)**.

---

## What it does

Claude Code and Codex CLI are hardcoded to talk to Anthropic's API. CCP sits in between and translates:

```
Claude Code / Codex CLI
        │
        ▼  (Anthropic/OpenAI wire format)
  CCP Proxy  ←── Admin Panel (http://127.0.0.1:8082/admin)
        │
        ▼  (provider-native format)
  Groq / Gemini / DeepSeek / Ollama / Bedrock / ...
```

You point your client at `http://127.0.0.1:8082` instead of Anthropic's servers, then pick any provider and model from the admin panel.

---

## Features

- **16 providers out of the box** — cloud and local (see table below)
- **SSE streaming** — full server-sent event translation so streaming responses work exactly like Anthropic's
- **Tool / function calling** — passes tool schemas and results through correctly
- **Reasoning/thinking blocks** — DeepSeek R1 and Gemini thinking tokens surfaced as Anthropic thinking blocks
- **Model routing** — map Claude variants (Opus / Sonnet / Haiku) to any provider model via the admin UI
- **MCP Tools manager** — configure Model Context Protocol servers (web search, filesystem, GitHub, etc.) and generate a ready-to-paste `~/.claude.json` snippet
- **Request logs** — full history with token counts, latency, and status per request
- **Analytics dashboard** — daily charts for tokens used, request volume, and error rate
- **Built-in playground** — chat directly against any configured provider/model from the browser
- **AES-256-CBC encryption** — all API keys are encrypted at rest in the local SQLite database
- **Persistent dark/light theme**

---

## Requirements

- **Node.js v18+** — [nodejs.org](https://nodejs.org/)
- No other global dependencies required

---

## Installation

### 🪟 Windows (PowerShell)

Open PowerShell and run:

```powershell
irm -useb https://raw.githubusercontent.com/SuparvaCode/ccp-proxy/main/install.ps1 | iex
```

> The window will stay open throughout the install. Everything is automatic — the installer clones the repo, installs deps, builds the UI, and registers `ccp-start`. Installs to `%USERPROFILE%\.ccp-proxy`.

### 🍎 macOS / 🐧 Linux

```bash
curl -fsSL https://raw.githubusercontent.com/SuparvaCode/ccp-proxy/main/install.sh | bash
```

> Installs to `~/.ccp-proxy` and registers `ccp-start` in `~/.local/bin`. Open a new terminal after install (or run `source ~/.bashrc`) for `ccp-start` to be available.

### Manual (all platforms)

```bash
git clone https://github.com/SuparvaCode/ccp-proxy.git
cd ccp-proxy
npm run install:all
cp server/.env.example server/.env
# Edit server/.env — set CCP_ENCRYPTION_SECRET (min 32 chars) and optionally CCP_AUTH_TOKEN
npm run build:admin
npm link   # registers the global ccp-start command
```

### 🗑️ Uninstalling

To completely remove the proxy, files, PATH updates, and global commands:

#### Windows (PowerShell)
```powershell
irm -useb https://raw.githubusercontent.com/SuparvaCode/ccp-proxy/main/uninstall.ps1 | iex
```

#### macOS / Linux (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/SuparvaCode/ccp-proxy/main/uninstall.sh | bash
```

---

## Starting the server

After installation, run from any terminal:

```bash
ccp-start
```

Or use the local launcher in the project folder:

```
Windows:      .\ccp.cmd
macOS/Linux:  ./ccp
```

The server starts on **port 8082** by default (configurable in the admin panel under Settings → Server Port).

```
⚡ CCP Proxy running at http://127.0.0.1:8082
📋 Admin panel:      http://127.0.0.1:8082/admin
🔌 Anthropic API:    http://127.0.0.1:8082/v1/messages
🤖 OpenAI API:       http://127.0.0.1:8082/v1/responses
```

---

## Connecting your client

### Claude Code

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8082
export ANTHROPIC_AUTH_TOKEN=super
claude
```

On Windows (PowerShell):
```powershell
$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:8082"
$env:ANTHROPIC_AUTH_TOKEN = "super"
claude
```

### Codex CLI

```bash
export CCP_CODEX_API_KEY=super

codex \
  -c model_provider="ccp" \
  -c model_providers.ccp.name="Claude Code Proxy" \
  -c model_providers.ccp.base_url="http://127.0.0.1:8082/v1" \
  -c model_providers.ccp.env_key="CCP_CODEX_API_KEY" \
  -c model_providers.ccp.wire_api="responses"
```

> The default auth token is `super`. Change it in **Admin → Settings** and update your env var to match.

---

## Selecting a model

Address any model using the `{provider_id}/{model_id}` format:

```
google/gemini-2.5-pro
groq/llama-3.3-70b-versatile
deepseek/deepseek-chat
bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0
ollama/llama3.2
```

Or set up routing rules in **Admin → Model Routing** to automatically map Claude variants (e.g. `claude-3-5-sonnet`) to a provider/model of your choice — so you never have to change your client config.

---

## Admin panel

Open **http://127.0.0.1:8082/admin** after starting the server.

| Page | What it does |
|---|---|
| Dashboard | Token usage, request count, error rate, active providers at a glance |
| Providers | Configure API keys and base URLs for each provider |
| Models | Browse and cache available models per provider |
| Model Routing | Map Claude variant names to specific provider/model pairs |
| Playground | Chat interface to test any provider/model directly |
| Request Logs | Full log of every proxied request with tokens and latency |
| Analytics | Daily charts for usage over time |
| MCP Tools | Configure MCP servers for Claude Code (web search, filesystem, GitHub…) |
| Settings | Change auth token, port, log level, and server restart |

---

## Provider registry

| Provider | ID | Type | Notes |
|---|---|---|---|
| Google AI Studio | `google` | Cloud | Gemini models |
| DeepSeek | `deepseek` | Cloud | Includes R1 reasoning |
| OpenRouter | `openrouter` | Cloud | Aggregates 200+ models |
| Groq | `groq` | Cloud | Ultra-fast inference |
| Mistral AI | `mistral` | Cloud | |
| Mistral Codestral | `codestral` | Cloud | Code-optimised |
| Cerebras | `cerebras` | Cloud | |
| Fireworks AI | `fireworks` | Cloud | |
| NVIDIA NIM | `nvidia` | Cloud | |
| Together AI | `together` | Cloud | |
| xAI (Grok) | `xai` | Cloud | |
| Cohere | `cohere` | Cloud | |
| Amazon Bedrock | `bedrock` | Cloud | IAM credentials or gateway |
| Ollama | `ollama` | Local | Runs on `localhost:11434` |
| LM Studio | `lmstudio` | Local | Runs on `localhost:1234` |
| llama.cpp | `llamacpp` | Local | Runs on `localhost:8080` |

---

## API endpoints

| Endpoint | Description |
|---|---|
| `POST /v1/messages` | Anthropic Messages API (Claude Code) |
| `POST /v1/messages/count_tokens` | Token counting |
| `GET /v1/models` | List available models |
| `POST /v1/responses` | OpenAI Responses API (Codex CLI) |
| `GET /health` | Health check |
| `GET /admin/*` | Admin panel UI |
| `GET/PUT /api/admin/*` | Admin REST API |

---

## Configuration

Server configuration is stored in a local SQLite database (`server/data/ccp.db`) and managed through the admin panel. For production deployments, set these in `server/.env`:

| Variable | Default | Description |
|---|---|---|
| `CCP_ENCRYPTION_SECRET` | insecure default | **Change this.** Min 32 chars. Used to encrypt API keys at rest. |
| `CCP_AUTH_TOKEN` | `super` | Bearer token your clients send. Set to something strong. |
| `PORT` | `8082` | Override the server port (or change via admin Settings) |
| `HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` to expose on the network. |

---

## MCP Tools

CCP includes an MCP Tools manager (**Admin → MCP Tools**) that lets you configure Model Context Protocol servers and generate a `~/.claude.json` snippet for Claude Code.

Built-in templates: Brave Search, Filesystem, Puppeteer Browser, HTTP Fetch, GitHub, PostgreSQL, Memory/Knowledge Graph, Custom SSE.

Click **Get Config** in the MCP Tools page to copy the ready-to-paste config block.

---

## License

MIT — see [LICENSE](LICENSE).
