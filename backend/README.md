# योजना सारथी (Yojana Saarthi) — Government Scheme Eligibility Checker

Real full-stack app: **Node.js + Express backend, PostgreSQL database, and a
frontend** — all in one deployable project. Users can register/login, check
scheme eligibility, and their checks are saved to the database.

---

## What's inside

```
backend/
  server.js          - main app (serves API + frontend)
  db.js              - database connection
  schema.sql          - table definitions
  seed.js             - loads the 49 schemes into your database
  routes/
    auth.js           - register/login (JWT, rate-limited)
    schemes.js         - list schemes
    check.js           - eligibility matching engine + near-matches + history
  middleware/
    auth.js            - login-check middleware
  public/
    index.html         - the website itself (form, near-matches, browse, history, share/print)
  Dockerfile           - containerised deployment
  render.yaml          - Render blueprint (free deploy)
  package.json
  .env.example
```

---

## Part 1 — Run it on your own computer first (recommended)

1. Install [Node.js](https://nodejs.org) (LTS version) if you don't have it.
2. Open a terminal in the `backend` folder:
   ```
   cd backend
   npm install
   ```

> **Shortcut:** there's also a root `package.json`, so from the project root
> you can just run `npm install`, `npm start` and `npm run seed` — they
> forward to `backend/` automatically. (If you ever see
> `ENOENT ... package.json`, you're in a folder without a package.json —
> either `cd backend` first or run from the project root.)
3. Create a **free** Postgres database at **[neon.tech](https://neon.tech)**:
   - Sign up (free), create a new project.
   - Copy the "Connection string" it gives you (starts with `postgresql://`).
4. Copy `.env.example` to `.env` and paste your connection string:
   ```
   DATABASE_URL=postgresql://your-real-connection-string-here
   JWT_SECRET=any-long-random-text-you-make-up
   PORT=3000
   ```
5. Load the schemes into your database:
   ```
   npm run seed
   ```
   You should see "Seed complete! Schemes in database: 49"
6. Start the server:
   ```
   npm start
   ```
7. Open **http://localhost:3000** in your browser. Register an account, fill
   the form, check eligibility — it's now a real working product with a real
   database.

---

## Part 2 — Put it on the internet (free) so anyone can use it

You need two free services: **Neon** (database — you already made this above)
and **Render** (to run the server 24/7 with a public URL).

### Step A — Push your code to GitHub
1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new repository (e.g. `yojana-sarthi`).
3. Upload the contents of the `backend` folder to it (GitHub's "Add file →
   Upload files" works fine, or use `git` if you know it).
   **Do NOT upload your `.env` file** — it has your secrets. `.gitignore` is
   already set up to skip it if you use git commands.

### Step B — Deploy on Render
1. Go to [render.com](https://render.com) and sign up (free).
2. Click **New → Web Service**, connect your GitHub repo.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add:
   - `DATABASE_URL` = your Neon connection string
   - `JWT_SECRET` = same random text you used locally
5. Click **Deploy**. Render will give you a live URL like
   `https://yojana-sarthi.onrender.com` — that's your real, independent
   website. Share it with anyone.

**Note:** Render's free tier "sleeps" the server after 15 minutes of no
traffic and takes ~30 seconds to wake up on the next visit. This is normal
for free hosting — upgrading to a paid plan (~$7/month) removes this.

> **Faster option:** the repo ships with a `render.yaml` blueprint. On
> Render, pick **New → Blueprint** and connect the repo — it reads the file,
> builds the image and asks you to fill in `DATABASE_URL`. A `Dockerfile` is
> included too, so the same container runs on Railway/Fly.io/any Docker host.

---

## How the eligibility matching works

Each scheme in the database has a `criteria` JSON field (see `seed.js`), e.g.:
```json
{ "minAge": 18, "occupations": ["farmer"], "requiresLandOwner": true }
```
`routes/check.js` compares the user's submitted answers against this JSON for
every scheme — no scheme's logic is hardcoded in the frontend anymore, so you
can add/edit schemes by just editing the database (or `seed.js` and
re-running `npm run seed`).

The same engine also returns **near-matches**: schemes a person missed by just
1-2 conditions, together with *what* was missing (age, income, category…), so
the UI can show people how close they were.

## Features

- **Eligibility check** — answer the form, get a live list of matching schemes
  from the database.
- **Near-matches** — schemes you missed by 1-2 conditions, with the exact
  missing criteria shown as chips.
- **Browse** — search and filter all schemes by keyword, category, level
  (Central/State) and state.
- **Account + history** — registers/logs in, saves every check, and lets you
  re-run any past check with one click.
- **Share / Print** — export your results to WhatsApp/clipboard or a PDF-style
  printout.
- **Rural/Urban aware** — schemes like PMAY-G and PMAY-U now match correctly
  (data includes a `residences` criterion).

## Adding more schemes later

Open `seed.js`, add a new object to the `schemes` array following the same
pattern, then run `npm run seed` again — it updates the database without
losing any user accounts or history.

## Important note on accuracy

The scheme data (amounts, income limits, eligibility) is indicative and
based on general knowledge of these schemes — government rules change over
time. Always show users a reminder to verify on the official portal (already
included in the UI) before they rely on this for actually applying.
