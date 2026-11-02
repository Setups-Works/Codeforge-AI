import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/services/user-store";
import { PublicHeader } from "@/components/layout/public-header";
import { PricingCards } from "@/features/subscription/pricing-cards";
import { getFeatureAccess } from "@/services/feature-access";
import { buildPricingFeatures } from "@/lib/feature-catalog";
import { Clock, RefreshCw, HeadphonesIcon, Sparkles } from "@/components/icons";
import { PageAura } from "@/components/shared/reactbits-kit";

export const metadata: Metadata = {
  title: "Pricing — Setups Works Lab",
  description: "Simple, transparent pricing. Start free, upgrade anytime.",
};
export const dynamic = "force-dynamic";

const paymentsEnabled = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export default async function PricingPage() {
  const session = await auth();
  const signedIn = !!session?.user;

  let currentPlan = "free";
  if (session?.user?.id) {
    currentPlan = await getUserPlan(session.user.id);
  }

  const featuresByPlan = buildPricingFeatures(await getFeatureAccess());

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <PageAura height={520} />
      <PublicHeader signedIn={signedIn} />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* header */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full border bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
            Simple, transparent pricing
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Start free, level up fast
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Every plan includes a 7-day free trial on paid tiers. No credit card required to start.
          </p>
        </div>

        {/* Beta banner — shown only when payments are not yet live */}
        {!paymentsEnabled && (
          <div className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-blue-400">
              <Sparkles className="size-4" />
              Paid plans launching soon
            </div>
            <p className="text-sm text-muted-foreground">
              Online payments aren&apos;t live yet — but the first{" "}
              <strong className="text-foreground">50 beta users</strong> get the{" "}
              <strong className="text-foreground">Go Plan free for 30 days</strong>, no card needed.
            </p>
            <Link
              href="/beta/join"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-bold text-blue-400 transition-colors hover:bg-blue-500/25"
            >
              Claim your free beta spot →
            </Link>
          </div>
        )}

        <PricingCards currentPlan={currentPlan} featuresByPlan={featuresByPlan} paymentsEnabled={paymentsEnabled} />

        {/* trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {paymentsEnabled ? "Secure payments via Razorpay" : "Online payments coming soon"}
          </span>
          <span className="flex items-center gap-2">
            <RefreshCw className="size-4 text-primary" /> Cancel anytime, no questions asked
          </span>
          <span className="flex items-center gap-2">
            <HeadphonesIcon className="size-4 text-primary" /> Priority support on Plus
          </span>
        </div>

        {/* FAQ */}
        <div className="mt-14 mx-auto max-w-2xl">
          <h2 className="text-xl font-bold text-center mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {[
              { q: "Do I need a credit card for the free trial?", a: "No. Your 7-day free trial starts without any payment. You'll only be charged if you subscribe after the trial." },
              { q: "Can I switch plans?", a: "Yes. You can upgrade or downgrade at any time from Settings → Billing. Upgrades take effect immediately." },
              { q: "What happens when my trial ends?", a: "You'll automatically move to the Free plan. Your data is kept; you just lose access to paid features until you subscribe." },
              { q: "When will paid plans launch?", a: "We're setting up secure payment infrastructure and will launch paid plans soon. Join the beta in the meantime to get the Go Plan free for 30 days." },
              { q: "Can I get a refund?", a: "We offer a 3-day refund window from the date of payment. Contact support and we'll process it right away." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border p-4 cursor-pointer">
                <summary className="flex items-center justify-between font-medium text-sm list-none">
                  {q}
                  <span className="ml-2 text-muted-foreground transition-transform group-open:rotate-180">↓</span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
