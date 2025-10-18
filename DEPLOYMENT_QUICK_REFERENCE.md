# BaseList Quick Deployment Reference

**Current Version: 1.0**

## One-Line Deploy (Fastest)

```bash
cd /home/cpaneluser/baselist && git pull && npm install && npm run build
```

Then restart the Node.js app in cPanel → Setup Node.js App → Restart App

## Using Deploy Script (Recommended)

```bash
cd /home/cpaneluser/baselist && bash deploy.sh
```

This automatically:
- ✅ Pulls latest code
- ✅ Installs dependencies
- ✅ Builds application
- ✅ Tests API endpoint
- ✅ Logs everything to `deploy.log`

## Manual Steps (Step-by-Step)

```bash
# SSH to your server
ssh cpaneluser@yourserver.com

# Navigate to app
cd /home/cpaneluser/baselist

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Done! App restarts automatically via cPanel
```

## Verify Deployment Worked

### Via Browser
- Visit: `https://yourdomain.com`
- Should see home page without errors

### Via SSH
```bash
# Check logs
tail -f /home/cpaneluser/baselist/logs/error.log

# Test API
curl https://yourdomain.com/api/ping

# Check build files exist
ls -la /home/cpaneluser/baselist/dist/spa/
ls -la /home/cpaneluser/baselist/dist/server/
```

### Via cPanel
- Go to: Software → Setup Node.js App
- Select your app
- Check "Status: Active"
- Click "View Logs" for error messages

## Troubleshooting

### App won't start after deploy
- **Check logs**: cPanel → Setup Node.js App → View Logs
- **Restart manually**: Software → Setup Node.js App → Restart
- **Check Node version**: Should be 22.x or higher
- **Verify build**: Check `dist/` folder exists and has files

### Git pull fails
```bash
# Show git status
git status

# Reset if needed
git reset --hard origin/main
git pull
```

### npm install fails
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

### Build fails
```bash
# Check Node/npm versions
node --version  # Should be 20+
npm --version   # Should be 10+

# Try rebuilding
npm run build:client
npm run build:server
```

## Important Files

| File | Purpose |
|------|---------|
| `deploy.sh` | Automated deployment script |
| `dist/spa/` | React frontend (built) |
| `dist/server/production.mjs` | Node.js app startup file |
| `.env` | Database credentials (created by installer) |
| `deploy.log` | Deployment log file |

## Timeline

- **Setup Time**: 15 min (first time only)
- **Deploy Time**: 2-3 min per update
- **Downtime**: ~30 seconds (app restart)

## Version Management

Current version is shown in:
- Admin panel → Settings (top right)
- `package.json` version field
- This file header

To update version:
1. Update `APP_VERSION` in `client/components/admin/sections/SettingsSection.tsx`
2. Update `"version"` in `package.json`
3. Commit and push: `git commit -am "Release v1.x" && git push`
4. Deploy: `bash deploy.sh`

## Schedule Deployments

### Quick Updates (1-2 min)
- Run during business hours
- Git pull + build + restart

### Major Updates (5+ min)
- Notify users 24h before
- Deploy during off-peak hours (2-4 AM)
- Test in staging first if possible

## Rollback (If Something Breaks)

```bash
cd /home/cpaneluser/baselist

# Go back one commit
git revert HEAD

# Or go back to specific commit
git log --oneline  # See commit history
git checkout <commit-hash>

# Rebuild and restart
npm install && npm run build
# Then restart in cPanel
```

## Support

- **Logs**: `/home/cpaneluser/baselist/deploy.log`
- **Error logs**: `/home/cpaneluser/baselist/logs/error.log`
- **Git status**: `git status` and `git log --oneline -5`
- **Database**: `mysql -u baselist_user -p baselist_db`

---

**Last Updated**: v1.0  
**Next Review**: After first production deployment
