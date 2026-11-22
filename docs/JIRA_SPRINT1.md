# Sprint 1 Jira Mapping

**Sprint goal:** An authenticated university user can submit LOST or FOUND reports, upload protected item photos, see their own report statuses, and an ADMIN can approve or reject reports before publishing them in Sprint 2.

Your current Jira project imported a new set of issue IDs. **Match by Summary rather than assuming the keys below**.

| Jira backlog title | Implementation evidence |
|---|---|
| Design high-level system architecture | `README.md` architecture section |
| Design initial database schema | `server/prisma/schema.prisma` |
| Set up GitHub repository and development workflow | `.gitignore`, `docs/TEAM_WORKFLOW.md` |
| Set up frontend application | `client/package.json`, `client/src/`, Vite |
| Set up backend API and database connection | `server/src/app.ts`, `server/src/index.ts`, Prisma |
| Implement university email registration | `server/src/routes/auth.ts`, `client/src/pages/AuthPages.tsx` |
| Implement login and logout | `server/src/routes/auth.ts`, `client/src/context/AuthContext.tsx` |
| Create basic user profile | `/auth/me`, `client/src/pages/ProfilePage.tsx` |
| Prepare local development environment | `README.md`, `docker-compose.yml`, `server/.env.example` |
| Define team Git branching and pull request rules | `docs/TEAM_WORKFLOW.md` |
| Prepare Sprint 1 test strategy | `docs/TEST_PLAN.md` |
| Implement role-based authorization | `server/src/middleware/guards.ts` |
| Create LOST item report | `server/src/routes/reports.ts`, `client/src/pages/ReportFormPage.tsx` |
| Create FOUND item report | Same routes/components with private identifying attributes |
| Upload and validate item photographs | `POST /reports/:id/images` and protected image serving |
| View My Reports | `client/src/pages/ReportsPage.tsx`, `GET /reports/mine` |
| Edit and resubmit rejected report | `PATCH /reports/:id`, `POST /reports/:id/resubmit` |
| Create admin pending reports dashboard | `client/src/pages/AdminPage.tsx` |
| Review full report details as admin | `GET /admin/reports/:id`, AdminPage |
| Approve report | `POST /admin/reports/:id/approve` |
| Reject report with reason | `POST /admin/reports/:id/reject` |

Start sprint only when team agrees on capacity and Definition of Done. This project is a prepared implementation, not evidence that every Jira item has been independently verified in your environment.
