# Railway Environment Setup Instructions

## Setting up GitHub Token for Production

Since we removed the hardcoded GitHub token for security, you need to set it as an environment variable in Railway:

### Step 1: Log into Railway Dashboard
1. Go to https://railway.app/dashboard
2. Select your FrontierAI project

### Step 2: Set Environment Variable
1. Go to your service settings
2. Click on "Variables" tab
3. Add a new variable:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: `[YOUR_GITHUB_TOKEN_HERE]`

### Step 3: Deploy
The system will automatically restart and use the secure token from environment variables.

## Alternative: Use Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Set the environment variable
railway variables set GITHUB_TOKEN=[YOUR_GITHUB_TOKEN_HERE]

# Deploy
railway up
```

## Security Benefits

✅ Token is not visible in source code
✅ Token is not committed to Git repository  
✅ Different tokens can be used for development/production
✅ Token can be rotated without code changes
✅ Meets GitHub security requirements

## Local Development

For local development, the token is loaded from the `.env` file, which is excluded from Git commits.

## Getting Your GitHub Token

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` permissions
3. Copy the token and use it in the Railway environment variable
