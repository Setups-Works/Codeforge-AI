import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DesignGuidelinesView } from "@/features/marketing/design-guidelines-view";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design Guidelines",
  description: `The ${APP_NAME} design system — logo, colors, typography, components and usage rules for building consistent Setups Works Lab experiences.`,
  alternates: { canonical: "/design-guidelines" },
};

export default async function DesignGuidelinesPage() {
  const session = await auth();
  return <DesignGuidelinesView signedIn={!!session?.user} />;
}
