-- My Bibi — SQLite Schema
-- All tables use TEXT primary keys (UUIDs generated in Python).
-- Timestamps are stored as ISO 8601 TEXT.

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'partner',  -- 'owner' | 'partner' (cosmetic only, equal permissions)
    last_active_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_tokens (
    token TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    content TEXT,
    media_type TEXT,    -- NULL | 'photo' | 'voice' | 'file'
    media_path TEXT,
    reply_to TEXT,
    created_at TEXT NOT NULL,
    delivered_at TEXT,  -- set when the partner's client first fetches it
    seen_at TEXT,       -- set when the partner marks the chat as seen
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Idempotent migrations for DBs created before receipts existed.
-- init_db() executes statements one by one and skips ones that error,
-- so "duplicate column" on re-runs is harmless by design.
ALTER TABLE messages ADD COLUMN delivered_at TEXT;
ALTER TABLE messages ADD COLUMN seen_at TEXT;

-- One reaction per person per message (tap same emoji again to remove)
CREATE TABLE IF NOT EXISTS message_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    media_path TEXT,
    memory_date TEXT NOT NULL,   -- YYYY-MM-DD
    created_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    title,
    content,
    content=memories,
    content_rowid=rowid
);

CREATE TABLE IF NOT EXISTS bloom_prompts (
    id TEXT PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    prompt_date TEXT UNIQUE NOT NULL,   -- YYYY-MM-DD, one per day
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bloom_answers (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(prompt_id, user_id),
    FOREIGN KEY (prompt_id) REFERENCES bloom_prompts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    content_encrypted TEXT NOT NULL,    -- plaintext for now; encrypted in Phase 4
    is_shared INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pings (
    id TEXT PRIMARY KEY,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    seen INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (from_user) REFERENCES users(id),
    FOREIGN KEY (to_user) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mood_weather (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mood TEXT NOT NULL,     -- 'sunny' | 'cloudy' | 'stormy'
    set_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS streak_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_date TEXT NOT NULL,    -- YYYY-MM-DD
    UNIQUE(user_id, activity_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- Phase 2 tables
-- ============================================================

-- Couple-level settings (relationship start date, etc.)
CREATE TABLE IF NOT EXISTS couple_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT
);

-- Time Capsules — locked until unlock_at; NEITHER partner can open early
CREATE TABLE IF NOT EXISTS time_capsules (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    media_path TEXT,
    unlock_at TEXT NOT NULL,    -- ISO date; enforced server-side
    opened_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Letters — deliberate delayed messages, a slower inbox alongside chat
CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    title TEXT,
    body TEXT NOT NULL,
    deliver_at TEXT NOT NULL,   -- recipient cannot read before this
    read_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Future Dreams board — shared goals with step milestones
CREATE TABLE IF NOT EXISTS dreams (
    id TEXT PRIMARY KEY,
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT,
    target_date TEXT,
    status TEXT DEFAULT 'dreaming',   -- 'dreaming' | 'achieved'
    achieved_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dream_steps (
    id TEXT PRIMARY KEY,
    dream_id TEXT NOT NULL,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (dream_id) REFERENCES dreams(id)
);

-- Shared Playlist Memories — song URL + note + who shared it (official embeds only)
CREATE TABLE IF NOT EXISTS playlist_memories (
    id TEXT PRIMARY KEY,
    shared_by TEXT NOT NULL,
    url TEXT NOT NULL,
    provider TEXT,              -- 'youtube' | 'spotify' | 'other'
    title TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (shared_by) REFERENCES users(id)
);

-- Link preview cache (OpenGraph data fetched server-side, no paid API)
CREATE TABLE IF NOT EXISTS link_previews (
    url TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT,
    site_name TEXT,
    fetched_at TEXT NOT NULL
);

-- ============================================================
-- Phase 3 tables
-- ============================================================

-- Private AI insights. MIRROR PRINCIPLE: user_id is the ONLY user who
-- can ever see a row. Insights analyse only that user's own words.
CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,         -- 'noticed' | 'resurface'
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- Phase 4 tables
-- ============================================================

-- Gift Vault — private per-user wishlist, encrypted, never visible to partner
CREATE TABLE IF NOT EXISTS gift_wishes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_encrypted TEXT NOT NULL,   -- encrypted JSON {title, note, url}
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON memories(memory_date);
CREATE INDEX IF NOT EXISTS idx_memories_created_by ON memories(created_by);
CREATE INDEX IF NOT EXISTS idx_bloom_prompts_date ON bloom_prompts(prompt_date);
CREATE INDEX IF NOT EXISTS idx_bloom_answers_prompt_id ON bloom_answers(prompt_id);
CREATE INDEX IF NOT EXISTS idx_bloom_answers_user_id ON bloom_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_pings_to_user ON pings(to_user, created_at);
CREATE INDEX IF NOT EXISTS idx_mood_user_id ON mood_weather(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_user_date ON streak_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_capsules_unlock_at ON time_capsules(unlock_at);
CREATE INDEX IF NOT EXISTS idx_letters_deliver_at ON letters(deliver_at);
CREATE INDEX IF NOT EXISTS idx_letters_author ON letters(author_id);
CREATE INDEX IF NOT EXISTS idx_dreams_status ON dreams(status);
CREATE INDEX IF NOT EXISTS idx_dream_steps_dream ON dream_steps(dream_id);
CREATE INDEX IF NOT EXISTS idx_playlist_created ON playlist_memories(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gifts_user ON gift_wishes(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id)
