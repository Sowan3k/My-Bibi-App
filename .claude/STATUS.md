# My Bibi — Project Status

## Current Phase: Phase 1 (In Progress)
## Last Updated: 2025-06-11

## What's done
- [x] Repository created
- [x] Project scaffold (CLAUDE.md, README, folder structure)
- [x] Docker Compose config (frontend + backend + ollama, health checks, vault volume)
- [x] `.env.example` with all environment variables
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
- [x] Backend: FastAPI app with lifespan, CORS (frontend URL only)
- [x] Backend: Auth (setup first-user-only, invite token, join, login, me)
- [x] Backend: Chat, Memory, Bloom, Journal, Little Things routers
- [x] Backend: Services layer (auth, vault, chat, bloom, journal)
- [x] Backend: Mirror principle guard utility (`utils/mirror_guard.py`)
- [x] Backend: Vault service (markdown-first storage, Obsidian-compatible)
- [x] DB: SQLite schema (WAL mode, FTS5, all tables + indexes)

## What's next (Phase 1 completion)
- [ ] `npm install` + `pip install` smoke test, fix any import/dependency gaps
- [ ] Wire frontend pages to real backend responses end-to-end
- [ ] Verify media upload (photos, voice notes) multipart flow against vault/media/
- [ ] Replace placeholder PWA icons with real artwork
- [ ] Run end-to-end test: two browser sessions, one shared chat
- [ ] Add first guardrail tests (mirror principle: A cannot read B's journal/bloom)

## Known issues / notes
- Journal entries stored as plaintext for now; encryption comes in Phase 4
- Bloom prompt pool is deterministic-by-date but hardcoded; can be expanded
- PWA icons are placeholders — swap before public release
- No automated tests yet — add during Phase 1 completion

## Phase 2 items (not started)
- YouTube/Spotify embeds, oEmbed/OpenGraph link previews (server-fetched, no paid API)
- File sharing (documents, PDFs)
- Daily Bloom mutual-reveal polish
- Streak, milestones, thinking-of-you ping UI refinement
- Mood weather display to partner (self-disclosure, not surveillance)

## Phase 3 items (not started)
- Ollama integration via single `ai_service.py` chokepoint
- Fact extractor (rules + small local model) → Caught Moments (visible to both)
- Thoughtfulness Engine nudges (facts only, never emotional inference)
- Own-journal self-reflection (mirror principle enforced — to author only)
- Graceful degradation when Ollama is offline

## Phase 4 items (not started)
- Per-user journal encryption (key derived from author's password)
- PWA service worker + offline polish
- Docker Compose packaging hardening + public README release
