"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURSE_LEVELS } from "@/lib/lms/constants";

const ALL = "all";

const PRICE_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** URL-driven filters: every change rewrites the query string and resets paging. */
export function CourseFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== ALL) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const choose = (key: string, label: string, options: { value: string; label: string }[]) => (
    <Select value={params.get(key) ?? ALL} onValueChange={(v) => update({ [key]: v })}>
      <SelectTrigger className="w-full sm:w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{key === "sort" ? "Sort: newest" : `All ${label.toLowerCase()}s`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <form
        className="flex flex-1 gap-2 sm:min-w-64"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" maxLength={80} aria-label="Search courses" />
        <Button type="submit" variant="outline" size="icon" aria-label="Search">
          <Search className="size-4" />
        </Button>
      </form>
      {categories.length > 0 && choose("category", "Category", categories.map((c) => ({ value: c, label: c })))}
      {choose("level", "Level", COURSE_LEVELS.map((l) => ({ value: l, label: l })))}
      {choose("price", "Price", PRICE_OPTIONS)}
      {choose("sort", "Sort", SORT_OPTIONS)}
    </div>
  );
}
