# Four-person GitHub + Jira Sprint 1 Workflow

## Suggested responsibility split

| Team member | Primary focus | Code area |
|---|---|---|
| Member A | Layout, registration/login, user pages | `client/src/` |
| Member B | Database, authentication, roles | `server/prisma/`, `server/src/routes/auth.ts`, `server/src/middleware/` |
| Member C | Report forms, file uploads, report API | `client/src/pages/ReportFormPage.tsx`, `server/src/routes/reports.ts` |
| Member D | Admin review, testing and integration | `client/src/pages/AdminPage.tsx`, `server/src/routes/admin.ts`, `server/tests/`, `docs/` |

Rotate code review responsibilities. Each issue should have one owner, visible acceptance criteria, and a test/demo.

## Basic Git commands

```bash
git clone https://github.com/ORG/REPO.git
cd REPO
git checkout main
git pull origin main
git checkout -b feature/CLFR-XX-short-description
# work, run checks
git add .
git commit -m "feat: implement short description"
git push -u origin feature/CLFR-XX-short-description
```

Open a GitHub PR targeting `main` or your designated `develop` integration branch.

After the PR is merged:

```bash
git checkout main
git pull origin main
git branch -d feature/CLFR-XX-short-description
```

## Branch/PR rules

- Never commit to `main` directly after the initial setup.
- Request at least one peer review on each PR.
- Keep changes small and link the correct Jira issue.
- Do not commit `.env`, uploaded photos, DB backups or real identifying details.
- Run `npm test` and `npm run build` before merging.
- Move Jira items: To Do → In Progress → Code Review/Testing → Done.
- Do not mark a Story Done without showing the acceptance criteria in a demo or test.
