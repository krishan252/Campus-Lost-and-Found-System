# Campus Lost and Found System

A campus lost-and-found application built with React, Express, TypeScript, Prisma, and PostgreSQL.

## Features

- Register and log in with an email address and password.
- Submit LOST and FOUND reports, including up to three JPEG, PNG, or WebP images.
- Search approved reports by keyword, report type, category, and campus location.
- Keep report verification details private from public search results.
- Review and approve or reject reports as an administrator.
- Submit and track ownership claims for approved found items.
- Review claims as an administrator; an approved claim closes the found-item report.

Claim verification is a staff review of the claimant's private identifying details; this application does not send email or make an automated ownership decision.

## Requirements

- Node.js 20 or newer and npm.
- PostgreSQL 14 or newer for local development, or Docker Desktop with the WSL 2 Linux engine enabled.
- Git (to clone the repository).

## Docker setup

1. Copy the example environment file and edit the values:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```sh
   cp .env.example .env
   ```

2. Set `JWT_SECRET` to a new random value of at least 32 characters. Keep the PostgreSQL credentials in `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL` consistent. The values in `.env.example` are for local development only.

3. Build and start the application:

   ```sh
   docker compose up --build
   ```

   Compose waits for PostgreSQL, applies migrations, seeds categories and locations, then starts the API and frontend.

4. Open:

   - Web application: <http://localhost:5173>
   - API health check: <http://localhost:4000/api/v1/health>

The database is stored in the `postgres_data` Docker volume and survives container restarts. `docker compose down` stops the services but preserves the volume. **`docker compose down -v` deletes the database data.**

To create an administrator, set both `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (password must be at least 12 characters) and run:

```sh
docker compose run --rm seed
```

The seed operation is safe to repeat and updates the administrator password to the configured value.

## Local development

### 1. Configure PostgreSQL and environment

Copy the example file for Compose and start only the database:

```sh
docker compose up -d db
```

Copy the example file for the API:

```powershell
Copy-Item .env.example server/.env
```

macOS/Linux:

```sh
cp .env.example server/.env
```

In `server/.env`, change `DATABASE_URL` to use the host port and hostname:

```text
DATABASE_URL=postgresql://clfr:change-me-in-local-env@localhost:5433/campus_lost_found?schema=public
```

Use your own local database credentials if needed. Set `JWT_SECRET` to a random value of at least 32 characters. Do not commit `.env` files.

If PostgreSQL is installed locally instead of using Compose, point `DATABASE_URL` to that server and database.

### 2. Install dependencies

From the repository root:

```sh
npm --prefix server ci
npm --prefix client ci
```

### 3. Apply migrations and seed lookup data

```sh
npm run db:deploy
npm run db:seed
```

The seed command creates the item categories and campus locations. It creates or updates an administrator only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured in `server/.env`.

### 4. Run the application

Open two terminals at the repository root:

```sh
npm run dev:server
```

```sh
npm run dev:client
```

The frontend runs at <http://localhost:5173> and proxies API requests to <http://localhost:4000>.

## Checks

```sh
npm test
npm run build
```

`npm test` runs backend API tests using an isolated in-memory repository. `npm run build` generates the Prisma client and builds both the backend and frontend.

## API overview

All API routes are under `/api/v1`.

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | API and database health |
| `POST` | `/auth/register` | Public | Create an account |
| `POST` | `/auth/login` | Public | Sign in |
| `POST` | `/auth/logout` | Signed in | Sign out |
| `GET` | `/auth/me` | Signed in | Current account |
| `GET` | `/reports/search` | Public | Search approved reports |
| `GET` | `/reports/metadata` | Public | Categories and locations |
| `GET` | `/reports/mine` | Signed in | Current user's reports |
| `POST` | `/reports` | Signed in | Submit a report |
| `POST` | `/reports/:id/claims` | Signed in | Claim an approved found item |
| `GET` | `/claims/mine` | Signed in | Current user's claims |
| `/admin/*` | — | Administrator | Moderate reports and claims |

Authentication uses an HttpOnly session cookie. Public search omits private identifying details; claim and report moderation screens require sign-in and administrator permissions.

## Production note

The example environment values are not suitable for deployment. Supply unique secrets, use HTTPS (the production cookie is Secure), restrict network access to PostgreSQL, and configure an HTTPS reverse proxy and appropriate `CLIENT_URL` before exposing the service publicly.
