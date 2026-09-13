-- schema.sql
-- Run this once against your Postgres database to create the tables.
-- (The seed.js script also creates these automatically if they don't exist.)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_hi TEXT,
  level TEXT NOT NULL,          -- 'central' or 'state'
  state TEXT,                   -- NULL for central schemes
  ministry TEXT,
  category TEXT,
  description TEXT,
  official_link TEXT,
  criteria JSONB NOT NULL,      -- eligibility rules stored as JSON
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eligibility_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  input_data JSONB NOT NULL,       -- the answers the person submitted
  matched_scheme_ids JSONB NOT NULL, -- array of scheme ids that matched
  created_at TIMESTAMP DEFAULT NOW()
);
