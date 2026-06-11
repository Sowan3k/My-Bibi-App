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
    FOREIGN KEY (sender_id) REFERENCES users(id)
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
CREATE INDEX IF NOT EXISTS idx_streak_user_date ON streak_log(user_id, activity_date)
