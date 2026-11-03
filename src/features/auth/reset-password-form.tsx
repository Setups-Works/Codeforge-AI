"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2 } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The recovery session is established on mount (verifyOtp with the emailed
// token_hash), after which updateUser sets the new password.
const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type ResetInput = z.infer<typeof schema>;

// Recovery tokens are single-use. Remember the in-flight redemption per token so
// a re-run of the effect (strict mode, param changes) reuses it instead of
// burning the token twice and reporting "expired".
const redemptions = new Map<string, Promise<boolean>>();

function redeemRecoveryToken(tokenHash: string): Promise<boolean> {
  let pending = redemptions.get(tokenHash);
  if (!pending) {
    const supabase = createClient();
    pending = supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: "recovery" })
      .then(async ({ error }) => {
        if (!error) return true;
        const { data } = await supabase.auth.getSession();
        return !!data.session;
      });
    redemptions.set(tokenHash, pending);
  }
  return pending;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // "checking" while we redeem the recovery token; then ok | invalid.
  const [linkState, setLinkState] = useState<"checking" | "ok" | "invalid">("checking");

  const form = useForm<ResetInput>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Establish the recovery session from the emailed token_hash (or an existing
  // session), so the subsequent updateUser is authorised.
  useEffect(() => {
    const supabase = createClient();
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    let cancelled = false;

    (async () => {
      if (tokenHash && type === "recovery") {
        const ok = await redeemRecoveryToken(tokenHash);
        if (!cancelled) setLinkState(ok ? "ok" : "invalid");
        return;
      }
      // No token in the URL — maybe the session is already set (hash flow).
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setLinkState(data.session ? "ok" : "invalid");
    })();

    return () => {
      cancelled = true;
    };
  }, [params]);

  async function onSubmit(values: ResetInput) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        toast.error(
          /session|jwt|token|Auth/i.test(error.message)
            ? "Your reset link is invalid or has expired. Please request a new one."
            : error.message,
        );
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Password updated!</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
            </div>
            <Button onClick={() => router.push("/login")} className="mt-2">
              Go to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (linkState === "checking") {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Verifying your reset link…
        </CardContent>
      </Card>
    );
  }

  if (linkState === "invalid") {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="py-10 text-center">
          <h2 className="text-lg font-bold">Link expired</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            This password-reset link is invalid or has expired. Request a new one and
            we&apos;ll email you a fresh link.
          </p>
          <Button asChild className="mt-5">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const errors = form.formState.errors;

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="space-y-2 px-0 pt-0">
        <CardTitle className="text-[26px] font-bold tracking-tight">Set a new password</CardTitle>
        <CardDescription>Choose a strong password for your Setups Works Lab account.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="pl-9 pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="pl-9 pr-10"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
