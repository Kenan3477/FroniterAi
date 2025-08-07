#!/usr/bin/env bash
echo "🚀 FRONTIER AI - RAILWAY DEPLOYMENT"
echo "=================================="

# Check if we're authenticated
echo "Checking Railway authentication..."
railway whoami

# Check project status
echo "Checking Railway project status..."
railway status

# If no project, initialize one
echo "Initializing Railway project if needed..."
railway init frontier-ai-comprehensive --template empty

# Deploy the application
echo "Deploying to Railway..."
railway up

# Get the domain
echo "Getting deployment domain..."
railway domain

echo "✅ Deployment process complete!"
echo "Check Railway dashboard for deployment status."
