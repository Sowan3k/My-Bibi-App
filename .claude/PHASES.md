# My Bibi — Phases & File-Level Checklists

This file tracks every phase with a file-level checklist. Update it as work lands.

---

## Phase 1 — Foundations (In Progress)

**Goal:** Two-user auth + invite flow, vault path config, shared chat (text/photos/voice notes), Memory Garden. No AI yet.

### Auth & Invite
- [x] `backend/services/auth_service.py` — bcrypt hashing, JWT create/decode, invite token gen
- [x] `backend/routers/auth.py` — setup (first user only), join (invite), login, me, invite
- [x] `backend/middleware/auth_middleware.py` — `get_current_user`, `require_same_user`
- [x] `frontend/app/(auth)/setup/page.tsx` — first-user setup + invite link display
- [x] `frontend/app/(auth)/join/page.tsx` — partner join via `?token=`
- [x] `frontend/app/(auth)/login/page.tsx` — email/password login
- [ ] Invite link share UX polish (copy-to-clipboard, QR optional)

### Vault & Storage
- [x] `backend/services/vault_service.py` — init_vault, markdown writers
- [x] `backend/db/database.py` — async SQLite (WAL, FK on)
- [x] `backend/db/schema.sql` — all tables + FTS5 + indexes
- [x] `.env.example` — `VAULT_PATH` and all config
- [ ] Verify vault directory tree is created on first boot

### Shared Chat (Us)
- [x] `backend/services/chat_service.py` — get/send messages, save_media
- [x] `backend/routers/chat.py` — list, send, media upload/serve, SSE stream
- [x] `frontend/app/(dashboard)/us/page.tsx` — chat UI, polling, uploads
- [ ] Voice note record/playback verified in-browser
- [ ] Photo thumbnail rendering verified from vault/media/

### Memory Garden
- [x] `backend/services/` memory logic + `backend/routers/memory.py`
- [x] `frontend/app/(dashboard)/memory/page.tsx` — grid, search, On This Day, save modal
- [ ] Memory markdown round-trip verified (file readable in editor)

### Mirror Principle (cross-cutting)
- [x] `backend/utils/mirror_guard.py` — `assert_own_data_only`, `assert_not_partner_analysis`
- [ ] Test: user A cannot fetch user B's journal entry (expect 403)
- [ ] Test: bloom answer hidden until both submitted

---

## Phase 2 — Connection Layer (Not Started)

**Goal:** Rich link previews, file sharing, Daily Bloom ritual, milestones, streak, thinking-of-you ping.

- [x] `backend/routers/bloom.py` + `bloom_service.py` (built early)
- [x] `frontend/app/(dashboard)/bloom/page.tsx` (built early)
- [x] `backend/routers/little_things.py` (built early)
- [x] `frontend/app/(dashboard)/little-things/page.tsx` (built early)
- [ ] oEmbed/OpenGraph link preview service (server-fetched, no paid API)
- [ ] YouTube + Spotify inline embeds in chat
- [ ] File sharing (PDF/docs) end-to-end
- [ ] Milestone counter (days together, anniversaries, reunion countdowns)
- [ ] Streak rollup job + soft celebration (no guilt mechanics)
- [ ] Mood weather surfaced to partner as self-disclosure signal

---

## Phase 3 — The AI Layer (Not Started)

**Goal:** Ollama integration. Nudges, memory resurfacing, self-reflection on own journal. Guardrail tests.

- [ ] `backend/services/ai_service.py` — single chokepoint for ALL LLM calls
- [ ] Ollama client + model config (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`)
- [ ] Graceful degradation when Ollama offline (app fully usable with AI off)
- [ ] Fact extractor (rules + small local model) — facts only, no emotion inference
- [ ] Caught Moments UI — every caught fact visible/editable/deletable by both
- [ ] Thoughtfulness Engine nudges (dates, plans, requests)
- [ ] Own-behavior analysis ("you haven't asked about X") — to author only
- [ ] Memory resurfacing ("one year ago today")
- [ ] Guardrail tests: no insight about A is ever delivered to B

---

## Phase 4 — Hardening & Release (Not Started)

**Goal:** Private journal encryption, PWA polish, Docker Compose packaging, public README with ethics statement.

- [ ] Per-user journal encryption (key derived from author's password)
- [ ] Migrate `journal_entries.content_encrypted` from plaintext → encrypted
- [ ] PWA service worker, offline cache, installability verified
- [ ] Real PWA icons (192/512) replacing placeholders
- [ ] Docker Compose hardening (named volumes, restart policies)
- [ ] CI check: fail build if a new outbound network dependency is added
- [ ] Public README ethics statement final pass
- [ ] License confirmed (MIT)

---

## Mirror-principle invariant (applies to every phase)

> An endpoint must NEVER return analysis, journal content, or personal insight
> of user A to user B. Enforced at the API layer via `mirror_guard`, not just UI.
> Every journal/bloom/insight query filters by the calling user's id. Write a
> test for each new endpoint that touches personal data.
