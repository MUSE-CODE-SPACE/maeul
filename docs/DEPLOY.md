# Deploying Maeul (Railway, Render, Fly, any host)

Maeul's HTTP server is a plain FastAPI app, so it deploys anywhere. The only
question is **where the model runs** — because a cloud box usually has no local
Ollama. Pick one:

| Setup | Model runs on | Cost | Config |
|---|---|---|---|
| **A. On-device** (default) | your machine | **$0** | nothing — `maeul serve` next to your game |
| **B. Cloud server + hosted model** | a model provider | free tier or pay-per-token | set `MAEUL_BASE_URL` + `MAEUL_API_KEY` |
| **C. Cloud server + your home Ollama** | your home PC (via tunnel) | **$0** | `MAEUL_BASE_URL=https://<your-tunnel>/v1` |

> ⚠️ Don't try to run a big LLM *on* Railway itself — no GPU, and CPU inference
> of a real model is too slow. The cloud box runs the lightweight Maeul server;
> the heavy model lives elsewhere (a provider, or your own machine).

## Deploy to Railway

1. Push this repo to GitHub, then **New Project → Deploy from GitHub** on Railway.
   (`railway.json` + `Procfile` are already here; Railway auto-detects Python.)
2. Set environment variables in the Railway dashboard:

   **Option B — a free/cheap hosted model (recommended for cloud):**
   ```
   MAEUL_BASE_URL = https://openrouter.ai/api/v1
   MAEUL_API_KEY  = <your OpenRouter key>
   MAEUL_MODEL    = qwen/qwen3-8b            # or any free/cheap model
   MAEUL_VILLAGE  = examples/village          # or your own village dir
   ```
   (OpenRouter and others have free-tier models — keep it $0 if you pick one.)

   **Option C — point back at your own machine's Ollama (stays free):**
   ```
   MAEUL_BASE_URL = https://<your-cloudflared-or-tailscale-url>/v1
   MAEUL_MODEL    = qwen3:8b
   ```
   Expose your local Ollama with e.g. `cloudflared tunnel --url http://localhost:11434`.

3. Railway gives you a URL like `https://maeul-production.up.railway.app`.
   Your game (or anyone) now calls it:
   ```bash
   curl -s https://maeul-production.up.railway.app/say \
     -d '{"who":"mira","text":"안녕?"}'
   ```
   In Unity, set `MaeulClient.baseUrl` to that URL. Done.

## Local test of the cloud config

```bash
PORT=8000 HOST=0.0.0.0 \
MAEUL_BASE_URL=http://localhost:11434/v1 MAEUL_MODEL=qwen3:8b \
python -m maeul.cli serve
```

## Notes
- `$PORT` and `HOST` are read from env automatically (what cloud hosts inject).
- CORS: if a browser game calls the server cross-origin, add FastAPI's
  `CORSMiddleware` in `server.py` (left out by default to keep it minimal).
- Keep secrets in the host's env vars, never in the repo.
