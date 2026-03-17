# 🚀 OMNIVOX-AI DEPLOYMENT GUIDE
## Frontend (Vercel) + Backend (Railway)

### 📋 Overview
This guide will help you deploy:
- **Backend**: Already running on Railway (`https://froniterai-production.up.railway.app`)
- **Frontend**: Deploy to Vercel with proper backend integration

### ✅ Pre-Deployment Configuration Complete - LATEST FIXES APPLIED

All necessary configuration files have been created and fixed:
- ✅ `frontend/vercel.json` - **FIXED**: Moved to correct location and cleaned up
- ✅ `frontend/.env.production` - Production environment template
- ✅ `frontend/next.config.js` - Updated with Railway backend URLs
- ✅ Fixed all hardcoded URLs to use environment variables
- ✅ All API routes properly configured to proxy to Railway backend

**🔧 LATEST FIXES (Commit: d6de6c3)**
- ✅ Moved `vercel.json` from root to `frontend/vercel.json` 
- ✅ Fixed build path resolution issues
- ✅ Clean JSON configuration without duplicate keys
- ✅ Proper Next.js framework detection configured

---

## 🎯 MANUAL DEPLOYMENT STEPS

### Step 1: Deploy Frontend to Vercel

1. **Visit Vercel Dashboard**
   - Go to https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Select your GitHub repository: `Kenan3477/FroniterAi`
   - Choose the repository and click "Import"

3. **Configure Project Settings**
   ```
   Project Name: omnivox-ai-frontend
   Framework Preset: Next.js
   Root Directory: frontend/
   ```

4. **Environment Variables (REQUIRED)**
   Add these environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://froniterai-production.up.railway.app
   NEXT_PUBLIC_API_URL=https://froniterai-production.up.railway.app
   ```

   **Optional Twilio Configuration (if needed):**
   ```
   NEXT_PUBLIC_TWILIO_SIP_DOMAIN=your-company.sip.twilio.com
   NEXT_PUBLIC_TWILIO_SIP_USERNAME=your-twilio-sip-username
   NEXT_PUBLIC_TWILIO_SIP_PASSWORD=your-secure-sip-password
   NEXT_PUBLIC_SIP_TRANSPORT=UDP
   NEXT_PUBLIC_SIP_CODEC=PCMU
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete (~2-5 minutes)

### Step 2: Configure Railway Backend (If Needed)

Your backend is already running, but if you need to update CORS settings:

1. **Add Frontend Domain to CORS**
   In your Railway backend environment variables, add:
   ```
   FRONTEND_URL=https://your-vercel-app-name.vercel.app
   CORS_ORIGIN=https://your-vercel-app-name.vercel.app
   ```

### Step 3: Test Deployment

1. **Access Your Deployed Frontend**
   - Your Vercel URL will be: `https://your-project-name.vercel.app`
   - Test login with your credentials
   - Verify backend connectivity in browser console

2. **Test Key Features**
   - ✅ Login/Authentication
   - ✅ Dashboard loads with data from Railway backend
   - ✅ Do Not Call functionality
   - ✅ Campaign management
   - ✅ Call dialing (if Twilio configured)

---

## 🔧 Configuration Details

### Frontend Environment Variables

**Required for Production:**
```bash
NEXT_PUBLIC_BACKEND_URL=https://froniterai-production.up.railway.app
NEXT_PUBLIC_API_URL=https://froniterai-production.up.railway.app
```

**Optional (Twilio Integration):**
```bash
NEXT_PUBLIC_TWILIO_SIP_DOMAIN=your-company.sip.twilio.com
NEXT_PUBLIC_TWILIO_SIP_USERNAME=your-twilio-sip-username
NEXT_PUBLIC_TWILIO_SIP_PASSWORD=your-secure-sip-password
```

### Backend Configuration (Railway)

**Current Railway URL:** `https://froniterai-production.up.railway.app`

**Verify these environment variables are set:**
```bash
DATABASE_URL=your-postgresql-url
JWT_SECRET=your-secure-jwt-secret
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

---

## 🌐 Expected URLs After Deployment

- **Frontend (Vercel)**: `https://your-project-name.vercel.app`
- **Backend (Railway)**: `https://froniterai-production.up.railway.app`

All API calls from the frontend will automatically proxy to the Railway backend.

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Frontend loads without errors
- [ ] Login page accessible
- [ ] Authentication works (check Network tab for API calls)
- [ ] Dashboard displays data from backend
- [ ] Business Settings → Do Not Call tab works
- [ ] No CORS errors in browser console
- [ ] All images and assets load correctly

---

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Add your Vercel domain to Railway backend CORS settings
   - Check browser console for specific error messages

2. **Environment Variables Not Working**
   - Ensure environment variables start with `NEXT_PUBLIC_`
   - Redeploy after adding environment variables

3. **API Calls Failing**
   - Check Network tab in browser developer tools
   - Verify Railway backend is running: visit https://froniterai-production.up.railway.app

4. **Build Errors**
   - Check Vercel build logs
   - Ensure all dependencies are in package.json

---

## 📞 Production Readiness

### Security Considerations:
- ✅ All API calls go through frontend API routes (no direct frontend-to-Railway calls)
- ✅ Authentication handled server-side
- ✅ Environment variables properly configured
- ✅ HTTPS enforced on both platforms

### Performance:
- ✅ Static assets served via Vercel CDN
- ✅ API routes cached appropriately
- ✅ Image optimization enabled

### Monitoring:
- Monitor Vercel deployment logs
- Monitor Railway backend logs
- Set up uptime monitoring for both services

---

## 🎉 Deployment Complete!

Once deployed, you'll have:
- **Professional AI Dialler Frontend** hosted on Vercel
- **Enterprise Backend API** running on Railway
- **Seamless Integration** between both platforms
- **Production-ready** configuration with proper security

Your Omnivox-AI platform will be fully operational and accessible worldwide!