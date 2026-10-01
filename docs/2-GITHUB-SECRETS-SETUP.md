# 🔑 STEP 2: GITHUB SECRETS & AUTO-DEPLOYMENT GUIDE

Follow these steps to enable **Automatic 1-Click Deployment** every time you `git push origin main`.

---

## 1️⃣ Open GitHub Repository Settings
1. Open your repository on GitHub: `https://github.com/mohitraj8503/PresenceX-live`
2. Click on **Settings** (top tab bar).
3. In the left sidebar, click **Secrets and variables** ➔ **Actions**.

---

## 2️⃣ Add 4 Repository Secrets
Click **New repository secret** for each of the following:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `VPS_HOST` | `<YOUR_VPS_IP>` | Hostinger VPS Public IP (e.g. `185.123.45.67`) |
| `VPS_USER` | `root` | SSH Login Username |
| `VPS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Your SSH Private Key |
| `VPS_APP_DIR` | `/opt/presencex` | Application directory on VPS |

---

## 3️⃣ Test Automatic Deployment (`git push`)
From now on, whenever you make code updates locally, simply run:

```bash
git add .
git commit -m "feat: updated facial recognition model"
git push origin main
```

### 🚀 What Happens Automatically:
- GitHub Actions pipeline (`.github/workflows/deploy.yml`) starts automatically.
- Runs lint & build tests.
- Connects to your Hostinger VPS via SSH.
- Updates Docker containers & database migrations.
- Runs automated health check script.
- Live website `https://presencex.techtomorrow.in` is updated automatically!
