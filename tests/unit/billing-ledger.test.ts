import { courseRow, mergeLedger, subscriptionRow, totalsByCurrency } from "@/lib/billing-ledger";
import { esc, money, renderInvoiceHtml } from "@/lib/invoice-html";

const sub = (id: string, iso: string, amount = 49) =>
  subscriptionRow({ id, plan: "go", billingCycle: "monthly", amount, currency: "INR", createdAt: new Date(iso) }, "Go");
const course = (id: string, iso: string, status: "paid" | "refunded" = "paid", amount = 500) =>
  courseRow({ id, courseTitle: "DSA", courseSlug: "dsa", amount, currency: "INR", status, paidAt: new Date(iso), refundableUntil: null });

describe("mergeLedger", () => {
  it("interleaves plan payments and course purchases, newest first", () => {
    const rows = mergeLedger([sub("s1", "2026-01-01T00:00:00Z"), sub("s2", "2026-03-01T00:00:00Z")], [course("c1", "2026-02-01T00:00:00Z")]);
    expect(rows.map((r) => r.id)).toEqual(["s2", "c1", "s1"]);
  });
  it("is stable for identical timestamps", () => {
    const t = "2026-01-01T00:00:00Z";
    expect(mergeLedger([sub("b", t), sub("a", t)]).map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("points each row at the right invoice endpoint", () => {
    expect(sub("s1", "2026-01-01T00:00:00Z").invoiceHref).toBe("/api/billing/invoice/s1");
    expect(course("c1", "2026-01-01T00:00:00Z").invoiceHref).toBe("/api/billing/course-invoice/c1");
  });
});

describe("totalsByCurrency", () => {
  it("sums paid rows and leaves refunds out", () => {
    const rows = [sub("s1", "2026-01-01T00:00:00Z", 49), course("c1", "2026-01-02T00:00:00Z", "paid", 500), course("c2", "2026-01-03T00:00:00Z", "refunded", 999)];
    expect(totalsByCurrency(rows)).toEqual({ INR: 549 });
  });
});

describe("invoice html", () => {
  it("escapes user- and admin-controlled text", () => {
    expect(esc(`<script>"x"&'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;");
    const html = renderInvoiceHtml({
      number: "CF-1",
      date: "Jan 1, 2026",
      billedTo: { name: "<img src=x onerror=alert(1)>", email: "a@b.c", addressLines: ["1 <b>Road</b>"], phone: null },
      extra: { label: "Refund window", value: "14 days" },
      description: "<script>alert(1)</script> course",
      total: money(500, "INR"),
      badge: { label: "Paid" },
      paymentRef: "pay_<x>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; course");
    expect(html).toContain("14 days");
  });
  it("shows a refunded badge", () => {
    const html = renderInvoiceHtml({
      number: "CF-2", date: "d", billedTo: { name: "A", email: null, addressLines: [] },
      extra: { label: "Period", value: "—" }, description: "x", total: "₹1", badge: { label: "Refunded", refunded: true },
    });
    expect(html).toContain("Refunded");
  });
});
