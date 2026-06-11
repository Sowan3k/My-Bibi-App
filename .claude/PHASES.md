# My Bibi — Phases & File-Level Checklists

This file tracks every phase with a file-level checklist. Update it as work lands.

---

## Phase 1 — Foundations ✅ Scaffold complete, verifying end-to-end

**Goal:** Two-user auth + invite flow, vault path config, shared chat (text/photos/voice notes), Memory Garden. No AI yet.

### Auth & Invite
- [x] `backend/services/auth_service.py` — bcrypt hashing, JWT create/decode, invite token gen
- [x] `backend/routers/auth.py` — setup (first user only), join (invite), login, me, invite
- [x] `backend/middleware/auth_middleware.py` — `get_current_user`, `require_same_user`
- [x] `frontend/app/(auth)/setup/page.tsx` — first-user setup + invite link display
- [x] `frontend/app/(auth)/join/page.tsx` — partner join via `?token=`
- [x] `frontend/app/(auth)/login/page.tsx` — email/password login
- [ ] Invite link share UX polish (copy-to-clipboard verified on mobile)

### Vault & Storage
- [x] `backend/services/vault_service.py` — init_vault, markdown writers (memories, journal, bloom archive)
- [x] `backend/db/database.py` — async SQLite (WAL, FK on, FTS5)
- [x] `backend/db/schema.sql` — all tables + FTS5 + indexes
- [x] `.env.example` — `VAULT_PATH` and all config
- [x] `.env` — created with generated secrets for local dev
- [x] Vault directory tree created on first boot (verified in smoke test)

### Shared Chat (Us)
- [x] `backend/services/chat_service.py` — get/send messages, save_media, activity log for streak
- [x] `backend/routers/chat.py` — list, send, media upload/serve, SSE stream skeleton
- [x] `frontend/app/(dashboard)/us/page.tsx` — chat UI, 3s polling, optimistic updates, photo/voice upload
- [ ] Voice note record/playback verified in-browser end-to-end
- [ ] Photo thumbnail rendering verified from vault/media/

### Memory Garden
- [x] `backend/routers/memory.py` — list, FTS search, on-this-day, create, delete
- [x] `frontend/app/(dashboard)/memory/page.tsx` — grid, search, On This Day, save modal
- [ ] Memory markdown round-trip verified (file readable in Obsidian)

### Daily Bloom
- [x] `backend/services/bloom_service.py` — prompt generation, mutual-reveal logic, vault archive
- [x] `backend/routers/bloom.py` — today, answer, history
- [x] `frontend/app/(dashboard)/bloom/page.tsx` — prompt, answer flow, waiting state, mutual reveal
- [ ] Verify mutual reveal: answer hidden until both partners submit

### Journal (My Pages)
- [x] `backend/services/journal_service.py` — CRUD with vault markdown writer
- [x] `backend/routers/journal.py` — list, get, create, update, delete (owner-only guard)
- [x] `frontend/app/(dashboard)/journal/page.tsx` — list/read/edit, private lock, full CRUD
- [ ] Verify A cannot access B's journal entries (expect 403)

### Little Things
- [x] `backend/routers/little_things.py` — streak, days_together, ping, mood weather
- [x] `frontend/app/(dashboard)/little-things/page.tsx` — streak, ping cooldown, mood picker
- [ ] Streak increments correctly on daily activity

### Mirror Principle (cross-cutting)
- [x] `backend/utils/mirror_guard.py` — `assert_own_data_only`, `assert_not_partner_analysis`
- [ ] Test: user A cannot fetch user B's journal entry (expect 403)
- [ ] Test: bloom answer hidden until both submitted
- [ ] Test: little-things status returns partner_mood only from partner's own disclosure

### Dev Tooling
- [x] `dev-start.bat` — Windows one-click launcher (venv, npm, both servers)
- [x] `SETUP.md` — full setup guide (Windows, Linux/Mac, Oracle Cloud, Fly.io, home server)
- [x] `docs/mockup.html` — interactive UI mockup (3 screens)

---

## Phase 2 — Connection Layer (Not Started)

**Goal:** Rituals, link embeds, Time Capsule, On This Day, Shared Playlist Memories, Letters, Relationship Timeline, Future Dreams board, Mood Weather calendar heatmap.

### Link Embeds
- [ ] `backend/services/embed_service.py` — oEmbed/OpenGraph fetch (server-side, no external API keys)
- [ ] YouTube + Spotify inline embeds in chat
- [ ] `backend/routers/embed.py` — `/api/embed?url=` endpoint (URL allowlist)

