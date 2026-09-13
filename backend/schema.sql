-- schema.sql
-- Run this once against your Postgres database to create the tables.
-- (The seed.js script also creates these automatically if they don't exist.)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',   -- 'user' or 'admin'
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
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
  documents TEXT[] NOT NULL DEFAULT '{}',   -- required documents checklist
  steps JSONB NOT NULL DEFAULT '[]',        -- how to apply steps
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eligibility_checks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  input_data JSONB NOT NULL,       -- the answers the person submitted
  matched_scheme_ids JSONB NOT NULL, -- array of scheme ids that matched
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved schemes a user wants to apply to, with their application status
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  scheme_id TEXT REFERENCES schemes(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, scheme_id)
);

-- Password-reset / email-verification tokens (hashed at rest)
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  purpose TEXT NOT NULL,             -- 'password_reset' or 'email_verify'
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- Idempotent migrations for databases that already existed before these
-- columns/tables were added (CREATE TABLE IF NOT EXISTS does NOT add columns
-- to an existing table, so ALTER ... IF NOT EXISTS is needed).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE schemes ADD COLUMN IF NOT EXISTS documents TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE schemes ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]';
