import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lmsEnabled } from "@/lib/lms/flag";
import { AnalyticsView } from "@/features/admin/lms-analytics-view";

export const metadata: Metadata = { title: "Admin · Course analytics" };

export default function AdminCourseAnalyticsPage() {
  if (!lmsEnabled()) notFound();
  return <AnalyticsView />;
}
