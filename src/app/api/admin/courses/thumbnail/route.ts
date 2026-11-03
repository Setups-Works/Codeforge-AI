import { NextRequest, NextResponse } from "next/server";
import { requireLmsAdmin } from "@/lib/lms/guard";
import { uploadPublicFile, storageEnabled } from "@/lib/storage";

export const runtime = "nodejs";

// Vercel caps request bodies at ~4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Upload a course thumbnail / instructor image; returns its public URL. */
export async function POST(req: NextRequest) {
  const { error } = await requireLmsAdmin();
  if (error) return error;
  if (!storageEnabled()) return NextResponse.json({ error: "Image upload isn't configured." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "No image provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 4 MB." }, { status: 413 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Please upload a PNG, JPEG or WebP image." }, { status: 415 });

  try {
    return NextResponse.json({ url: await uploadPublicFile("covers", file, file.type) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 502 });
  }
}
