import { NextRequest,NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { SUBMISSION_STATUSES } from "@/lib/constants";

const SUBMISSION_STATUSES_GUARD: string[] = [...SUBMISSION_STATUSES];
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AdminSubItem {
  id: string;
  kind: string;
  status: string;
  language: string | null;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  createdAt: string | Date;
  user: { name: string; username: string } | null;
  target: { title: string; href: string } | null;
}

/** Admin: latest submissions across the platform, optionally by status */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status");
  const statusFilter = status && SUBMISSION_STATUSES_GUARD.includes(status) ? status : null;
    const sb = supabaseAdmin();
    let q = sb
      .from("submissions")
      .select("id,kind,status,language,passed_count,total_count,runtime_ms,created_at,user_id,question_id,challenge_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (statusFilter) q = q.eq("status", statusFilter);
    const { data } = await q;
    const rows = (data ?? []) as {
      id: string; kind: string; status: string; language: string | null;
      passed_count: number; total_count: number; runtime_ms: number | null; created_at: string;
      user_id: string | null; question_id: string | null; challenge_id: string | null;
    }[];
    const [users, questions, challenges] = await Promise.all([
      fetchMap(sb, "users", "id,name,username", rows.map((r) => r.user_id)),
      fetchMap(sb, "questions", "id,title,slug", rows.map((r) => r.question_id)),
      fetchMap(sb, "frontend_challenges", "id,title,slug", rows.map((r) => r.challenge_id)),
    ]);
    const submissions: AdminSubItem[] = rows.map((s) => {
      const u = s.user_id ? users.get(s.user_id) : null;
      const qq = s.question_id ? questions.get(s.question_id) : null;
      const cc = s.challenge_id ? challenges.get(s.challenge_id) : null;
      return {
        id: s.id, kind: s.kind, status: s.status, language: s.language,
        passedCount: s.passed_count, totalCount: s.total_count, runtimeMs: s.runtime_ms, createdAt: s.created_at,
        user: u ? { name: u.name as string, username: u.username as string } : null,
        target: qq ? { title: qq.title as string, href: `/problems/${qq.slug}` }
          : cc ? { title: cc.title as string, href: `/challenges/${cc.slug}` } : null,
      };
    });
    return NextResponse.json({ submissions });
}

type SbClient = ReturnType<typeof supabaseAdmin>;
async function fetchMap(sb: SbClient, table: string, cols: string, ids: (string | null)[]) {
  const uniq = [...new Set(ids.filter(Boolean))] as string[];
  const map = new Map<string, Record<string, unknown>>();
  if (!uniq.length) return map;
  const { data } = await sb.from(table).select(cols).in("id", uniq);
  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) map.set(row.id as string, row);
  return map;
}
