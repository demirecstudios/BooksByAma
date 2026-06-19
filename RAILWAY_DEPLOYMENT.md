# Railway Deployment Guide for CNP Bookstore

This guide will help you deploy your Book app to Railway with both a backend server and web frontend.

## Architecture Overview

Your app has been restructured into three parts:

1. **Backend Server** (`/backend`) - Node.js/Express API
   - Replaces Supabase Edge Functions
   - Handles authentication, payments, and data operations
   - Connects to your existing Supabase database

2. **Web Frontend** (`/web`) - Next.js web application
   - Responsive web platform for desktop/mobile browsers
   - Consumes the backend API
   - Similar UI/UX to your mobile app

3. **Mobile App** (root directory) - Original Expo app
   - Can continue to work as-is
   - Can optionally consume the new backend API

## Prerequisites

- Railway account (https://railway.app)
- Supabase project (already set up)
- Paystack account (already set up)

## Step 1: Deploy Backend Server

### 1.1 Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository

### 1.2 Configure Backend Service

1. Click "New Service" → "Git"
2. Select your repository
3. Set root directory to `backend`
4. Railway will detect the Node.js project automatically

### 1.3 Set Environment Variables

In your Railway backend service, add these variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://llasuftjrngeexqegtoq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_8aea307757ade32163cc86855638051b6e89b886

# Web URL (update after frontend deployment)
WEB_URL=https://your-frontend-url.railway.app
```

**Important:** Get your Supabase keys from:
- Supabase Dashboard → Project Settings → API
- Use the `service_role` key (not anon key) for backend operations

### 1.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Copy the backend URL (e.g., `https://your-backend.railway.app`)

## Step 2: Deploy Web Frontend

### 2.1 Create Frontend Service

1. In the same Railway project, click "New Service" → "Git"
2. Select your repository
3. Set root directory to `web`
4. Railway will detect the Next.js project

### 2.2 Set Environment Variables

In your Railway frontend service, add these variables:

```bash
# API URL (use your deployed backend URL)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://llasuftjrngeexqegtoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_8aea307757ade32163cc86855638051b6e89b886
```

### 2.3 Update Backend WEB_URL

Go back to your backend service environment variables and update:
```bash
WEB_URL=https://your-frontend-url.railway.app
```

### 2.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Copy the frontend URL

## Step 3: Test the Deployment

### 3.1 Test Backend Health

Visit: `https://your-backend.railway.app/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-06-19T..."
}
```

### 3.2 Test API Endpoints

```bash
# Get all books
curl https://your-backend.railway.app/api/books

# Get all categories
curl https://your-backend.railway.app/api/categories
```

### 3.3 Test Frontend

Visit: `https://your-frontend-url.railway.app`

You should see the CNP Bookstore web interface.

## Step 4: Update Mobile App (Optional)

If you want your mobile app to use the new backend API:

### 4.1 Update Supabase Configuration

In your mobile app, you can continue using the existing Supabase client or switch to the new backend API.

### 4.2 Update API Calls

Replace direct Supabase calls with backend API calls:

```javascript
// Old (direct Supabase)
const { data } = await supabase.from('books').select('*');

// New (backend API)
const response = await fetch('https://your-backend.railway.app/api/books');
const data = await response.json();
```

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Custom Domain

1. Go to Railway project settings
2. Click "Domains"
3. Add your custom domain (e.g., `api.cnpbookstore.com` for backend)
4. Add another domain for frontend (e.g., `www.cnpbookstore.com`)

### 5.2 Update DNS

Railway will provide DNS records to add to your domain registrar.

## Step 6: Monitor and Scale

### 6.1 View Logs

- Railway provides real-time logs for both services
- Monitor for errors and performance issues

### 6.2 Set Up Alerts

- Configure Railway alerts for downtime
- Set up error tracking (e.g., Sentry)

### 6.3 Scale Resources

- Go to service settings
- Adjust CPU/RAM based on traffic
- Enable auto-scaling if needed

## Troubleshooting

### Backend Issues

**Problem:** Backend won't start
- Check environment variables are set correctly
- Verify Supabase credentials
- Check Railway logs for errors

**Problem:** API returns 500 errors
- Check Supabase connection
- Verify database tables exist
- Check service role key permissions

### Frontend Issues

**Problem:** Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check backend is running
- Ensure CORS is configured (already done in backend)

**Problem:** Build fails
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check TypeScript errors

### Database Issues

**Problem:** Can't access Supabase from backend
- Verify SUPABASE_URL is correct
- Check service role key has proper permissions
- Ensure Supabase project is active

## Cost Management

Railway pricing:
- Free tier: $5/month credit
- Backend: ~$5-20/month depending on usage
- Frontend: ~$5-20/month depending on usage
- Database: Supabase has free tier, then paid plans

## Security Best Practices

1. **Never commit secrets to git**
   - Use Railway environment variables
   - Keep `.env` files in `.gitignore`

2. **Use service role key only on backend**
   - Frontend should use anon key
   - Backend uses service role for admin operations

3. **Enable HTTPS**
   - Railway provides automatic SSL certificates
   - Never use HTTP in production

4. **Regular backups**
   - Supabase handles database backups
   - Consider Railway backups for application state

## Next Steps

1. Test the deployment thoroughly
2. Set up monitoring and alerts
3. Configure custom domains
4. Update mobile app to use backend API (optional)
5. Set up CI/CD pipeline
6. Document API endpoints for future development

## Support

- Railway Documentation: https://docs.railway.app
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs

## Summary

Your CNP Bookstore is now deployed on Railway with:
- ✅ Backend API server (Node.js/Express)
- ✅ Web frontend (Next.js)
- ✅ Existing Supabase database
- ✅ Paystack payment integration
- ✅ Mobile app (can be updated optionally)

The backend replaces Supabase Edge Functions and provides a centralized API for both web and mobile platforms.
