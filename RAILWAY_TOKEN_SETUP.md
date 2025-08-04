# Railway Environment Setup Instructions

## CRITICAL: Set Environment Variable in Railway Dashboard

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your project**: FronterAi
3. **Click on your service** (web-production-3ef05)
4. **Go to Variables tab**
5. **Add new environment variable**:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: `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`

## Alternative: Use Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Set the environment variable
railway variables set GITHUB_TOKEN=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

# Deploy
railway up
```

## Verification

After setting the environment variable, Railway will automatically redeploy your application. 

The dashboard should then show:
- ✅ "Connected" status instead of "Simulated"
- 🔢 Real commit counts and file counts
- 📊 Actual competitive analysis scores
- 🎯 Live GitHub repository data

## Current Issue

The dashboard is showing fallback/simulated data because the GITHUB_TOKEN environment variable is not set in Railway, causing the GitHub analyzer to return placeholder values.
