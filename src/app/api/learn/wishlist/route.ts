import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { notFound } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { wishlistSchema } from "@/schemas/course";
import { setWishlisted } from "@/services/lms-engagement";

export const runtime = "nodejs";

async function handle(req: NextRequest, on: boolean) {
  if (!lmsEnabled()) return notFound();
  const { session, error } = await requireUser();
  if (error) return error;
  const limited = await enforceRateLimit("api", req, session.user.id);
  if (limited) return limited;
  const body = await parseBody(req, wishlistSchema);
  if (body.error) return body.error;
  const result = await setWishlisted(session.user.id, body.data.courseId, on);
  return result.ok ? NextResponse.json({ ok: true, wishlisted: on }) : NextResponse.json({ error: result.error }, { status: result.status });
}

export const POST = (req: NextRequest) => handle(req, true);
export const DELETE = (req: NextRequest) => handle(req, false);
