# Foundly — Campus Lost & Found Repository (Sprint 1)

A complete **Sprint 1 academic MVP** for the University of Ruhuna Campus Lost & Found Repository with Claim Verification Workflow.

- **Frontend:** React 18 + TypeScript + Vite + responsive brown/cream CSS design.
- **Backend:** Node.js + Express + TypeScript + Zod.
- **Database:** PostgreSQL + Prisma (one shared database and one reports table for LOST/FOUND).
- **Security:** verified university email registration, bcrypt password hashes, HttpOnly authentication cookie, backend RBAC, protected photo storage, audit events.
- **Admin:** pending report queue, full moderation review, approve/reject with rejection reasons.

> **Figma note:** The supplied Figma project URL was not accessible as design frames in this session. The UI implements a polished brown/cream theme inspired by the project title, **not** a pixel-perfect Figma reproduction. Colors, spacing and illustrations can be changed in `client/src/styles.css` after comparing with the Figma frames.

## 1. What Sprint 1 includes

| Feature | Included |
|---|---|
| Project structure, Git starter docs, environment configuration | ✅ |
| PostgreSQL/Prisma database schema + seeds | ✅ |
| University email registration with verification link | ✅ |
| Login, logout, profile, USER/ADMIN permissions | ✅ |
| Create LOST/FOUND reports with private identifying fields | ✅ |
| Upload up to three protected JPEG/PNG/WebP images | ✅ |
| My Reports and report detail views | ✅ |
| Admin pending list / approve / reject with explanation | ✅ |
| Reporter edits/resubmits rejected reports | ✅ |
| Audit records, validation and unit tests | ✅ |
| Search/filter repository and claims | **Sprint 2, not included** |
| Claim verification/contact release | **Sprint 2, not included** |
| Handover, notifications and deployment hardening | **Sprint 3, not included** |

## 2. Requirements

- Node.js **20 or newer** (Node 22 recommended).
- npm.
- PostgreSQL **14+** installed locally, OR Docker Desktop (optional).
- Visual Studio Code.
- Git for collaboration.

**Windows (PowerShell)** and macOS/Linux commands work unless otherwise noted.

## 3. Unzip and install

Open a terminal in the project folder, where this README and `package.json` are located.

```powershell
npm run install:all
```

This installs packages in `server/` and `client/`. Do not commit `node_modules` to Git.

## 4. Configure database

### Option A — Docker (optional)

```powershell
docker compose up -d
```

Docker exposes PostgreSQL at `localhost:5433`, DB name `campus_lost_found`, username `clfr`, password `clfr_local_password`. These credentials are for **local development only**.

### Option B — PostgreSQL already installed on Windows

Use pgAdmin Query Tool or psql to create a database:

```sql
CREATE DATABASE campus_lost_found;
```

Use your own Postgres username/password in the connection string in `server/.env`, e.g.:

```text
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/campus_lost_found?schema=public
```

If your database password contains characters such as `@`, `#` or `:`, URL-encode them first. No Docker/WSL is required for Option B.

## 5. Set the backend environment

From the project root:

```powershell
Copy-Item server/.env.example server/.env
```

On macOS/Linux: `cp server/.env.example server/.env`

Open `server/.env` and set:

- `DATABASE_URL` to your actual PostgreSQL connection string.
- `JWT_SECRET` to a **random secret of at least 32 characters** (use a unique value, not the example).
- `ALLOWED_EMAIL_DOMAINS` to the exact domains approved by your client. The examples are `engug.ruh.ac.lk,ruh.ac.lk`; confirm before an actual deployment.
- `DEMO_ADMIN_EMAIL` to a university-address demo administrator.
- `DEMO_ADMIN_PASSWORD` to a **new strong password of at least 12 characters** if you want a demo admin account created by the seed command.

**Important:** The server uses `server/.env` when you run it from `server/`. Never commit secrets or real user credentials.

### University email verification

In local development, the backend prints a **single-use verification URL** to the terminal after registration. Open that link to verify the account. This makes Sprint 1 testable without an SMTP account.

