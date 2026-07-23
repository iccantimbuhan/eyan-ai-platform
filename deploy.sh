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
