import { NextRequest,NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/newsletter";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function page(title: string, message: string, ok: boolean): NextResponse {
  const color = ok ? "#059669" : "#e5484d";
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f2f2f2;">
<div style="max-width:460px;margin:80px auto;background:#fff;border:1px solid #00000014;border-radius:16px;padding:40px;text-align:center;">
<div style="font-size:40px;line-height:1;color:${color};margin-bottom:16px;">${ok ? "✓" : "!"}</div>
<h1 style="margin:0 0 10px;font-size:22px;color:#171717;">${title}</h1>
<p style="margin:0 0 24px;font-size:15px;color:#4d4d4d;line-height:22px;">${message}</p>
<a href="https://labs.setups.works" style="display:inline-block;padding:12px 22px;background:#171717;color:#fff;border-radius:6px;text-decoration:none;font-size:15px;">Back to Setups Works Lab</a>
</div></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** One-click unsubscribe from a newsletter footer link. Public, token-verified. */
export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return page("Invalid link", "This unsubscribe link is invalid or has expired.", false);
  }
  try {
    {      await supabaseAdmin().from("users").update({ email_opt_out: true }).eq("email", email);}
  } catch {
    return page("Something went wrong", "We couldn't update your preferences. Please try again later.", false);
  }
  return page(
    "You're unsubscribed",
    "You won't receive newsletters from Setups Works Lab anymore. You'll still get important account and billing emails.",
    true,
  );
}
