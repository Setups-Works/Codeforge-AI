import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingWithName } from "@/services/user-store";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const metadata = { title: "Welcome — Setups Works Lab" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // If already onboarded, send to dashboard
  const user = await getOnboardingWithName(session.user.id);
  if (user?.completed) redirect("/dashboard");

  return <OnboardingWizard name={session.user.name ?? "there"} />;
}
