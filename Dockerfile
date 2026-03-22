# --- Stage 1: Engine Builder ---
FROM debian:bookworm-slim AS engine-builder
RUN apt-get update && apt-get install -y --no-install-recommends g++ make \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/engine
COPY engine/ .
RUN make -j$(nproc)

# --- Stage 2: Frontend Builder ---
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --frozen-lockfile || npm install
COPY frontend/ .
RUN npm run build

# --- Stage 3: Final Production Image ---
FROM node:20-bookworm-slim
WORKDIR /app

# Install runtime dependencies: C++ standard library and Python 3 for scraper
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Optimize Python environment by installing dependencies globally
# --break-system-packages is required for Debian 12+ globally, perfectly valid in Docker containers
COPY backend/requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Setup Backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production --frozen-lockfile || npm install --production

# Bring in compiled engine and built frontend
COPY --from=engine-builder /app/engine/route_engine /app/engine/route_engine
COPY --from=frontend-builder /app/frontend/dist/ /app/frontend/dist/

# Copy data and source code (COPY only what's needed)
WORKDIR /app
COPY master_train_data*.json ./
COPY stations.json ./stations.json
COPY backend/ ./backend/

# Runtime Configuration
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "server.js"]
