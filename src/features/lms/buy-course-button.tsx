"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
  prefill: { name: string; email: string };
}

/** Buy (Razorpay) or enrol (free) in a course, then drop the learner into lesson one. */
export function BuyCourseButton({ courseId, courseSlug, isFree, priceLabel, paymentsAvailable, prefill }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const base = `/api/learn/courses/${courseId}`;

  const enter = (lessonId: string | null) =>
    router.push(lessonId ? `/learn/watch/${courseSlug}/${lessonId}` : `/learn/courses/${courseSlug}`);

  async function start() {
    setBusy(true);
    try {
      const order = await api<{ free: boolean; orderId?: string; amount?: number; currency?: string; key?: string; name?: string }>(
        `${base}/checkout`,
        { method: "POST" },
      );

      if (order.free) {
        toast.success("You're enrolled");
        router.refresh();
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

  const disabled = busy || (!isFree && !paymentsAvailable);

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={start} disabled={disabled}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {isFree ? "Enrol for free" : `Buy for ${priceLabel}`}
      </Button>
      {!isFree && !paymentsAvailable && <p className="text-center text-xs text-muted-foreground">Payments aren&apos;t available yet.</p>}
    </div>
  );
}
