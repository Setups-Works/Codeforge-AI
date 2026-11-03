import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ServiceResult } from "@/services/lms-courses";

/** Parse a JSON body against a zod schema; returns a ready 400 on failure. */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return { error: NextResponse.json({ error: `${where}${issue?.message ?? "Invalid input"}` }, { status: 400 }) };
  }
  return { data: parsed.data };
}

/** Turn a service result into a response (`ok` payload or its error status). */
export function respond<T>(result: ServiceResult<T>, okBody: (data: T) => unknown, okStatus = 200) {
  return result.ok
    ? NextResponse.json(okBody(result.data), { status: okStatus })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
