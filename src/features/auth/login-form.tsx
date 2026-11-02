"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInAction } from "@/lib/auth-actions";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Fingerprint } from "@/components/icons";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { loginWithPasskey, passkeysSupported } from "@/lib/passkey-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthButtons } from "./oauth-buttons";

export function LoginForm({
  google,
  github,
}: {
  google: boolean;
  github: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  async function onPasskey() {
    setPasskeyBusy(true);
    try {
      await loginWithPasskey();
      import("posthog-js").then(({ default: posthog }) => {
        posthog.capture("user_logged_in", { method: "passkey" });
      });
      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      // A user cancelling the browser prompt throws — don't nag them for that.
      const msg = e instanceof Error ? e.message : "Passkey sign-in failed";
      if (!/aborted|cancel|NotAllowed|timed out/i.test(msg)) toast.error(msg);
    } finally {
      setPasskeyBusy(false);
    }
  }

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const result = await signInAction(values.email, values.password);
      if (!result.ok) {
        toast.error(result.error ?? "Invalid email or password");
        return;
      }
      import("posthog-js").then(({ default: posthog }) => {
        posthog.identify(values.email, { email: values.email });
        posthog.capture("user_logged_in", { method: "email" });
      });
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="space-y-2 px-0 pt-0">
        <CardTitle className="text-[26px] font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue your interview prep
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <OAuthButtons google={google} github={github} callbackUrl={callbackUrl} />
        {passkeysSupported() && (
          <Button
            type="button"
            variant="outline"
            className="mb-3 w-full"
            onClick={onPasskey}
            disabled={passkeyBusy}
          >
            {passkeyBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Fingerprint className="size-4" />
            )}
            Sign in with a passkey
          </Button>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <input
              id="rememberMe"
              type="checkbox"
              className="size-4 accent-primary cursor-pointer"
              {...form.register("rememberMe")}
            />
            <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer select-none">
              Remember me for 30 days
            </label>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to Setups Works?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
