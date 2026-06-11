# My Bibi — Setup Guide

Everything you need to run this app locally and host it for free so both of you can use it from anywhere.

---

## Run locally in 2 minutes (Windows)

### Prerequisites
- [Python 3.11+](https://python.org/downloads)
- [Node.js 18+](https://nodejs.org)
- Git

### Steps

```batch
git clone https://github.com/Sowan3k/My-Bibi-App.git
cd My-Bibi-App
copy .env.example .env
```

Edit `.env` — at minimum change these two lines to long random strings:
```
JWT_SECRET=your-long-random-string-here
INVITE_SECRET=a-different-long-random-string
```

Then double-click **`dev-start.bat`** — it creates the Python virtualenv, installs all dependencies, and opens both servers in separate windows.

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- API docs → http://localhost:8000/docs (dev mode only)

### First time

1. Go to http://localhost:3000/setup — create your account, copy the invite link
2. Send the link to your partner — they open it and create their account
3. That's it. Start chatting.

---

## Run locally on macOS / Linux

```bash
git clone https://github.com/Sowan3k/My-Bibi-App.git
cd My-Bibi-App
cp .env.example .env
# Edit .env — change JWT_SECRET and INVITE_SECRET

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload &

# Frontend (separate terminal)
cd ../frontend
npm install --legacy-peer-deps
npm run dev
```

---

## Host it free — so you can use it from anywhere

You need a server that:
- Runs Docker Compose
- Has persistent disk storage for the vault (photos, messages, memories)
- Is free forever (not trial credits)

### Option 1 — Oracle Cloud Always Free ⭐ (recommended)

This is the best option. Oracle gives you a genuinely free-forever VM with 1 GB RAM and 50 GB storage. No credit card games.

**Steps:**

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com) — choose "Always Free" tier
2. Create an **AMD Micro** instance (Ubuntu 22.04 LTS)
3. SSH in and install Docker:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```
4. Clone the repo and configure:
```bash
git clone https://github.com/Sowan3k/My-Bibi-App.git
cd My-Bibi-App
cp .env.example .env
nano .env   # set JWT_SECRET, INVITE_SECRET, FRONTEND_URL=https://yourdomain.com
```
5. Start it:
```bash
docker compose up -d
```
6. Point your domain (or a free subdomain from [DuckDNS](https://duckdns.org)) at the server IP
7. Add HTTPS with [Caddy](https://caddyserver.com) (2 commands):
```bash
sudo apt install -y caddy
# Edit /etc/caddy/Caddyfile:
# yourdomain.duckdns.org {
#     reverse_proxy localhost:3000
# }
sudo systemctl reload caddy
```

Your app is now live at `https://yourdomain.duckdns.org`. Share the `/join?token=...` link with your partner.

---

### Option 2 — Fly.io (easy, generous free tier)

Fly.io has a hobby free tier that covers a small app easily.

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch          # follow prompts, pick a region close to you
fly volumes create vault_data --size 3   # persistent storage for the vault
fly deploy
```

Set secrets:
```bash
fly secrets set JWT_SECRET=your-secret INVITE_SECRET=your-other-secret
```

---

### Option 3 — Home server / spare PC

If you have a PC at home that's always on (or a Raspberry Pi):

1. Install Docker Desktop (Windows/Mac) or docker.io (Linux)
2. Clone the repo, edit `.env`
3. Run `docker compose up -d`
4. Use [Tailscale](https://tailscale.com) (free) to access it from anywhere without port-forwarding:
   - Install Tailscale on the home PC and on your phone
   - Your app becomes accessible at the Tailscale IP, e.g. `http://100.x.x.x:3000`

This option means your data never leaves your own hardware at all.

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes — change it** | Signs login tokens. Use `openssl rand -hex 32` |
| `INVITE_SECRET` | **Yes — change it** | Signs invite links. Must differ from JWT_SECRET |
| `VAULT_PATH` | No | Where files are stored. Default: `./vault` |
| `FRONTEND_URL` | Yes (prod) | Full URL of your frontend, e.g. `https://mybibi.duckdns.org` |
| `BACKEND_URL` | No | Internal backend URL. Default: `http://localhost:8000` |
| `JWT_EXPIRE_MINUTES` | No | Token lifetime. Default: `60` |
| `OLLAMA_BASE_URL` | No | For Phase 3 AI features. Default: `http://ollama:11434` |
| `OLLAMA_MODEL` | No | Ollama model name. Default: `llama3.2:3b` |

---

## Backup

Everything is in the `vault/` folder:
```bash
# One-liner backup
tar -czf bibi-backup-$(date +%Y%m%d).tar.gz vault/
```

Restore by extracting the archive and restarting. The vault is plain files — no proprietary format.

---

## Docker Compose with optional Ollama AI

AI features are Phase 3 and fully optional. To enable local AI:
```bash
docker compose --profile ai up -d
# Then pull a model (one-time, ~2 GB):
docker exec my-bibi-ollama-1 ollama pull llama3.2:3b
```

The app degrades gracefully if Ollama is not running — all Phase 1/2 features work without it.
