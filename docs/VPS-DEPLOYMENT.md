# PRESENCEX — COMPLETE HOSTINGER VPS DEPLOYMENT GUIDE

This document provides the step-by-step instructions for deploying PresenceX to a single **Hostinger Linux VPS** (or any Ubuntu 22.04 / 24.04 LTS VPS).

---

## 🏛️ Target Production Architecture

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                   HOSTINGER LINUX VPS                  │
                                  │                                                        │
INTERNET                          │  ┌──────────────┐                                      │
─────────▶ HTTPS (443) / HTTP (80)▶  │ NGINX        │ (Reverse Proxy & SSL Termination)      │
                                  │  └──────┬───────┘                                      │
                                  │         │                                              │
                                  │         ▼                                              │
                                  │  ┌──────────────┐                                      │
                                  │  │ Next.js Web  │ (Port 3000)                          │
                                  │  └──────┬───────┘                                      │
                                  │         │                                              │
                                  │         ▼                                              │
                                  │  ┌──────────────┐                                      │
                                  │  │ FastAPI AI   │ (Port 8001 - PyTorch MTCNN + 512D)   │
                                  │  └──────┬───────┘                                      │
                                  │         │                                              │
                                  │         ▼                                              │
                                  │  ┌──────────────┐                                      │
                                  │  │ PostgreSQL   │ (Port 5432 - pgvector extension)     │
                                  │  └──────────────┘                                      │
                                  └────────────────────────────────────────────────────────┘
```

---

## 📋 18-Step Production Deployment Guide

### STEP 1: Create VPS & Access Terminal
Obtain a Hostinger KVM VPS (Ubuntu 22.04 or 24.04 LTS) and SSH into your server:
```bash
ssh root@<YOUR_VPS_IP>
```

### STEP 2: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose-plugin
```

### STEP 3: Clone Repository
```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/mohitraj8503/PresenceX-live.git presencex
cd presencex
```

### STEP 4: Configure Production `.env`
Copy the template and set strong credentials:
```bash
cp .env.production.example .env
nano .env
```
Ensure `.env` contains:
```env
POSTGRES_PASSWORD="Your_Strong_Secure_Password_Here"
ADMIN_PASSWORD="Your_Admin_Password_Here"
DATABASE_URL="postgresql://presencex_user:Your_Strong_Secure_Password_Here@postgres:5432/presencex"
FACE_ENGINE_URL="http://face-engine:8001"
FACE_MATCH_THRESHOLD="0.45"
FACE_MODEL_NAME="InceptionResnetV1_VGGFace2"
```

### STEP 5: Start Docker Containers
```bash
docker compose up -d --build
```

### STEP 6: Verify PostgreSQL Container
```bash
docker exec -it presencex_postgres psql -U presencex_user -d presencex -c "SELECT version();"
```

### STEP 7: Enable pgvector Extension
```bash
docker exec -it presencex_postgres psql -U presencex_user -d presencex -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker exec -it presencex_postgres psql -U presencex_user -d presencex -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

### STEP 8: Start FastAPI Face Engine
Verify that `presencex_face_engine` is healthy:
```bash
docker logs presencex_face_engine
curl http://localhost:8001/health
```

### STEP 9: Start Next.js Container
Verify `presencex_web`:
```bash
docker logs presencex_web
```

### STEP 10: Start Nginx Reverse Proxy
Nginx container proxies public traffic on ports 80/443 to `web:3000`.

### STEP 11: Configure Domain DNS
In your domain registrar (TechTomorrow DNS / Hostinger DNS), add an **A Record**:
- Host: `presencex` (or `@`)
- Points to: `<YOUR_VPS_IP>`

### STEP 12: Configure HTTPS SSL (Certbot)
Install Certbot on host VPS to issue SSL for `presencex.techtomorrow.in`:
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d presencex.techtomorrow.in
```

### STEP 13: Export Local Development Database
On your local machine, export the current registered students and 512D face embeddings:
```bash
npm run db:export
```
This generates `presencex-local-export.json`.

### STEP 14: Transfer & Import Data to VPS
Copy `presencex-local-export.json` to the VPS and run import:
```bash
TARGET_DATABASE_URL="postgresql://presencex_user:Your_Strong_Secure_Password_Here@localhost:5432/presencex" npm run db:import
```

### STEP 15: Verify 512D Vector Embeddings
```bash
docker exec -it presencex_postgres psql -U presencex_user -d presencex -c "SELECT COUNT(*), vector_dims(embedding) FROM face_profiles GROUP BY vector_dims(embedding);"
```

### STEP 16: Test Online Face Registration
Open `https://presencex.techtomorrow.in/admin/register`:
- Enter Person Details (e.g. Name, Person ID slug `AJU/250609`).
- Align face inside bounds and click **Capture Face**.
- Verify registration succeeds with 512-D MTCNN + InceptionResnetV1 embedding stored.

### STEP 17: Test Online Face Recognition
Open `https://presencex.techtomorrow.in/admin/face-test`:
- Test face capture.
- Verify status returns `recognized: true` with correct student ID and distance.

### STEP 18: Test Online Live Kiosk & Attendance
Open `https://presencex.techtomorrow.in/kiosk`:
- Start live session.
- Click **Verify Now**.
- Verify visible students are recognized in multi-face mode and marked `PRESENT` in PostgreSQL.
