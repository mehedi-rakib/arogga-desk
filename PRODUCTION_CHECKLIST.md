# Production Deployment Checklist

## 🔐 Security

- [ ] **Remove .env from git history**
  ```bash
  git rm --cached .env
  git commit -m "Remove .env file from git history"
  git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all
  git push origin --force --all
  ```

- [ ] **Generate secure AUTH_SECRET**
  ```bash
  npm run generate-secret
  # Copy the output and use it for AUTH_SECRET
  ```

- [ ] **Update all environment variables for production**
  - [ ] `MYSQL_HOST` - Set to your production database host
  - [ ] `MYSQL_PORT` - Set to your production database port
  - [ ] `MYSQL_DATABASE` - Set to your production database name
  - [ ] `MYSQL_USER` - Set to your production database user
  - [ ] `MYSQL_PASSWORD` - Use a strong, random password (min 16 characters)
  - [ ] `ADMIN_EMAIL` - Set to a real admin email
  - [ ] `ADMIN_PASSWORD` - Use a strong password (min 12 characters, mix of uppercase, lowercase, numbers, symbols)
  - [ ] `AUTH_SECRET` - Must be at least 32 characters (use `npm run generate-secret`)

- [ ] **Set NODE_ENV=production** in your deployment environment

- [ ] **Use HTTPS only** - Configure your hosting to use SSL/TLS certificates

- [ ] **Enable secure cookie settings** - Already configured in `src/lib/auth.ts`

## 📋 Configuration

- [ ] **Review next.config.ts** - Security headers are configured

- [ ] **Check PORT variable** - The start script now uses `$PORT` environment variable (defaults to 3090)

- [ ] **Database migrations** - Run `npm run setup-db` before deployment to ensure schema is up to date

- [ ] **Seed initial data** - Run `npm run seed-categories` if needed

## 🔍 Code Quality

- [ ] **Run linter** - `npm run lint` (fix any issues)

- [ ] **Build locally** - `npm run build` (ensure no build errors)

- [ ] **Test login flow** - Verify authentication works with new credentials

## 📊 Monitoring

- [ ] Set up error logging (consider services like Sentry, LogRocket, etc.)

- [ ] Set up health checks for your API endpoints

- [ ] Monitor database connection pool

- [ ] Set up alerts for authentication failures

## 🚀 Deployment

- [ ] Use a process manager (PM2, systemd, Docker, etc.)

- [ ] Set up automatic restarts on failure

- [ ] Configure log rotation

- [ ] Set up backup for MySQL database

- [ ] Test disaster recovery procedures

## 📝 Notes

- The app will fail to start if required environment variables are missing or invalid in production
- Environment validation is enforced for security (see `src/lib/env-validation.ts`)
- Never commit `.env` files to version control
- Always use the `.env.example` template for developers
