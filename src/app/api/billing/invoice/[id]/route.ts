import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getPaidSubscriptionById, getInvoiceUserProfile } from "@/services/billing-store";
import { addressLines, invoiceResponse, money, renderInvoiceHtml } from "@/lib/invoice-html";

/** Printable HTML invoice for one paid subscription (download → print to PDF). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;

  const sub = await getPaidSubscriptionById(session.user.id, id);
  if (!sub) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const user = await getInvoiceUserProfile(session.user.id);

  const num = `CF-${sub.id.slice(-8).toUpperCase()}`;
  const planName = sub.plan === "plus" ? "Plus" : "Go";

  const html = renderInvoiceHtml({
    number: num,
    date: new Date(sub.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    billedTo: {
      name: user?.name ?? null,
      email: user?.email ?? null,
      addressLines: addressLines(user?.billing),
      phone: user?.billing?.phone ?? null,
    },
    extra: {
      label: "Period",
      value:
        sub.periodStart && sub.periodEnd
          ? `${new Date(sub.periodStart).toLocaleDateString()} – ${new Date(sub.periodEnd).toLocaleDateString()}`
          : "—",
    },
    description: `${planName} Plan — ${sub.billingCycle} subscription`,
    total: money(sub.amount, sub.currency || "USD"),
    badge: { label: "Paid" },
    paymentRef: sub.paymentId,
  });

  return invoiceResponse(html, num);
}
