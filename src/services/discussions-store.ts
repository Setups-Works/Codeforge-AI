import { supabaseAdmin } from "@/lib/supabase/admin";

/** Embedded reply as stored in the discussions.replies jsonb. */
export interface SbReply {
  _id: string;
  author: string;
  content: string;
  parentReply?: string;
  createdAt: string;
}

export interface SbDiscussionRow {
  id: string;
  question_id: string | null;
  author_id: string | null;
  title: string;
  content: string;
  tags: string[] | null;
  kind: string;
  language: string | null;
  upvotes: string[] | null;
  downvotes: string[] | null;
  replies: SbReply[] | null;
  is_pinned: boolean;
  ai_summary: string | null;
  ai_summary_at: string | null;
  views: number;
  created_at: string;
}

export interface AuthorRef {
  _id: string;
  username: string;
  name: string;
  image: string | null;
}

export const DISCUSSION_LIST_COLS =
  "id,question_id,author_id,title,content,tags,kind,language,upvotes,downvotes,is_pinned,ai_summary,ai_summary_at,views,created_at";
export const DISCUSSION_FULL_COLS = `${DISCUSSION_LIST_COLS},replies`;

/** Fetch author user rows keyed by id, shaped like a populated Mongo subdoc. */
export async function fetchAuthors(ids: string[]): Promise<Map<string, AuthorRef>> {
  const map = new Map<string, AuthorRef>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const { data } = await supabaseAdmin()
    .from("users")
    .select("id,username,name,image")
    .in("id", unique);
  for (const u of (data ?? []) as { id: string; username: string; name: string; image: string | null }[]) {
    map.set(u.id, { _id: u.id, username: u.username, name: u.name, image: u.image });
  }
  return map;
}

/** Common discussion fields shaped for the client (author populated). */
function baseShape(row: SbDiscussionRow, authors: Map<string, AuthorRef>) {
  return {
    _id: row.id,
    question: row.question_id,
    author: row.author_id ? authors.get(row.author_id) ?? null : null,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    kind: row.kind,
    language: row.language,
    upvotes: row.upvotes ?? [],
    downvotes: row.downvotes ?? [],
    isPinned: row.is_pinned,
    aiSummary: row.ai_summary,
    aiSummaryAt: row.ai_summary_at,
    views: row.views,
    createdAt: row.created_at,
  };
}

/** List item (no replies). */
export function listShape(row: SbDiscussionRow, authors: Map<string, AuthorRef>) {
  return baseShape(row, authors);
}

/** Detail item with replies (reply authors populated). */
export function detailShape(row: SbDiscussionRow, authors: Map<string, AuthorRef>) {
  const replies = (row.replies ?? []).map((r) => ({
    _id: r._id,
    author: authors.get(r.author) ?? null,
    content: r.content,
    parentReply: r.parentReply ?? null,
    createdAt: r.createdAt,
  }));
  return { ...baseShape(row, authors), replies };
}

export type DiscussionDetailView = ReturnType<typeof detailShape>;


interface PopulatedAuthor {
  _id: { toString(): string };
  username?: string;
  name?: string;
  image?: string | null;
}
interface MongoDiscussionDoc {
  _id: { toString(): string };
  question?: { toString(): string } | null;
  author?: PopulatedAuthor | null;
  title: string;
  content: string;
  tags?: string[];
  kind: string;
  language?: string | null;
  upvotes?: { toString(): string }[];
  downvotes?: { toString(): string }[];
  replies?: {
    _id: { toString(): string };
    author?: PopulatedAuthor | null;
    content: string;
    parentReply?: { toString(): string } | null;
    createdAt: Date;
  }[];
  isPinned?: boolean;
  aiSummary?: string | null;
  aiSummaryAt?: Date | null;
  views?: number;
  createdAt: Date;
}

function authorRef(a: PopulatedAuthor | null | undefined): AuthorRef | null {
  return a ? { _id: a._id.toString(), username: a.username ?? "", name: a.name ?? "", image: a.image ?? null } : null;
}

/** Increment views and return the full discussion detail (thread pages). */
export async function getDiscussionForView(id: string): Promise<DiscussionDetailView | null> {
    const sb = supabaseAdmin();
    const { data } = await sb.from("discussions").select(DISCUSSION_FULL_COLS).eq("id", id).maybeSingle();
    if (!data) return null;
    const row = data as SbDiscussionRow;
    await sb.from("discussions").update({ views: (row.views ?? 0) + 1 }).eq("id", id);
    row.views = (row.views ?? 0) + 1;
    const authors = await fetchAuthors([row.author_id ?? "", ...(row.replies ?? []).map((r) => r.author)].filter(Boolean));
    return detailShape(row, authors);
}

/** A discussion's title (thread metadata). */
export async function getDiscussionTitle(id: string): Promise<string | null> {
    const { data } = await supabaseAdmin().from("discussions").select("title").eq("id", id).maybeSingle();
    return (data as { title: string } | null)?.title ?? null;
}

export interface RecentDiscussion {
  _id: string;
  title: string;
  kind: string;
  author: AuthorRef | null;
  createdAt: string | Date;
  upvotes: string[];
}

/** Most recent discussions with authors (community page). */
export async function getRecentDiscussions(limit: number): Promise<RecentDiscussion[]> {
    const { data } = await supabaseAdmin()
      .from("discussions")
      .select("id,title,kind,author_id,created_at,upvotes")
      .order("created_at", { ascending: false })
      .limit(limit);
    const rows = (data ?? []) as { id: string; title: string; kind: string; author_id: string | null; created_at: string; upvotes: string[] | null }[];
    const authors = await fetchAuthors(rows.map((r) => r.author_id ?? "").filter(Boolean));
    return rows.map((r) => ({
      _id: r.id, title: r.title, kind: r.kind,
      author: r.author_id ? authors.get(r.author_id) ?? null : null,
      createdAt: r.created_at, upvotes: r.upvotes ?? [],
    }));
}

/** Public forum threads (id + last-modified) for the sitemap. */
export async function listDiscussionsForSitemap(limit = 5000): Promise<{ id: string; updatedAt: Date }[]> {
    const { data } = await supabaseAdmin()
      .from("discussions")
      .select("id,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return ((data ?? []) as { id: string; created_at: string }[]).map((r) => ({
      id: r.id,
      updatedAt: new Date(r.created_at),
    }));
}

/** Count discussions (optionally only those created today). */
export async function countDiscussions(opts: { sinceToday?: boolean } = {}): Promise<number> {
    let q = supabaseAdmin().from("discussions").select("id", { count: "exact", head: true });
    if (opts.sinceToday) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      q = q.gte("created_at", start.toISOString());
    }
    const { count } = await q;
    return count ?? 0;
}