For production, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`; otherwise registration is disabled. Production email delivery, deployment hardening and external university identity-provider integration must be reviewed before real-world use.

## 6. Create database tables and demo data

```powershell
cd server
npx prisma generate
npx prisma migrate dev --name sprint1
npm run db:seed
cd ..
```

The seed step creates item categories and campus locations. It also creates/updates an email-verified ADMIN account **only if** `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` are set. Do not use an example admin password on a real server.

## 7. Run the application — two terminals

**Terminal 1 (backend)**

```powershell
npm run dev:server
```

Backend: http://localhost:4000/api/v1/health

**Terminal 2 (frontend)**

```powershell
npm run dev:client
```

Open **http://localhost:5173**.

Vite proxies `/api` requests to Express, avoiding local cross-origin configuration problems.

## 8. Demonstrate Sprint 1

1. Register using a permitted university-domain email.
2. In the **backend terminal**, copy the local-development verification link, open it, then log in.
3. Click **Report an item**. Create a LOST or FOUND report with category, location, date and description.
4. For FOUND reports, provide a secret private identifying feature. Upload a photo if needed.
5. The report shows **Pending review** in **My reports**.
6. Log out and sign in using the demo admin email/password you configured.
7. Open **Admin panel**, select the pending report and click **Approve** or enter a reason and **Reject**.
8. Log in as the reporting user. Approved reports show **Approved**; rejected reports can be edited and resubmitted.

The **repository search, claims, verification and handover** screens are intentionally not implemented in Sprint 1.

## 9. Backend API reference

All endpoints have the prefix `/api/v1`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health check |
| POST | `/auth/register` | Public | Create account, send verification |
| POST | `/auth/resend-verification` | Public | Request new verification email |
| POST | `/auth/verify` | Public | Verify one-time email token |
| POST | `/auth/login` | Public | Create HttpOnly session cookie |
| GET | `/auth/me` | Logged in | Get account profile |
| POST | `/auth/logout` | Logged in | Invalidate session version |
| GET | `/reports/metadata` | Logged in | Locations and categories |
| POST | `/reports` | Logged in | Create report |
| GET | `/reports/mine` | Logged in | My reports |
| GET | `/reports/:id` | Owner/ADMIN | Private report details |
| PATCH | `/reports/:id` | Owner + rejected | Edit rejected report |
| POST | `/reports/:id/resubmit` | Owner + rejected | Return to pending |
| POST | `/reports/:id/images` | Owner | Multipart image upload (name: `image`) |
| GET | `/reports/:id/images/:imageId` | Authorized | Protected photo access |
| GET | `/admin/reports/pending` | ADMIN | Pending queue |
| GET | `/admin/reports/:id` | ADMIN | Review report |
| POST | `/admin/reports/:id/approve` | ADMIN | Approve pending report |
| POST | `/admin/reports/:id/reject` | ADMIN | Reject pending report with `{ "reason": "..." }` |

**Example request body** (`POST /api/v1/reports`):

```json
{
  "reportType": "FOUND",
  "title": "Black wireless mouse",
  "publicDescription": "Found near the engineering library entrance yesterday evening.",
  "categoryId": 1,
  "locationId": 2,
  "eventDate": "2026-11-03",
  "secretAttributes": "Distinct marking on the underside",
  "storageLocation": "With authorized faculty staff",
  "finderContact": ""
}
```

Category and location numeric IDs must correspond to `/reports/metadata` and may differ from this illustrative example.

## 10. Run unit tests and build

```powershell
npm test
npm run build
```

Server tests exercise basic report status rules and image signature checks. For complete API integration you must run against a test database and use the manual acceptance checklist in `docs/TEST_PLAN.md`.

## 11. GitHub workflow for four team members

1. Create one shared GitHub repository and invite all teammates as collaborators.
2. Protect `main`; optionally use `develop` for integration.
3. Start each task on a branch, e.g. `feature/CLFR-38-architecture` or `feature/report-form`.
4. Open a pull request; obtain at least one peer review before merge.
5. Never commit `.env`, database files, uploads or `node_modules`.
6. Keep Jira status and pull request links updated.

```powershell
git init
git add .
git commit -m "feat: implement Sprint 1 campus lost and found MVP"
git branch -M main
git remote add origin https://github.com/YOUR_ORGANIZATION/YOUR_REPO.git
git push -u origin main
```

For the complete branching steps, see `docs/TEAM_WORKFLOW.md`.

## 12. Architecture

```text
React + TypeScript web client (localhost:5173)
             │  HTTPS/HTTP + REST JSON
             ▼
Express API (localhost:4000)
  ├─ Authentication & roles
  ├─ Report CRUD + private details
  ├─ Secure photo storage
  └─ Administrator moderation + audit
             │  Prisma ORM
             ▼
  Single PostgreSQL database
```

The application uses only **USER** and **ADMIN** roles in Sprint 1, and one `Report` entity for both LOST and FOUND.

## Known limitations / future hardening

- A separate React Native application is **not** part of this Sprint 1 package; the responsive web UI is mobile friendly.
- Email verification in development uses console links; do not enable that behavior in production.
- Further email deliverability, automated integration tests, image moderation, rate limiting across all endpoints, production object storage, security reviews, deployment hardening and university SSO integration require additional engineering.
- Images are private behind authorization. A manual admin should review images before approval; automatic photo redaction is not implemented.
- A signed-in user's owner/admin report details may show private fields as intended. Other user search is not exposed in Sprint 1.

See `docs/TEST_PLAN.md`, `docs/TEAM_WORKFLOW.md` and `docs/JIRA_SPRINT1.md`.
