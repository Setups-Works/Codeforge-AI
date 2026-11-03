import crypto from "crypto";

// Razorpay and the mailer touch env/network at import time in places; mock them.
jest.mock("@/lib/mailer", () => ({ sendEmail: jest.fn() }));
jest.mock("@/lib/posthog-server", () => ({ getPostHogServer: () => null }));

import { verifyCheckoutSignature } from "@/lib/razorpay";
import { courseReceiptEmailHtml, courseReceiptEmailSubject } from "@/lib/email-templates";

describe("checkout signature (course orders)", () => {
  const OLD = process.env.RAZORPAY_KEY_SECRET;
  beforeAll(() => { process.env.RAZORPAY_KEY_SECRET = "test_secret"; });
  afterAll(() => { process.env.RAZORPAY_KEY_SECRET = OLD; });

  const sign = (orderId: string, paymentId: string) =>
    crypto.createHmac("sha256", "test_secret").update(`${orderId}|${paymentId}`).digest("hex");

  it("accepts a valid order|payment signature", () => {
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") })).toBe(true);
  });
  it("rejects a signature for a different order or payment", () => {
    expect(verifyCheckoutSignature({ orderId: "order_2", paymentId: "pay_1", signature: sign("order_1", "pay_1") })).toBe(false);
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_2", signature: sign("order_1", "pay_1") })).toBe(false);
  });
  it("rejects an empty or tampered signature", () => {
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: "" })).toBe(false);
    expect(verifyCheckoutSignature({ orderId: "order_1", paymentId: "pay_1", signature: "00" })).toBe(false);
  });
});

describe("course receipt email", () => {
  it("includes the course, amount, refund window and link", () => {
    const html = courseReceiptEmailHtml({
      name: "Asha",
      courseTitle: "DSA Masterclass",
      amountLabel: "₹499",
      refundDays: 14,
      courseUrl: "https://example.com/learn/courses/dsa",
    });
    expect(html).toContain("DSA Masterclass");
    expect(html).toContain("₹499");
    expect(html).toContain("14 days");
    expect(html).toContain("https://example.com/learn/courses/dsa");
    expect(courseReceiptEmailSubject("DSA Masterclass")).toContain("DSA Masterclass");
  });
});
