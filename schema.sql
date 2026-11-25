CREATE TABLE IF NOT EXISTS players (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL,
 username_key TEXT NOT NULL UNIQUE,
 avatar TEXT NOT NULL,
 xp INTEGER NOT NULL DEFAULT 0,
 completed INTEGER NOT NULL DEFAULT 0,
 document TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0,
 created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS players_ranking ON players (xp,completed,created_at);
CREATE TABLE IF NOT EXISTS crews (code TEXT PRIMARY KEY,created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS crew_members (
 player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
 code TEXT NOT NULL REFERENCES crews(code) ON DELETE CASCADE,
 joined_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS crew_members_code ON crew_members(code);
CREATE TABLE IF NOT EXISTS crew_events (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL,
 sender_id TEXT NOT NULL,
 recipient_id TEXT,
 kind TEXT NOT NULL,
 item_key TEXT,
 day_key TEXT NOT NULL,
 created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS crew_events_thanks ON crew_events(sender_id,recipient_id,kind,day_key);
CREATE TABLE IF NOT EXISTS crew_projects (code TEXT PRIMARY KEY REFERENCES crews(code) ON DELETE CASCADE,document TEXT NOT NULL);
