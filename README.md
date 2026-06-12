# My Bibi ❤️

A self-hosted, privacy-first companion app for two people in a relationship. Built by one couple, for themselves first. Open source so other couples can run their own.

> **"This app will never message your partner for you, never read your partner's mood for you, and never score your relationship. It remembers what you chose to keep, reminds you to show up, and stays out of the way. Your data lives on your server, in plain markdown, owned by both of you equally. We built the limits in on purpose. The limits are the point."**

---

## UI Mockup

Three screens — the chat, the memory garden, and the daily bloom ritual.

👉 **[Open interactive mockup](docs/mockup.html)** — open the file locally in a browser, or view it via GitHub Pages.

| Us (Chat) | Memory Garden | Daily Bloom |
|---|---|---|
| Private shared chat with voice notes, link previews, and a whisper only you see from the thoughtfulness engine | 48 memories planted, caught moments auto-extracted from chat and editable by both | One shared prompt per day — answers revealed only after both people have replied |

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
| **Shared Chat (Us)** | Private text, photo, voice note, and file chat — with rich link previews |
| **Memory Garden** | Save meaningful moments as markdown — searchable, browsable, yours forever |
| **Daily Bloom** | One shared prompt per day; answers revealed only after both respond |
| **Time Capsules** | Seal a message + photo until a future date — neither of you can open early |
| **Letters** | Slow messages with scheduled delivery — a quieter inbox alongside chat |
| **Future Dreams** | A shared board of goals with step milestones; achieved dreams join your timeline |
| **Our Songs** | The playlist of your story — official YouTube/Spotify embeds + the note behind each song |
| **Our Story (Timeline)** | Everything you kept, in chronological order — no AI, just your vault |
| **Garden Map** | Your whole story as an animated garden — every memory a flower, star, or note |
| **Monthly Scrapbook** | Auto-generated keepsake per month; export to PDF locally |
| **My Pages (Journal)** | Private per-person journal, **encrypted at rest** — the server owner can't read it |
| **Gift Vault** | Private encrypted wishlist (sizes, favourites) — invisible to your partner on purpose |
| **I Noticed** | Local AI reflects your *own* words back to you — never your partner's (mirror principle) |
| **Little Things** | Streak, days together, thinking-of-you ping, self-disclosed mood weather + heatmap |
| **Themes** | Light & dark mode, 7 colour themes (incl. Crimson ❤️ and Midnight), 3 text sizes |

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

> **Status:** Phases 1–4 are feature-complete. See `.claude/STATUS.md` for the live checklist and the remaining pre-release polish items.

### Phase 1 — Foundation ✅
- Two-user auth with invite link flow
- Vault path configuration
- Shared chat (text, photos, voice notes)
- Memory Garden (save + browse + search)

### Phase 2 — Rituals & Memory ✅
- Rich link previews, file sharing
- Daily Bloom ritual polish
- Milestones, streak, thinking-of-you ping
- **Mood Weather** — you pick your sky (☀️ ⛅ 🌧 ⛈ 🌙); stored in markdown; calendar heatmap; never inferred, never surveillance
- **Time Capsule** — lock a message + photos + voice note until a future date; neither partner can open early; confetti on unlock
- **On This Day** — date-math resurface of memories from the same day in past years; no AI required
- **Shared Playlist Memories** — save a song URL + a note + who shared it + why; renders official embed; never proxies audio
- **Letters** — deliberate delayed messages with scheduled delivery (tonight / tomorrow morning / custom); slower inbox alongside chat; markdown editor; beautiful paper UI
- **Relationship Timeline** — chronological story built from existing vault markdown; smooth scrolling; click opens the memory
- **Future Dreams board** — shared goals (visit Kyoto, first apartment, learn scuba); attach memories as you move toward them; completed dreams archive into the timeline

