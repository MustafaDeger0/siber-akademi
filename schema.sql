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
