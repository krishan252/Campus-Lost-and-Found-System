# UniTrace GitHub Actions CI/CD — setup guide

This package was tailored to the uploaded `clfr-sprint1` project: separate `server/` and `client/` npm lockfiles, Prisma 5, PostgreSQL, Vite, Express, and `GET /api/v1/health`.
It also supports the later CLFR-63 Claim migration when that migration is committed.

## What happens automatically

| Event | CI | CD |
|---|---|---|
| Push to `feature/yasuru-sprint1` | Tests, migrations, build, API smoke test | No |
| Pull request to `main` | Tests, migrations, build, API smoke test | No |
| Push/merge to `main` | Same CI | Re-checks tests/build, publishes **two images** to GHCR |
| Manual `workflow_dispatch` from `main` | Runs on demand | Can republish the two images |

**Important:** Image publication is continuous **delivery**, not live deployment. It does not create a public URL. The optional Compose file supports a future Linux host once Docker, HTTPS reverse proxy, DNS and production configuration are ready.

## 1. Install into your current VS Code project

Back up the existing project first. Extract this ZIP and copy these files into `E:\clfr-sprint1` **without deleting any other files**:

- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `server/Dockerfile`
- `client/Dockerfile`
- `client/nginx.conf`
- `.dockerignore`
- `deploy/compose.prod.yml`
- `deploy/.env.production.example`
- `deploy/server.env.example`
- `deploy/.gitignore`
- `docs/CI_CD_SETUP.md`

If VS Code asks to overwrite an existing workflow or Dockerfile, compare it first; don't overwrite team-specific Docker work by mistake.

## 2. Local verification

Run these on your Windows project folder after closing running Prisma servers if `EPERM` occurs:

```powershell
cd E:\clfr-sprint1
npm --prefix server ci
npm --prefix client ci
npm test
npm run build
```

`npm ci` requires that `server/package-lock.json` and `client/package-lock.json` match their respective `package.json` files. Fix lockfile mismatches on your feature branch; don't delete lockfiles.

Optional Docker build verification (requires Docker Desktop, Linux containers):

```powershell
docker build -f server/Dockerfile -t unitrace-api:local .
docker build -f client/Dockerfile -t unitrace-web:local .
```

## 3. Commit the new CI/CD files to YOUR branch

```powershell
cd E:\clfr-sprint1
git switch feature/yasuru-sprint1
git status
# Stage only the CI/CD integration files:
git add .github/workflows/ci.yml .github/workflows/cd.yml server/Dockerfile client/Dockerfile client/nginx.conf .dockerignore deploy/compose.prod.yml deploy/.env.production.example deploy/server.env.example deploy/.gitignore docs/CI_CD_SETUP.md
git diff --cached --name-status
git diff --cached --check
git commit -m "ci: add UniTrace GitHub Actions CI and container delivery"
git push -u origin feature/yasuru-sprint1
```

**Do not include** `server/.env`, real database passwords, JWT secrets, SMTP credentials, `node_modules`, or `dist` in Git.

## 4. Verify GitHub Actions

1. Open https://github.com/krishan252/Campus-Lost-and-Found-System/actions
2. Choose **UniTrace CI**; select the latest run from your feature branch.
3. It should pass: `npm ci` -> `prisma generate` -> `prisma migrate deploy` -> `npm test` -> `npm run build` -> health check.
4. Open a Pull Request from `feature/yasuru-sprint1` into `main`. Request teammate review. A successful CI run **does not** guarantee your large local-versus-main differences are safe to merge.
5. Ask the repository maintainer to configure branch protection so `UniTrace CI / Test, migrate, and build` must pass before merging.

The CI PostgreSQL service uses **throwaway test credentials only**. No production DB secrets are required in GitHub Actions for CI.

## 5. Publish Docker images (CD)

After a reviewed pull request is merged into `main`, GitHub Actions automatically triggers **UniTrace CD - publish Docker images**. It repeats tests/build against a temporary PostgreSQL container and, only if they pass, publishes:

```
ghcr.io/krishan252/campus-lost-and-found-system-api:latest
ghcr.io/krishan252/campus-lost-and-found-system-web:latest
```

Each image is also tagged `sha-<full-commit-sha>` for reproducible rollbacks. The images' package access can be configured under the GitHub repository/organization package settings. If `packages: write` is restricted by organizational settings, ask the maintainer to adjust Actions workflow permissions.

The API includes the Prisma CLI in the runtime image to support migrations; this favors straightforward deployment for your course project, at the expense of image size. Review and harden runtime dependencies before production service.

## 6. Optional Linux VPS deployment (NOT automatic)

Only do this once you have an actual hosting server, HTTPS domain, and secure secret storage.

1. Copy `deploy/compose.prod.yml` to your server along with the two `.example` files.
2. Create `deploy/.env.production` from `.env.production.example` and `deploy/server.env` from `server.env.example` using real values. Keep these out of Git.
3. Set `GHCR_REPO` to the repository path **in lowercase** and set matching database passwords in both files. URL-encode special characters in the password used inside `DATABASE_URL`.
4. Configure an HTTPS reverse proxy from your public domain to `http://127.0.0.1:8080`. The application uses cookie-based sessions and must be served over HTTPS in production. Set `CLIENT_URL` to the exact HTTPS origin (no path/trailing slash). Configure SMTP so registration can send verification emails.
5. Authenticate Docker to GHCR if your published images are private. Do not put login tokens in command history or repository files; use your hosting system's secure secret injection mechanism.
6. Back up your production PostgreSQL data and uploaded images before each deployment. From the directory containing `deploy/` run:

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.prod.yml pull
docker compose --env-file deploy/.env.production -f deploy/compose.prod.yml up -d
docker compose --env-file deploy/.env.production -f deploy/compose.prod.yml ps
```

The `api` container runs `prisma migrate deploy` before starting. Its database must already exist and be healthy. `postgres_data` and `uploads_data` are Docker volumes to retain records and uploaded images across upgrades. Carefully review new migrations, backups, TLS, email and authentication security before production use.

## 7. Common problems

- **CI: missing `DATABASE_URL`** — the workflow provides a temporary value; confirm the workflow is in the root `.github/workflows` folder.
- **CI: migration fails** — ensure all Prisma migrations, including CLFR-63 if implemented, are committed. Never use `prisma migrate reset` against production data.
- **CI: `npm ci` error** — lockfile and `package.json` are out of sync; update and commit lockfile changes intentionally.
- **Docker: Vite route 404** — `client/nginx.conf` includes a React Router SPA fallback (`try_files`).
- **API: wrong CORS origin** — set `CLIENT_URL` to exact public website origin; browser calls same-origin `/api/v1/*` via Nginx.
- **API: database connect failure** — Docker DB host is `db`, **not** `localhost`.
- **GitHub: GHCR permission denied** — check package permissions, repo Actions permissions, and whether the organization permits image publishing.
- **Prisma `EPERM` on Windows** — stop dev servers/Prisma Studio, then rerun `npm run build`.

## Security reminders

- Never put secrets in the repository, workflow YAML, or PR comments. `ci_only_password` is only an ephemeral CI database password.
- Apply authorization in Express; GitHub Actions passing is not a security audit.
- Publish to your feature branch first. Keep `main` protected and require human review.
- Serving UniTrace publicly needs a TLS certificate, valid SMTP provider, secured database, backups, privacy review, and storage access controls.
