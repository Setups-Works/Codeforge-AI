// Setups Works Lab email templates — Vercel Geist design system (Light theme).
// Primary action = solid gray-1000; blue-700 reserved for links/accent.
const PRIMARY = "#171717"; // gray-1000 — primary text + primary button
const SECONDARY = "#4d4d4d"; // gray-900 — secondary text
const MUTED = "#8f8f8f"; // gray-700 — tertiary text / fine print
const BLUE = "#006bff"; // blue-700 — links, accent
const BLUE_100 = "#f0f7ff"; // blue-100 — info surface
const BLUE_400 = "#cae7ff"; // blue-400 — info border
const BG100 = "#ffffff"; // card surface
const PAGE = "#eceef3"; // page background
const SOFT = "#f6f7f9"; // subtle separation surface
const BORDER = "#00000014"; // gray-alpha-400 — default border
const SHADOW = "0 12px 32px rgba(9,14,30,0.10)"; // raised card
const DARK = "#0b1226"; // masthead / brand band
const FONT =
  "'Geist','Geist Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// White wordmark for the dark masthead (logo-dark.png is the light-on-dark variant).
const LOGO_WHITE = "https://labs.setups.works/logo-dark.png";

function base(content: string, footerExtra = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Setups Works Lab</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:18px;overflow:hidden;border:1px solid ${BORDER};box-shadow:${SHADOW};">
          <!-- Masthead -->
          <tr>
            <td align="center" style="background:${DARK};background-image:linear-gradient(135deg,#0b3ea8 0%,#0b1226 60%);padding:30px 40px;border-bottom:3px solid ${BLUE};">
              <img src="${LOGO_WHITE}" alt="Setups Works Lab" height="26" style="height:26px;width:auto;display:block;" />
            </td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background:${BG100};padding:40px;">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:22px 16px 0;">
              <p style="margin:0 0 10px;font-size:13px;color:${MUTED};line-height:18px;">
                <a href="https://labs.setups.works/dashboard" style="color:${SECONDARY};text-decoration:none;">Dashboard</a>
                &nbsp;&middot;&nbsp;
                <a href="https://labs.setups.works/help" style="color:${SECONDARY};text-decoration:none;">Help</a>
                &nbsp;&middot;&nbsp;
                <a href="https://labs.setups.works/privacy" style="color:${SECONDARY};text-decoration:none;">Privacy</a>
              </p>
              ${footerExtra}
              <p style="margin:0;font-size:12px;color:${MUTED};line-height:18px;">
                <a href="https://labs.setups.works" style="color:${BLUE};text-decoration:none;">labs.setups.works</a>
                &nbsp;&middot;&nbsp; &copy; ${new Date().getFullYear()} Setups Works Lab
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Primary button — brand blue, white label, pill-ish radius, soft shadow. */
function btn(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="background:${BLUE};border-radius:10px;box-shadow:0 6px 16px rgba(0,107,255,0.28);">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:600;line-height:20px;text-decoration:none;border-radius:10px;background:${BLUE};">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr><td style="border-top:1px solid ${BORDER};"></td></tr>
  </table>`;
}

/** Feature line with a small blue accent dot. */
function featureRow(text: string, last = false): string {
  return `<tr>
    <td style="padding:${last ? "0" : "0 0 14px"};">
      <span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${BLUE};vertical-align:middle;"></span>
      <span style="color:${PRIMARY};font-size:14px;font-weight:400;line-height:20px;margin-left:12px;vertical-align:middle;">${text}</span>
    </td>
  </tr>`;
}

function eyebrow(label: string): string {
  return `<div style="margin-bottom:16px;">
    <span style="display:inline-block;background:${BLUE_100};border:1px solid ${BLUE_400};color:${BLUE};font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;padding:5px 12px;border-radius:9999px;">
      ${label}
    </span>
  </div>`;
}

const H1 =
  `margin:0 0 12px;color:${PRIMARY};font-size:26px;font-weight:700;line-height:32px;letter-spacing:-0.6px;`;
const COPY = `margin:0 0 24px;color:${SECONDARY};font-size:16px;line-height:25px;`;

// ─── Welcome / Account Created ────────────────────────────────────────────────

export function welcomeEmailHtml({
  name,
  loginUrl,
}: {
  name: string;
  loginUrl: string;
}): string {
  return base(`
    <h1 style="${H1}">Welcome to Setups Works Lab, ${name}</h1>
    <p style="${COPY}">
      Your account is ready. You're now part of a community of developers
      sharpening their skills and acing technical interviews.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${featureRow("Solve 500+ real interview problems")}
            ${featureRow("AI mentor, pair programmer and 9 AI tools")}
            ${featureRow("Weekly contests and global leaderboards")}
            ${featureRow("Progress tracking, streaks and analytics", true)}
          </table>
        </td>
      </tr>
    </table>

    ${btn("Go to Dashboard", loginUrl)}

    ${divider()}

    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      Questions? Just reply to this email and we'll be happy to help.
    </p>
  `);
}

export function welcomeEmailSubject(name: string): string {
  return `Welcome to Setups Works Lab, ${name}`;
}

// ─── Beta Welcome ─────────────────────────────────────────────────────────────

export function betaWelcomeEmailHtml({
  name,
  dashboardUrl,
  spotsLeft,
  planExpiresAt,
}: {
  name: string;
  dashboardUrl: string;
  spotsLeft: number;
  planExpiresAt: string;
}): string {
  return base(`
    ${eyebrow("Beta access granted")}

    <h1 style="${H1}">You're in, ${name}</h1>
    <p style="${COPY}">
      You've secured early access to Setups Works Lab. As a beta member you get the
      <strong style="color:${PRIMARY};font-weight:600;">Go Plan free for 30 days</strong> — no credit card needed.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${featureRow("Go Plan — free for 30 days")}
            ${featureRow(`Plan active until <strong style="color:${PRIMARY};font-weight:600;">${planExpiresAt}</strong>`)}
            ${featureRow("Unlimited AI Mentor, Pair Programmer and Coach")}
            ${featureRow("All contests, challenges and leaderboards")}
            ${featureRow("Spaced repetition and advanced analytics", true)}
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${BLUE_100};border:1px solid ${BLUE_400};border-radius:12px;padding:14px 18px;text-align:center;">
          <span style="color:${SECONDARY};font-size:13px;line-height:18px;">Only <strong style="color:${BLUE};font-weight:600;">${spotsLeft} beta spot${spotsLeft !== 1 ? "s" : ""} remaining</strong> — share with friends before they're gone.</span>
        </td>
      </tr>
    </table>

    ${btn("Start Solving Problems", dashboardUrl)}

    ${divider()}

    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      Questions or feedback? Reply to this email — we read every message.
    </p>
  `);
}

export function betaWelcomeEmailSubject(name: string): string {
  return `You're in, ${name} — beta access and Go Plan activated`;
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export function resetPasswordEmailHtml({
  name,
  resetUrl,
  expiryMinutes = 60,
}: {
  name: string;
  resetUrl: string;
  expiryMinutes?: number;
}): string {
  return base(`
    <h1 style="${H1}">Reset your password</h1>
    <p style="margin:0;color:${SECONDARY};font-size:16px;line-height:24px;">
      Hi ${name}, we received a request to reset your Setups Works Lab password.
      Click the button below to choose a new one.
    </p>

    ${btn("Reset Password", resetUrl)}

    ${divider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;padding:14px 18px;">
          <p style="margin:0;color:${SECONDARY};font-size:13px;line-height:18px;">
            This link expires in <strong style="color:${PRIMARY};font-weight:600;">${expiryMinutes} minutes</strong>.
            If you didn't request a password reset, you can safely ignore this email —
            your password won't be changed.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;color:${MUTED};font-size:13px;line-height:18px;word-break:break-all;">
      Or copy and paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color:${BLUE};">${resetUrl}</a>
    </p>
  `);
}

export const resetPasswordEmailSubject = "Reset your Setups Works Lab password";

// ─── Billing / Payments ───────────────────────────────────────────────────────

/** A label→value row for the summary card in billing emails. */
function summaryRow(label: string, value: string, last = false): string {
  return `<tr>
    <td style="padding:${last ? "0" : "0 0 12px"};color:${SECONDARY};font-size:14px;line-height:20px;">${label}</td>
    <td align="right" style="padding:${last ? "0" : "0 0 12px"};color:${PRIMARY};font-size:14px;font-weight:600;line-height:20px;">${value}</td>
  </tr>`;
}

function summaryCard(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td>
    </tr>
  </table>`;
}

/** Card-on-file free trial started (no charge yet; first charge at trial end). */
export function trialStartedEmailHtml({
  name,
  planName,
  trialDays,
  firstChargeDate,
  amountLabel,
  manageUrl,
}: {
  name: string;
  planName: string;
  trialDays: number;
  firstChargeDate: string;
  amountLabel: string;
  manageUrl: string;
}): string {
  return base(`
    ${eyebrow("Free trial started")}
    <h1 style="${H1}">Your ${trialDays}-day free trial is live, ${name}</h1>
    <p style="${COPY}">
      You now have full access to <strong>${planName}</strong>. You won't be charged
      today — your first payment happens only when the trial ends, and you can
      cancel anytime before then at no cost.
    </p>
    ${summaryCard(
      summaryRow("Plan", planName) +
        summaryRow("Due today", "₹0") +
        summaryRow(`First charge · ${firstChargeDate}`, amountLabel, true),
    )}
    ${btn("Manage subscription", manageUrl)}
    ${divider()}
    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      Change your mind? Cancel before ${firstChargeDate} and you pay nothing.
    </p>
  `);
}

export function trialStartedEmailSubject(planName: string, trialDays: number): string {
  return `Your ${trialDays}-day ${planName} free trial has started`;
}

/** Payment received — used for both the first purchase and each renewal. */
export function paymentReceiptEmailHtml({
  name,
  planName,
  amountLabel,
  periodEndLabel,
  renewal,
  manageUrl,
}: {
  name: string;
  planName: string;
  amountLabel: string;
  periodEndLabel: string;
  renewal: boolean;
  manageUrl: string;
}): string {
  return base(`
    ${eyebrow(renewal ? "Payment received" : "Payment successful")}
    <h1 style="${H1}">${renewal ? `Thanks — your ${planName} plan renewed` : `Welcome to ${planName}, ${name}`}</h1>
    <p style="${COPY}">
      ${
        renewal
          ? `We've received your payment and extended your <strong>${planName}</strong> plan. No action needed.`
          : `Your payment went through and <strong>${planName}</strong> is now active. Auto-pay is on, so you'll never lose access mid-flow.`
      }
    </p>
    ${summaryCard(
      summaryRow("Plan", planName) +
        summaryRow("Amount", amountLabel) +
        summaryRow("Renews on", periodEndLabel, true),
    )}
    ${btn("View billing", manageUrl)}
    ${divider()}
    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      You can cancel auto-renewal anytime from your billing settings.
    </p>
  `);
}

export function paymentReceiptEmailSubject(planName: string, renewal: boolean): string {
  return renewal
    ? `Your Setups Works Lab ${planName} plan renewed`
    : `Payment received — ${planName} is active`;
}

/** Receipt for a one-time course purchase. */
export function courseReceiptEmailHtml({
  name,
  courseTitle,
  amountLabel,
  refundDays,
  courseUrl,
}: {
  name: string;
  courseTitle: string;
  amountLabel: string;
  refundDays: number;
  courseUrl: string;
}): string {
  return base(`
    ${eyebrow("Payment successful")}
    <h1 style="${H1}">You're in, ${name}</h1>
    <p style="${COPY}">
      Your payment went through and you now have access to <strong>${courseTitle}</strong>.
    </p>
    ${summaryCard(summaryRow("Course", courseTitle) + summaryRow("Amount paid", amountLabel, true))}
    ${btn("Start learning", courseUrl)}
    ${divider()}
    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      Not what you expected? You can request a refund within ${refundDays} days of purchase.
    </p>
  `);
}

export function courseReceiptEmailSubject(courseTitle: string): string {
  return `You're enrolled in ${courseTitle}`;
}

/** A recurring charge failed / the subscription was halted. */
export function paymentFailedEmailHtml({
  name,
  planName,
  updateUrl,
}: {
  name: string;
  planName: string;
  updateUrl: string;
}): string {
  return base(`
    ${eyebrow("Action needed")}
    <h1 style="${H1}">We couldn't process your payment, ${name}</h1>
    <p style="${COPY}">
      A charge for your <strong>${planName}</strong> plan didn't go through, so
      auto-pay is paused. Update your payment method to keep your access and
      avoid losing your streak, progress and AI tools.
    </p>
    ${btn("Update payment method", updateUrl)}
    ${divider()}
    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      Already fixed it? You can safely ignore this email.
    </p>
  `);
}

export function paymentFailedEmailSubject(planName: string): string {
  return `Action needed: your ${planName} payment failed`;
}

/** Auto-renewal cancelled — access continues until the period ends. */
export function subscriptionCancelledEmailHtml({
  name,
  planName,
  accessUntilLabel,
  resubscribeUrl,
}: {
  name: string;
  planName: string;
  accessUntilLabel: string;
  resubscribeUrl: string;
}): string {
  return base(`
    ${eyebrow("Subscription cancelled")}
    <h1 style="${H1}">Your auto-renewal is cancelled, ${name}</h1>
    <p style="${COPY}">
      We've turned off auto-pay for your <strong>${planName}</strong> plan. You
      keep full access until your current period ends — nothing changes before then.
    </p>
    ${summaryCard(
      summaryRow("Plan", planName) +
        summaryRow("Access until", accessUntilLabel, true),
    )}
    ${btn("Reactivate subscription", resubscribeUrl)}
    ${divider()}
    <p style="margin:0;color:${MUTED};font-size:13px;line-height:18px;text-align:center;">
      Changed your mind? Resubscribe anytime — your progress is always saved.
    </p>
  `);
}

export function subscriptionCancelledEmailSubject(planName: string): string {
  return `Your ${planName} auto-renewal is cancelled`;
}

// ─── Newsletter / Broadcast ───────────────────────────────────────────────────

/**
 * Admin newsletter/broadcast. `bodyHtml` must already be sanitized
 * (see {@link import('./newsletter').sanitizeNewsletterHtml}). All fields
 * except `bodyHtml` and `unsubscribeUrl` are optional.
 */
export function newsletterEmailHtml({
  heading,
  bodyHtml,
  imageUrl,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: {
  heading?: string;
  bodyHtml: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}): string {
  const img = imageUrl
    ? `<img src="${imageUrl}" alt="" style="width:100%;height:auto;border-radius:12px;display:block;margin:0 0 24px;" />`
    : "";
  const head = heading ? `<h1 style="${H1}">${heading}</h1>` : "";
  const cta = ctaLabel && ctaUrl ? btn(ctaLabel, ctaUrl) : "";
  return base(`
    ${img}
    ${head}
    <div style="color:${SECONDARY};font-size:16px;line-height:24px;">
      ${bodyHtml}
    </div>
    ${cta}
    ${divider()}
    <p style="margin:0;color:${MUTED};font-size:12px;line-height:18px;text-align:center;">
      You're receiving this because you have a Setups Works Lab account.
      <a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a>
    </p>
  `);
}
