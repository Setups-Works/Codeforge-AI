import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Serve a blog post's cover image (decoded from inline base64). Public. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let post: { coverData: string | null; coverMime: string | null } | null;
  {    const { data } = await supabaseAdmin()
      .from("blog_posts")
      .select("cover_data,cover_mime")
      .eq("slug", slug)
      .maybeSingle();
    const p = data as { cover_data: string | null; cover_mime: string | null } | null;
    post = p ? { coverData: p.cover_data, coverMime: p.cover_mime } : null;}
  if (!post?.coverData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(post.coverData, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": post.coverMime ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(buffer.length),
    },
  });
}
