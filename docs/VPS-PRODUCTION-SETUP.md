# PRESENCEX — VPS SELF-HOSTED PRODUCTION ARCHITECTURE & DEPLOYMENT GUIDE

This document provides complete instructions for deploying the **PresenceX AI Facial Recognition Attendance System** on a single self-hosted Linux VPS (Ubuntu 22.04 / 24.04 LTS).

---

## 🏛️ Production System Architecture

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                     PRODUCTION VPS                     │
                                  │                                                        │
INTERNET                          │  ┌──────────────┐                                      │
─────────▶ HTTPS (443) / HTTP (80)▶  │ NGINX / CADDY│ (Reverse Proxy & SSL Termination)      │
                                  │  └──────┬───────┘                                      │
                                  │         │                                              │
                                  │         ├──────────▶ Next.js Web App (Port 3000)       │
                                  │         │            (Server-Side API Routes)          │
                                  │         │                     │                        │
                                  │         │                     ▼                        │
                                  │         └──────────▶ FastAPI Face Engine (Port 8001)   │
                                  │                       (PyTorch MTCNN + 512D ResNet)    │
                                  │                               │                        │
                                  │                               ▼                        │
                                  │                      PostgreSQL 16 + pgvector          │
                                  │                      (Port 5432 - Localhost Only)      │
                                  └────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Production Principles

1. **NO Third-Party Cloud DB Dependencies**: Database is local PostgreSQL 16 + `pgvector` on VPS.
2. **NO Supabase / External SaaS**: 100% self-hosted and private.
3. **Database Security**: PostgreSQL listens **only on `127.0.0.1:5432`** (not exposed to public internet).
4. **FastAPI Engine**: Runs internally on `127.0.0.1:8001`.
5. **Reverse Proxy**: Nginx handles SSL (`certbot`) and routes traffic to Next.js.

---

## 🚀 Step 1: Automated VPS Setup Script

Copy and run `scripts/vps-setup.sh` on your Ubuntu VPS:

```bash
chmod +x scripts/vps-setup.sh
sudo ./scripts/vps-setup.sh
```

### Manual Installation Steps (If Running Manually)

#### 1. Install PostgreSQL 16 and pgvector
```bash
sudo apt update && sudo apt install -y postgresql-16 postgresql-contrib postgresql-16-pgvector
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### 2. Create Database & User
```bash
sudo -u postgres psql -c "CREATE DATABASE presencex;"
sudo -u postgres psql -c "CREATE USER presencex_user WITH ENCRYPTED PASSWORD 'StrongPasswordHere';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE presencex TO presencex_user;"
sudo -u postgres psql -d presencex -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### 3. Secure PostgreSQL
Edit `/etc/postgresql/16/main/postgresql.conf`:
```ini
listen_addresses = 'localhost'
```
Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 🐍 Step 2: Configure FastAPI Face Engine

```bash
cd /var/www/presencex/face-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `/etc/systemd/system/presencex-face-engine.service`:
```ini
[Unit]
Description=PresenceX FastAPI Face Recognition Engine
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/var/www/presencex/face-engine
ExecStart=/var/www/presencex/face-engine/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
Restart=always
Environment=DATABASE_URL=postgresql://presencex_user:StrongPasswordHere@localhost:5432/presencex
Environment=FACE_MATCH_THRESHOLD=0.45
Environment=FACE_MODEL_NAME=InceptionResnetV1_VGGFace2

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl enable presencex-face-engine
sudo systemctl start presencex-face-engine
```

---

## ⚡ Step 3: Configure Next.js Application

Create `/var/www/presencex/.env.local`:
```env
DATABASE_URL="postgresql://presencex_user:StrongPasswordHere@localhost:5432/presencex"
FACE_ENGINE_URL="http://127.0.0.1:8001"
FACE_MATCH_THRESHOLD="0.45"
FACE_MODEL_NAME="InceptionResnetV1_VGGFace2"
ADMIN_PASSWORD="Mohit@123"
```

Build Next.js:
```bash
cd /var/www/presencex
npm run build
```

Create `/etc/systemd/system/presencex-web.service`:
```ini
[Unit]
Description=PresenceX Next.js Web App
After=network.target presencex-face-engine.service

[Service]
User=www-data
WorkingDirectory=/var/www/presencex
ExecStart=/usr/bin/npm start
Restart=always
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl enable presencex-web
sudo systemctl start presencex-web
```

---

## 🌐 Step 4: Configure Nginx & SSL

Create `/etc/nginx/sites-available/presencex`:
```nginx
server {
    server_name presencex.techtomorrow.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }
}
```

Enable site & SSL:
```bash
sudo ln -s /etc/nginx/sites-available/presencex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d presencex.techtomorrow.in
```

---

## 📦 Step 5: Migrate Local Data & Embeddings to VPS

Run the migration script to transfer all local registered students and 512D face vectors to VPS PostgreSQL:

```bash
TARGET_DATABASE_URL="postgresql://presencex_user:StrongPasswordHere@<VPS_IP>:5432/presencex" npm run migrate:production
```

Or execute backup restore locally:
```bash
npm run migrate:production
```

---

## 📊 Step 6: System Health Verification

Verify deployment by calling the online system health endpoint:

```bash
curl -s https://presencex.techtomorrow.in/api/system/health
```

Expected Output:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-01T13:58:00.000Z",
  "services": {
    "nextjs": { "status": "healthy", "version": "16.2.9" },
    "database": {
      "status": "healthy",
      "provider": "Self-Hosted PostgreSQL",
      "pgvector": "active (v0.8.6)"
    },
    "face_engine": {
      "status": "healthy",
      "url": "http://127.0.0.1:8001",
      "data": {
        "status": "ok",
        "service": "presencex-face-engine",
        "model_loaded": true,
        "embedding_dimension": 512,
        "model_name": "InceptionResnetV1_VGGFace2"
      }
    }
  }
}
```
