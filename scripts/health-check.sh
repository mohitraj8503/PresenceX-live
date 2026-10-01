#!/usr/bin/env bash
# PRESENCEX — HEALTH CHECK VERIFICATION SCRIPT

set -euo pipefail

APP_DIR="${VPS_APP_DIR:-/opt/presencex}"
cd "${APP_DIR}"

echo "🔍 Verifying Docker Service Containers..."
docker compose ps

# 1. PostgreSQL & pgvector Check
echo "🔍 Checking PostgreSQL and pgvector extension..."
VEC_STATUS=$(docker compose exec -T postgres psql -U presencex_user -d presencex -t -c "SELECT extversion FROM pg_extension WHERE extname='vector';" | tr -d '[:space:]')
if [ -z "${VEC_STATUS}" ]; then
  console.error "❌ ERROR: pgvector extension is NOT enabled in PostgreSQL."
  exit 1
fi
echo "✅ pgvector active: v${VEC_STATUS}"

# 2. FastAPI Internal Health Check
echo "🔍 Checking FastAPI Face Engine internal health..."
FE_HEALTH=$(docker compose exec -T face-engine curl -s http://localhost:8001/health || true)
if [[ "${FE_HEALTH}" != *"presencex-face-engine"* ]]; then
  echo "❌ ERROR: FastAPI Face Engine health check failed. Output: ${FE_HEALTH}"
  exit 1
fi
echo "✅ FastAPI Face Engine is healthy."

# 3. Next.js Web App Check
echo "🔍 Checking Next.js Web application health..."
WEB_HEALTH=$(docker compose exec -T web curl -s http://localhost:3000/api/system/health || true)
if [[ "${WEB_HEALTH}" != *"healthy"* ]]; then
  echo "❌ ERROR: System Health route check failed. Output: ${WEB_HEALTH}"
  exit 1
fi
echo "✅ Next.js Web Application is healthy."

echo "✅ ALL SYSTEM HEALTH CHECKS PASSED CLEANLY!"
