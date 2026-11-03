import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Job-application data access (careers). Standalone module — no cross-refs — so
 * it can be flipped independently via DATA_BACKEND_JOBAPPLICATION=supabase.
 * One repository, two backends. Default stays MongoDB.
 */

export interface JobApplicationInput {
  role: string;
  roleTitle: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  company?: string;
  resumeUrl?: string;
  resumeName?: string;
  message?: string;
}

export interface JobApplicationItem extends Omit<JobApplicationInput, never> {
  id: string;
  status: string;
  createdAt: string | Date;
}

export interface JobApplicationList {
  items: JobApplicationItem[];
  counts: { new: number; reviewing: number; shortlisted: number; rejected: number };
}

// column mapping helpers (camelCase ↔ snake_case) ----------------------------
function toRow(i: JobApplicationInput) {
  return {
    role: i.role, role_title: i.roleTitle, name: i.name, email: i.email,
    phone: i.phone ?? "", location: i.location ?? "", experience: i.experience ?? "",
    linkedin: i.linkedin ?? "", github: i.github ?? "", portfolio: i.portfolio ?? "",
    company: i.company ?? "", resume_url: i.resumeUrl ?? "", resume_name: i.resumeName ?? "",
    message: i.message ?? "",
  };
}
interface SbRow {
  id: string; role: string; role_title: string; name: string; email: string;
  phone: string; location: string; linkedin: string; github: string; portfolio: string;
  experience: string; company: string; resume_url: string; resume_name: string;
  message: string; status: string; created_at: string;
}
function fromRow(r: SbRow): JobApplicationItem {
  return {
    id: r.id, role: r.role, roleTitle: r.role_title, name: r.name, email: r.email,
    phone: r.phone ?? "", location: r.location ?? "", linkedin: r.linkedin ?? "",
    github: r.github ?? "", portfolio: r.portfolio ?? "", experience: r.experience ?? "",
    company: r.company ?? "", resumeUrl: r.resume_url ?? "", resumeName: r.resume_name ?? "",
    message: r.message ?? "", status: r.status, createdAt: r.created_at,
  };
}

export async function createApplication(input: JobApplicationInput): Promise<void> {
    const { error } = await supabaseAdmin().from("job_applications").insert(toRow(input));
    if (error) throw new Error(error.message);
    return;
}

export async function listApplications(filter: { role?: string; status?: string }): Promise<JobApplicationList> {
  const emptyCounts = { new: 0, reviewing: 0, shortlisted: 0, rejected: 0 };
    const sb = supabaseAdmin();
    let q = sb.from("job_applications").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter.role && filter.role !== "all") q = q.eq("role", filter.role);
    if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const items = ((data ?? []) as unknown as SbRow[]).map(fromRow);
    const { data: st } = await sb.from("job_applications").select("status");
    const counts = { ...emptyCounts };
    for (const r of (st ?? []) as { status: string }[]) if (r.status in counts) counts[r.status as keyof typeof counts]++;
    return { items, counts };
}

export async function updateApplicationStatus(id: string, status: string): Promise<void> {
    const { error } = await supabaseAdmin().from("job_applications").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
}

export async function deleteApplication(id: string): Promise<void> {
    const { error } = await supabaseAdmin().from("job_applications").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
}

export async function getApplicationResume(id: string): Promise<{ resumeUrl: string; resumeName: string } | null> {
    const { data, error } = await supabaseAdmin().from("job_applications").select("resume_url,resume_name").eq("id", id).maybeSingle();
    if (error || !data) return null;
    const row = data as { resume_url: string | null; resume_name: string | null };
    return { resumeUrl: row.resume_url ?? "", resumeName: row.resume_name ?? "" };
}
