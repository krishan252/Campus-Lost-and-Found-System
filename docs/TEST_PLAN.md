# Sprint 1 Test Plan and Acceptance Checklist

## Foundation

- [ ] `npm run install:all` finishes.
- [ ] PostgreSQL connection succeeds.
- [ ] `npx prisma migrate dev --name sprint1` creates tables.
- [ ] `npm run db:seed` creates categories and locations.
- [ ] Frontend loads at http://localhost:5173.
- [ ] Backend health endpoint returns JSON.

## Authentication and authorization

- [ ] Registration with permitted university email succeeds.
- [ ] Registration with non-university email fails.
- [ ] Duplicate email registration fails.
- [ ] Unverified account cannot log in.
- [ ] One-time verification link works and cannot be reused.
- [ ] Valid credentials can log in; invalid credentials cannot.
- [ ] Logout invalidates the session.
- [ ] USER cannot access `/api/v1/admin/reports/pending` (403).
- [ ] Requests without a session cannot access `/api/v1/reports/mine` (401).

## Report submission

- [ ] LOST report can be created and defaults to `PENDING_REVIEW`.
- [ ] FOUND report requires a private identifying attribute.
- [ ] Title, description, location, category and event date are validated.
- [ ] Future or impossible calendar dates fail.
- [ ] A user sees only their own reports in My Reports.
- [ ] Another USER cannot access a pending report by guessing its ID.
- [ ] JPEG/PNG/WebP image uploads succeed and are associated with the report.
- [ ] `.txt` upload or invalid signature is rejected.
- [ ] Image larger than 5 MB fails; maximum 3 photos enforced.

## Moderation

- [ ] ADMIN sees submitted pending reports.
- [ ] USER cannot access pending moderation queue.
- [ ] ADMIN can approve pending report.
- [ ] Approved report is no longer pending and cannot be approved twice.
- [ ] ADMIN can reject with a reason; empty reason fails.
- [ ] Rejected reporter sees reason, can edit, and can resubmit.
- [ ] Non-owner cannot edit someone else's report.
- [ ] Audit event is recorded for submit, moderation and resubmit.

## Manual demo cases

1. Happy path: register → verify → login → submit report → admin approves → status APPROVED.
2. Rejection path: submit → admin rejects → reporter edits → resubmits → admin approves.
3. Security path: USER tries admin API → 403.
4. Image validation path: upload a text file with `.png` extension → 400.
5. Invalid input path: use future event date → 400.

## Deferred

Search/filter, claims, private-attribute verification, controlled detail release, handover, notifications and closure are Sprint 2/3 work, not Sprint 1 acceptance tests.
