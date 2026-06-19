# Railway Deployment Guide for CNP Bookstore (Railway-Only)

This guide will help you deploy your Book app to Railway with both a backend server and web frontend, using Railway PostgreSQL instead of Supabase.

## Architecture Overview

Your app has been restructured into three parts:

1. **Backend Server** (`/backend`) - Node.js/Express API
   - Custom JWT authentication with bcrypt
   - Handles payments via Paystack
   - Connects to Railway PostgreSQL database
   - Replaces all Supabase functionality

2. **Web Frontend** (`/web`) - Next.js web application
   - Responsive web platform for desktop/mobile browsers
   - Consumes the backend API
   - No Supabase dependencies

3. **Mobile App** (root directory) - Original Expo app
   - Can continue to work with Supabase or be updated to use new backend API

## Prerequisites

- Railway account (https://railway.app)
- Paystack account (already set up)
- GitHub repository with the code

## Step 1: Set Up Railway PostgreSQL Database

### 1.1 Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository

### 1.2 Add PostgreSQL Database

1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will create a PostgreSQL database

### 1.3 Get Database URL

1. Click on the PostgreSQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL` (you'll need this for the backend)

### 1.4 Run Database Schema

1. Click on the PostgreSQL service
2. Go to "Query" tab
3. Copy and paste the contents of `backend/schema.sql`
4. Click "Run Query" to create all tables

## Step 2: Deploy Backend Server

### 2.1 Create Backend Service

1. In the same Railway project, click "New Service" → "Git"
2. Select your repository
3. Set root directory to `backend`
4. Railway will detect the Node.js project

### 2.2 Set Environment Variables

In your Railway backend service, add these variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Railway PostgreSQL Database
DATABASE_URL=your-postgresql-url-from-step-1.3

# JWT Secret for authentication
JWT_SECRET=generate-a-secure-random-secret-key

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_8aea307757ade32163cc86855638051b6e89b886

# Web URL (update after frontend deployment)
WEB_URL=https://your-frontend-url.railway.app
```

**Important:** Generate a secure JWT_SECRET using:
```bash
openssl rand -base64 32
```

### 2.3 Connect Backend to Database

1. Click on the backend service
2. Go to "Settings" → "Networking"
3. Find the PostgreSQL service in the list
4. Click "Connect" to link the backend to the database

### 2.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Copy the backend URL (e.g., `https://your-backend.railway.app`)

## Step 3: Deploy Web Frontend

### 3.1 Create Frontend Service

1. In the same Railway project, click "New Service" → "Git"
2. Select your repository
3. Set root directory to `web`
4. Railway will detect the Next.js project

### 3.2 Set Environment Variables

In your Railway frontend service, add these variables:

```bash
# API URL (use your deployed backend URL)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_8aea307757ade32163cc86855638051b6e89b886
```

### 3.3 Update Backend WEB_URL

Go back to your backend service environment variables and update:
```bash
WEB_URL=https://your-frontend-url.railway.app
```

### 3.4 Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Copy the frontend URL

## Step 4: Test the Deployment

### 4.1 Test Backend Health

Visit: `https://your-backend.railway.app/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-06-19T...",
  "database": "connected"
}
```

### 4.2 Test Authentication

```bash
# Sign up a new user
curl -X POST https://your-backend.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User","username":"testuser"}'

# Sign in
curl -X POST https://your-backend.railway.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 4.3 Test API Endpoints

```bash
# Get all books
curl https://your-backend.railway.app/api/books

# Get all categories
curl https://your-backend.railway.app/api/categories
```

### 4.4 Test Frontend

Visit: `https://your-frontend-url.railway.app`

You should see the CNP Bookstore web interface.

## Step 5: Add Initial Data

### 5.1 Add Categories via Railway Query

1. Go to your PostgreSQL service
2. Go to "Query" tab
3. Run this query to add sample categories:

```sql
INSERT INTO categories (name, cover_url) VALUES 
('Adventure', 'https://example.com/adventure.jpg'),
('Fairy Tales', 'https://example.com/fairytales.jpg'),
('Educational', 'https://example.com/educational.jpg');
```

### 5.2 Add Sample Books

```sql
INSERT INTO books (title, description, age, category, color, price, cover_image, author) VALUES 
('The Magic Forest', 'A wonderful adventure in the magical forest', '3-5', 'Adventure', '#4CAF50', 1500, 'https://example.com/forest.jpg', 'Jane Doe'),
('Princess Stories', 'Classic fairy tales for little princesses', '4-7', 'Fairy Tales', '#E91E63', 2000, 'https://example.com/princess.jpg', 'John Smith');
```

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain

1. Go to Railway project settings
2. Click "Domains"
3. Add your custom domain (e.g., `api.cnpbookstore.com` for backend)
4. Add another domain for frontend (e.g., `www.cnpbookstore.com`)

### 6.2 Update DNS

Railway will provide DNS records to add to your domain registrar.

## Step 7: Monitor and Scale

### 7.1 View Logs

- Railway provides real-time logs for both services
- Monitor for errors and performance issues

### 7.2 Set Up Alerts

- Configure Railway alerts for downtime
- Set up error tracking (e.g., Sentry)

### 7.3 Scale Resources

- Go to service settings
- Adjust CPU/RAM based on traffic
- Enable auto-scaling if needed

## Troubleshooting

### Backend Issues

**Problem:** Backend won't start
- Check environment variables are set correctly
- Verify DATABASE_URL is correct
- Check Railway logs for errors

**Problem:** Database connection failed
- Verify DATABASE_URL is correct
- Check if backend is connected to PostgreSQL service
- Ensure database schema was created

**Problem:** Authentication fails
- Verify JWT_SECRET is set
- Check if user exists in database
- Verify password hashing is working

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

**Problem:** Tables don't exist
- Run the schema.sql file in Railway Query tab
- Verify all tables were created successfully

**Problem:** Can't insert data
- Check table structure matches schema
- Verify data types are correct
- Check for constraint violations

## Cost Management

Railway pricing:
- Free tier: $5/month credit
- PostgreSQL: ~$5-10/month depending on usage
- Backend: ~$5-20/month depending on usage
- Frontend: ~$5-20/month depending on usage

## Security Best Practices

1. **Never commit secrets to git**
   - Use Railway environment variables
   - Keep `.env` files in `.gitignore`

2. **Use strong JWT_SECRET**
   - Generate a secure random key
   - Never use default or weak secrets

3. **Enable HTTPS**
   - Railway provides automatic SSL certificates
   - Never use HTTP in production

4. **Regular backups**
   - Railway handles database backups
   - Consider Railway backups for application state

## Migration from Supabase

If you have existing data in Supabase:

1. Export your Supabase data
2. Transform it to match the new schema
3. Import into Railway PostgreSQL
4. Update any hardcoded Supabase references in mobile app

## Next Steps

1. Test the deployment thoroughly
2. Set up monitoring and alerts
3. Configure custom domains
4. Update mobile app to use new backend API (optional)
5. Set up CI/CD pipeline
6. Document API endpoints for future development

## Support

- Railway Documentation: https://docs.railway.app
- PostgreSQL Documentation: https://www.postgresql.org/docs
- Next.js Documentation: https://nextjs.org/docs

## Summary

Your CNP Bookstore is now deployed on Railway with:
- ✅ Backend API server (Node.js/Express + PostgreSQL)
- ✅ Web frontend (Next.js)
- ✅ Railway PostgreSQL database
- ✅ Custom JWT authentication
- ✅ Paystack payment integration
- ✅ No Supabase dependencies

The backend provides a complete API for both web and mobile platforms using Railway's infrastructure only.
