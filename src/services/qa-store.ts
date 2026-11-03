import { supabaseAdmin } from "@/lib/supabase/admin";


export interface ContributorRow {
  status: string;
  focusAreas: string[];
  createdAt: string | Date;
  reviewedAt: string | Date | null;
}

/** The signed-in user's QA contributor record, if any. */
export async function getContributor(userId: string): Promise<ContributorRow | null> {
    const { data } = await supabaseAdmin()
      .from("qa_contributors")
      .select("status,focus_areas,created_at,reviewed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    const c = data as { status: string; focus_areas: string[] | null; created_at: string; reviewed_at: string | null };
    return { status: c.status, focusAreas: c.focus_areas ?? [], createdAt: c.created_at, reviewedAt: c.reviewed_at };
}

/** Just the contributor status (for gating). */
export async function getContributorStatus(userId: string): Promise<string | null> {
    const { data } = await supabaseAdmin()
      .from("qa_contributors")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as { status: string } | null)?.status ?? null;
}

export interface CreateContributor {
  userId: string;
  name: string;
  email: string;
  motivation: string;
  focusAreas: string[];
  experience: string;
  github: string;
}

/** Create a QA contributor application. */
export async function createContributor(input: CreateContributor): Promise<void> {
    const { error } = await supabaseAdmin().from("qa_contributors").insert({
      user_id: input.userId,
      name: input.name,
      email: input.email,
      motivation: input.motivation,
      focus_areas: input.focusAreas,
      experience: input.experience,
      github: input.github,
    });
    if (error) throw new Error(error.message);
    return;
}

export interface BugItem {
  id: string;
  title: string;
  area: string;
  severity: string;
  status: string;
  createdAt: string | Date;
}

/** List the bugs a user has reported. */
export async function listUserBugs(userId: string, limit: number): Promise<BugItem[]> {
    const { data } = await supabaseAdmin()
      .from("bug_reports")
      .select("id,title,area,severity,status,created_at")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as { id: string; title: string; area: string; severity: string; status: string; created_at: string }[]).map((b) => ({
      id: b.id, title: b.title, area: b.area, severity: b.severity, status: b.status, createdAt: b.created_at,
    }));
}

export interface CreateBug {
  userId: string;
  reporterName: string;
  title: string;
  area: string;
  severity: string;
  steps: string;
  expected: string;
  actual: string;
  environment: string;
  url: string;
  screenshotUrl: string;
}

/** File a bug report. Returns its id. */
export async function createBugReport(input: CreateBug): Promise<string> {
    const { data, error } = await supabaseAdmin()
      .from("bug_reports")
      .insert({
        reporter_id: input.userId,
        reporter_name: input.reporterName,
        title: input.title,
        area: input.area,
        severity: input.severity,
        steps: input.steps,
        expected: input.expected,
        actual: input.actual,
        environment: input.environment,
        url: input.url,
        screenshot_url: input.screenshotUrl,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
}

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminBug {
  id: string;
  title: string;
  area: string;
  severity: string;
  steps: string;
  expected: string;
  actual: string;
  environment: string;
  url: string;
  screenshotUrl: string;
  status: string;
  adminNote: string;
  reporterName: string;
  createdAt: string | Date;
}

/** Admin bug list + status counts. */
export async function adminListBugs(
  filter: { status?: string; severity?: string },
): Promise<{ items: AdminBug[]; counts: Record<string, number> }> {
    const sb = supabaseAdmin();
    let q = sb.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
    if (filter.severity && filter.severity !== "all") q = q.eq("severity", filter.severity);
    const { data } = await q;
    const items = ((data ?? []) as Record<string, unknown>[]).map(sbBug);
    const { data: all } = await sb.from("bug_reports").select("status");
    const counts: Record<string, number> = {};
    for (const r of (all ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return { items, counts };
}

function sbBug(b: Record<string, unknown>): AdminBug {
  return {
    id: b.id as string, title: b.title as string, area: b.area as string, severity: b.severity as string,
    steps: b.steps as string, expected: (b.expected as string) ?? "", actual: (b.actual as string) ?? "",
    environment: (b.environment as string) ?? "", url: (b.url as string) ?? "",
    screenshotUrl: (b.screenshot_url as string) ?? "", status: b.status as string,
    adminNote: (b.admin_note as string) ?? "", reporterName: (b.reporter_name as string) ?? "",
    createdAt: b.created_at as string,
  };
}

/** Update a bug's status/adminNote. Returns false if not found. */
export async function updateBug(id: string, patch: { status?: string; adminNote?: string }): Promise<boolean> {
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.adminNote !== undefined) row.admin_note = patch.adminNote;
    const { data } = await supabaseAdmin().from("bug_reports").update(row).eq("id", id).select("id").maybeSingle();
    return Boolean(data);
}

/** Delete a bug report. */
export async function deleteBug(id: string): Promise<void> {
    await supabaseAdmin().from("bug_reports").delete().eq("id", id);
    return;
}

export interface AdminContributor {
  id: string;
  name: string;
  email: string;
  motivation: string;
  focusAreas: string[];
  experience: string;
  github: string;
  status: string;
  createdAt: string | Date;
}

/** Admin contributor list + status counts. */
export async function adminListContributors(
  filter: { status?: string },
): Promise<{ items: AdminContributor[]; counts: Record<string, number> }> {
    const sb = supabaseAdmin();
    let q = sb.from("qa_contributors").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
    const { data } = await q;
    const items = ((data ?? []) as Record<string, unknown>[]).map((c) => ({
      id: c.id as string, name: c.name as string, email: c.email as string, motivation: c.motivation as string,
      focusAreas: (c.focus_areas as string[]) ?? [], experience: (c.experience as string) ?? "",
      github: (c.github as string) ?? "", status: c.status as string, createdAt: c.created_at as string,
    }));
    const { data: all } = await sb.from("qa_contributors").select("status");
    const counts: Record<string, number> = {};
    for (const r of (all ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return { items, counts };
}

/** Set a contributor's status; returns their email (for the approval notice). */
export async function updateContributorStatus(id: string, status: string): Promise<{ email: string | null } | null> {
    const { data } = await supabaseAdmin()
      .from("qa_contributors")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .select("email")
      .maybeSingle();
    return data ? { email: (data as { email: string | null }).email } : null;
}
