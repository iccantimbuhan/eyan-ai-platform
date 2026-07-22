#!/usr/bin/env bash

set -e

echo "📦 Building frontend..."
pnpm build

echo "🧹 Cleaning deployment directory..."
sudo rm -rf /var/www/eyan.fyi/*

echo "📂 Copying files..."
sudo cp -r dist/* /var/www/eyan.fyi/

echo "👤 Setting ownership..."
sudo chown -R www-data:www-data /var/www/eyan.fyi

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Frontend deployed successfully!"
