"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/lms/api";
import { cn } from "@/lib/utils";

export function WishlistButton({ courseId, initial }: { courseId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await api("/api/learn/wishlist", { method: on ? "DELETE" : "POST", json: { courseId } });
      setOn(!on);
      toast.success(on ? "Removed from wishlist" : "Saved to wishlist");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update wishlist");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={toggle} disabled={busy} aria-pressed={on}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className={cn("size-4", on && "fill-current text-primary")} />}
      {on ? "Saved" : "Save for later"}
    </Button>
  );
}
