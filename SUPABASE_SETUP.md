# Supabase + Netlify Setup Guide

This app has been migrated from cPanel + MySQL to Supabase + Netlify Functions for easier deployment.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Select your organization or create one
4. Enter project name (e.g., "baselist")
5. Create a strong database password
6. Select your region
7. Click **"Create new project"**

The project will be initialized in ~2 minutes.

## 2. Run Database Migrations

Once your Supabase project is ready:

1. Go to the **SQL Editor** tab
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_init_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"**

Your database schema is now ready.

## 3. Get Your Credentials

1. Go to **Project Settings** → **API** (left sidebar)
2. Copy your **Project URL** and **Service Role Key** (keep this secret!)
3. You'll need these for the Netlify environment variables

## 4. Set Up Netlify Environment Variables

If you haven't already:
1. Go to [netlify.com](https://netlify.com)
2. Click **"New site from Git"**
3. Connect your repository
4. Once connected, go to **Site Settings** → **Build & Deploy** → **Environment**
5. Click **"Edit variables"**

Add these two variables:
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Warning:** Never commit the Service Role Key to git. Only set it in Netlify's environment variables.

## 5. Update .env (Local Development)

For local testing, create a `.env` file at the root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Never commit this file to git.

## 6. Deploy

Push your code to your repository:

```bash
git add .
git commit -m "chore: migrate to Supabase + Netlify"
git push origin main
```

Netlify will automatically build and deploy your app.

## 7. Initialize Setup

Once deployed, visit your Netlify URL and complete the setup wizard:
- Enter your admin credentials
- Select your base (military installation)
- Optionally include sample data

## Troubleshooting

**"SUPABASE_URL not found"** → Check Netlify environment variables are set correctly

**"Service Role Key invalid"** → Copy from Supabase **without** extra spaces

**"Connection timeout"** → Your Supabase URL might be wrong; verify in Project Settings

**Database errors** → Check SQL migration ran successfully in Supabase SQL Editor

## API Endpoints

Your Netlify Functions now handle all API routes:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/listings` - List all listings
- `POST /api/listings` - Create listing
- `GET /api/users/:id` - Get user profile
- `POST /api/users/profile/update` - Update profile
- `POST /api/setup/initialize` - Complete setup wizard

All requests are automatically routed to the correct Netlify Function via `netlify.toml`.

## Next Steps

- **Real-time features**: Add Supabase real-time subscriptions for live updates
- **Storage**: Use Supabase Storage for image uploads instead of storing URLs
- **Auth**: Switch to Supabase Auth for built-in user management
- **Monitoring**: Set up Sentry for error tracking in production
