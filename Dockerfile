# --- Stage 1: Engine Builder ---
FROM alpine:3.20 AS engine-builder
RUN apk add --no-cache g++ make
WORKDIR /app/engine
COPY engine/ .
RUN make -j$(nproc)

# --- Stage 2: Frontend Builder ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# --- Stage 3: Final Production Image ---
FROM node:22-alpine
WORKDIR /app

# No runtime dependencies needed for static engine!
# Only copy production backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Compiled engine + built frontend
COPY --from=engine-builder /app/engine/route_engine /app/engine/route_engine
COPY --from=frontend-builder /app/frontend/dist/ /app/frontend/dist/

# Essential Data and backend source code
WORKDIR /app
COPY master_train_data*.json stations.json city_stations.json ./
COPY backend/ ./backend/

ENV PORT=3000 NODE_ENV=production
EXPOSE 3000

# Run as an unprivileged user
RUN chown -R node:node /app
USER node

# Uses $PORT: hosts such as Railway assign their own port.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/readyz" > /dev/null || exit 1

WORKDIR /app/backend
CMD ["node", "server.js"]
