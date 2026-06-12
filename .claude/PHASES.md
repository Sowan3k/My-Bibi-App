# My Bibi — Phases & File-Level Checklists

This file tracks every phase with a file-level checklist. Update it as work lands.

---

## Phase 1 — Foundations ✅ COMPLETE (code; end-to-end manual pass still recommended)

**Goal:** Two-user auth + invite flow, vault path config, shared chat (text/photos/voice notes), Memory Garden. No AI yet.

### Auth & Invite
- [x] `backend/services/auth_service.py` — bcrypt hashing, JWT create/decode, invite token gen
- [x] `backend/routers/auth.py` — setup (first user only), join (invite), login, me, invite + Phase 4 key unlock
- [x] `backend/middleware/auth_middleware.py` — `get_current_user`, `require_same_user`
- [x] `frontend/app/(auth)/setup/page.tsx` — first-user setup + invite link display
- [x] `frontend/app/(auth)/join/page.tsx` — partner join via `?token=`
- [x] `frontend/app/(auth)/login/page.tsx` — email/password login
- [x] Auth pages: animated ASCII-couple background, theme/colour picker available pre-login

### Vault & Storage
- [x] `backend/services/vault_service.py` — init_vault, markdown writers (memories, journal, bloom archive)
- [x] `backend/db/database.py` — async SQLite (WAL, FK on, FTS5)
- [x] `backend/db/schema.sql` — all tables + FTS5 + indexes (incl. Phase 2–4 tables)
- [x] `.env.example` — `VAULT_PATH` and all config

### Shared Chat (Us)
- [x] `backend/services/chat_service.py` — get/send messages, save_media, activity log for streak
- [x] `backend/routers/chat.py` — list, send, media upload/serve, SSE stream skeleton
- [x] `frontend/app/(dashboard)/us/page.tsx` — chat UI, polling, optimistic updates, photo/voice/file upload, link previews

### Memory Garden
- [x] `backend/routers/memory.py` — list, FTS search, on-this-day, create, delete
- [x] `frontend/app/(dashboard)/memory/page.tsx` — grid, search, On This Day, save modal

### Daily Bloom
- [x] `backend/services/bloom_service.py` — prompt generation, mutual-reveal logic, vault archive
- [x] `backend/routers/bloom.py` — today, answer, history
- [x] `frontend/app/(dashboard)/bloom/page.tsx` — prompt, answer flow, waiting state, mutual reveal

### Journal (My Pages)
- [x] `backend/services/journal_service.py` — CRUD with vault markdown writer + Phase 4 encryption
- [x] `backend/routers/journal.py` — list, get, create, update, delete (owner-only guard)
- [x] `frontend/app/(dashboard)/journal/page.tsx` — list/read/edit, private lock, 423-locked state

### Little Things
- [x] `backend/routers/little_things.py` — streak, days_together, ping, mood weather (6 moods), mood history, start date
- [x] `frontend/app/(dashboard)/little-things/page.tsx` — streak, ping cooldown, mood picker, 90-day heatmap, day-one setting

### Mirror Principle (cross-cutting)
- [x] `backend/utils/mirror_guard.py` — `assert_own_data_only`, `assert_not_partner_analysis`
- [x] `backend/tests/test_guardrails.py` — mirror principle + AI-layer subject guard + encryption tests (9 passing)

### Dev Tooling
- [x] `dev-start.bat` — Windows one-click launcher (venv, npm, both servers)
- [x] `SETUP.md` — full setup guide
- [x] `docs/mockup.html` — interactive UI mockup

### Remaining manual verification (run through `dev-start.bat`)
- [ ] Two-browser end-to-end: setup → invite → join → chat both directions
- [ ] Voice note record/playback verified in-browser
- [ ] Memory markdown round-trip verified in Obsidian

---

## Phase 2 — Connection Layer ✅ COMPLETE

**Goal:** Rituals, link previews, file sharing, Time Capsule, On This Day, Shared Playlist Memories, Letters, Relationship Timeline, Future Dreams board, Mood Weather calendar heatmap.

### Link Previews
- [x] `backend/routers/links.py` — `/api/links/preview?url=` OpenGraph fetch, SQLite cache, SSRF guard (private IPs blocked)
- [x] Frontend: preview cards render under chat messages containing URLs

### File Sharing
- [x] `backend/routers/chat.py` already accepts `media_type='file'`
- [x] Frontend: paperclip attach button + file download bubble in chat

### Time Capsule
- [x] DB: `time_capsules` table
- [x] `backend/routers/capsules.py` — create, list (content hidden while sealed — even from author), open (server-enforced after unlock_at), delete (sealed+author only)
- [x] `frontend/app/(dashboard)/capsules/page.tsx` — seal composer, countdown card, open reveal

### On This Day
- [x] Backend endpoint + Memory Garden surface card (was already live)

### Shared Playlist Memories
- [x] DB: `playlist_memories` table
- [x] `backend/routers/playlist.py` — add, list, delete; YouTube/Spotify URL detection
- [x] `frontend/app/(dashboard)/playlist/page.tsx` — official embeds (youtube-nocookie / Spotify iframe), note in handwriting font; audio never proxied

