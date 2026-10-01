#!/usr/bin/env bash
# PRESENCEX — ONE-TIME VPS BOOTSTRAP SCRIPT
# Run this script ONCE on a fresh Ubuntu 22.04/24.04 VPS as root or with sudo

set -euo pipefail

echo "===================================================="
echo "🚀 PRESENCEX: ONE-TIME VPS BOOTSTRAP INITIALIZATION"
echo "===================================================="

# 1. Update system packages
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw jq ca-certificates gnupg

# 2. Configure UFW Firewall (Allow SSH 22, HTTP 80, HTTPS 443 only)
echo "🔒 Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 3. Install Docker & Docker Compose plugin
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker Engine..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
fi
apt-get install -y docker-compose-plugin

# 4. Prepare Application Directory
APP_DIR="/opt/presencex"
echo "📁 Setting up application directory at ${APP_DIR}..."
mkdir -p "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "📥 Cloning PresenceX repository into ${APP_DIR}..."
  git clone https://github.com/mohitraj8503/PresenceX-live.git "${APP_DIR}"
fi

cd "${APP_DIR}"

# 5. Create .env from template if missing
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "📄 Creating default .env configuration file..."
  cp .env.production.example .env
  echo "⚠️ IMPORTANT: Edit ${APP_DIR}/.env and set POSTGRES_PASSWORD and ADMIN_PASSWORD before starting services!"
fi

# 6. Make scripts executable
chmod +x scripts/*.sh

echo "===================================================="
echo "✅ VPS BOOTSTRAP COMPLETED SUCCESSFULLY!"
echo "Next Steps:"
echo "1. Set strong passwords in: nano ${APP_DIR}/.env"
echo "2. Run: cd ${APP_DIR} && docker compose up -d --build"
echo "===================================================="
