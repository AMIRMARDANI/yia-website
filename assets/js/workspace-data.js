// V20 Research Workspace data access layer.
// Browser-safe: uses only the publishable key and relies on database RLS.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const TABLES = Object.freeze({
  datasets: "workspace_datasets",
  datasetVersions: "workspace_dataset_versions",
  analyses: "workspace_analyses",
  experiments: "workspace_experiments",
  findings: "workspace_findings",
  knowledge: "workspace_knowledge_resources",
  tasks: "workspace_tasks",
  activity: "workspace_activity_events",
  links: "workspace_entity_links"
});

function assertProjectId(projectId) {
  if (typeof projectId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(projectId)) {
    throw new TypeError("A valid project UUID is required.");
  }
}
function assertEntity(entity) {
  if (!Object.hasOwn(TABLES, entity)) throw new TypeError("Unsupported workspace entity.");
  return TABLES[entity];
}
function throwIfError({ data, error }) {
  if (error) {
    const wrapped = new Error(error.message || "Workspace request failed.");
    wrapped.code = error.code;
    throw wrapped;
  }
  return data;
}

export async function getWorkspaceSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
export async function listWorkspace(projectId, entity, { limit = 100, offset = 0 } = {}) {
  assertProjectId(projectId);
  const table = assertEntity(entity);
  const boundedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const boundedOffset = Math.max(Number(offset) || 0, 0);
  let query = supabase.from(table).select("*").range(boundedOffset, boundedOffset + boundedLimit - 1);
  if (entity !== "datasetVersions") query = query.eq("project_id", projectId);
  else query = query.in("dataset_id", (await listWorkspace(projectId, "datasets", {limit:500})).map(x => x.id));
  if (entity === "activity") query = query.order("created_at", { ascending: false });
  else query = query.order("updated_at", { ascending: false, nullsFirst: false }).order("created_at", {ascending:false});
  return throwIfError(await query);
}
export async function createWorkspaceRecord(projectId, entity, payload) {
  assertProjectId(projectId);
  const table = assertEntity(entity);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("A record payload is required.");
  if (entity === "activity") {
    const safe = { ...payload, project_id: projectId };
    delete safe.actor_user_id;
    return throwIfError(await supabase.from(table).insert(safe).select("*").single());
  }
  const safe = { ...payload };
  delete safe.id;
  delete safe.created_by;
  if (entity === "datasetVersions") {
    if (!safe.dataset_id) throw new TypeError("dataset_id is required for a dataset version.");
    const dataset = throwIfError(await supabase.from(TABLES.datasets).select("id,project_id").eq("id", safe.dataset_id).eq("project_id", projectId).single());
    if (!dataset) throw new Error("Dataset not found in this project.");
  } else {
    safe.project_id = projectId;
  }
  return throwIfError(await supabase.from(table).insert(safe).select("*").single());
}
export async function updateWorkspaceRecord(projectId, entity, id, changes) {
  assertProjectId(projectId);
  const table = assertEntity(entity);
  if (entity === "activity") throw new Error("Activity history is append-only.");
  if (entity === "datasetVersions") throw new Error("Dataset versions are immutable; create a new version instead.");
  if (!id || !changes || typeof changes !== "object" || Array.isArray(changes)) throw new TypeError("Record id and changes are required.");
  const safe = { ...changes };
  for (const key of ["id", "project_id", "created_by", "created_at", "actor_user_id"]) delete safe[key];
  safe.updated_at = new Date().toISOString();
  return throwIfError(await supabase.from(table).update(safe).eq("project_id", projectId).eq("id", id).select("*").single());
}
export async function deleteWorkspaceRecord(projectId, entity, id) {
  assertProjectId(projectId);
  const table = assertEntity(entity);
  if (entity === "activity") throw new Error("Activity history is append-only.");
  if (entity === "datasetVersions") throw new Error("Dataset versions are immutable; delete the parent dataset if permitted.");
  if (!id) throw new TypeError("Record id is required.");
  return throwIfError(await supabase.from(table).delete().eq("project_id", projectId).eq("id", id).select("id").single());
}
export async function logWorkspaceActivity(projectId, event) {
  return createWorkspaceRecord(projectId, "activity", event);
}
export { TABLES };
