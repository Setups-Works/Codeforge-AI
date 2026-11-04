import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid, notFound } from "@/lib/lms/guard";
import { getLessonCourse, resolveLessonAccess } from "@/services/lms-learn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORWARD_REQUEST = ["range", "if-range"];
const FORWARD_RESPONSE = ["content-length", "content-range", "accept-ranges", "etag", "last-modified"];

/**
 * Streams a Drive-hosted lesson video through our own origin so the Drive
 * file id / link never reaches the browser. Access is checked on every
 * request (enrolment, free preview, drip, expiry), and range requests are
 * forwarded so seeking and resume work.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;

  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const found = await getLessonCourse(id);
  if (!found) return notFound();

  const { decision, lesson } = await resolveLessonAccess(session.user, found.courseId, id);
  if (!decision.allowed || !lesson?.video) return NextResponse.json({ error: "You don't have access to this lesson" }, { status: 403 });
  if (lesson.video.provider !== "drive") return notFound();

  const upstreamUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(lesson.video.ref)}&export=download&confirm=t`;
  const headers = new Headers();
  for (const h of FORWARD_REQUEST) {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { headers, redirect: "follow", signal: req.signal });
  } catch {
    return NextResponse.json({ error: "Video unavailable" }, { status: 502 });
  }

  const type = upstream.headers.get("content-type") ?? "";
  // Drive answers with an HTML page when the file is private, missing or over quota.
  if ((!upstream.ok && upstream.status !== 206) || type.includes("text/html") || !upstream.body) {
    return NextResponse.json({ error: "Video unavailable" }, { status: 502 });
  }

  const out = new Headers();
  for (const h of FORWARD_RESPONSE) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  out.set("content-type", type.startsWith("video/") ? type : "video/mp4");
  out.set("cache-control", "private, no-store");
  out.set("x-content-type-options", "nosniff");
  out.set("content-disposition", "inline");
  out.set("cross-origin-resource-policy", "same-origin");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
