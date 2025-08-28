# Fleet Maintenance MVP (Server + React Client)

This is a starter you can deploy quickly. It includes:
- **Driver/Tech form** (mobile-friendly) with: unit number, mileage, driver, company doing the work, technician, checklist, notes, estimated time, and signature.
- **Admin dashboard** to view and filter by unit number, and see service history.
- **Automated admin notifications**: email (if SMTP is configured) and real-time web notifications via Socket.IO.

## Quick Start (Local)
**Prereqs:** Node.js 18+

```bash
# 1) Install & build client
cd client
npm ci
npm run build

# 2) Install server deps
cd ../
npm ci

# 3) Create a .env file (copy .env.example) and set values as needed
cp .env.example .env

# 4) Start the server (serves API + built client)
npm start
# Open http://localhost:3000
```

**Default login:**
- Admin email: `admin@example.com`
- Admin password: `admin123`
- Driver email: `driver@example.com`
- Driver password: `driver123`

> Change these in production! You can add users in the Admin dashboard.

## Render Deployment (One Service)
When creating a **Web Service** on Render:
- **Environment:** Node
- **Build Command:**
  ```bash
  cd client && npm ci && npm run build && cd .. && npm ci
  ```
- **Start Command:**
  ```bash
  node server.js
  ```
- **Environment Variables:** Add what you need from `.env.example` (e.g., `ADMIN_EMAILS`, SMTP, `JWT_SECRET`).

## Notifications
- **Email:** If SMTP vars are set, each new driver submission sends an email to `ADMIN_EMAILS` (comma-separated).
- **Real-time:** Admin dashboard receives a live banner via Socket.IO when new entries arrive.

## Data storage
- SQLite file is created automatically at `data.sqlite` on first run.
- Uploaded photos/signatures go in `/uploads` (local folder). On Render, use persistent disk or switch to S3 in production.

## Tech Stack
- Server: Node.js, Express, Socket.IO, SQLite (better-sqlite3), JWT auth, Nodemailer
- Client: React + Vite, react-router, axios, react-signature-canvas

## Important
This is an MVP meant to get you running quickly. Before production:
- Replace default users.
- Set a strong `JWT_SECRET`.
- Add HTTPS, rate limits, and validation.
- Consider moving uploads to S3 or similar.
- Add role-based permissions as your team grows.
