"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ExternalLink } from "@/components/icons";

type Result =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "valid"; code: string; learnerName: string; courseTitle: string; issuedAt: string }
  | { status: "invalid"; message: string };

export function VerifyForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<Result>({ status: "idle" });
  const auto = useRef(false);

  async function verify(value: string) {
    setResult({ status: "loading" });
    try {
      const res = await fetch(`/api/certificates/verify?code=${encodeURIComponent(value.trim())}`);
      const data = await res.json().catch(() => null);
      if (res.status === 429) return setResult({ status: "invalid", message: "Too many lookups. Please wait a minute and try again." });
      if (res.ok && data?.valid) return setResult({ status: "valid", ...data.certificate });
      setResult({
        status: "invalid",
        message: data?.reason === "invalid-format" ? "That doesn't look like a certificate code. Check it and try again." : "No certificate matches this code.",
      });
    } catch {
      setResult({ status: "invalid", message: "Couldn't reach the server. Try again." });
    }
  }

  useEffect(() => {
    if (initialCode && !auto.current) {
      auto.current = true;
      void verify(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void verify(code);
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SW-XXXX-XXXX-XXXX"
          aria-label="Certificate verification code"
          className="font-mono"
          maxLength={32}
          autoComplete="off"
        />
        <Button type="submit" disabled={!code.trim() || result.status === "loading"}>
          {result.status === "loading" ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
        </Button>
      </form>

      <AnimatePresence mode="wait">
        {result.status === "valid" && (
          <motion.div
            key="valid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-green-500/30 bg-green-500/5 p-5"
            role="status"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-green-600">
              <Check className="size-4" /> Genuine certificate
            </p>
            <p className="mt-3 text-lg font-bold">{result.learnerName}</p>
            <p className="text-sm text-muted-foreground">
              completed <span className="font-medium text-foreground">{result.courseTitle}</span> on {format(new Date(result.issuedAt), "MMMM d, yyyy")}
            </p>
            <a href={`/certificate/${result.code}`} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View certificate <ExternalLink className="size-3" />
            </a>
          </motion.div>
        )}
        {result.status === "invalid" && (
          <motion.p
            key="invalid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            {result.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
