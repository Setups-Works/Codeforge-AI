import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSiteConfig, MASKED } from "@/lib/site-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  return null;
}

function ok(message: string) {
  return NextResponse.json({ ok: true, message });
}
function fail(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 200 });
}

/** Resolve: use form value if not masked, else fall back to DB/env */
function val(formVal: string, dbVal: string, envVal?: string): string {
  if (formVal && formVal !== MASKED) return formVal;
  if (dbVal && dbVal !== MASKED) return dbVal;
  return envVal ?? "";
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { service } = body;
  const cfg = await getSiteConfig();

  // ── Supabase ──────────────────────────────────────────────────────────────
  if (service === "supabase") {
    try {
      const { error } = await supabaseAdmin().from("users").select("id", { head: true, count: "exact" }).limit(1);
      if (error) return fail("Supabase error: " + error.message);
      return ok("Supabase connected successfully.");
    } catch (e) {
      return fail("Supabase error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── SMTP ─────────────────────────────────────────────────────────────────
  if (service === "smtp") {
    const host = val(body.smtpHost, cfg.smtpHost, process.env.SMTP_HOST ?? "smtp.hostinger.com");
    const port = Number(body.smtpPort || cfg.smtpPort || process.env.SMTP_PORT || 465);
    const user = val(body.smtpUser, cfg.smtpUser, process.env.SMTP_USER);
    const pass = val(body.smtpPass, cfg.smtpPass, process.env.SMTP_PASS);
    const from = val(body.smtpFrom, cfg.smtpFrom, process.env.SMTP_FROM ?? user);
    const to = val(body.smtpUser, cfg.smtpUser, process.env.SMTP_USER);
    try {
      const nodemailer = (await import("nodemailer")).default;
      const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      await t.verify();
      await t.sendMail({
        from: from || user,
        to,
        subject: "Setups Works Lab — SMTP Test",
        html: "<p>SMTP connection test from the admin panel. If you see this, it works!</p>",
      });
      return ok(`SMTP connected and test email sent to ${to}.`);
    } catch (e) {
      return fail("SMTP error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── Redis ─────────────────────────────────────────────────────────────────
  if (service === "redis") {
    const url = val(body.redisUrl, cfg.redisUrl, process.env.UPSTASH_REDIS_REST_URL);
    const token = val(body.redisToken, cfg.redisToken, process.env.UPSTASH_REDIS_REST_TOKEN);
    try {
      const res = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json() as { result?: string };
      if (data.result === "PONG") return ok("Redis connected — PONG received.");
      return fail("Redis responded but not PONG: " + JSON.stringify(data));
    } catch (e) {
      return fail("Redis error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── Groq / AI ─────────────────────────────────────────────────────────────
  if (service === "groq") {
    const apiKey = val(body.groqApiKey, cfg.groqApiKey, process.env.GROQ_API_KEY);
    const model = val(body.groqModel, cfg.groqModel, process.env.GROQ_MODEL ?? "openai/gpt-oss-120b");
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Say OK" }], max_tokens: 5 }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return ok(`Groq API connected — model ${model} responded.`);
      const err = await res.text();
      return fail(`Groq error ${res.status}: ${err.slice(0, 200)}`);
    } catch (e) {
      return fail("Groq error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── Judge0 ────────────────────────────────────────────────────────────────
  if (service === "judge0") {
    const url = val(body.judge0Url, cfg.judge0Url, process.env.JUDGE0_URL ?? "https://judge0-ce.p.rapidapi.com");
    const apiKey = val(body.judge0ApiKey, cfg.judge0ApiKey, process.env.JUDGE0_API_KEY);
    try {
      const res = await fetch(`${url}/languages`, {
        headers: apiKey
          ? { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": new URL(url).hostname }
          : {},
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const langs = await res.json() as unknown[];
        return ok(`Judge0 connected — ${langs.length} languages available.`);
      }
      return fail(`Judge0 error ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
    } catch (e) {
      return fail("Judge0 error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── Piston ────────────────────────────────────────────────────────────────
  if (service === "piston") {
    const url = val(body.pistonUrl, cfg.pistonUrl, process.env.PISTON_URL ?? "https://emkc.org");
    try {
      const res = await fetch(`${url}/api/v2/runtimes`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const runtimes = await res.json() as unknown[];
        return ok(`Piston connected — ${runtimes.length} runtimes available.`);
      }
      return fail(`Piston error ${res.status}`);
    } catch (e) {
      return fail("Piston error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── Paiza ─────────────────────────────────────────────────────────────────
  if (service === "paiza") {
    const url = val(body.paizaUrl, cfg.paizaUrl, process.env.PAIZA_URL ?? "https://api.paiza.io");
    const apiKey = val(body.paizaApiKey, cfg.paizaApiKey, process.env.PAIZA_API_KEY ?? "guest");
    try {
      const res = await fetch(`${url}/runners/create`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ source_code: 'print("ok")', language: "python3", api_key: apiKey }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (data.id) return ok("Paiza connected — runner created successfully.");
      return fail("Paiza error: " + (data.error ?? "no runner id returned"));
    } catch (e) {
      return fail("Paiza error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  // ── Razorpay ──────────────────────────────────────────────────────────────
  if (service === "razorpay") {
    const keyId = val(body.razorpayKeyId, cfg.razorpayKeyId, process.env.RAZORPAY_KEY_ID);
    const keySecret = val(body.razorpayKeySecret, cfg.razorpayKeySecret, process.env.RAZORPAY_KEY_SECRET);
    try {
      const res = await fetch("https://api.razorpay.com/v1/items?count=1", {
        headers: {
          Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 404) return ok("Razorpay API credentials are valid.");
      return fail(`Razorpay error ${res.status}: invalid credentials`);
    } catch (e) {
      return fail("Razorpay error: " + (e instanceof Error ? e.message : "unknown"));
    }
  }

  return NextResponse.json({ error: "Unknown service" }, { status: 400 });
}
