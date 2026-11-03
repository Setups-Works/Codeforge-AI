import { Star } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Read-only 1–5 star row. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(value) ? "text-amber-500" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}
