import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { lmsEnabled } from "@/lib/lms/flag";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: string) => UUID.test(v);

/** Admin-only gate for LMS admin routes. Hidden (404) while the LMS flag is off. */
export async function requireLmsAdmin() {
  if (!lmsEnabled()) {
    return { session: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return requireAdmin();
}

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
