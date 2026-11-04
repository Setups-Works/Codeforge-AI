import { NextRequest, NextResponse } from "next/server";
import { GROWTH } from "@/lib/lms/growth";
import { lmsEnabled } from "@/lib/lms/flag";
import { isValidReferralCode } from "@/lib/lms/referral";

/** Referral share link: remember the code for a while, then send the visitor to the courses. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const res = NextResponse.redirect(new URL(lmsEnabled() ? "/courses" : "/", req.url));
  const code = (await params).code.toUpperCase();
  if (lmsEnabled() && isValidReferralCode(code)) {
    res.cookies.set(GROWTH.referral.cookie, code, {
      maxAge: GROWTH.referral.cookieDays * 86_400,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return res;
}
