# My Bibi ❤️

A self-hosted, privacy-first companion app for two people in a relationship. Built by one couple, for themselves first. Open source so other couples can run their own.

> **"This app will never message your partner for you, never read your partner's mood for you, and never score your relationship. It remembers what you chose to keep, reminds you to show up, and stays out of the way. Your data lives on your server, in plain markdown, owned by both of you equally. We built the limits in on purpose. The limits are the point."**

---

## Ethics Statement

My Bibi is designed with hard limits, not soft suggestions. These are not future roadmap items — they are implemented constraints baked into the API layer:

1. **No impersonation.** The AI never sends messages as either partner. Every message in the chat is written by a real human.
2. **The mirror principle.** AI insights about you go only to you. No mood flags, no "your partner seems distant" alerts. If the app observes person A and reports to person B, that feature is rejected.
3. **No cross-person surveillance.** No sentiment analysis of the other person's messages delivered to you.
4. **Private stays private.** Your journal is encrypted at rest. The person who runs the server cannot casually read your entries.
5. **Equal ownership.** Both partners have identical permissions. There is no superuser over the relationship data.
6. **Data never leaves the server.** No third-party analytics, no telemetry, no external APIs that receive your message content.

---

## Features

| Feature | Description |
|---|---|
| **Shared Chat (Us)** | Private text, photo, and voice note chat between exactly two people |
| **Memory Garden** | Save meaningful moments as markdown — searchable, browsable, yours forever |
| **Daily Bloom** | One shared prompt per day; answers revealed only after both respond |
| **My Pages (Journal)** | Private per-person journal, encrypted at rest, never shared without explicit consent |
| **Little Things** | Streak counter, relationship day milestone, thinking-of-you ping, mood weather |
| **Thoughtfulness Engine** *(Phase 3)* | Local AI that resurfaces memories and suggests small gestures — never spies on your partner |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript | Modern SSR, great PWA support |
| Styling | Tailwind CSS, shadcn/ui | Fast, accessible, beautiful |
| Backend | FastAPI (Python 3.11) | Async, fast, clean |
| Database | SQLite + FTS5 | Zero ops, perfect for two users |
| Storage | Markdown vault (Obsidian-compatible) | Human-readable, no lock-in |
| AI | Ollama (local model — Phase 3) | Completely free, fully private |
| Auth | bcrypt + JWT + invite link | Simple, secure, no third parties |
| Deploy | Docker Compose | One command, self-hosted |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- ~2 GB disk space (more if you add Ollama models)

### One-command setup

```bash
git clone https://github.com/yourusername/my-bibi-app.git
cd my-bibi-app
cp .env.example .env
# Edit .env — at minimum, change JWT_SECRET and INVITE_SECRET to long random strings
docker compose up -d
```

Then open `http://localhost:3000` in your browser.

### First-time setup

1. Go to `http://localhost:3000/setup` — create the first account (you)
2. Copy the invite link shown after setup
3. Send it to your partner — they visit it and create their account
4. Both of you log in and start chatting

That's it. No email verification, no third-party accounts, no cloud sign-in.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Default |
|---|---|---|
| `VAULT_PATH` | Where markdown files and SQLite DB are stored | `./vault` |
| `JWT_SECRET` | Secret for signing JWTs — **change this** | — |
| `JWT_EXPIRE_MINUTES` | JWT lifetime in minutes | `60` |
| `INVITE_SECRET` | Secret for signing invite tokens — **change this** | — |
| `BACKEND_URL` | Internal URL of FastAPI backend | `http://localhost:8000` |
| `FRONTEND_URL` | URL of Next.js frontend (used for CORS) | `http://localhost:3000` |
| `OLLAMA_BASE_URL` | Ollama service URL (Phase 3) | `http://ollama:11434` |
| `OLLAMA_MODEL` | Model name to use (Phase 3) | `llama3.2:3b` |

**Security note:** `JWT_SECRET` and `INVITE_SECRET` must be long, random strings. Generate them with:

