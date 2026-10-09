# V20 Research Workspace backend rollout

## Included in this change
- Additive migration for datasets and immutable dataset versions, analyses, experiments, findings, knowledge resources, tasks, append-only activity events, and cross-entity links.
- RLS on all new public-schema tables. Access is scoped to a project creator, project lead, or active/approved project member linked to the current Supabase Auth user.
- Explicit table grants (no anon access). Existing projects, membership roles, YIC balances/ledger, and public project assets are not modified.
- Browser-side data access module in `assets/js/workspace-data.js`; it uses the existing publishable key and never embeds a service-role key.

## Before release
1. Review and apply `supabase/migrations/20261009120000_v20_research_workspace.sql` to a staging branch first; do not apply directly to production before review.
2. Ensure each real project member has `members.auth_user_id` mapped to their Supabase Auth user ID and `project_members.status` is `active` or `approved`. Rows without that mapping intentionally receive no access.
3. Run the SQL tests in `supabase/tests/workspace_rls.test.sql` in a Supabase local/staging environment and test owner, lead, active member, non-member, and anonymous access.
4. Import `assets/js/workspace-data.js` into the V20 HTML and replace its in-memory demo stores with the exported CRUD methods. The supplied V20 demo is not currently a tracked repository file, so this PR does not claim its UI is already wired.
5. AI is deliberately not enabled by this migration. Choose an AI provider/model and configure its API key as a Supabase Edge Function secret; only then add and test the server-side AI endpoint. Never put provider secrets in browser code.

## Important schema behavior
- Dataset versions are immutable and version numbers are unique per dataset.
- Activity events are append-only for authenticated project members.
- Dataset versions are accessed through the parent dataset's project membership.
- RLS is the enforcement layer; client-side filtering is not treated as authorization.
