-- V20 Research Workspace backend foundation
-- Additive migration: does not alter existing project, membership, YIC, or public asset tables.
create schema if not exists workspace_private;
revoke all on schema workspace_private from public, anon, authenticated;

create or replace function workspace_private.can_access_workspace(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        exists (
          select 1 from public.members owner_member
          where owner_member.id = p.created_by
            and owner_member.auth_user_id = (select auth.uid())
        )
        or exists (
          select 1 from public.members lead_member
          where lead_member.id = coalesce(p.project_lead_member_id, p.project_lead)
            and lead_member.auth_user_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.project_members pm
          join public.members m on m.id = pm.member_id
          where pm.project_id = p.id
            and m.auth_user_id = (select auth.uid())
            and pm.status in ('active', 'approved')
        )
      )
  );
$$;
revoke all on function workspace_private.can_access_workspace(uuid) from public, anon;
grant usage on schema workspace_private to authenticated;
grant execute on function workspace_private.can_access_workspace(uuid) to authenticated;

create table if not exists public.workspace_datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  description text,
  source_uri text,
  source_type text not null default 'other' check (source_type in ('file','url','database','api','other')),
  status text not null default 'registered' check (status in ('registered','processing','ready','failed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.workspace_datasets(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  storage_path text,
  checksum text,
  schema_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique(dataset_id, version_number)
);
create table if not exists public.workspace_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  dataset_version_id uuid references public.workspace_dataset_versions(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 240),
  analysis_type text not null default 'exploratory',
  status text not null default 'draft' check (status in ('draft','queued','running','completed','failed','archived')),
  parameters jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  summary text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_experiments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_id uuid references public.workspace_analyses(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 240),
  hypothesis text,
  protocol jsonb not null default '{}'::jsonb,
  status text not null default 'planned' check (status in ('planned','running','completed','failed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  analysis_id uuid references public.workspace_analyses(id) on delete set null,
  experiment_id uuid references public.workspace_experiments(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 240),
  body text not null default '',
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','validated','rejected','superseded')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_knowledge_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  resource_type text not null default 'note' check (resource_type in ('paper','url','note','file','dataset','code','other')),
  uri text,
  content text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  linked_entity_type text,
  linked_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_user_id uuid default auth.uid() references auth.users(id) on delete set null,
  event_type text not null check (length(trim(event_type)) between 1 and 120),
  entity_type text,
  entity_id uuid,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.workspace_entity_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  relation text not null default 'related',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique(project_id, source_type, source_id, target_type, target_id, relation),
  check (source_type <> target_type or source_id <> target_id)
);

create index if not exists workspace_datasets_project_idx on public.workspace_datasets(project_id, created_at desc);
create index if not exists workspace_dataset_versions_dataset_idx on public.workspace_dataset_versions(dataset_id, version_number desc);
create index if not exists workspace_analyses_project_idx on public.workspace_analyses(project_id, created_at desc);
create index if not exists workspace_experiments_project_idx on public.workspace_experiments(project_id, created_at desc);
create index if not exists workspace_findings_project_idx on public.workspace_findings(project_id, created_at desc);
create index if not exists workspace_knowledge_project_idx on public.workspace_knowledge_resources(project_id, created_at desc);
create index if not exists workspace_tasks_project_status_idx on public.workspace_tasks(project_id, status, created_at desc);
create index if not exists workspace_activity_project_idx on public.workspace_activity_events(project_id, created_at desc);
create index if not exists workspace_links_project_idx on public.workspace_entity_links(project_id);

alter table public.workspace_datasets enable row level security;
alter table public.workspace_dataset_versions enable row level security;
alter table public.workspace_analyses enable row level security;
alter table public.workspace_experiments enable row level security;
alter table public.workspace_findings enable row level security;
alter table public.workspace_knowledge_resources enable row level security;
alter table public.workspace_tasks enable row level security;
alter table public.workspace_activity_events enable row level security;
alter table public.workspace_entity_links enable row level security;

-- Restrict API grants explicitly; activity is append-only for project members.
revoke all on public.workspace_datasets, public.workspace_dataset_versions, public.workspace_analyses,
  public.workspace_experiments, public.workspace_findings, public.workspace_knowledge_resources,
  public.workspace_tasks, public.workspace_activity_events, public.workspace_entity_links from anon, public;
grant select, insert, update, delete on public.workspace_datasets, public.workspace_dataset_versions,
  public.workspace_analyses, public.workspace_experiments, public.workspace_findings,
  public.workspace_knowledge_resources, public.workspace_tasks, public.workspace_entity_links to authenticated;
grant select, insert on public.workspace_activity_events to authenticated;

create policy workspace_datasets_select on public.workspace_datasets for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_datasets_insert on public.workspace_datasets for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_datasets_update on public.workspace_datasets for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_datasets_delete on public.workspace_datasets for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));

create policy workspace_versions_select on public.workspace_dataset_versions for select to authenticated using (exists(select 1 from public.workspace_datasets d where d.id = dataset_id and (select workspace_private.can_access_workspace(d.project_id))));
create policy workspace_versions_insert on public.workspace_dataset_versions for insert to authenticated with check (created_by = (select auth.uid()) and exists(select 1 from public.workspace_datasets d where d.id = dataset_id and (select workspace_private.can_access_workspace(d.project_id))));
create policy workspace_versions_update on public.workspace_dataset_versions for update to authenticated using (exists(select 1 from public.workspace_datasets d where d.id = dataset_id and (select workspace_private.can_access_workspace(d.project_id)))) with check (exists(select 1 from public.workspace_datasets d where d.id = dataset_id and (select workspace_private.can_access_workspace(d.project_id))));
create policy workspace_versions_delete on public.workspace_dataset_versions for delete to authenticated using (exists(select 1 from public.workspace_datasets d where d.id = dataset_id and (select workspace_private.can_access_workspace(d.project_id))));

create policy workspace_analyses_select on public.workspace_analyses for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_analyses_insert on public.workspace_analyses for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_analyses_update on public.workspace_analyses for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_analyses_delete on public.workspace_analyses for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));

create policy workspace_experiments_select on public.workspace_experiments for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_experiments_insert on public.workspace_experiments for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_experiments_update on public.workspace_experiments for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_experiments_delete on public.workspace_experiments for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));

create policy workspace_findings_select on public.workspace_findings for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_findings_insert on public.workspace_findings for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_findings_update on public.workspace_findings for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_findings_delete on public.workspace_findings for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));

create policy workspace_knowledge_select on public.workspace_knowledge_resources for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_knowledge_insert on public.workspace_knowledge_resources for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_knowledge_update on public.workspace_knowledge_resources for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_knowledge_delete on public.workspace_knowledge_resources for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));

create policy workspace_tasks_select on public.workspace_tasks for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_tasks_insert on public.workspace_tasks for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_tasks_update on public.workspace_tasks for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_tasks_delete on public.workspace_tasks for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));

create policy workspace_activity_select on public.workspace_activity_events for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_activity_insert on public.workspace_activity_events for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and actor_user_id = (select auth.uid()));

create policy workspace_links_select on public.workspace_entity_links for select to authenticated using ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_links_insert on public.workspace_entity_links for insert to authenticated with check ((select workspace_private.can_access_workspace(project_id)) and created_by = (select auth.uid()));
create policy workspace_links_update on public.workspace_entity_links for update to authenticated using ((select workspace_private.can_access_workspace(project_id))) with check ((select workspace_private.can_access_workspace(project_id)));
create policy workspace_links_delete on public.workspace_entity_links for delete to authenticated using ((select workspace_private.can_access_workspace(project_id)));
