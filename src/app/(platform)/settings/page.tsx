import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { User, Mail, ShieldCheck, Palette, Code2, Bell, CreditCard } from "@/components/icons";
import { getSession } from "@/lib/session";
import { getUserSettings } from "@/services/user-store";
import {
  EditorSettingsForm,
  ProfileSettingsForm,
} from "@/features/settings/settings-forms";
import { SettingsView, type SettingsSection } from "@/features/settings/settings-view";
import { ProfileMedia } from "@/features/settings/profile-media";
import { AccountSettings } from "@/features/settings/account-settings";
import { AppearanceSettings } from "@/features/settings/appearance-settings";
import { EmailNotifications } from "@/features/settings/email-notifications";
import { PasskeyManager } from "@/features/settings/passkey-manager";
import { DeleteAccount } from "@/features/settings/delete-account";
import { BillingPanel } from "@/features/subscription/billing-panel";
import { UsagePanel } from "@/features/subscription/usage-panel";
import { MyPurchases } from "@/features/subscription/my-purchases";
import { lmsEnabled } from "@/lib/lms/flag";
import { listMyCourses } from "@/services/lms-learn";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const user = await getUserSettings(session.user.id);
  if (!user) redirect("/login");

  const plan = user.plan;
  const purchases = lmsEnabled() ? await listMyCourses(session.user.id).catch(() => []) : null;
  const paymentsEnabled = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

  const sections: SettingsSection[] = [
    {
      id: "profile",
      label: "Profile",
      icon: <User className="size-4 shrink-0" />,
      desc: "Your public profile, photos and links.",
      node: (
        <>
          <ProfileMedia name={user.name} image={user.image} coverImage={user.coverImage} />
          <ProfileSettingsForm
            defaults={{
              name: user.name,
              username: user.username,
              bio: user.bio ?? "",
              location: user.location ?? "",
              website: user.website ?? "",
              githubUrl: user.githubUrl ?? "",
              linkedinUrl: user.linkedinUrl ?? "",
            }}
          />
        </>
      ),
    },
    {
      id: "account",
      label: "Account",
      icon: <Mail className="size-4 shrink-0" />,
      desc: "Email, sign-in methods and password.",
      node: <AccountSettings email={user.email} providers={user.providers} />,
    },
    {
      id: "security",
      label: "Security",
      icon: <ShieldCheck className="size-4 shrink-0" />,
      desc: "Passkeys and account deletion.",
      node: (
        <>
          <PasskeyManager />
          <DeleteAccount />
        </>
      ),
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: <Palette className="size-4 shrink-0" />,
      desc: "Theme and how the app looks.",
      node: <AppearanceSettings />,
    },
    {
      id: "editor",
      label: "Editor",
      icon: <Code2 className="size-4 shrink-0" />,
      desc: "Defaults for the coding workspace.",
      node: (
        <EditorSettingsForm
          defaults={{
            editorFontSize: user.preferences.editorFontSize,
            editorTheme: user.preferences.editorTheme as "vs-dark" | "light",
            vimMode: user.preferences.vimMode,
            defaultLanguage: user.preferences.defaultLanguage,
          }}
        />
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="size-4 shrink-0" />,
      desc: "Choose what lands in your inbox.",
      node: <EmailNotifications optOut={user.emailOptOut} />,
    },
    {
      id: "billing",
      label: "Billing & Usage",
      icon: <CreditCard className="size-4 shrink-0" />,
      desc: "Plan, courses, payments, invoices and AI credits.",
      node: (
        <>
          <BillingPanel
            paymentsEnabled={paymentsEnabled}
            billing={{
              plan,
              planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
              trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
              billingCycle: user.billingCycle ?? null,
            }}
          />
          {purchases && <MyPurchases courses={purchases} />}
          <UsagePanel plan={plan} />
        </>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 sm:py-8">
      <SettingsView sections={sections} />
    </div>
  );
}
