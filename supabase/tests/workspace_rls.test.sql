-- Run with Supabase CLI / pgTAP in a staging/local database after applying the migration.
begin;
select plan(8);
select has_table('public', 'workspace_datasets', 'datasets table exists');
select has_table('public', 'workspace_dataset_versions', 'dataset versions table exists');
select has_table('public', 'workspace_analyses', 'analyses table exists');
select has_table('public', 'workspace_experiments', 'experiments table exists');
select has_table('public', 'workspace_findings', 'findings table exists');
select has_table('public', 'workspace_knowledge_resources', 'knowledge resources table exists');
select has_table('public', 'workspace_tasks', 'tasks table exists');
select has_table('public', 'workspace_activity_events', 'activity events table exists');
select * from finish();
rollback();

-- Authorization scenario tests should additionally run with JWT claims set for:
-- 1) project owner / lead: SELECT + CRUD allowed;
-- 2) active project member: SELECT + CRUD allowed;
-- 3) authenticated non-member: no rows, writes denied;
-- 4) anon: no table privileges;
-- 5) activity UPDATE/DELETE: denied to authenticated users.
