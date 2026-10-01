# 🌐 STEP 1: HOSTINGER VPS ONE-TIME SETUP GUIDE

Follow these instructions ONCE on your Hostinger Linux VPS.

---

## 1️⃣ SSH Into Your Hostinger VPS
Open terminal on your local computer and SSH into your VPS:
```bash
ssh root@<YOUR_VPS_IP>
```

---

## 2️⃣ Run 1-Click Bootstrap Script
Execute this command on your VPS:
```bash
bash <(curl -s https://raw.githubusercontent.com/mohitraj8503/PresenceX-live/main/scripts/bootstrap-vps.sh)
```

**What this script does automatically**:
- Updates Linux packages.
- Configures UFW firewall (Allows SSH 22, HTTP 80, HTTPS 443; blocks public DB & AI engine ports).
- Installs Docker Engine & Docker Compose plugin.
- Clones repository into `/opt/presencex`.
- Creates `/opt/presencex/.env` from production template.

---

## 3️⃣ Set Passwords in `/opt/presencex/.env`
Open `/opt/presencex/.env` on VPS:
```bash
nano /opt/presencex/.env
```
Fill in your secret passwords:
```env
POSTGRES_PASSWORD="Your_Strong_Database_Password_Here"
ADMIN_PASSWORD="Mohit@123"
AUTH_SECRET="Your_Random_Auth_Secret_Key_Here"
```
Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

---

## 4️⃣ Issue SSL Certificate (HTTPS)
Run Certbot to secure `presencex.techtomorrow.in`:
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d presencex.techtomorrow.in
```

---

## ✅ VPS Setup Finished!
Now proceed to `docs/2-GITHUB-SECRETS-SETUP.md` to configure 1-click automatic GitHub push deployment.