### Phase 3 — Local AI ✅
- Ollama integration (Llama 3.2 3B or Qwen 2.5 3B)
- Memory resurfacing nudges
- Own-journal self-reflection
- **"I noticed"** private self-reflection insights — analyses only *your* messages for recurring topics, unspoken gratitude, unfinished promises; output goes to you only; never cross-person; all LLM calls through `ai_service.py`
- Mirror principle enforced at every AI call; degrades gracefully if Ollama is offline

### Phase 4 — Privacy + Polish ✅
- Per-user journal encryption (key derived from password)
- **Gift Vault** — private per-user wishlist (wishes, ring sizes, favourites); encrypted; never visible to partner
- **Monthly Scrapbook** — auto-generated from vault: top photos + memories + blooms + milestones; rendered as magazine layout; PDF export; generated locally, no external services
- **Relationship Map** — visual garden where every memory is a flower/star/stone by type; timeline grows left-to-right; click opens the markdown note; canvas optimised for mobile
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

---

## App mockup

The following is an HTML mockup of the app screens. Copy into an `.html` file and open in a browser to preview.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Bibi ❤️ — App Mockup</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
	:root{
		--paper:#FBF5EF;
		--rose:#E8AFB5;
		--rose-deep:#C96F7B;
		--sage:#9DB89A;
		--sage-deep:#5F7A5C;
		--peach:#F6E3D3;
		--ink:#4A3F3B;
		--ink-soft:#8A7B74;
		--white:#FFFFFF;
	}
	*{margin:0;padding:0;box-sizing:border-box;}
	body{
		font-family:'Nunito',sans-serif;
		background:linear-gradient(160deg,#F3DDD6 0%, #FBF5EF 45%, #E3EAD9 100%);
		color:var(--ink);
		min-height:100vh;
		padding:28px 0 40px;
	}
	.intro{max-width:560px;margin:0 auto 22px;padding:0 22px;text-align:center;}
	.intro h1{font-family:'Fraunces',serif;font-weight:600;font-size:30px;letter-spacing:.2px;}
	.intro h1 span{color:var(--rose-deep);}
	.intro p{color:var(--ink-soft);font-size:14px;margin-top:6px;font-weight:600;}
	.rail{
		display:flex;gap:26px;overflow-x:auto;padding:8px 24px 26px;
		scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;
	}
	.rail::-webkit-scrollbar{height:6px;}
	.rail::-webkit-scrollbar-thumb{background:var(--rose);border-radius:3px;}
	.stop{scroll-snap-align:center;flex:0 0 auto;}
	.screen-label{
		text-align:center;font-weight:800;font-size:12px;letter-spacing:1.6px;
		text-transform:uppercase;color:var(--sage-deep);margin-bottom:10px;
	}
	/* ---------- phone frame ---------- */
	.phone{
		width:330px;height:690px;background:#2E2725;border-radius:42px;padding:10px;
		box-shadow:0 24px 50px rgba(74,63,59,.25), 0 4px 12px rgba(74,63,59,.18);
		position:relative;
	}
	.glass{
		width:100%;height:100%;background:var(--paper);border-radius:34px;overflow:hidden;
		display:flex;flex-direction:column;position:relative;
	}
	.notch{
		position:absolute;top:10px;left:50%;transform:translateX(-50%);
		width:96px;height:22px;background:#2E2725;border-radius:12px;z-index:30;
	}
	.statusbar{
		display:flex;justify-content:space-between;align-items:center;
		padding:14px 20px 4px;font-size:11px;font-weight:800;color:var(--ink);
	}
	/* ---------- app header ---------- */
	.apphead{
		padding:8px 16px 12px;display:flex;align-items:center;gap:10px;
		background:linear-gradient(180deg,#F9E8E4, var(--paper));
	}
	.avatar{
		width:38px;height:38px;border-radius:50%;
		background:radial-gradient(circle at 35% 30%, #F7CDD0, var(--rose-deep));
		display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;font-weight:800;
		box-shadow:0 2px 6px rgba(201,111,123,.35);
	}
	.who{flex:1;}
	.who .name{font-family:'Fraunces',serif;font-weight:600;font-size:17px;}
	.who .meta{font-size:11px;color:var(--ink-soft);font-weight:700;display:flex;align-items:center;gap:5px;margin-top:1px;}
	.weather-chip{
		background:#EAF0E4;border:1px solid #CFDCC6;border-radius:20px;
		padding:5px 10px;font-size:11px;font-weight:800;color:var(--sage-deep);
		display:flex;align-items:center;gap:4px;
	}
	.days{
		text-align:center;font-size:10.5px;font-weight:800;color:var(--rose-deep);
		letter-spacing:.8px;padding-bottom:6px;background:var(--paper);
	}
	/* ---------- whisper (thoughtfulness engine) ---------- */
	.whisper{
		margin:10px 14px 4px;background:#FFF;border:1.5px dashed var(--rose);
		border-radius:18px;padding:10px 12px;display:flex;gap:9px;align-items:flex-start;
		box-shadow:0 3px 10px rgba(201,111,123,.08);
	}
	.whisper .icon{font-size:15px;line-height:1.2;}
	.whisper .txt{font-size:12px;line-height:1.45;font-weight:700;color:var(--ink);}
	.whisper .txt em{font-style:normal;color:var(--rose-deep);}
	.whisper .tag{font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink-soft);font-weight:800;margin-top:3px;}
	/* ---------- chat ---------- */
	.chat{flex:1;overflow:hidden;padding:8px 14px;display:flex;flex-direction:column;gap:9px;}
	.bubble{max-width:78%;padding:9px 13px;border-radius:18px;font-size:13px;line-height:1.45;font-weight:600;}
	.her{align-self:flex-start;background:#FFFFFF;border:1px solid #F0DEDA;border-bottom-left-radius:6px;box-shadow:0 2px 5px rgba(74,63,59,.05);}
	.me{align-self:flex-end;background:linear-gradient(135deg,#F2BFC4,var(--rose));color:#5C3338;border-bottom-right-radius:6px;box-shadow:0 2px 6px rgba(201,111,123,.25);}
	.stamp{font-size:9px;color:var(--ink-soft);font-weight:800;margin-top:4px;text-align:right;}
	.yt{
		align-self:flex-start;width:78%;background:#fff;border:1px solid #F0DEDA;border-radius:18px;
		border-bottom-left-radius:6px;overflow:hidden;box-shadow:0 2px 6px rgba(74,63,59,.06);
	}
	.yt .thumb{
		height:84px;background:linear-gradient(120deg,#5F7A5C,#9DB89A);
		display:flex;align-items:center;justify-content:center;position:relative;
	}
	.yt .play{
		width:34px;height:34px;background:rgba(255,255,255,.92);border-radius:50%;
		display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--rose-deep);
	}
	.yt .info{padding:8px 11px;}
	.yt .t1{font-size:12px;font-weight:800;}
	.yt .t2{font-size:10px;color:var(--ink-soft);font-weight:700;margin-top:2px;}
	.voice{
		align-self:flex-end;display:flex;align-items:center;gap:8px;
		background:linear-gradient(135deg,#F2BFC4,var(--rose));color:#5C3338;
		border-radius:18px;border-bottom-right-radius:6px;padding:9px 13px;
		box-shadow:0 2px 6px rgba(201,111,123,.25);
	}
	.voice .bars{display:flex;align-items:center;gap:2.5px;}
	.voice .bars i{display:block;width:2.5px;background:#5C3338;border-radius:2px;opacity:.75;}
	.voice .dur{font-size:11px;font-weight:800;}
	/* ---------- input ---------- */
	.inputbar{
		display:flex;align-items:center;gap:8px;padding:10px 12px 14px;background:var(--paper);
	}
	.flowerbtn{
		width:42px;height:42px;border-radius:50%;flex:0 0 auto;
		background:linear-gradient(135deg,#FBE3D4,var(--peach));border:1.5px solid #EFC9AE;
		display:flex;align-items:center;justify-content:center;font-size:18px;
		box-shadow:0 3px 8px rgba(201,111,123,.18);
	}
	.field{
		flex:1;background:#fff;border:1px solid #EBDCD6;border-radius:22px;
		padding:11px 15px;font-size:12.5px;color:var(--ink-soft);font-weight:700;
	}
	.send{
		width:42px;height:42px;border-radius:50%;flex:0 0 auto;
		background:linear-gradient(135deg,var(--rose),var(--rose-deep));
		display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;
		box-shadow:0 4px 10px rgba(201,111,123,.4);
	}
	/* ---------- bottom nav ---------- */
	.nav{
		display:flex;justify-content:space-around;padding:8px 8px 16px;background:#FFF;
		border-top:1px solid #F1E4DE;
	}
	.nav .item{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9.5px;font-weight:800;color:var(--ink-soft);letter-spacing:.4px;}
	.nav .item .ic{font-size:17px;}
	.nav .item.on{color:var(--rose-deep);}
	.nav .item.on .ic{transform:scale(1.12);}
	/* ---------- garden screen ---------- */
	.gtitle{font-family:'Fraunces',serif;font-weight:600;font-size:21px;padding:6px 18px 2px;}
	.gsub{font-size:11.5px;color:var(--ink-soft);font-weight:700;padding:0 18px 10px;}
	.garden{flex:1;overflow:hidden;padding:0 14px;}
	.mem-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
	.mem{
		background:#fff;border:1px solid #F0E2DC;border-radius:18px;padding:11px;
		box-shadow:0 3px 8px rgba(74,63,59,.05);
	}
	.mem .pf{font-size:20px;}
	.mem .mt{font-size:11.5px;font-weight:800;margin-top:5px;line-height:1.35;}
	.mem .md{font-size:9.5px;color:var(--ink-soft);font-weight:700;margin-top:3px;}
	.mem.sage{background:#F4F8F0;border-color:#DCE7D4;}
	.mem.peachy{background:#FCF1E8;border-color:#F2DCC8;}
	.caught-h{
		display:flex;align-items:center;justify-content:space-between;margin:2px 2px 8px;
	}
	.caught-h .ch1{font-size:12.5px;font-weight:800;color:var(--sage-deep);}
	.caught-h .ch2{font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--ink-soft);background:#EEF3E9;border-radius:10px;padding:3px 8px;}
	.fact{
		background:#fff;border:1px solid #E5ECDF;border-left:4px solid var(--sage);
		border-radius:14px;padding:9px 11px;margin-bottom:8px;
		display:flex;align-items:center;gap:9px;
	}
	.fact .ft{flex:1;font-size:11.5px;font-weight:700;line-height:1.4;}
	.fact .ft b{color:var(--sage-deep);}
	.fact .acts{display:flex;gap:6px;font-size:12px;opacity:.55;}
	/* ---------- bloom screen ---------- */
	.bloomwrap{flex:1;overflow:hidden;padding:4px 18px;display:flex;flex-direction:column;}
	.streak{
		display:flex;align-items:center;gap:8px;background:#FCF1E8;border:1px solid #F2DCC8;
		border-radius:16px;padding:9px 13px;margin-bottom:14px;
	}
	.streak .num{font-family:'Fraunces',serif;font-size:21px;font-weight:600;color:var(--rose-deep);}
	.streak .lbl{font-size:10.5px;font-weight:800;color:var(--ink-soft);line-height:1.35;}
	.bloomcard{
		background:#fff;border:1.5px solid #F0DEDA;border-radius:24px;padding:20px 18px;
		text-align:center;box-shadow:0 6px 18px rgba(201,111,123,.1);
	}
	.bloomcard .bflower{font-size:34px;}
	.bloomcard .bq{
		font-family:'Fraunces',serif;font-size:17px;font-weight:500;line-height:1.5;margin:10px 4px 4px;
	}
	.bloomcard .bd{font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--ink-soft);}
	.answerbox{
		margin-top:14px;background:var(--paper);border:1.5px dashed var(--rose);
		border-radius:16px;padding:13px;font-size:12px;color:var(--ink-soft);
		font-weight:700;text-align:left;min-height:64px;
	}
	.bloombtn{
		margin-top:12px;background:linear-gradient(135deg,var(--rose),var(--rose-deep));
		color:#fff;border-radius:22px;padding:12px;font-size:13px;font-weight:800;
		box-shadow:0 5px 14px rgba(201,111,123,.35);
	}
	.waiting{
		margin-top:13px;display:flex;align-items:center;gap:8px;justify-content:center;
		font-size:11.5px;font-weight:800;color:var(--sage-deep);
	}
	.dot{width:7px;height:7px;border-radius:50%;background:var(--sage);}
	.footer{
		text-align:center;color:var(--ink-soft);font-size:11.5px;font-weight:700;
		max-width:520px;margin:4px auto 0;padding:0 22px;line-height:1.6;
	}
	.footer b{color:var(--rose-deep);}
</style>
</head>
<body>

<div class="intro">
	<h1>My Bibi <span>❤️</span></h1>
	<p>A home for two people · self-hosted · nobody else can read it</p>
</div>

<div class="rail">

	<!-- ============ SCREEN 1 : US (CHAT) ============ -->
	<div class="stop">
		<div class="screen-label">Us — the chat</div>
		<div class="phone"><div class="glass">
			<div class="notch"></div>
			<div class="statusbar"><span>04:57</span><span>▲ ▽ ●●● 🔋</span></div>

			<div class="apphead">
				<div class="avatar">L</div>
				<div class="who">
					<div class="name">Lamia</div>
					<div class="meta">last seen just now</div>
				</div>
				<div class="weather-chip">🌦 stormy today</div>
			</div>
			<div class="days">2,557 DAYS OF US 🌱</div>

			<div class="whisper">
				<div class="icon">💭</div>
				<div>
					<div class="txt">Her exams start <em>Monday</em> — she asked for light, compact chats this week 🌸</div>
					<div class="tag">thoughtfulness · only you see this</div>
				</div>
			</div>

			<div class="chat">
				<div class="bubble her">Sowan!! did you submit the Japan form?? 👀</div>
				<div class="bubble me">Submitted. 4am. I'm a machine 😤<div class="stamp">04:02 ✓✓</div></div>
				<div class="bubble her">I'm so proud of you 🥹 also listen to this while you study—</div>
				<div class="yt">
					<div class="thumb"><div class="play">▶</div></div>
					<div class="info">
						<div class="t1">Snowman — Sia</div>
						<div class="t2">youtube.com · tap to play here</div>
					</div>
				</div>
				<div class="voice">
					<span>▶</span>
					<span class="bars"><i style="height:6px"></i><i style="height:12px"></i><i style="height:8px"></i><i style="height:15px"></i><i style="height:7px"></i><i style="height:11px"></i><i style="height:5px"></i><i style="height:13px"></i><i style="height:8px"></i></span>
					<span class="dur">0:11</span>
				</div>
				<div class="bubble her">go to your class and then SLEEP. don't wait for me tonight, I'm out with the girls 💃</div>
			</div>

			<div class="inputbar">
				<div class="flowerbtn">🌷</div>
				<div class="field">Write something sweet…</div>
				<div class="send">➤</div>
			</div>

			<div class="nav">
				<div class="item on"><span class="ic">💬</span>Us</div>
				<div class="item"><span class="ic">🌱</span>Garden</div>
				<div class="item"><span class="ic">🌸</span>Bloom</div>
				<div class="item"><span class="ic">🤍</span>Me</div>
			</div>
		</div></div>
	</div>

	<!-- ============ SCREEN 2 : MEMORY GARDEN ============ -->
	<div class="stop">
		<div class="screen-label">Memory Garden</div>
		<div class="phone"><div class="glass">
			<div class="notch"></div>
			<div class="statusbar"><span>04:58</span><span>▲ ▽ ●●● 🔋</span></div>

			<div class="gtitle">Our garden 🌱</div>
			<div class="gsub">48 memories planted · 7 years growing</div>

			<div class="garden">
				<div class="mem-grid">
					<div class="mem peachy">
						<div class="pf">🎂</div>
						<div class="mt">Lamia's birthday</div>
						<div class="md">in 9 days · yearly</div>
					</div>
					<div class="mem">
						<div class="pf">🐈</div>
						<div class="mt">Mishti was sick, vet on Sat</div>
						<div class="md">saved by Lamia</div>
					</div>
					<div class="mem sage">
						<div class="pf">🇯🇵</div>
						<div class="mt">METI application submitted!</div>
						<div class="md">today, 04:02 · milestone</div>
					</div>
					<div class="mem">
						<div class="pf">💍</div>
						<div class="mt">"After Japan, we plan the wedding"</div>
						<div class="md">saved by Sowan</div>
					</div>
				</div>

				<div class="caught-h">
					<div class="ch1">🍃 Caught Moments</div>
					<div class="ch2">both of you see this</div>
				</div>
				<div class="fact">
					<div class="ft">Lamia's <b>exams start Monday</b> — she asked for light chats</div>
					<div class="acts">✏️ ✖</div>
				</div>
				<div class="fact">
					<div class="ft">She's <b>out with friends tonight</b> — "don't wait for me"</div>
					<div class="acts">✏️ ✖</div>
				</div>
				<div class="fact">
					<div class="ft">Sowan expects the <b>internship reply</b> after screening</div>
					<div class="acts">✏️ ✖</div>
				</div>
			</div>

			<div class="nav">
				<div class="item"><span class="ic">💬</span>Us</div>
				<div class="item on"><span class="ic">🌱</span>Garden</div>
				<div class="item"><span class="ic">🌸</span>Bloom</div>
				<div class="item"><span class="ic">🤍</span>Me</div>
			</div>
		</div></div>
	</div>

	<!-- ============ SCREEN 3 : DAILY BLOOM ============ -->
	<div class="stop">
		<div class="screen-label">Daily Bloom</div>
		<div class="phone"><div class="glass">
			<div class="notch"></div>
			<div class="statusbar"><span>04:59</span><span>▲ ▽ ●●● 🔋</span></div>

			<div class="gtitle">Daily Bloom 🌸</div>
			<div class="gsub">Answer privately. You see each other's words only when both have bloomed.</div>

			<div class="bloomwrap">
				<div class="streak">
					<div class="num">12</div>
					<div class="lbl">days blooming together<br>no pressure — flowers grow back 🌼</div>
				</div>

				<div class="bloomcard">
					<div class="bflower">🌷</div>
					<div class="bq">"One small thing they did this week that you never said thank you for."</div>
					<div class="bd">Today's bloom · June 12</div>
					<div class="answerbox">Write it here, only for her…</div>
					<div class="bloombtn">Plant my answer 🌱</div>
					<div class="waiting"><span class="dot"></span> Lamia answered today's Bloom. Yours is waiting.</div>
				</div>
			</div>

			<div class="nav">
				<div class="item"><span class="ic">💬</span>Us</div>
				<div class="item"><span class="ic">🌱</span>Garden</div>
				<div class="item on"><span class="ic">🌸</span>Bloom</div>
				<div class="item"><span class="ic">🤍</span>Me</div>
			</div>
		</div></div>
	</div>

</div>

<div class="footer">
	Swipe to see all three screens → <br>
	<b>Your vault, your server, your story.</b> No accounts. No analytics. No one between you two.
</div>

</body>
</html>
```
