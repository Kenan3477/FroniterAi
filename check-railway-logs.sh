#!/bin/bash

echo "🔍 Checking Railway deployment logs for latency and errors..."
echo "================================================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not installed. Installing..."
    npm install -g @railway/cli
fi

echo "📊 Fetching recent logs from Railway..."
echo ""

# Get logs from the last 3 days
railway logs --limit 500