### Letters
- [x] DB: `letters` table
- [x] `backend/routers/letters.py` — write, inbox (delivered only), sent (sealed until delivery), read, take-back (undelivered only)
- [x] `frontend/app/(dashboard)/letters/page.tsx` — inbox/sent tabs, handwriting composer, reading view

### Relationship Timeline
- [x] `backend/routers/timeline.py` — merges memories, achieved dreams, opened capsules, songs, delivered letters, day one
- [x] `frontend/app/(dashboard)/timeline/page.tsx` — "Our Story" vertical thread grouped by year

### Future Dreams Board
- [x] DB: `dreams` + `dream_steps` tables
- [x] `backend/routers/dreams.py` — CRUD, steps, achieve (lands on timeline)
- [x] `frontend/app/(dashboard)/dreams/page.tsx` — board, step checklists, progress bar, achieved section

### Milestones & Streak Polish
- [x] Relationship start date — in-app setting (`couple_settings`), either partner can set
- [x] Mood weather: 6 moods + 90-day calendar heatmap (own moods only — mirror principle)
- [x] Unseen-ping toast ("X is thinking of you") in dashboard shell

---

## Phase 3 — The AI Layer ✅ COMPLETE

**Goal:** Ollama integration. Nudges, memory resurfacing, self-reflection on own messages. Guardrail tests for mirror principle.

- [x] `backend/services/ai_service.py` — single chokepoint for ALL LLM calls (no other module talks to Ollama)
- [x] Ollama client + model config (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`), 30s-cached availability check
- [x] Graceful degradation when Ollama offline (503 with honest message; resurfacing falls back to date-math; nothing else affected)
- [x] "I noticed" private self-reflection (`backend/routers/insights.py`) — SQL filters `sender_id = me`; `assert_single_subject()` guard at the AI layer; output stored per-user, visible only to its subject
- [x] Memory resurfacing — random shared memory + optional AI one-line caption
- [x] `frontend/app/(dashboard)/insights/page.tsx` — mirror explanation, offline state, reflections list
- [x] Guardrail tests: cross-person AI analysis raises (test_ai_layer_rejects_cross_person_subjects)

---

## Phase 4 — Hardening & Release ✅ COMPLETE (release checklist below)

**Goal:** Privacy hardening, visual polish, Gift Vault, Monthly Scrapbook, Relationship Map, Docker packaging, public release.

- [x] Per-user journal encryption (`backend/utils/crypto.py`) — PBKDF2(200k) key from password, Fernet, key lives in process memory only; vault markdown stores ciphertext with `encrypted: true`
- [x] Plaintext → encrypted migration runs automatically at login
- [x] 423 Locked flow: journal & gift vault show "log in to unlock" after server restart
- [x] Gift Vault (`backend/routers/gifts.py` + `frontend/app/(dashboard)/gifts/page.tsx`) — encrypted, no share endpoint on purpose
- [x] Monthly Scrapbook (`backend/routers/scrapbook.py` + `frontend/app/(dashboard)/scrapbook/page.tsx`) — vault-generated month pages, browser print → PDF (local)
- [x] Relationship Map (`frontend/app/(dashboard)/map/page.tsx`) — SVG garden, plants by type, sway animation, tap-to-open, horizontal scroll on mobile
- [x] Real PWA icons (192/512) — generated heart-on-dawn-gradient (`scripts/make_icons.py`)
- [x] PWA service worker via next-pwa (already configured; manual SW removed as redundant)
- [ ] Upgrade Next.js to latest patched version (still on 14.2.3 — do before public release)
- [ ] Docker Compose hardening final pass (health checks exist; review restart policies/secrets)
- [ ] CI check: fail build if a new outbound network dependency is added
- [ ] Public README ethics statement final pass
- [x] License confirmed (MIT)

---

## Design system (cross-cutting) ✅

- [x] Dark mode (class strategy, warm charcoal, pre-paint init script — no flash)
- [x] 7 accent themes: Rose, Crimson ❤️ (red), Ocean, Lavender, Sunset, Forest, Midnight — all CSS-variable driven (`--brand-*`), light & dark
- [x] Text size setting (Cosy / Normal / Large) — root rem scaling
- [x] Fonts: Plus Jakarta Sans (body), Fraunces (display), Caveat (handwriting accents)
- [x] Animation kit: fade/slide/scale/pop entrances, stagger-children, float, heartbeat, shimmer skeletons, glow-pulse, garden sway, ASCII heart rise; `prefers-reduced-motion` respected
- [x] Theme picker available pre-login (auth pages + landing) — persisted in localStorage
- [x] Mobile: bottom tab bar + drawer sidebar; print styles for scrapbook

---

## Mirror-principle invariant (applies to every phase)

> An endpoint must NEVER return analysis, journal content, or personal insight
> of user A to user B. Enforced at the API layer via `mirror_guard`, not just UI.
> Every journal/bloom/insight query filters by the calling user's id. Write a
> test for each new endpoint that touches personal data.
