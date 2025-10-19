# Deploy BaseList to Supabase + Netlify

Your app has been successfully migrated from cPanel + Express to Supabase + Netlify Functions. Here's the complete deployment guide.

## Prerequisites

- Supabase account (free tier is fine)
- Netlify account (already connected)
- Git repository with your code

## Step 1: Set Up Supabase

### Create a Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `baselist` (or your preferred name)
   - **Database password**: Create a strong password
   - **Region**: Select closest to you
4. Click **"Create new project"** and wait ~2 minutes

### Run Database Migrations

1. In Supabase, go to **SQL Editor**
2. Click **"New Query"**
3. Copy entire contents of `supabase/migrations/001_init_schema.sql`
4. Paste into the query editor
5. Click **"Run"**

### Get Your Credentials

1. Go to **Project Settings** (gear icon)
2. Click **"API"** on the left
3. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Service Role Key** (hidden by default; click eye icon)
   - **Anon Public Key** (visible by default)
4. Keep these safe! You'll use them in the next step.

## Step 2: Set Up Netlify Environment Variables

### For Production Deployment

1. Go to your Netlify site
2. Click **"Site settings"**
3. Go to **"Build & deploy"** → **"Environment"**
4. Click **"Edit variables"**
5. Add these 4 variables:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Important**: The `SUPABASE_SERVICE_ROLE_KEY` is sensitive! Never commit it to git. Only set it in Netlify's UI.

### For Local Development

1. Create a `.env` file in your project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
CORS_ORIGIN=http://localhost:5173
```

2. **Never commit `.env` to git!** It's already in `.gitignore`.

## Step 3: Push Code to Git

```bash
git add .
git commit -m "feat: migrate to Supabase + Netlify Functions"
git push origin main
```

Netlify will automatically detect the push and start building your app.

## Step 4: Monitor the Build

1. Go to your Netlify site
2. Click **"Deploys"** tab
3. Watch the build progress

**Build should complete in ~2-3 minutes.** If it fails:

- Check **Build logs** for errors
- Ensure environment variables are set correctly
- Verify `netlify.toml` is in the root directory

## Step 5: Initialize Your App

Once deployed:

1. Visit your Netlify URL (something like `your-site.netlify.app`)
2. If this is your first time, the Setup Wizard will appear
3. Fill in:
   - **Admin Email**: Your email
   - **Admin Password**: Strong password (min 8 chars)
   - **Admin Username**: Your username
   - **Base/Installation**: Select from dropdown (e.g., "Vance AFB")
   - **Include sample data**: Toggle if you want example listings
4. Click **"Start Installation"**

The app is now ready to use! 🎉

## Step 6: Verify Everything Works

- [ ] Login with admin account
- [ ] Create a new listing
- [ ] Search/filter listings
- [ ] Send a message (if applicable)
- [ ] Check admin panel (if applicable)

## API Endpoints

Your Netlify Functions now serve all API routes:

| Endpoint                     | Method | Purpose                    |
| ---------------------------- | ------ | -------------------------- |
| `/api/auth/register`         | POST   | Register new user          |
| `/api/auth/login`            | POST   | Login user                 |
| `/api/setup/status`          | GET    | Check if setup is complete |
| `/api/setup/initialize`      | POST   | Complete initial setup     |
| `/api/listings`              | GET    | List all listings          |
| `/api/listings`              | POST   | Create new listing         |
| `/api/listings/:id`          | PUT    | Update listing             |
| `/api/listings/:id`          | DELETE | Delete listing             |
| `/api/users/:id`             | GET    | Get user profile           |
| `/api/users/profile/update`  | POST   | Update profile             |
| `/api/users/password/change` | POST   | Change password            |
| `/api/users/account/delete`  | POST   | Delete account             |
| `/api/messages/thread/:id`   | GET    | Get messages in thread     |
| `/api/messages`              | POST   | Send message               |
| `/api/admin/users`           | GET    | List all users (admin)     |
| `/api/admin/reports`         | GET    | List all reports (admin)   |

## Troubleshooting

### "SUPABASE_URL not found" error

→ Check that environment variables are set in Netlify **Build & deploy → Environment**, not just in `.env`

### "Service Role Key invalid"

→ Copy the exact key from Supabase without extra spaces or quotes

### "Connection to database failed"

→ Verify the SQL migration ran successfully in Supabase **SQL Editor**

### "Setup already complete" error

→ Your app was already initialized. To reset, you can manually delete records in Supabase or contact support

### Build fails with "Command not found"

→ Check that Node.js version is 18+ in Netlify **Site settings → Build & deploy → Node version**

## Next Steps

### Enable Real-Time Updates (Optional)

Add real-time subscriptions for live listings and messages:

```typescript
const subscription = supabase
  .from("listings")
  .on("*", (payload) => {
    // Handle real-time updates
  })
  .subscribe();
```

### Add Image Upload (Optional)

Switch from URLs to Supabase Storage:

```typescript
const { data } = await supabase.storage
  .from("listings")
  .upload(`${listingId}/${file.name}`, file);
```

### Set Up Error Monitoring

[Connect Sentry](#open-mcp-popover) for production error tracking.

### Custom Domain

Go to **Site settings → Domain management** and add your custom domain.

## Questions?

- Check the [Supabase docs](https://supabase.com/docs)
- Check the [Netlify docs](https://docs.netlify.com)
- Review `SUPABASE_SETUP.md` for detailed Supabase setup

---

**That's it!** Your app is now deployed to production. You can safely cancel your cPanel account once everything is working. 🚀
