#!/bin/bash

# finish.sh - Production Build & Deployment Script (NPM Version)
# Usage: ./finish.sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Production Build Process..."

# 1. Pull latest changes (Uncomment if you want to pull from git automatically)
# echo "📥 Pulling latest changes from git..."
# git pull

# 2. Set Package Manager to NPM
PKG_MANAGER="npm"
INSTALL_CMD="npm install"     # Use 'npm ci' if you want strict lockfile adherence
BUILD_CMD="npm run build"

echo "📦 Using package manager: $PKG_MANAGER"

# 3. Install Dependencies
echo "running install..."
$INSTALL_CMD

# 4. Clean Cache
echo "🧹 Cleaning unnecessary caches..."
# Remove Next.js cache to ensure fresh build
rm -rf .next/cache
# Remove node_modules cache if it exists
# rm -rf node_modules/.cache 

echo "✅ Cache cleaned."

# 5. Build Project
echo "🏗️ Building project..."
$BUILD_CMD

# 6. Restart Application (PM2)
APP_NAME="gambut-api" 

if command -v pm2 &> /dev/null; then
    echo "🔄 Restarting PM2 process..."
    # Try to reload for zero-downtime, fallback to restart
    pm2 reload all || pm2 restart all
    echo "✅ PM2 processes restarted."
else
    echo "⚠️ PM2 not found. Skipping restart."
    echo "ℹ️ You can start the app manually with: $PKG_MANAGER start"
fi

echo "🎉 Deployment finished successfully!"