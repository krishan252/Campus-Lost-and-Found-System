# CLFR-59 — Browse approved Lost and Found reports

## Status: Implementation present in the uploaded project; verification added

This Sprint 2 story is already implemented in the uploaded source code. The
changes in this review clarify that these are **admin-approved reports**, not
ownership-verified claims, and add regression tests for the public API.

## Implementation locations

- `server/src/routes/publicReports.ts`
  - `GET /api/v1/public/reports`: public list, only `status: 'APPROVED'`, newest first, 48 results max.
  - `GET /api/v1/public/reports/:id`: only approved report details.
  - `GET /api/v1/public/reports/:id/images/:imageId`: image access only if associated report is approved.
  - `GET /api/v1/public/metadata`: categories and campus locations.
  - Explicit Prisma `select` intentionally excludes owner identity, contact, secret attributes, and private collection location.
- `client/src/pages/HomePage.tsx`: list, images, empty/loading/error states and links to details.
- `client/src/pages/PublicReportPage.tsx`: detail page for public fields only.
- `client/src/main.tsx`: `/items/:id` route.
- `server/tests/publicReports.test.ts`: regression checks for the list/query/visibility contract.

## Manual acceptance checklist

1. Start PostgreSQL, backend and frontend.
2. Log in as a student, submit a LOST report. Confirm it is `PENDING_REVIEW`.
3. Open the homepage in a private browser window. The pending item must NOT appear.
4. Log in as an admin and approve the report.
5. Reload the homepage. The report must now appear with the correct title/category/location/type.
6. Open the item details. There must be no `secretAttributes`, `finderContact`, `storageLocation` or reporter email.
7. Reject a different report. Confirm it is not public.
8. Confirm an item without photos uses a non-broken category placeholder.
9. In browser DevTools -> Network, inspect the `/api/v1/public/reports` JSON response for absence of private fields.

## Run checks

From project root:

```powershell
npm run test
npm run build
```

This project uses PostgreSQL via `server/.env`; this story does not require a Prisma migration.

## Scope boundaries

- CLFR-60 (keyword search), CLFR-61 (filters), and CLFR-62 (safe public details)
  already have initial implementations in this uploaded snapshot. They need
  their own acceptance tests before marking Done.
- CLFR-63–65 (claims) are NOT implemented in this snapshot.
- `APPROVED` is a report-moderation state; it does not mean an ownership claim
  has been verified.
