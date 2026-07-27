#!/usr/bin/env bash

set -euo pipefail

ROOT="$HOME/eyan-ai-platform"
FRONTEND_DEPLOY_DIR="/var/www/eyan.fyi"
HEALTH_URL="http://localhost:3001/api/v1/health"

echo "======================================="
echo "🚀 Deploying EYAN AI Platform"
echo "======================================="

cd "$ROOT"

CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "❌ You are on branch '$CURRENT_BRANCH'. Switch to 'dev' before deploying."
    exit 1
fi

echo ""
echo "📥 Pulling latest code..."
git pull origin dev

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🗄 Running Prisma migrations..."
cd backend
pnpm prisma migrate deploy
cd ..

echo ""
echo "🔨 Building backend..."
pnpm --filter backend build

echo ""
echo "🔨 Building frontend..."
pnpm --filter frontend build

echo ""
echo "🚀 Restarting backend..."
sudo systemctl restart eyan-backend

echo ""
echo "⏳ Waiting for backend to become healthy..."

MAX_RETRIES=30
RETRY_DELAY=2

for ((i=1; i<=MAX_RETRIES; i++)); do
    if curl -fs "$HEALTH_URL" >/dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi

    if [ "$i" -eq "$MAX_RETRIES" ]; then
        echo ""
        echo "❌ Backend failed health check."
        echo ""
        echo "Recent logs:"
        sudo journalctl -u eyan-backend -n 50 --no-pager
        exit 1
    fi

    echo "Waiting... ($i/$MAX_RETRIES)"
    sleep "$RETRY_DELAY"
done

echo ""
echo "======================================="
echo "🔥 Warming Ollama model..."
echo "======================================="

# Reuse the exact Ollama configuration the backend itself uses (see
# backend/src/config/env.ts) instead of hardcoding a base URL or model
# here. Falls back to the same defaults env.ts falls back to, only if a
# key is genuinely absent from backend/.env.
OLLAMA_BASE_URL=$(grep -E '^OLLAMA_BASE_URL=' backend/.env | tail -n1 | cut -d '=' -f2-)
OLLAMA_MODEL=$(grep -E '^OLLAMA_MODEL=' backend/.env | tail -n1 | cut -d '=' -f2-)
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"

echo ""
echo "⏳ Loading model into memory..."

# An empty prompt to /api/generate is Ollama's documented way to load a
# model into memory without generating any tokens — the smallest request
# that still forces a full model load. --max-time matches the backend's
# own AI provider timeout (300s, see ollama.provider.ts) so a slow cold
# load has the same grace period here as it would from a real request.
WARMUP_TMP_FILE="/tmp/ollama-warmup-response.$$"
set +e
WARMUP_HTTP_CODE=$(curl -sS --max-time 300 -o "$WARMUP_TMP_FILE" -w "%{http_code}" \
    -X POST "${OLLAMA_BASE_URL}/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"\"}")
WARMUP_CURL_EXIT=$?
set -e

if [ "$WARMUP_CURL_EXIT" -ne 0 ] || [ "$WARMUP_HTTP_CODE" != "200" ]; then
    echo ""
    echo "❌ Model warm-up failed."
    echo ""
    echo "Model:    ${OLLAMA_MODEL}"
    echo "Endpoint: ${OLLAMA_BASE_URL}/api/generate"
    echo "curl exit code: ${WARMUP_CURL_EXIT}"
    echo "HTTP status:     ${WARMUP_HTTP_CODE}"
    echo ""
    echo "Response:"
    cat "$WARMUP_TMP_FILE" 2>/dev/null || true
    echo ""
    rm -f "$WARMUP_TMP_FILE"
    exit 1
fi

rm -f "$WARMUP_TMP_FILE"
echo "✅ Model warmed successfully."

echo ""
echo "🌐 Deploying frontend..."

sudo rm -rf "${FRONTEND_DEPLOY_DIR:?}/"*
sudo cp -r frontend/dist/* "$FRONTEND_DEPLOY_DIR/"
sudo chown -R www-data:www-data "$FRONTEND_DEPLOY_DIR"

echo ""
echo "🔄 Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "❤️ Backend Health:"
curl "$HEALTH_URL"

echo ""
echo ""
echo "📌 Deployed Commit:"
git log -1 --oneline

echo ""
echo "======================================="
echo "🎉 Deployment completed successfully!"
echo "======================================="
