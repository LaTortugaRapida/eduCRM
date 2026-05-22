# Deploying EduCRM

EduCRM has two parts:

- `frontend/`: static HTML, CSS, and browser JavaScript. This is ready for Netlify.
- `src/`: Express API with MySQL and SMTP. This needs a Node backend host or a serverless conversion before production use.

## 1. Deploy the API first

Deploy the Express app from `src/app.js` to a Node host such as Render, Railway, Fly.io, or another VPS-style host. The API needs these environment variables:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-mysql-host
DB_PORT=3306
DB_USER=your-production-mysql-user
DB_PASSWORD=your-production-mysql-password
DB_NAME=your-production-database
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=replace_with_a_long_random_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
FRONTEND_URL=https://your-netlify-site.netlify.app
```

If your MySQL provider requires encrypted connections, set `DB_SSL=true`. Some providers with self-signed certificates also need `DB_SSL_REJECT_UNAUTHORIZED=false`.

Run `database/production_schema.sql` against the production MySQL database before using the app. After deployment, open:

```text
https://your-api-host.com/health/db
```

It should return `status: "OK"`. If it returns `configuration_error`, a Render environment variable is missing. If it returns `schema_error`, run or repair the production schema.

## 2. Deploy the frontend to Netlify

In Netlify, connect this repository and use:

```text
Build command: npm run build:netlify
Publish directory: frontend
```

Add this Netlify environment variable if you want to override the API host:

```text
API_BASE_URL=https://your-api-host.com/api
```

The build writes `frontend/js/env.js`, and `frontend/js/config.js` reads it. Local development still falls back to `http://localhost:3000/api`. Production currently falls back to `https://edu-crm-api-7b35.onrender.com/api` when `API_BASE_URL` is not set.

## 3. Password reset links

Set the backend `FRONTEND_URL` to your Netlify URL. Netlify is configured to rewrite `/reset-password/:token` to the reset password page, so email reset links keep working.

## 4. Important Git cleanup

Keep `.env` and `node_modules/` out of Git. If `.env` ever contained real secrets, rotate those credentials before deploying.
