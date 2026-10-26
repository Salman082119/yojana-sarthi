# Build context must be the repo root:  docker build -t yojana-sarthi .

# ---- build stage: install both packages and build the React frontend ----
FROM node:22-alpine AS build
WORKDIR /app

# Manifests first so dependency layers stay cached across source edits.
COPY package.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend

COPY backend ./backend
COPY frontend ./frontend
RUN npm run build

# ---- runtime stage: production deps + the freshly built frontend ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json server.js ./
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev && npm cache clean --force

COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

EXPOSE 3000

# /ready, not /health: the server starts and answers /health even when it cannot
# reach its database, so only the readiness probe tells you the app is usable.
# The seed runs before the port opens, hence the generous start period.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/ready >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
