# PRESENCEX — AUTOMATED DEPLOYMENT & OPERATION GUIDE

This document explains the **one-time setup**, **daily developer workflow**, **rollback procedures**, and **backup/restore operations** for PresenceX on Hostinger Linux VPS.

---

## 🏛️ Architecture & Services

```text
INTERNET
   │
   ▼ (HTTPS: 443 / HTTP: 80)
NGINX Reverse Proxy (Container: presencex_nginx)
   │
   ▼ (Internal HTTP: 3000)
Next.js Web App (Container: presencex_web)
   │
   ├──────▶ FastAPI Face Engine (Container: presencex_face_engine:8001)
   │
   └──────▶ PostgreSQL 16 + pgvector (Container: presencex_postgres:5432)
```

---

## 🛠️ Step 1: One-Time VPS Bootstrap Setup

### 1. Provision VPS & Set DNS
- Provision an Ubuntu 22.04 / 24.04 VPS on Hostinger.
- In your DNS provider, set an **A Record** pointing `presencex.techtomorrow.in` to `<YOUR_VPS_IP>`.

### 2. Run One-Time Bootstrap Script on VPS
Connect to VPS as `root` and run:
```bash
bash <(curl -s https://raw.githubusercontent.com/mohitraj8503/PresenceX-live/main/scripts/bootstrap-vps.sh)
```
Or execute manually:
```bash
mkdir -p /opt/presencex && cd /opt/presencex
git clone https://github.com/mohitraj8503/PresenceX-live.git .
bash scripts/bootstrap-vps.sh
```

### 3. Create Production `.env`
Edit `/opt/presencex/.env` on the VPS and set your secret passwords:
```bash
nano /opt/presencex/.env
```
Fill in:
```env
POSTGRES_PASSWORD="Your_Strong_Database_Password"
ADMIN_PASSWORD="Your_Portal_Admin_Password"
AUTH_SECRET="Your_Random_Auth_Secret_Key"

DATABASE_URL="postgresql://presencex_user:Your_Strong_Database_Password@postgres:5432/presencex"
FACE_MATCH_THRESHOLD="0.45"
FACE_MODEL_NAME="InceptionResnetV1_VGGFace2"
FACE_ENGINE_URL="http://face-engine:8001"
NEXT_PUBLIC_APP_URL="https://presencex.techtomorrow.in"
```

### 4. Configure HTTPS SSL (Certbot)
On the host VPS:
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d presencex.techtomorrow.in
```

### 5. Add GitHub Repository Secrets
Go to **GitHub Repo -> Settings -> Secrets and variables -> Actions** and add:

| Secret Name | Value | Example |
| :--- | :--- | :--- |
| `VPS_HOST` | VPS Public IP | `123.45.67.89` |
| `VPS_USER` | SSH User | `root` |
| `VPS_SSH_KEY` | SSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_APP_DIR` | App Directory | `/opt/presencex` |

---

## 🔄 Step 2: Daily Developer Workflow (`git push`)

Once the 1-time setup is complete, **NO MANUAL COMMANDS ARE NEEDED ON THE VPS**.

Simply work locally and push:
```bash
git add .
git commit -m "feat: updated facial recognition model threshold"
git push origin main
```

### What Happens Automatically:
1. GitHub Actions triggers `.github/workflows/deploy.yml`.
2. Code is linted & built locally inside GitHub runner.
3. GitHub Actions SSHs into your VPS at `/opt/presencex`.
4. Pulls latest code, rebuilds Docker containers (`docker compose up -d --build`).
5. Runs PostgreSQL schema migrations (`lib/migrate.ts`).
6. Executes `scripts/health-check.sh` (verifies PostgreSQL, pgvector, FastAPI PyTorch model, and Next.js).
7. Deployment completes with green **✅ DEPLOYED** status!

---

## ⏪ Rollback Procedure

If a bad commit causes an issue on production:

```bash
# On your local machine or VPS:
git checkout <previous-clean-commit-hash>
git push origin main --force
```

Or manually on VPS:
```bash
cd /opt/presencex
git reset --hard <previous-clean-commit-hash>
docker compose up -d --build
```
*Note: PostgreSQL volume `presencex_pgdata` is never deleted during deployment or rollback.*

---

## 📊 Viewing Logs

```bash
# View all container logs:
cd /opt/presencex && docker compose logs -f

# View FastAPI Face Engine logs:
docker logs -f presencex_face_engine

# View Next.js Web App logs:
docker logs -f presencex_web
```

---

## 💾 Database Backup & Restore

### Export Local Data to VPS:
```bash
# 1. Export local database & 512D embeddings:
npm run db:export

# 2. Transfer presencex-local-export.json to VPS /opt/presencex

# 3. On VPS run import:
npm run db:import
```