```bash
openssl rand -hex 32
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your Server / PC                            │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐   │
│  │  Next.js 14      │    │  FastAPI (Python 3.11)               │   │
│  │  Port 3000       │◄──►│  Port 8000                          │   │
│  │                  │    │                                      │   │
│  │  PWA             │    │  ┌────────────────────────────────┐  │   │
│  │  Tailwind CSS    │    │  │  Routers                       │  │   │
│  │  shadcn/ui       │    │  │  auth / chat / memory /        │  │   │
│  └──────────────────┘    │  │  bloom / journal / little_things│  │   │
│                          │  └────────────────────────────────┘  │   │
│                          │                                      │   │
│                          │  ┌────────────────┐ ┌────────────┐  │   │
│                          │  │ SQLite + FTS5  │ │  Markdown  │  │   │
│                          │  │ vault/db.sqlite│ │  Vault     │  │   │
│                          │  └────────────────┘ └────────────┘  │   │
│                          │                                      │   │
│                          │  vault/                              │   │
│                          │  ├── chat/                           │   │
│                          │  ├── media/                          │   │
│                          │  ├── memories/YYYY-MM/               │   │
│                          │  ├── journal/{user_id}/              │   │
│                          │  └── bloom/                          │   │
│                          └──────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐                                               │
│  │  Ollama          │  (Phase 3 — optional)                         │
│  │  Port 11434      │                                               │
│  │  llama3.2:3b     │                                               │
│  └──────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘

No data ever leaves this box. No external APIs. No telemetry.
```

---

## Self-Hosting Instructions

### On a home server or VPS

1. Clone the repo on your server
2. Copy and edit `.env`
3. Run `docker compose up -d`
4. Point your domain at port 3000 (use Nginx or Caddy as a reverse proxy)
5. Add HTTPS with Let's Encrypt (strongly recommended)

### Backup your data

Everything lives in the `vault/` directory. Back it up with:

```bash
# Simple backup
tar -czf bibi-backup-$(date +%Y%m%d).tar.gz vault/

# Or rsync to another location
rsync -av vault/ user@backup-server:/backups/bibi/
```

The vault contains:
- `db.sqlite` — all messages, memories, bloom answers, streaks
- `memories/` — markdown files for every memory
- `journal/` — per-user journal entries (encrypted in Phase 4)
- `media/` — photos and voice notes
- `bloom/` — daily bloom archive

### Vault Path Configuration

By default the vault lives at `./vault` relative to the docker-compose.yml. To move it:

```env
VAULT_PATH=/mnt/nas/my-bibi-vault
```

The vault is an Obsidian-compatible folder. You can open it in Obsidian for a beautiful read-only view of your memories and journals.

---

## Phases

### Phase 1 — Foundation (current)
- Two-user auth with invite link flow
- Vault path configuration
- Shared chat (text, photos, voice notes)
- Memory Garden (save + browse + search)

### Phase 2 — Rituals
- Rich link previews
- File sharing
- Daily Bloom ritual polish
- Milestones, streak, thinking-of-you ping
- Mood weather (self-disclosure only — never surveillance)

### Phase 3 — Local AI
- Ollama integration (Llama 3.2 3B or Qwen 2.5 3B)
- Memory resurfacing nudges
- Own-journal self-reflection
- Thoughtfulness suggestions
- Mirror principle enforced at every AI call

### Phase 4 — Privacy + Polish
- Per-user journal encryption (key derived from password)
- PWA polish + service worker
- Docker Compose packaging
- Public release

---

## Contributing

My Bibi is open source. Contributions are welcome, with one constraint: **the ethical guardrails are non-negotiable.**

Pull requests that add cross-person surveillance, sentiment analysis of one partner delivered to the other, or any form of AI impersonation will be closed immediately, not because the idea is poorly implemented, but because the feature is the problem.

If you want to add AI features, read the Mirror Principle section in `CLAUDE.md` carefully first.

```bash
# Local development (without Docker)
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # Edit as needed
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## License

MIT License

Copyright (c) 2025 My Bibi Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
