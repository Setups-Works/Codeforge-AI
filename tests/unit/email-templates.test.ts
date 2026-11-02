import {
  trialStartedEmailHtml,
  trialStartedEmailSubject,
  paymentReceiptEmailHtml,
  paymentReceiptEmailSubject,
  paymentFailedEmailHtml,
  paymentFailedEmailSubject,
  subscriptionCancelledEmailHtml,
  subscriptionCancelledEmailSubject,
} from "@/lib/email-templates";

describe("payment email templates", () => {
  it("trial started: renders full HTML with plan, ₹0 today, and first-charge date", () => {
    const html = trialStartedEmailHtml({
      name: "Ada",
      planName: "Go",
      trialDays: 7,
      firstChargeDate: "18 Jul 2026",
      amountLabel: "₹49",
      manageUrl: "https://labs.setups.works/settings?tool=billing",
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Ada");
    expect(html).toContain("Go");
    expect(html).toContain("₹0");
    expect(html).toContain("18 Jul 2026");
    expect(html).toContain("₹49");
    expect(trialStartedEmailSubject("Go", 7)).toBe("Your 7-day Go free trial has started");
  });

  it("receipt: distinguishes first purchase from renewal", () => {
    const first = paymentReceiptEmailHtml({
      name: "Ada", planName: "Plus", amountLabel: "₹99",
      periodEndLabel: "11 Aug 2026", renewal: false, manageUrl: "u",
    });
    expect(first).toContain("Welcome to Plus");
    expect(paymentReceiptEmailSubject("Plus", false)).toContain("is active");

    const renew = paymentReceiptEmailHtml({
      name: "Ada", planName: "Plus", amountLabel: "₹99",
      periodEndLabel: "11 Aug 2026", renewal: true, manageUrl: "u",
    });
    expect(renew).toContain("renewed");
    expect(paymentReceiptEmailSubject("Plus", true)).toContain("renewed");
  });

  it("payment failed: prompts to update the card", () => {
    const html = paymentFailedEmailHtml({ name: "Ada", planName: "Go", updateUrl: "https://x/settings" });
    expect(html).toContain("Update payment method");
    expect(html).toContain("https://x/settings");
    expect(paymentFailedEmailSubject("Go")).toContain("failed");
  });

  it("cancelled: states access continues until the given date", () => {
    const html = subscriptionCancelledEmailHtml({
      name: "Ada", planName: "Go", accessUntilLabel: "11 Aug 2026", resubscribeUrl: "https://x/pricing",
    });
    expect(html).toContain("11 Aug 2026");
    expect(html).toContain("Reactivate subscription");
    expect(subscriptionCancelledEmailSubject("Go")).toContain("cancelled");
  });

  it("escapes nothing unexpected — every template returns a complete document", () => {
    for (const html of [
      trialStartedEmailHtml({ name: "A", planName: "Go", trialDays: 7, firstChargeDate: "d", amountLabel: "₹49", manageUrl: "u" }),
      paymentReceiptEmailHtml({ name: "A", planName: "Go", amountLabel: "₹49", periodEndLabel: "d", renewal: false, manageUrl: "u" }),
      paymentFailedEmailHtml({ name: "A", planName: "Go", updateUrl: "u" }),
      subscriptionCancelledEmailHtml({ name: "A", planName: "Go", accessUntilLabel: "d", resubscribeUrl: "u" }),
    ]) {
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
      expect(html).toContain("</html>");
    }
  });
});
