"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { format } from "date-fns";
import { CreditCard, Crown, Zap, AlertTriangle, Sparkles } from "@/components/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlanBadge } from "@/features/subscription/plan-badge";
import { PricingCards } from "@/features/subscription/pricing-cards";
import { PLANS, getPlanById } from "@/lib/plans";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BillingInfo {
  plan: string;
  planExpiresAt?: string | null;
  trialEndsAt?: string | null;
  billingCycle?: string | null;
}

export function BillingPanel({ billing, paymentsEnabled = false }: { billing: BillingInfo; paymentsEnabled?: boolean }) {
  const { update } = useSession();
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const plan = getPlanById(billing.plan);
  const isFree = billing.plan === "free";
  const isOnTrial = !!billing.trialEndsAt && new Date(billing.trialEndsAt) > new Date();
  const trialDaysLeft = billing.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  async function cancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Subscription cancelled. Access continues until period ends.");
      await update();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* current plan card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-muted-foreground" /> Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex size-10 items-center justify-center rounded-xl", plan.id === "plus" ? "bg-primary/10" : plan.id === "go" ? "bg-blue-500/10" : "bg-muted")}>
                {plan.id === "plus" ? <Crown className="size-5 text-primary" /> : plan.id === "go" ? <Zap className="size-5 text-blue-500" /> : <span className="text-xs font-bold text-muted-foreground">F</span>}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{plan.name} Plan</span>
                  <PlanBadge plan={billing.plan} />
                </div>
                {isOnTrial && (
                  <p className="text-xs text-primary font-medium">
                    Trial · {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
                  </p>
                )}
                {billing.planExpiresAt && !isOnTrial && (
                  <p className="text-xs text-muted-foreground">
                    {billing.billingCycle ? "Renews" : "Expires"} {format(new Date(billing.planExpiresAt), "MMM d, yyyy")}
                  </p>
                )}
                {isFree && <p className="text-xs text-muted-foreground">Free forever</p>}
              </div>
            </div>
            {!isFree && (
              <Button variant="outline" size="sm" onClick={cancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel"}
              </Button>
            )}
          </div>

          {isOnTrial && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
              <AlertTriangle className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-primary">Trial ends in {trialDaysLeft} days</p>
                <p className="text-muted-foreground mt-0.5">Subscribe now to keep access after your trial.</p>
              </div>
            </div>
          )}

          {/* plan limits */}
          <Separator />
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="font-bold text-base">{plan.limits.aiCallsPerDay === -1 ? "∞" : plan.limits.aiCallsPerDay}</p>
              <p className="text-muted-foreground mt-0.5">AI calls/day</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="font-bold text-base">{plan.limits.bookmarks === -1 ? "∞" : plan.limits.bookmarks}</p>
              <p className="text-muted-foreground mt-0.5">Bookmarks</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="font-bold text-base">{plan.limits.notes === -1 ? "∞" : plan.limits.notes}</p>
              <p className="text-muted-foreground mt-0.5">Notes</p>
            </div>
          </div>

          {(isFree || isOnTrial) && (
            paymentsEnabled ? (
              <Button className="w-full" onClick={() => setShowUpgrade(true)}>
                <Crown className="size-4" /> Upgrade to {isFree ? PLANS.go.name : "paid plan"}
              </Button>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Sparkles className="size-3.5" /> Paid plans coming soon
                </p>
                <p className="text-xs text-muted-foreground">
                  Online payments aren&apos;t live yet. Join the beta to get Go Plan free for 30 days.
                </p>
                <Link href="/beta/join">
                  <Button size="sm" variant="outline" className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                    Claim free beta spot →
                  </Button>
                </Link>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* upgrade section — only shown when payments are live */}
      {showUpgrade && paymentsEnabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Choose a plan</h3>
            <button onClick={() => setShowUpgrade(false)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
          <PricingCards
            compact
            currentPlan={billing.plan}
            paymentsEnabled={paymentsEnabled}
            onPlanChosen={() => { setShowUpgrade(false); update(); }}
          />
        </div>
      )}

      {/* payment note */}
      {paymentsEnabled && (
        <p className="text-xs text-muted-foreground text-center">
          Payments processed securely via Razorpay. Download invoices from Orders &amp; payments above.
        </p>
      )}
    </div>
  );
}
