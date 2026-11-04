import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { VerifyForm } from "@/features/lms/verify-form";
import { lmsEnabled } from "@/lib/lms/flag";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check that a Setups Works Lab course certificate is genuine by entering its verification code.",
  alternates: { canonical: "/verify" },
};

type Props = { searchParams: Promise<{ code?: string }> };

/** Public page: anyone can confirm a certificate's code without signing in. */
export default async function VerifyPage({ searchParams }: Props) {
  if (!lmsEnabled()) notFound();
  const { code } = await searchParams;
  return (
    <div className="min-h-svh bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-8">
        <Logo href="/" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Verify a certificate</h1>
          <p className="text-sm text-muted-foreground">
            Enter the verification code printed on a Setups Works Lab certificate (it looks like <span className="font-mono">SW-7K2M-9QXD-4TNB</span>).
            No account needed.
          </p>
        </div>
        <VerifyForm initialCode={typeof code === "string" ? code.slice(0, 32) : ""} />
      </div>
    </div>
  );
}
