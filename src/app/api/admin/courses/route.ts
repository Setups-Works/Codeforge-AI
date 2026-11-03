import { NextRequest, NextResponse } from "next/server";
import { requireLmsAdmin } from "@/lib/lms/guard";
import { parseBody } from "@/lib/lms/route";
import { courseCreateSchema } from "@/schemas/course";
import { adminListCourses, createCourse } from "@/services/lms-courses";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  return NextResponse.json({ courses: await adminListCourses() });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireLmsAdmin();
  if (error) return error;
  const body = await parseBody(req, courseCreateSchema);
  if (body.error) return body.error;
  const created = await createCourse(body.data.title, session.user.id);
  return NextResponse.json(created, { status: 201 });
}
