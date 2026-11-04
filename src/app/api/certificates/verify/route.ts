import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { lmsEnabled } from "@/lib/lms/flag";
import { normalizeCertificateCode } from "@/lib/lms/certificate";
import { getCertificateByCode } from "@/services/lms-certificates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public certificate check: anyone can confirm a code is genuine. Anonymous,
 * so it is rate-limited per IP, and it returns only what the certificate page
 * itself shows (no email or user id).
 */
export async function GET(req: NextRequest) {
  if (!lmsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limited = await enforceRateLimit("verify", req);
  if (limited) return limited;

  const code = normalizeCertificateCode(req.nextUrl.searchParams.get("code") ?? "");
  if (!code) return NextResponse.json({ valid: false, reason: "invalid-format" }, { status: 400 });

  const cert = await getCertificateByCode(code);
  if (!cert) return NextResponse.json({ valid: false, reason: "not-found" }, { status: 404, headers: { "cache-control": "no-store" } });

  return NextResponse.json(
    {
      valid: true,
      certificate: {
        code: cert.code,
        learnerName: cert.learnerName,
        courseTitle: cert.courseTitle,
        issuedAt: cert.issuedAt,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
