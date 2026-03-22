# 🚀 RailYatra Deployment Guide

This guide explains how to deploy the RailYatra engine, backend, and frontend.

## Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop/) installed on your machine.
- Node.js (for local development).
- Python 3.10+ (for live status scraper).

## 1. Local Deployment (Docker)

The easiest way to run the production build locally is using Docker. This ensures the C++ engine is compiled, Python environment is provisioned with scraper dependencies, and everything is matched with the backend correctly.

### Step 1: Build the Frontend
Ensure you have the latest frontend build:
```bash
cd frontend
npm install
npm run build
```

### Step 2: Build the Docker Image
From the project root:
```bash
docker build -t railyatra .
```

### Step 3: Run the Container
```bash
docker run -p 3000:3000 railyatra
```
Visit `http://localhost:3000` to use the application.

---

## 2. Cloud Deployment

### Recommended Platforms
- **Railway**: Easiest for Docker-based Node.js apps.
- **Render**: Supports Docker deployments.
- **DigitalOcean App Platform**: Excellent for containerized apps.

### General Steps for Cloud
1.  **Push to GitHub**: Ensure your `Dockerfile`, `backend/`, `frontend/dist/`, `engine/`, and `master_train_data.json` are all pushed to your repository.
2.  **Connect to Platform**: Point your cloud provider to your GitHub repo.
3.  **Automatic Detection**: Most platforms (like Railway or Render) will detect the `Dockerfile` in the root and build it automatically.
4.  **Environment Variables**: 
    - `PORT`: Default 3000.
    - `PDF_BASE_URL`: (Optional) If you are hosting PDFs externally (e.g., S3/R2), set this to the base URL (e.g., `https://storage.railyatra.in/pdfs`). The backend will automatically redirect download requests to this URL.

---

## 3. Manual Build (Linux/No Docker)

If you are not using Docker on a Linux server:

### Build the Engine
**Windows (PowerShell):**
```powershell
cd engine
./build.ps1
```

**Linux/macOS:**
```bash
cd engine
make
```

### Setup Backend
```bash
cd backend
npm install
node server.js
```

### Setup Frontend
Ensure `frontend/dist` exists. The backend will serve it automatically.
