# Neon PostgreSQL + Netlify Deployment

Your app now uses **Neon** (managed PostgreSQL) instead of Supabase.

## Setup Steps

### 1. Create Neon Project

1. Go to [console.neon.tech](https://console.neon.tech)
2. Sign up or log in
3. Click **Create a new project**
4. Select your region
5. Click **Create project**

Your database will be initialized in ~1 minute.

### 2. Get Connection String

1. In Neon, go to **Connection String** (top right)
2. Copy the **Connection string** (looks like: `postgresql://user:password@host/database`)
3. Save it somewhere safe

### 3. Run Database Schema

1. In Neon, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `supabase/migrations/001_init_schema.sql`
4. Paste and click **Execute**

Your database schema is now ready.

### 4. Add to Netlify

1. Go to [Netlify dashboard](https://netlify.com) → Your site
2. Click **Site settings** → **Build & deploy** → **Environment**
3. Click **Edit variables**
4. Add this variable:
   ```
   DATABASE_URL = postgresql://user:password@host/database
   ```
5. **Save**

### 5. Redeploy

1. Go to **Deploys** tab
2. Click the three dots on latest deploy
3. Click **Redeploy**
4. Wait 2-3 minutes for build to complete

### 6. Run Setup Wizard

1. Refresh your live site
2. Complete the **Setup Wizard** (admin account creation)
3. Done! Your app is now live 🎉

## Troubleshooting

**"Connection refused"** → Copy your connection string again without extra spaces

**"Database does not exist"** → Run the SQL schema in Neon's SQL Editor

**"Setup already complete"** → Your app was already initialized. Start fresh by deleting the `settings` table entry:

```sql
DELETE FROM settings WHERE key_name = 'setup_complete';
```

Then refresh your app and run setup again.

## Environment Variables

For local development, create `.env`:

```env
DATABASE_URL=postgresql://user:password@host/database
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

**Never commit `.env` to git** (it's already in `.gitignore`)

## API Endpoints

All routes are powered by Netlify Functions connecting to Neon:

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/listings` - List all
- `POST /api/listings` - Create listing
- `GET /api/users/:id` - Get profile
- `POST /api/setup/initialize` - Setup wizard
- And more...

See `DEPLOYMENT_GUIDE_SUPABASE_NETLIFY.md` for full endpoint list.

---

That's it! You're running on Neon PostgreSQL. 🚀
