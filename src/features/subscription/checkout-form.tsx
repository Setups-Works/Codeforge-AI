"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { ArrowLeft, Crown, Loader2, Lock, ShieldCheck, Sparkles, Tag, Zap } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => {
      open(): void;
      /** Custom Checkout (headless) — needs enabling on the Razorpay account. */
      createPayment?(data: Record<string, unknown>): void;
      on?(event: string, cb: (data: Record<string, unknown>) => void): void;
    };
  }
}

/**
 * Pay with UPI on our own page (VPA entry) instead of Razorpay's popup. Needs
 * Razorpay Custom Checkout enabled on the account; off by default so checkout
 * is unchanged until it is. Cards always use the popup (no card data here).
 */
const INLINE_UPI = process.env.NEXT_PUBLIC_RAZORPAY_INLINE_UPI === "1";
const UPI_ID = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

interface PaymentSuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

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

interface Defaults {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export function CheckoutForm({
  plan,
  cycle,
  amount,
  planName,
  trialDays,
  trialEligible,
  initialTrial,
  initialCouponCode,
  campaign,
  defaults,
}: {
  plan: "go" | "plus";
  cycle: "monthly" | "yearly";
  amount: number;
  planName: string;
  trialDays: number;
  /** True when this account has never trialed and the plan offers a trial. */
  trialEligible: boolean;
  /** Whether to open in trial mode (from ?trial=1). */
  initialTrial: boolean;
  initialCouponCode?: string;
  /** /join campaign code — extends the trial; re-validated server-side. */
  campaign?: string;
  defaults: Defaults;
}) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Defaults>(defaults);
  // Payment flow screens: fill billing → review & pay (Razorpay overlay) →
  // verifying the signature → animated success receipt.
  const [step, setStep] = useState<"billing" | "review" | "processing" | "success">("billing");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [vpa, setVpa] = useState("");
  const [upiWaiting, setUpiWaiting] = useState(false);
  // Card-on-file trial: the card is authenticated now, the first charge fires
  // when the trial ends. Only offered to eligible accounts.
  const [trial, setTrial] = useState(initialTrial && trialEligible);
  const firstChargeDate = new Date(Date.now() + trialDays * 86400_000).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" },
  );

  // Coupon state
  const [couponInput, setCouponInput] = useState(initialCouponCode?.toUpperCase() ?? "");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; finalAmount: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const due = coupon ? coupon.finalAmount : amount;
  const PlanIcon = plan === "plus" ? Crown : Zap;

  // Fresh signups (e.g. from /join) continue into onboarding via the dashboard
  // gate; existing users land on their billing settings.
  const afterPayment = session?.user?.onboardingComplete === false ? "/dashboard" : "/settings?tool=billing";

  // Success screen auto-continues after a short beat.
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => {
      router.push(afterPayment);
      router.refresh();
    }, 5000);
    return () => clearTimeout(t);
  }, [step, afterPayment, router]);

  async function applyCoupon(codeOverride?: string) {
    const code = (typeof codeOverride === "string" ? codeOverride : couponInput).trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, plan, cycle }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCoupon(null);
        const errMessage = data.reason ?? data.error ?? "Invalid coupon";
        setCouponError(errMessage);
        toast.error(errMessage);
        return;
      }
      setCoupon({ code: data.code, discount: data.discount, finalAmount: data.finalAmount });
      toast.success(`Coupon ${data.code} applied`);
    } catch {
      const errMessage = "Could not validate coupon";
      setCouponError(errMessage);
      toast.error(errMessage);
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  // Auto-apply logic (Safe for Strict Mode duplicate mounts)
  const autoApplied = useRef(false);
  useEffect(() => {
    if (initialCouponCode && !trial && !autoApplied.current) {
      autoApplied.current = true;
      applyCoupon(initialCouponCode);
    }
  }, [initialCouponCode, trial]);
  const set = (k: keyof Defaults) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate(): string | null {
    if (!form.name.trim()) return "Please enter your name";
    if (!/^\+?[0-9\s-]{7,15}$/.test(form.phone.trim())) return "Please enter a valid phone number";
    if (!form.line1.trim()) return "Please enter your address";
    if (!form.city.trim()) return "Please enter your city";
    if (!form.postalCode.trim()) return "Please enter your postal code";
    return null;
  }

  async function onPaid(response: PaymentSuccess) {
    setUpiWaiting(false);
    setStep("processing");
    const verify = await fetch("/api/subscription/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpaySubscriptionId: response.razorpay_subscription_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      }),
    });
    const v = await verify.json();
    if (verify.ok) {
      setPaymentId(response.razorpay_payment_id);
      await update();
      setStep("success");
    } else {
      toast.error(v.error ?? "Payment verification failed");
      setStep("review");
      setLoading(false);
    }
  }

  function payWithUpi() {
    const id = vpa.trim();
    if (!UPI_ID.test(id)) {
      toast.error("Enter a valid UPI ID, e.g. name@okaxis");
      return;
    }
    void pay(id);
  }

  async function pay(upiVpa?: string) {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    try {
      const billing = {
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim() || "IN",
      };

      const res = await fetch("/api/subscription/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A trial delays the first charge; coupons apply to immediate purchases only.
        body: JSON.stringify({
          plan,
          cycle,
          billing,
          trial,
          campaign: trial ? campaign : undefined,
          coupon: trial ? undefined : coupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start subscription");

      // 100%-off coupon — plan granted server-side, no payment needed.
      if (data.granted) {
        toast.success(`Welcome to ${planName}! Your coupon covered it.`);
        await update();
        setStep("success");
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load payment gateway");

      const rzp = new window.Razorpay({
        key: data.key,
        subscription_id: data.subscriptionId,
        name: "CodeForge AI",
        description: trial
          ? `${planName} — ${trialDays}-day free trial, then ${cycle}`
          : `${planName} — ${cycle} (auto-renews)`,
        image: `${window.location.origin}/icon-192.png`,
        theme: {
          color: "#006bff",
          backdrop_color: "#0b1220",
          image_padding: true,
        },
        // Allow a few retries on a failed attempt and expire an abandoned
        // session after 15 minutes instead of leaving it open indefinitely.
        retry: { enabled: true, max_count: 3 },
        timeout: 15 * 60,
        remember_customer: true,
        send_sms_hash: true,
        // Prefilled so Razorpay skips the contact/email step and goes straight
        // to the payment apps (UPI / cards / netbanking).
        prefill: {
          name: form.name.trim(),
          email: form.email.trim() || session?.user?.email || "",
          contact: form.phone.trim(),
        },
        notes: {
          address: [billing.line1, billing.city, billing.state, billing.postalCode]
            .filter(Boolean)
            .join(", "),
        },
        modal: {
          // Ask before closing so a stray click or Esc can't drop a payment.
          confirm_close: true,
          escape: true,
          backdropclose: false,
          animation: true,
          ondismiss: () => setLoading(false),
        },
        handler: onPaid,
      });

      if (upiVpa && INLINE_UPI) {
        const custom = new window.Razorpay({ key: data.key });
        if (custom.createPayment && custom.on) {
          custom.on("payment.success", (r) => void onPaid(r as unknown as PaymentSuccess));
          custom.on("payment.error", (r) => {
            const msg = (r as { error?: { description?: string } }).error?.description;
            toast.error(msg ?? "UPI payment failed — try again or use another method");
            setUpiWaiting(false);
            setLoading(false);
          });
          setUpiWaiting(true);
          custom.createPayment({
            subscription_id: data.subscriptionId,
            method: "upi",
            vpa: upiVpa,
            email: form.email.trim() || session?.user?.email || "",
            contact: form.phone.trim(),
          });
          return;
        }
        // Custom Checkout isn't available — fall back to the popup.
      }
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
      setLoading(false);
    }
  }

  // ── Screen: verifying payment ────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="size-7 animate-spin text-primary" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight">Verifying your payment…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirming the signature with Razorpay. Don&apos;t close this tab — this takes a few seconds.
        </p>
      </div>
    );
  }

  // ── Screen: success receipt ──────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <span className="flex size-16 animate-[bounce_1s_ease-in-out_1] items-center justify-center rounded-full bg-easy/15 ring-8 ring-easy/10">
          <ShieldCheck className="size-8 text-easy" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          {trial ? "Your free trial has started!" : `Welcome to ${planName}!`}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {trial
            ? `Enjoy ${planName} free for ${trialDays} days. Auto-pay charges ${formatPrice(amount)} on ${firstChargeDate} — cancel anytime before that.`
            : "Auto-pay is active. A receipt is on its way to your inbox."}
        </p>

        <div className="mt-6 w-full divide-y rounded-xl border bg-card text-left text-sm">
          <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Plan</span><span className="font-medium">{planName} · {cycle}</span></div>
          <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Paid today</span><span className="font-medium tabular-nums">{trial ? formatPrice(0) : formatPrice(due)}</span></div>
          {trial && (
            <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">First charge</span><span className="font-medium">{firstChargeDate}</span></div>
          )}
          {paymentId && (
            <div className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{paymentId}</span></div>
          )}
        </div>

        <Button
          size="lg"
          className="mt-6 w-full max-w-xs gap-2"
          onClick={() => { router.push(afterPayment); router.refresh(); }}
        >
          Continue <Sparkles className="size-4" />
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">Taking you onward automatically…</p>
      </div>
    );
  }

  // ── Screens: billing → review & pay ──────────────────────────────────────
  const steps = [
    { id: "billing", label: "Billing" },
    { id: "review", label: "Review & pay" },
    { id: "success", label: "Confirmation" },
  ] as const;
  const stepIndex = step === "billing" ? 0 : 1;

  function continueToReview() {
    const err = validate();
    if (err) { toast.error(err); return; }
    setStep("review");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => (step === "review" ? setStep("billing") : router.push("/pricing"))}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {step === "review" ? "Edit billing" : "Back to plans"}
        </button>

        {/* Step indicator */}
        <ol className="flex items-center gap-2 text-[11px] font-medium">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-5 bg-border" />}
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  i === stepIndex ? "text-primary" : i < stepIndex ? "text-easy" : "text-muted-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-4.5 items-center justify-center rounded-full border text-[10px] tabular-nums",
                    i === stepIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : i < stepIndex
                        ? "border-easy bg-easy/10 text-easy"
                        : "border-border",
                  )}
                >
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {step === "review" ? (
          /* review card — read-only billing summary */
          <div className="rounded-2xl border bg-card p-6">
            <h1 className="text-lg font-semibold tracking-tight">Review your details</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One last look before the secure Razorpay window opens.
            </p>
            <div className="mt-5 divide-y rounded-xl border text-sm">
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Email" value={form.email || session?.user?.email || "—"} />
              <ReviewRow label="Phone" value={form.phone} />
              <ReviewRow
                label="Address"
                value={[form.line1, form.line2, form.city, form.state, form.postalCode, form.country]
                  .filter(Boolean)
                  .join(", ")}
              />
            </div>

            <div className="mt-5 rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
              {trial ? (
                <>Clicking <span className="font-semibold text-foreground">Start free trial</span> opens Razorpay to
                approve the auto-pay mandate (a refundable ~₹1 authorisation). You pay nothing today; the first
                charge of <span className="font-semibold text-foreground">{formatPrice(amount)}</span> is on{" "}
                <span className="font-semibold text-foreground">{firstChargeDate}</span> unless you cancel first.</>
              ) : (
                <>Clicking <span className="font-semibold text-foreground">Pay</span> opens Razorpay&apos;s secure
                window to complete the {formatPrice(due)} payment and enable auto-renewal. Cancel anytime from
                Settings → Billing.</>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pay with</p>
              <div className="flex flex-wrap gap-1.5">
                {["UPI", "Cards", "NetBanking", "Wallets", "EMI"].map((m) => (
                  <span key={m} className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
        /* billing details */
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-lg font-semibold tracking-tight">Billing details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We use these for your invoice and to skip re-entering them at payment.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <Input value={form.name} onChange={set("name")} placeholder="Jane Doe" />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={set("email")} type="email" placeholder="jane@email.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" inputMode="tel" />
            </Field>
            <Field label="Address line 1" className="sm:col-span-2">
              <Input value={form.line1} onChange={set("line1")} placeholder="Flat / Street" />
            </Field>
            <Field label="Address line 2 (optional)" className="sm:col-span-2">
              <Input value={form.line2} onChange={set("line2")} placeholder="Area / Landmark" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={set("city")} placeholder="Chennai" />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={set("state")} placeholder="Tamil Nadu" />
            </Field>
            <Field label="Postal code">
              <Input value={form.postalCode} onChange={set("postalCode")} placeholder="600001" inputMode="numeric" />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={set("country")} placeholder="IN" maxLength={2} />
            </Field>
          </div>
        </div>
        )}

        {/* order summary */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <PlanIcon className="size-4.5 text-primary" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">{planName} plan</h2>
                <p className="text-xs text-muted-foreground">
                  {trial ? `${trialDays}-day free trial, then ${cycle}` : `${cycle} · auto-renews`}
                </p>
              </div>
            </div>

            {/* trial / subscribe toggle */}
            {trialEligible && (
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => setTrial(true)}
                  aria-pressed={trial}
                  className={cn("rounded-md px-2 py-1.5 text-xs font-medium transition-colors", trial ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {trialDays}-day free trial
                </button>
                <button
                  type="button"
                  onClick={() => setTrial(false)}
                  aria-pressed={!trial}
                  className={cn("rounded-md px-2 py-1.5 text-xs font-medium transition-colors", !trial ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Subscribe now
                </button>
              </div>
            )}

            {/* coupon (immediate purchases only) */}
            {!trial && (
            <div className="mt-5 border-t pt-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Tag className="size-3.5" /> {coupon.code}
                  </span>
                  <button onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-foreground">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                    placeholder="Coupon code"
                    className="h-9"
                  />
                  <Button variant="outline" size="sm" onClick={() => applyCoupon()} disabled={couponBusy || !couponInput.trim()}>
                    {couponBusy ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="mt-1.5 text-xs text-destructive">{couponError}</p>}
            </div>
            )}

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{planName} ({cycle})</span>
                <span className="font-medium tabular-nums">{formatPrice(amount)}</span>
              </div>
              {!trial && coupon && coupon.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount ({coupon.code})</span>
                  <span className="tabular-nums">−{formatPrice(coupon.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Due today</span>
                <span className="tabular-nums">{trial ? formatPrice(0) : formatPrice(due)}</span>
              </div>
              {trial && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>First charge · {firstChargeDate}</span>
                  <span className="tabular-nums">{formatPrice(amount)}</span>
                </div>
              )}
            </div>

            {trial ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                <Sparkles className="size-3.5" /> Free for {trialDays} days · cancel anytime before {firstChargeDate}
              </p>
            ) : trialEligible ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" /> Prefer to try first? Switch to the {trialDays}-day free trial above.
              </p>
            ) : null}

            {step === "billing" ? (
              <Button onClick={continueToReview} size="lg" className="mt-5 w-full gap-2">
                Continue to review <ArrowLeft className="size-4 rotate-180" />
              </Button>
            ) : (
              <>
                {INLINE_UPI && due > 0 && (
                  <div className="mt-5 rounded-xl border p-4">
                    <Label htmlFor="upi-id" className="text-xs font-semibold">Pay with UPI</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        id="upi-id"
                        value={vpa}
                        onChange={(e) => setVpa(e.target.value)}
                        placeholder="yourname@okaxis"
                        autoComplete="off"
                        inputMode="email"
                        disabled={loading}
                      />
                      <Button onClick={payWithUpi} disabled={loading || !vpa.trim()}>
                        {upiWaiting ? <Loader2 className="size-4 animate-spin" /> : "Pay"}
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {upiWaiting
                        ? "Approve the auto-pay request in your UPI app — this page updates automatically."
                        : "We'll send a request to your UPI app. No popup."}
                    </p>
                    <p className="my-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">or</p>
                  </div>
                )}
                <Button
                  onClick={() => void pay()}
                  disabled={loading}
                  size="lg"
                  variant={INLINE_UPI && due > 0 ? "outline" : "default"}
                  className="mt-5 w-full gap-2"
                >
                  {loading && !upiWaiting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  {loading && !upiWaiting
                    ? "Opening payment…"
                    : trial
                      ? `Start ${trialDays}-day free trial`
                      : due <= 0
                        ? "Activate plan"
                        : INLINE_UPI
                          ? "Pay with card or netbanking"
                          : `Pay ${formatPrice(due)}`}
                </Button>
              </>
            )}

            <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" /> Secured by Razorpay · 256-bit encryption
              </p>
              <p className={cn("flex items-center gap-1.5")}>
                <Lock className="size-3.5 text-primary" /> UPI, cards & netbanking · cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
