# backend

The Express + PostgreSQL half of [Yojana Saarthi](../README.md). The frontend
lives in [`../frontend`](../frontend) and is served from `../frontend/dist` — see
the [root README](../README.md) for setup, deployment and the full API reference.

```
server.js          Express app: API routes + static hosting of the built frontend
db.js              PostgreSQL connection pool
lib/eligibility.js Scheme matching engine (matches + near-matches)
routes/            auth, schemes, check, applications, admin
middleware/auth.js requireAuth / optionalAuth / requireAdmin
schema.sql         Table definitions
seed.js            The 76 schemes, upserted on server start
tests/             Vitest + Supertest
```

Everything is usually run from the repo root instead:

```bash
npm install    # from the root — installs this package and ../frontend
npm run build  # from the root — builds ../frontend/dist
npm start      # from the root — runs this server
npm test       # from the root — runs the tests here
```

Config lives in `.env` — copy `.env.example` and fill it in.
