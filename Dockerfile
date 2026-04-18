# --- Stage 1: Engine Builder ---
FROM alpine:3.20 AS engine-builder
RUN apk add --no-cache g++ make
WORKDIR /app/engine
COPY engine/ .
RUN make -j$(nproc)

# --- Stage 2: Frontend Builder ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --frozen-lockfile || npm install
COPY frontend/ .
RUN npm run build

# --- Stage 3: Final Production Image ---
FROM node:20-alpine
WORKDIR /app

# No runtime dependencies needed for static engine!
# Only copy production backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production --frozen-lockfile || npm install --production

# Compiled engine + built frontend
COPY --from=engine-builder /app/engine/route_engine /app/engine/route_engine
COPY --from=frontend-builder /app/frontend/dist/ /app/frontend/dist/

# Essential Data and backend source code
WORKDIR /app
COPY master_train_data*.json stations.json ./
COPY backend/ ./backend/

ENV PORT=3000
EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "server.js"]
