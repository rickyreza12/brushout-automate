# Brushout Automate

Small automation dashboard for deploying GitHub repositories to a VPS.

## Features

- Admin-token login.
- GitHub repository listing.
- Project registration.
- Manual deploy trigger.
- GitHub push webhook.
- Deployment history.
- Deployment log viewer.
- Production build served by the same Node app.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5174
```

Default local token if `ADMIN_TOKEN` is not set:

```text
dev-token
```

## Production

```bash
cp .env.example .env
npm install
npm run build
npm start
```

Recommended VPS deployment uses Docker Compose and Caddy. See:

```text
../workspaces/vps-guidelines.md
```