### File Sharing
- [ ] Extend `backend/routers/chat.py` to accept PDF/doc uploads
- [ ] Frontend: file attachment button + download card in chat

### Time Capsule
- [ ] DB: `time_capsules` table (id, creator, title, content, unlock_at, media_paths)
- [ ] `backend/routers/time_capsule.py` — create, list (metadata only before unlock), open (after unlock)
- [ ] Frontend: capsule composer, countdown card, confetti on open
- [ ] Lock enforced at API layer — content blocked before `unlock_at` timestamp

### On This Day
- [ ] DB: already has `memories.memory_date` — query is in `memory.py` (`/on-this-day`)
- [x] Backend endpoint already built
- [ ] Frontend: "On this day" surface on Memory Garden homepage (card above the grid)

### Shared Playlist Memories
- [ ] DB: `songs` table (id, url, title, note, sender_id, created_at)
- [ ] `backend/routers/songs.py` — add, list, delete
- [ ] Frontend: song card with embed renderer (YouTube iframe, Spotify embed) in Memory Garden
- [ ] Store metadata in vault markdown

### Letters
- [ ] DB: `letters` table (id, from_user, content, deliver_at, opened, created_at)
- [ ] `backend/routers/letters.py` — compose, list, open (after deliver_at)
- [ ] Frontend: markdown editor, schedule picker, animated envelope reveal

### Relationship Timeline
- [ ] `backend/routers/timeline.py` — aggregate memories + bloom + milestones in date order
- [ ] Frontend: scrolling timeline, click to open detail

### Future Dreams Board
- [ ] DB: `dreams` table (id, title, notes, status, target_date, completed_at)
- [ ] `backend/routers/dreams.py` — CRUD + complete (moves to timeline)
- [ ] Frontend: board view, progress dots, "fulfilled" confetti

### Milestones & Streak Polish
- [ ] Configurable relationship start date (env var or in-app setting)
- [ ] Anniversary countdowns, reunion dates
- [ ] Streak soft celebration (no guilt mechanics)
- [ ] Mood weather: extended emoji set + calendar heatmap view

---

## Phase 3 — The AI Layer (Not Started)

**Goal:** Ollama integration. Nudges, memory resurfacing, self-reflection on own messages. Guardrail tests for mirror principle.

- [ ] `backend/services/ai_service.py` — single chokepoint for ALL LLM calls
- [ ] Ollama client + model config (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`)
- [ ] Graceful degradation when Ollama offline (all Phase 1/2 features unaffected)
- [ ] "I noticed" private self-reflection: analyse only the calling user's own messages
  - recurring topics, unfinished promises, gratitude opportunities
  - output goes to that user only — never cross-person
- [ ] Memory resurfacing ("one year ago today you saved this moment")
- [ ] Thoughtfulness Engine nudges (facts only, no emotion inference)
- [ ] Guardrail tests: no insight about A is ever delivered to B

---

## Phase 4 — Hardening & Release (Not Started)

**Goal:** Privacy hardening, visual polish, Gift Vault, Monthly Scrapbook, Relationship Map, Docker packaging, public release.

- [ ] Per-user journal encryption (key derived from author's password, server cannot read)
- [ ] Migrate `journal_entries.content_encrypted` from plaintext → encrypted
- [ ] Gift Vault: private per-user encrypted wishlist (never visible to partner, even DB admin)
- [ ] Monthly Scrapbook: auto-generated from vault data, local PDF export
- [ ] Relationship Map: canvas visualisation, flowers/stars/stones by memory type, zoom + pan mobile
- [ ] PWA service worker, offline cache, installability verified on Android + iOS
- [ ] Real PWA icons (192/512) — replace placeholders
- [ ] Upgrade Next.js to latest patched version
- [ ] Docker Compose hardening (health checks, restart policies, secrets management)
- [ ] CI check: fail build if a new outbound network dependency is added
- [ ] Public README ethics statement final pass
- [ ] License confirmed (MIT)

---

## Mirror-principle invariant (applies to every phase)

> An endpoint must NEVER return analysis, journal content, or personal insight
> of user A to user B. Enforced at the API layer via `mirror_guard`, not just UI.
> Every journal/bloom/insight query filters by the calling user's id. Write a
> test for each new endpoint that touches personal data.
