import { supabaseAdmin } from "@/lib/supabase/admin";
import { toUuidOrNull } from "@/lib/data-backend";

/**
 * Feedback data access — the Phase-2 pilot of the Supabase migration.
 * Routes call these functions rather than querying the table directly.
 */

export interface FeedbackInput {
  type: "feature" | "bug" | "issue";
  title: string;
  description: string;
  email?: string;
  userId?: string | null;
}

export interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  description: string;
  email: string;
  user: { name: string; username: string } | null;
  status: string;
  createdAt: string | Date;
}

export interface FeedbackList {
  items: FeedbackItem[];
  counts: { new: number; read: number; resolved: number };
}


export async function createFeedback(input: FeedbackInput): Promise<void> {
    const { error } = await supabaseAdmin().from("feedback").insert({
      type: input.type,
      title: input.title,
      description: input.description,
      email: input.email ?? "",
      // ObjectId can't go in a uuid column; re-linked during the users backfill.
      user_id: toUuidOrNull(input.userId),
    });
    if (error) throw new Error(error.message);
    return;
}

interface SbFeedbackRow {
  id: string;
  type: string;
  title: string;
  description: string;
  email: string | null;
  status: string;
  created_at: string;
  users: { name: string | null; username: string | null } | null;
}

export async function listFeedback(filter: { status?: string; type?: string }): Promise<FeedbackList> {
    const sb = supabaseAdmin();
    let q = sb
      .from("feedback")
      .select("id,type,title,description,email,status,created_at,users(name,username)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
    if (filter.type && filter.type !== "all") q = q.eq("type", filter.type);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as SbFeedbackRow[];
    const items: FeedbackItem[] = rows.map((f) => ({
      id: f.id,
      type: f.type,
      title: f.title,
      description: f.description,
      email: f.email ?? "",
      user: f.users ? { name: f.users.name ?? "", username: f.users.username ?? "" } : null,
      status: f.status,
      createdAt: f.created_at,
    }));
    const { data: statusRows } = await sb.from("feedback").select("status");
    const counts = { new: 0, read: 0, resolved: 0 };
    for (const r of (statusRows ?? []) as { status: string }[]) {
      if (r.status === "new" || r.status === "read" || r.status === "resolved") counts[r.status]++;
    }
    return { items, counts };
}

export async function updateFeedbackStatus(id: string, status: string): Promise<void> {
    const { error } = await supabaseAdmin().from("feedback").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
}

export async function deleteFeedback(id: string): Promise<void> {
    const { error } = await supabaseAdmin().from("feedback").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
}
