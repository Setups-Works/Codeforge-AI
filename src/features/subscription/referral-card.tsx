"use client";

import { toast } from "sonner";
import { Users } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { ReferralOverview } from "@/services/lms-referrals";

type View = Omit<ReferralOverview, "referrals"> & { referrals: { id: string; status: "pending" | "rewarded"; rewardCode: string | null; createdAt: string }[] };

/** Share link plus rewards earned. Rendered in Billing so credits sit next to payments. */
export function ReferralCard({ overview }: { overview: View }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overview.link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually");
    }
  };

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Users className="size-4.5 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Invite friends</h3>
          <p className="text-xs text-muted-foreground">
            They get {overview.refereePercent}% off their first course; you get a {overview.referrerPercent}% coupon when they buy.
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <input readOnly value={overview.link} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
        <Button size="sm" variant="outline" onClick={copy}>Copy</Button>
      </div>
      {overview.referrals.length > 0 && (
        <ul className="mt-4 divide-y overflow-hidden rounded-lg border text-sm">
          {overview.referrals.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
              <span className="ml-auto">{r.status === "rewarded" && r.rewardCode ? <>Reward <span className="font-mono font-semibold">{r.rewardCode}</span></> : "Pending"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
