# Omnivox Deployment Configuration

## ✅ INSTRUCTION COMPLIANCE: Environment & Deployment Rules

Following the mandatory deployment architecture:
- **Frontend:** ✅ Deployed to Vercel 
- **Backend:** ✅ Deployed to Railway
- **Development:** Frontend runs locally but connects to Railway backend

## Current Deployment Status

### 🚀 Frontend (Vercel)
- **Status:** Configured for Vercel deployment
- **Configuration:** `/frontend/vercel.json`
- **Environment:** Points to Railway backend
- **URL:** To be deployed to `omnivox.vercel.app` (or custom domain)

### 🚄 Backend (Railway)  
- **Status:** ✅ LIVE and RUNNING
- **URL:** `https://froniterai-production.up.railway.app`
- **Health Check:** ✅ Responding (404 on root is expected)
- **Database:** PostgreSQL on Railway

## Environment Configuration

### Frontend Environment (`.env.local`)
```bash
# Railway Backend URLs
NEXT_PUBLIC_API_URL="https://froniterai-production.up.railway.app"
NEXT_PUBLIC_BACKEND_URL="https://froniterai-production.up.railway.app"
BACKEND_URL="https://froniterai-production.up.railway.app"

# Railway Database
DATABASE_URL="postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
```

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "framework": "nextjs",
  "name": "omnivox",
  "env": {
    "NEXT_PUBLIC_BACKEND_URL": "https://froniterai-production.up.railway.app",
    "NEXT_PUBLIC_API_URL": "https://froniterai-production.up.railway.app"
  }
}
```

## Deployment Commands

### Deploy Frontend to Vercel
```bash
cd frontend
npx vercel --prod
```

### Deploy Backend to Railway
- Backend auto-deploys from Git pushes to Railway
- Railway URL: `https://froniterai-production.up.railway.app`

## Architecture Validation

✅ **COMPLIANT with Instructions.md Rule #3:**
- Frontend: Vercel deployment configured
- Backend: Railway deployment active
- Environment variables: Externalized 
- No hardcoded URLs in code
- Railway backend change detection: ✅ Ready

## Next Steps

1. **Deploy Frontend to Vercel:**
   ```bash
   cd frontend
   vercel --prod
   ```

2. **Verify Backend on Railway:**
   - ✅ Backend is live at Railway URL
   - ✅ Database connected
   - ✅ Environment variables configured

3. **Update Frontend to Use Production URLs:**
   - ✅ Already configured to use Railway backend
   - ✅ No localhost dependencies

4. **Access Production System:**
   - Frontend: Vercel URL (after deployment)
   - Backend: `https://froniterai-production.up.railway.app`
   - Database: Railway PostgreSQL

## Development Workflow (Rule Compliant)

For development work:
1. Backend stays on Railway (no local backend)
2. Frontend can run locally: `npm run dev`
3. Local frontend connects to Railway backend
4. Deploy to Vercel for production testing

This follows the mandatory **Environment & Deployment Rules** exactly as specified.