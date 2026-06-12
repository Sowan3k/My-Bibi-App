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

The only genuinely free-forever tier that runs the FULL stack including local AI:
an **Ampere A1 (ARM) VM with up to 4 OCPUs and 24 GB RAM**, plus 200 GB of block
storage. That's enough for Docker, the app, AND Ollama with a 3B–7B model.
(Do NOT pick the 1 GB AMD Micro — it can't run Ollama.)

All images in this repo are arm64-ready (`python:3.11-slim`, `node:20-alpine`,
`ollama/ollama` are multi-arch) — `docker compose up` just works on A1.

**Three things to know about Oracle before you start:**

1. **Signup is picky.** Their fraud detection rejects many legitimate cards on
   the first try. Use your real name, a card in that exact name, no VPN.
   If rejected, wait a day and retry — it usually goes through.
2. **Idle Always-Free VMs can be reclaimed.** After signup, upgrade the account
   to **Pay As You Go** (Billing → Upgrade). You still pay $0 while inside the
   free limits, but your instance becomes safe from reclamation. Do this.
3. **Two firewalls, not one.** Oracle blocks ports in the cloud **Security List**
   AND in the OS's own iptables. You must open them in BOTH places (step 5).

**Steps:**

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com)
2. Create instance → Image: **Ubuntu 22.04** → Shape: **Ampere A1 Flex**
   (e.g. 2 OCPU / 12 GB — leave headroom inside the free 4/24 limit), add your
   SSH key, create.
3. Open ports in the cloud firewall: VCN → your subnet → **Security List** →
   Add Ingress Rules for TCP **80** and **443** (source `0.0.0.0/0`).
4. SSH in and install Docker:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu && newgrp docker
```
5. Open the same ports in the OS firewall (Oracle's Ubuntu ships restrictive iptables):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```
6. Clone the repo and configure:
```bash
git clone https://github.com/Sowan3k/My-Bibi-App.git
cd My-Bibi-App
cp .env.example .env
nano .env   # set JWT_SECRET, INVITE_SECRET, FRONTEND_URL=https://yourdomain.duckdns.org
```
7. Start it (add `--profile ai` if you want Ollama for the "I Noticed" features):
```bash
docker compose up -d
# with local AI:
docker compose --profile ai up -d
docker exec -it $(docker ps -qf name=ollama) ollama pull llama3.2:3b
```
8. Point a domain (or a free [DuckDNS](https://duckdns.org) subdomain) at the
   server's public IP.
9. Add HTTPS with [Caddy](https://caddyserver.com):
```bash
sudo apt install -y caddy
# /etc/caddy/Caddyfile:
# yourdomain.duckdns.org {
#     reverse_proxy localhost:3000
# }
sudo systemctl reload caddy
```

Your app is now live at `https://yourdomain.duckdns.org`. Open `/setup`, create
your account, and send the invite link to your partner. Budget an afternoon for
the Oracle networking the first time — it's the price of free.

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
4. Access it from anywhere — two free choices, no port-forwarding:
   - **Private (recommended for couples):** [Tailscale](https://tailscale.com)
     on the home PC and both phones → app at `http://100.x.x.x:3000`. Nobody
     outside your tailnet can even see it.
   - **Public URL:** a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
     gives you `https://yourname.example.com` with HTTPS, for free:
     ```bash
     # on the home PC
     cloudflared tunnel --url http://localhost:3000   # quick throwaway URL
     # or set up a named tunnel for a stable domain (see Cloudflare docs)
     ```

This option means your data never leaves your own hardware at all — the most
on-brand way to host a privacy app, as long as the machine stays on.

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
