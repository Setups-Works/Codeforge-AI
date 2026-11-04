import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lmsEnabled } from "@/lib/lms/flag";
import { BundlesManager } from "@/features/admin/bundles-manager";

export const metadata: Metadata = { title: "Admin · Course bundles" };

export default function AdminBundlesPage() {
  if (!lmsEnabled()) notFound();
  return <BundlesManager />;
}
