"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Sparkles, Download, Crown, Loader2, CreditCard } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LedgerRow } from "@/lib/billing-ledger";

interface Usage {
  period: string;
  used: number;
  allowance: number | null;
  remaining: number | null;
  unlimited: boolean;
}
function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function UsagePanel({ plan }: { plan: string }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setUsage(d.usage);
          setLedger(d.ledger ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const pct =
    usage && !usage.unlimited && usage.allowance
      ? Math.min(100, Math.round((usage.used / usage.allowance) * 100))
      : 0;
  const nearLimit = pct >= 80;

  return (
    <div className="space-y-6">
      {/* AI credits */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-4.5 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">AI Credits</h3>
            <p className="text-xs text-muted-foreground">
              Monthly usage{usage ? ` · ${format(new Date(usage.period + "-01"), "MMMM yyyy")}` : ""}
            </p>
          </div>
          {!loading && (
            <span className="ml-auto rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
              {plan} plan
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-5 flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : usage?.unlimited ? (
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-primary">Unlimited</span>
            <span className="text-sm text-muted-foreground">AI credits · {usage.used.toLocaleString()} used this month</span>
          </div>
        ) : usage ? (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-2xl font-semibold tabular-nums">{usage.used.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Credits used</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-2xl font-semibold tabular-nums">{(usage.remaining ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-2xl font-semibold tabular-nums">{(usage.allowance ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly limit</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{pct}% used</span>
                {nearLimit && <span className="font-medium text-warning">Running low</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", nearLimit ? "bg-warning" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {plan === "free" && (
              <Button asChild size="sm" className="mt-4 w-full">
                <Link href="/pricing">
                  <Crown className="size-4" /> Upgrade for more credits
                </Link>
              </Button>
            )}
          </>
        ) : null}
      </section>

      {/* Orders & payments: plan payments and course purchases in one list */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="size-4.5 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Orders &amp; payments</h3>
            <p className="text-xs text-muted-foreground">Plan payments and course purchases, with invoices</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : ledger.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No payments yet. {plan === "free" && "You're on the Free plan."}
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border">
            {ledger.map((row, i) => (
              <div key={`${row.kind}-${row.id}`} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", i !== 0 && "border-t")}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {row.kind === "course" && row.courseSlug ? (
                      <Link href={`/learn/courses/${row.courseSlug}`} className="hover:underline">{row.description}</Link>
                    ) : (
                      row.description
                    )}{" "}
                    <span className="font-normal capitalize text-muted-foreground">· {row.detail}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(row.date), "MMM d, yyyy")}
                    {row.refundableUntil && ` · refundable until ${format(new Date(row.refundableUntil), "MMM d")}`}
                  </p>
                </div>
                {row.status === "refunded" && (
                  <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Refunded</span>
                )}
                <span className={cn("text-sm font-semibold tabular-nums", row.status === "refunded" && "text-muted-foreground line-through")}>
                  {money(row.amount, row.currency)}
                </span>
                <Button asChild variant="outline" size="sm">
                  <a href={row.invoiceHref} target="_blank" rel="noopener noreferrer">
                    <Download className="size-3.5" /> Invoice
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
