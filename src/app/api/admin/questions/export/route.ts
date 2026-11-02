import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { exportQuestions } from "@/services/questions";

export const dynamic = "force-dynamic";

/**
 * Admin: download every question as a JSON file in the same format the
 * importer accepts — a full backup that can be re-uploaded anywhere.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const payload = await exportQuestions();

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="setups-works-questions-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
