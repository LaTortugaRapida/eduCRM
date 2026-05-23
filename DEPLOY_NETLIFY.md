# Deploying EduCRM

EduCRM has two parts:

- `frontend/`: static HTML, CSS, and browser JavaScript. This is ready for Netlify.
- `src/`: Express API with Postgres and SMTP. This needs a Node backend host such as Render.

## 1. Create a free Render Postgres database

In Render, create a Postgres database on the Free instance type. Copy the database's Internal Database URL.

Free Render Postgres databases expire after 30 days. They are useful for demos and class projects, not permanent production storage.

## 2. Deploy the API

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your-render-postgres-internal-database-url
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=replace_with_a_long_random_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
FRONTEND_URL=https://your-netlify-site.netlify.app
```

Run `database/production_schema.sql` against the Render Postgres database before using the app. After deployment, open:

```text
https://your-api-host.com/health/db
```

It should return `status: "OK"`. If it returns `configuration_error`, a Render environment variable is missing. If it returns `schema_error`, run or repair the production schema.

## 3. Deploy the frontend to Netlify

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

## 4. Password reset links

Set the backend `FRONTEND_URL` to your Netlify URL. Netlify is configured to rewrite `/reset-password/:token` to the reset password page, so email reset links keep working.

Render Free web services block outbound SMTP ports such as `587`, so password reset emails may need a paid Render instance or an email provider with an HTTPS API.

## 5. Important Git cleanup

Keep `.env` and `node_modules/` out of Git. If `.env` ever contained real secrets, rotate those credentials before deploying.
