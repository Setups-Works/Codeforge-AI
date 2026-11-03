import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { lmsEnabled } from "@/lib/lms/flag";
import { isUuid } from "@/lib/lms/guard";
import { COURSE_REFUND_DAYS } from "@/lib/lms/constants";
import { addressLines, invoiceResponse, money, renderInvoiceHtml } from "@/lib/invoice-html";
import { getInvoiceUserProfile } from "@/services/billing-store";
import { getCourseInvoice } from "@/services/billing-ledger";

/** Printable HTML invoice for one course purchase. No tax is applied to courses. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!lmsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const notFound = () => NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!isUuid(id)) return notFound();

  const order = await getCourseInvoice(session.user.id, id);
  if (!order) return notFound();
  const user = await getInvoiceUserProfile(session.user.id);

  const num = `CF-C${order.id.replace(/-/g, "").slice(-8).toUpperCase()}`;
  const html = renderInvoiceHtml({
    number: num,
    date: order.paidAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    billedTo: {
      name: user?.name ?? null,
      email: user?.email ?? null,
      addressLines: addressLines(user?.billing),
      phone: user?.billing?.phone ?? null,
    },
    extra: { label: "Refund window", value: `${COURSE_REFUND_DAYS} days from purchase` },
    description: `${order.courseTitle} — online course`,
    total: money(order.amount, order.currency),
    badge: order.status === "refunded" ? { label: "Refunded", refunded: true } : { label: "Paid" },
    paymentRef: order.paymentId,
  });
  return invoiceResponse(html, num);
}
