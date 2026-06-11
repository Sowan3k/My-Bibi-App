# CLAUDE.md — My Bibi ❤️

A self-hosted, privacy-first companion app for two people in a relationship. Built by one couple, for themselves first. Open source so other couples can run their own.

This file is the source of truth for any Claude Code session working on this project. Read it fully before writing code.

---

## What this project is

My Bibi is a private space for exactly two people. It helps a busy couple stay close on purpose. It is a shared chat, a shared memory, and a gentle reflection ritual. It is NOT a chatbot that pretends to be either partner, and it is NOT a monitoring tool.

The two users are equal owners. There is no admin who can read the other person's private data.

## Ethical guardrails (non-negotiable, enforce in code and in design)

1. **No impersonation.** The AI never sends messages as either partner. It never speaks in their voice. Every message in the couple's chat is written by a real human.
2. **The mirror principle.** AI insights about a person go ONLY to that person. The AI may show Sowan his own patterns. It may show her hers. It must NEVER deliver a reading of one partner to the other partner. No mood flags, no tone alerts, no "your partner seems distant" notifications. If a feature observes person A and reports to person B, the feature is rejected.
3. **No cross-person surveillance.** No sentiment analysis of the other person's messages delivered to you, regardless of frequency or framing. Consent does not unlock this. The structure itself is the problem.
4. **Private stays private.** Each partner has a private journal space. Entries are private by default, even from the self-hosting partner, until the author explicitly shares them. Implement per-user encryption at rest for private entries so the server owner cannot casually read them.
5. **Equal ownership.** Both partners have identical roles and permissions. There is no superuser over the relationship data.
6. **Shared data is deliberate or transparent.** The shared memory contains what a partner intentionally saved, plus facts the extractor caught from shared chat — and every caught fact is visible, editable, and deletable by both partners in Caught Moments. No hidden memory or profile of either person may exist. Emotional-state inference about a partner is banned at every layer (see Thoughtfulness Engine rules).
7. **Data never leaves the server.** No third-party analytics, no telemetry, no external APIs that receive message content. Everything runs locally or on the couple's own server.

These guardrails are a feature. They go in the README, stated plainly. The restraint is the product.

## Cost constraint: everything must be free

- No paid APIs. No OpenAI/Anthropic/Gemini API calls for core features.
- LLM: local open-source model via **Ollama** (e.g. Llama 3.2 3B or Qwen 2.5 3B)
- Database: **SQLite** (two users, no scale problem)
- Vector/memory search: SQLite FTS5. Add embeddings later only if needed.
- Hosting: self-hosted. Docker Compose for one-command setup.
- Storage format: human-readable **Markdown files** (Obsidian-compatible vault)

## Tech Stack

- **Frontend:** Next.js (App Router), Tailwind. Mobile-first PWA.
- **Backend:** FastAPI (Python).
- **DB:** SQLite + FTS5. Markdown vault on disk.
- **AI:** Ollama, small local model (Phase 3).
- **Auth:** Two-user auth, bcrypt, JWT. Invite link flow.
- **Encryption:** Private journal entries encrypted with key derived from author's password.
- **Deploy:** Docker Compose.

## Phases

- **Phase 1:** Two-user auth + invite flow, vault path config, shared chat with text/photos/voice notes, Memory Garden. No AI yet.
- **Phase 2:** Rich link previews, file sharing, Daily Bloom ritual, milestones, streak, thinking-of-you ping, Mood Weather (self-disclosed only — user picks their sky, never inferred), Time Capsule (either partner locks a message+media until a future date — neither can open early), On This Day (date-math resurface of old memories, no AI), Shared Playlist Memories (store a song URL + a note + who shared it, render official embeds, never proxy audio), Letters (deliberate delayed messages with scheduled delivery — a slower inbox alongside chat), Relationship Timeline (chronological story built from existing vault markdown), Future Dreams board (shared goals with progress milestones, archives into timeline when reached).
- **Phase 3:** Ollama integration: nudges, memory resurfacing, self-reflection on own journal. "I noticed" private insights — analyse ONLY the logged-in user's own messages for recurring topics, unspoken gratitude, unfinished promises; output goes to that user only; never cross-person. All LLM calls route through `ai_service.py`.
- **Phase 4:** Journal encryption, Gift Vault (private per-user wishlist — wishes, ring sizes, favourite things; encrypted, never visible to partner), Monthly Scrapbook (auto-generated from vault: top photos + memories + blooms + milestones; PDF export; generated locally), Relationship Map (visual garden — each memory is a flower/star/stone by type; timeline grows left-to-right; click opens markdown note; canvas optimised for mobile), PWA polish, Docker Compose packaging.

## Architecture Rules

- Enforce the mirror principle at the API layer, not just UI. An endpoint must never return analysis of user A to user B.
- Keep `ai_service.py` as the single chokepoint for all LLM calls.
- All AI features must degrade gracefully if Ollama is offline.
- Memories and journal entries are markdown files first, database rows second.
- No external network calls in core paths.

## Ethics Statement

"This app will never message your partner for you, never read your partner's mood for you, and never score your relationship. It remembers what you chose to keep, reminds you to show up, and stays out of the way. Your data lives on your server, in plain markdown, owned by both of you equally. We built the limits in on purpose. The limits are the point."
