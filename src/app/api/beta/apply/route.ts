import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { betaWelcomeEmailHtml,betaWelcomeEmailSubject } from "@/lib/email-templates";
import { BETA_LIMIT } from "@/lib/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { betaUserCount,updateUserPlan } from "@/services/billing-store";

// Called after Google OAuth on /beta/success to apply Go plan if slots available
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let user: { name: string; email: string; betaUser: boolean } | null;
  {    const { data } = await supabaseAdmin()
      .from("users")
      .select("name,email,beta_user")
      .eq("id", session.user.id)
      .maybeSingle();
    const u = data as { name: string; email: string; beta_user: boolean } | null;
    user = u ? { name: u.name, email: u.email, betaUser: u.beta_user } : null;}
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Already a beta user — just confirm
  if (user.betaUser) {
    const betaCount = await betaUserCount();
    return NextResponse.json({ ok: true, spotsLeft: Math.max(0, BETA_LIMIT - betaCount) });
  }

  const betaCount = await betaUserCount();
  if (betaCount >= BETA_LIMIT) {
    return NextResponse.json({ ok: false, error: "All 50 beta spots have been claimed." });
  }

  const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await updateUserPlan(session.user.id, {
    plan: "go",
    planExpiresAt,
    betaUser: true,
  });

  const spotsLeft = Math.max(0, BETA_LIMIT - betaCount - 1);
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const expiryStr = planExpiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  sendEmail({
    to: user.email,
    subject: betaWelcomeEmailSubject(user.name),
    html: betaWelcomeEmailHtml({ name: user.name, dashboardUrl: `${appUrl}/dashboard`, spotsLeft, planExpiresAt: expiryStr }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, spotsLeft });
}
