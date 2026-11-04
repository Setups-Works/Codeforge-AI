"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CTA } from "@/features/lms/colors";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/plans";
import { api } from "@/lib/lms/api";
import { APP_NAME } from "@/lib/constants";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// `window.Razorpay` is typed globally in features/subscription/checkout-form.tsx.
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface Props {
  courseId: string;
  courseSlug: string;
  isFree: boolean;
  priceLabel: string;
  paymentsAvailable: boolean;
  /** Set when the learner's plan already includes this course. */
  includedPlanName?: string | null;
  /** Buy a bundle instead of a single course (no coupons, lands on My courses). */
  bundle?: boolean;
  prefill: { name: string; email: string };
}

/** Buy (Razorpay) or enrol (free) in a course, then drop the learner into lesson one. */
export function BuyCourseButton({ courseId, courseSlug, isFree, priceLabel, paymentsAvailable, includedPlanName, bundle = false, prefill }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; finalAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const base = `/api/learn/${bundle ? "bundles" : "courses"}/${courseId}`;

  const enter = (lessonId: string | null) =>
    router.push(bundle ? "/learn/my-courses" : lessonId ? `/learn/watch/${courseSlug}/${lessonId}` : `/learn/courses/${courseSlug}`);

  async function applyCoupon() {
    setChecking(true);
    setCouponError(null);
    try {
      const res = await api<{ ok: boolean; code?: string; discount?: number; finalAmount?: number; reason?: string }>(`${base}/coupon`, { method: "POST", json: { code } });
      if (res.ok) setApplied({ code: res.code!, discount: res.discount!, finalAmount: res.finalAmount! });
      else {
        setApplied(null);
        setCouponError(res.reason ?? "That coupon can't be used here");
      }
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : "Couldn't check the coupon");
    } finally {
      setChecking(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const order = await api<{ free: boolean; orderId?: string; amount?: number; currency?: string; key?: string; name?: string }>(
        `${base}/checkout`,
        { method: "POST", json: applied ? { couponCode: applied.code } : {} },
      );

      if (order.free) {
        toast.success("You're enrolled");
        if (bundle) enter(null);
        else router.refresh();
        return;
      }

      if (!(await loadRazorpay())) throw new Error("Couldn't load the payment window. Check your connection and try again.");

      const rzp = new window.Razorpay({
        key: order.key,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: APP_NAME,
        description: order.name,
        image: `${window.location.origin}/icon-192.png`,
        theme: { color: "#006bff" },
        prefill,
        retry: { enabled: true, max_count: 3 },
        timeout: 15 * 60,
        modal: { ondismiss: () => setBusy(false) },
        handler: async (response: RazorpayResponse) => {
          try {
            const done = await api<{ resumeLessonId: string | null }>(`${base}/verify`, { method: "POST", json: response });
            toast.success("Payment successful — welcome aboard!");
            enter(done.resumeLessonId);
          } catch (e) {
            // The webhook will still enrol them if the money was taken.
            toast.error(e instanceof Error ? e.message : "We couldn't confirm your payment. If you were charged, you'll get access shortly.");
            router.refresh();
          } finally {
            setBusy(false);
          }
        },
      });
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const disabled = busy || (!isFree && !includedPlanName && !paymentsAvailable);

  return (
    <div className="space-y-2">
      <Button className={`w-full ${CTA}`} onClick={start} disabled={disabled}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {includedPlanName ? `Start free with your ${includedPlanName} plan` : isFree ? "Enrol for free" : applied ? `Buy for ${formatPrice(applied.finalAmount)}` : `Buy for ${priceLabel}`}
      </Button>
      {!isFree && !includedPlanName && !bundle && (
        applied ? (
          <p className="text-center text-xs text-muted-foreground">
            {applied.code} applied — you save {formatPrice(applied.discount)}.{" "}
            <button type="button" className="underline" onClick={() => { setApplied(null); setCode(""); }}>Remove</button>
          </p>
        ) : showCoupon ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" maxLength={40} className="h-9" aria-label="Coupon code" />
              <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={checking || !code.trim()}>
                {checking ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive">{couponError}</p>}
          </div>
        ) : (
          <button type="button" className="mx-auto block text-xs text-muted-foreground underline" onClick={() => setShowCoupon(true)}>Have a coupon?</button>
        )
      )}
      {!isFree && !paymentsAvailable && <p className="text-center text-xs text-muted-foreground">Payments aren&apos;t available yet.</p>}
    </div>
  );
}
