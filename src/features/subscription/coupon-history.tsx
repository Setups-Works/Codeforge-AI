import { format } from "date-fns";
import { Tag } from "@/components/icons";
import { formatPrice } from "@/lib/plans";
import type { CouponRedemption } from "@/services/billing-ledger";

/** Coupons the user has redeemed. Hidden when there are none, so it never adds an empty box. */
export function CouponHistory({ redemptions }: { redemptions: CouponRedemption[] }) {
  if (redemptions.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Tag className="size-4.5 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Coupons used</h3>
          <p className="text-xs text-muted-foreground">Discount codes you&apos;ve redeemed</p>
        </div>
      </div>
      <ul className="mt-4 divide-y overflow-hidden rounded-lg border">
        {redemptions.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <span className="font-mono text-sm font-semibold">{r.code}</span>
            <span className="text-xs text-muted-foreground">{format(r.redeemedAt, "MMM d, yyyy")}</span>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {r.discount > 0 ? `${formatPrice(r.discount)} off` : "Applied"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
