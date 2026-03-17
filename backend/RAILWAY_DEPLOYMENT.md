# Railway Deployment Instructions

This service should be deployed from the `/backend` directory.

## Configuration Required in Railway Dashboard:
1. Go to Service Settings → Source
2. Set "Root Directory" to: `backend`
3. Save and redeploy

## Build Configuration:
- Build Command: `npm run build` 
- Start Command: `npm run start`
- Node Version: 18.x
- Environment: production

Last updated: $(date)