#!/usr/bin/env bash
# PRESENCEX — AUTOMATED VPS DEPLOYMENT SCRIPT
# Executed by GitHub Actions or manually on VPS

set -euo pipefail

APP_DIR="${VPS_APP_DIR:-/opt/presencex}"

echo "===================================================="
echo "🚀 PRESENCEX: EXECUTING PRODUCTION DEPLOYMENT"
echo "Target Directory: ${APP_DIR}"
echo "===================================================="

cd "${APP_DIR}"

# 1. Fetch & Reset code without touching volumes
echo "📥 Fetching latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2. Verify environment file
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "❌ ERROR: ${APP_DIR}/.env does not exist. Run bootstrap or create .env first."
  exit 1
fi

# 3. Build & update containers (WITHOUT deleting volumes)
echo "🐳 Building & updating Docker services..."
docker compose pull || true
docker compose build --parallel
docker compose up -d --remove-orphans

# 4. Wait for database readiness
echo "⏳ Waiting for PostgreSQL container health check..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' presencex_postgres 2>/dev/null)" = "healthy" ]; do
  sleep 2
done
echo "✅ PostgreSQL is healthy."

# 5. Enable pgvector extension & run schema migrations
echo "⚙️ Enabling pgvector extension..."
docker compose exec -T postgres psql -U presencex_user -d presencex -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "🔄 Running database schema migration..."
docker compose exec -T web npx tsx lib/migrate.ts

# 6. Execute Health Check
echo "🔍 Running Automated Health Verification..."
bash scripts/health-check.sh

echo "===================================================="
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "===================================================="
