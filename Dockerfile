# --- Stage 1: Build Engine ---
FROM debian:bookworm AS engine-builder
WORKDIR /app/engine
COPY engine/ .
RUN apt-get update && apt-get install -y g++ make && make clean && make

# --- Stage 2: Build Frontend ---
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 3: Final Image ---
FROM node:20-bookworm-slim
WORKDIR /app

# Install necessary runtime libs for C++
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*

# Copy Backend and install dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production

# Copy built engine binary
COPY --from=engine-builder /app/engine/route_engine /app/engine/route_engine

# Copy all built assets and source
WORKDIR /app
COPY master_train_data.json ./master_train_data.json
COPY stations.json ./stations.json
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist/ ./frontend/dist/

# Expose port
EXPOSE 3001

# Command to run
WORKDIR /app/backend
CMD ["node", "server.js"]
