# My Bibi — Project Status

## Current Phase: Phase 1 (Complete — ready for end-to-end testing)
## Last Updated: 2026-06-12

## What's done
- [x] Repository created and pushed to GitHub (Sowan3k/My-Bibi-App)
- [x] Project scaffold (CLAUDE.md, README, folder structure)
- [x] Docker Compose config (frontend + backend + ollama, health checks, vault volume)
- [x] `.env.example` + `.env` with generated secrets (JWT + invite)
- [x] Frontend: Next.js 14 + TypeScript + Tailwind setup (dawn-tone palette)
- [x] Frontend: Landing page, setup, join, login pages
- [x] Frontend: Dashboard layout + sidebar (partner online indicator, mobile overlay)
- [x] Frontend: Chat page (Us) — 3s polling, optimistic updates, photo/voice upload
- [x] Frontend: Memory Garden — grid, FTS search, On This Day, save modal
- [x] Frontend: Daily Bloom — prompt, answer flow, waiting state, mutual reveal, history
- [x] Frontend: Journal (My Pages) — list/read/edit, private lock, full CRUD
- [x] Frontend: Little Things — streak, days together, ping cooldown, mood weather
- [x] Frontend: API client (`lib/api.ts`) with JWT + 401 redirect, types (`lib/types.ts`)
- [x] Frontend: PWA manifest, multi-stage Dockerfile
- [x] Frontend: `package.json` fixed (removed non-existent `@radix-ui/react-textarea`, added `tailwindcss-animate`)
- [x] Frontend: `next.config.js` updated (`output: 'standalone'` for Docker multi-stage build)
- [x] Frontend: `npm install` verified — 780 packages, no hard errors
- [x] Backend: FastAPI app with lifespan, CORS (frontend URL only)
- [x] Backend: Auth (setup first-user-only, invite token, join, login, me)
- [x] Backend: Chat, Memory, Bloom, Journal, Little Things routers — all fully implemented
- [x] Backend: Services layer (auth, vault, chat, bloom, journal)
- [x] Backend: Mirror principle guard utility (`utils/mirror_guard.py`)
- [x] Backend: Vault service (markdown-first storage, Obsidian-compatible)
- [x] Backend: Python venv created at `backend/venv/`, all deps installed
- [x] DB: SQLite schema (WAL mode, FTS5, all tables + indexes)
- [x] Both servers smoke-tested: backend health `/health` returns `{"status":"ok"}`, frontend ready in 3.3s
- [x] `dev-start.bat` — one-click Windows dev launcher (creates venv, installs deps, opens both servers)
- [x] `SETUP.md` — full setup guide (Windows, macOS/Linux, Oracle Cloud, Fly.io, home server)
- [x] UI mockup (`docs/mockup.html`) added and linked from README
- [x] Roadmap expanded: 9 new Phase 2–4 features added (Time Capsule, On This Day, Letters, etc.)

## What's next (Phase 1 end-to-end verification)
- [ ] Open http://localhost:3000/setup, create first account, copy invite link
- [ ] Open invite link in a second browser/incognito, create partner account
- [ ] Verify shared chat works: send text, photo, voice note in both directions
- [ ] Verify Memory Garden: save a memory, search for it, check vault markdown file written
- [ ] Verify Daily Bloom: both partners answer → mutual reveal on second answer
- [ ] Verify Journal: create entry, confirm it is NOT visible to other user
- [ ] Verify Little Things: ping cooldown, streak increment on activity
- [ ] Replace placeholder PWA icons with real artwork
- [ ] Add first guardrail tests (mirror principle: A cannot read B's journal/bloom)

## Known issues / notes
- Journal entries stored as plaintext for now; encryption comes in Phase 4
- Bloom prompt pool is deterministic-by-date; can be expanded with a larger bank
- PWA icons are 1×1 pixel placeholders — swap before public release
- No automated tests yet — add during Phase 1 completion
- `dev-start.bat` uses Windows `venv\Scripts\` path; macOS/Linux should use `source venv/bin/activate`
- Next.js 14 has a patched security vulnerability — upgrade to latest Next.js before public release

## Phase 2 items (not started)
- YouTube/Spotify embeds, oEmbed/OpenGraph link previews (server-fetched, no paid API)
- File sharing (documents, PDFs)
- Time Capsule (lock message + media until a future date)
- On This Day (date-math resurface, no AI)
- Shared Playlist Memories (URL + note + who shared it)
- Letters (deliberate delayed messaging)
- Relationship Timeline (aggregates vault markdown)
- Future Dreams board (shared goals with milestone tracking)
- Mood weather extended moods + calendar heatmap

## Phase 3 items (not started)
- Ollama integration via single `ai_service.py` chokepoint
- "I noticed" private self-reflection (own messages only → own screen only)
- Memory resurfacing nudges
- Graceful degradation when Ollama is offline

## Phase 4 items (not started)
- Gift Vault (private per-user encrypted wishlist)
- Monthly Scrapbook (auto-generated, local PDF export)
- Relationship Map (visual garden, canvas optimised for mobile)
- Per-user journal encryption (key derived from author's password)
- PWA service worker + offline polish
- Docker Compose packaging hardening + public release
