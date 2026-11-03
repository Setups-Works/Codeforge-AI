import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/user-provision";
import { sendEmail } from "@/lib/mailer";
import { betaWelcomeEmailHtml, betaWelcomeEmailSubject } from "@/lib/email-templates";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sanitizeUserContent, cap } from "@/lib/sanitize";
import { BETA_LIMIT } from "@/lib/constants";
import { z } from "zod";

const betaSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers and underscores"),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (p) => /[A-Z]/.test(p) || /[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p),
      "Password must contain at least one uppercase letter, number, or symbol",
    ),
});

async function betaUserCount(): Promise<number> {
  const { count } = await supabaseAdmin()
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("beta_user", true);
  return count ?? 0;
}

export async function GET() {
  const count = await betaUserCount();
  return NextResponse.json({ count, limit: BETA_LIMIT, spotsLeft: Math.max(0, BETA_LIMIT - count) });
}

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit("auth", req);
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = betaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, username, email, password } = parsed.data;
  const cleanName = sanitizeUserContent(cap(name, 80));
  const cleanUsername = cap(username.toLowerCase(), 30);
  const cleanEmail = email.toLowerCase();

  const betaCount = await betaUserCount();
  if (betaCount >= BETA_LIMIT) {
    return NextResponse.json({ error: "Sorry, all 50 beta spots have been claimed." }, { status: 409 });
  }

  const admin = supabaseAdmin();
  const [emailTaken, usernameTaken] = await Promise.all([
    admin.from("users").select("id").eq("email", cleanEmail).maybeSingle(),
    admin.from("users").select("id").eq("username", cleanUsername).maybeSingle(),
  ]);

  if (emailTaken.data) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  if (usernameTaken.data) return NextResponse.json({ error: "This username is already taken" }, { status: 409 });

  const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const created = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { name: cleanName, username: cleanUsername },
  });
  if (created.error || !created.data.user) {
    return NextResponse.json({ error: created.error?.message ?? "Could not create your account" }, { status: 400 });
  }
  await ensureProfile({
    id: created.data.user.id,
    email: cleanEmail,
    name: cleanName,
    username: cleanUsername,
    provider: "credentials",
  });
  const { error: planError } = await admin
    .from("users")
    .update({ plan: "go", plan_expires_at: planExpiresAt.toISOString(), beta_user: true })
    .eq("id", created.data.user.id);
  if (planError) {
    return NextResponse.json({ error: "Account created but beta plan could not be applied" }, { status: 500 });
  }

  const spotsLeft = Math.max(0, BETA_LIMIT - betaCount - 1);
  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const expiryStr = planExpiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  sendEmail({
    to: cleanEmail,
    subject: betaWelcomeEmailSubject(cleanName),
    html: betaWelcomeEmailHtml({ name: cleanName, dashboardUrl: `${appUrl}/dashboard`, spotsLeft, planExpiresAt: expiryStr }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, spotsLeft }, { status: 201 });
}
