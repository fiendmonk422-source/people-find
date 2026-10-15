# PeopleFind admin dashboard and activity reports

This feature is intentionally developed on its own branch and must be tested before merging into main.

## What this branch adds

- Role-based admin entry through the protected user_roles table.
- Overview counts for people, requests, responses, feedback and recorded admin events.
- Admin directory search and edit UI. Updates are restricted to an explicit field allowlist and logged in the same database transaction.
- Request status review (Open, Resolved, Closed), with changes recorded in the admin activity log.
- A searchable activity report with CSV export.
- Safer ownership checks for request creation, response creation and feedback creation.
- Converts admission_year and graduation_year to text so values such as 2023/2024 can be stored without integer conversion errors.

## Required database setup

The app does not grant anyone an admin role automatically. Apply the SQL migration at:

supabase/migrations/202610160001_admin_dashboard_activity_reports.sql

Review the migration before applying it to the production project. For a first local test, prefer a separate Supabase development project/branch if one is available. The migration revokes direct client UPDATE on people and requests so these admin changes must pass through the audited RPC functions.

After applying the migration, find the intended administrator's UUID in Supabase Dashboard → Authentication → Users. Use the SQL Editor (not the browser client) to provision that person. Replace the placeholder below with the UUID copied from the dashboard:

    insert into public.user_roles (user_id, role)
    values ('REPLACE-WITH-AUTH-USER-UUID', 'super_admin')
    on conflict (user_id) do update set role = excluded.role;

Never add a role-management button to the public client. Normal signed-in users can only read their own role record; only a trusted database administrator can add or change role assignments.

## Important deployment notes

- The code must be checked out from feature/admin-dashboard-activity-reports; main is not modified by this feature branch.
- Apply the migration before testing admin actions. Without it, the admin UI intentionally will not grant access.
- The SECURITY DEFINER RPC functions are deliberately narrow: they check auth.uid() against user_roles, use a fixed search_path, permit only a known list of person fields or request statuses, and write the corresponding audit event transactionally. Do not add generic SQL execution or user-controlled table/column names.
- Review Supabase Security Advisor results after migration. The advisor may flag these authenticated SECURITY DEFINER functions by category; inspect their explicit checks and grants rather than removing the checks or opening direct table writes.
- Admin records in the activity report include only field names for person edits, not the before/after values of sensitive directory fields.
- PeopleFind directory records remain admin-managed; end users are not given a general profile-edit feature.
